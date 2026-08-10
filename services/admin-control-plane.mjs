import crypto from 'node:crypto';

const MAX_TEXT = 256;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
const safeRecord = (value, allowed, label) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype || Object.getOwnPropertySymbols(value).length) throw new TypeError(`invalid_${label}`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) if (!allowed.has(key) || !('value' in descriptor)) throw new TypeError(`invalid_${label}`);
  return Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]));
};
const safeString = (value, label, { min = 1, max = MAX_TEXT, pattern = SAFE_ID } = {}) => {
  if (typeof value !== 'string' || value.length < min || value.length > max || !pattern.test(value)) throw new TypeError(`invalid_${label}`);
  return value;
};
const safeArray = (value, label, max = 1000) => {
  if (!Array.isArray(value) || value.length > max || Object.keys(value).length !== value.length) throw new TypeError(`invalid_${label}`);
  return value;
};
const safeClone = (value, seen = new WeakSet()) => {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (typeof value !== 'object' || seen.has(value) || Object.getOwnPropertySymbols(value).length) throw new TypeError('unsafe_value');
  seen.add(value);
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length || value.length > 1000) throw new TypeError('unsafe_value');
    const result = value.map((item) => safeClone(item, seen)); seen.delete(value); return result;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError('unsafe_value');
  const result = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!('value' in descriptor)) throw new TypeError('unsafe_value');
    result[key] = safeClone(descriptor.value, seen);
  }
  seen.delete(value); return result;
};
const clone = safeClone;
const id = (actor) => `${actor.issuer}|${actor.subject}`;
const error = (status, code, request_id, details = {}) => ({ status, body: { request_id, code, details, retryable: status >= 500, docs: `https://docs.upfs.dev/errors/${code}` } });
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
const ACTOR_KEYS = new Set(['issuer', 'subject', 'admin_scopes', 'tenant_ids', 'environment_ids', 'session_id', 'step_up']);
const TENANT_KEYS = new Set(['id', 'name', 'organization_id', 'status']);
const ENV_KEYS = new Set(['id', 'tenant_id', 'name', 'status']);
const SUPPORT_KEYS = new Set(['id', 'actor_id', 'tenant_id', 'environment_ids', 'case_id', 'reason_code', 'approved_by', 'step_up', 'expires_at']);
const STATUS = new Set(['healthy', 'degraded', 'unavailable']);

const normalizeActor = (value) => {
  const actor = safeRecord(value, ACTOR_KEYS, 'actor');
  safeString(actor.issuer, 'actor'); safeString(actor.subject, 'actor'); safeString(actor.session_id, 'actor');
  const scopes = safeArray(actor.admin_scopes, 'actor_scopes', 32).map((scope) => safeString(scope, 'scope'));
  const tenantIds = safeArray(actor.tenant_ids ?? [], 'tenant_scope', 1000).map((tenantId) => safeString(tenantId, 'tenant_scope'));
  const environmentIds = safeArray(actor.environment_ids ?? [], 'environment_scope', 5000).map((environmentId) => safeString(environmentId, 'environment_scope'));
  return Object.freeze({ issuer: actor.issuer, subject: actor.subject, session_id: actor.session_id, step_up: actor.step_up === true, scopes: new Set(scopes), tenantIds: new Set(tenantIds), environmentIds: new Set(environmentIds) });
};
const normalizeTenant = (value) => { const tenant = safeRecord(value, TENANT_KEYS, 'tenant'); return Object.freeze({ id: safeString(tenant.id, 'tenant'), name: safeString(tenant.name, 'tenant_name', { pattern: /^[^\u0000-\u001f\u007f]{1,256}$/ }), organization_id: safeString(tenant.organization_id, 'organization'), status: safeString(tenant.status ?? 'active', 'tenant_status') }); };
const normalizeEnvironment = (value) => { const environment = safeRecord(value, ENV_KEYS, 'environment'); return Object.freeze({ id: safeString(environment.id, 'environment'), tenant_id: safeString(environment.tenant_id, 'tenant'), name: safeString(environment.name, 'environment_name', { pattern: /^[^\u0000-\u001f\u007f]{1,256}$/ }), status: safeString(environment.status ?? 'active', 'environment_status') }); };

/** Read-only admin control-plane reference. Production adapters must sit behind a private control-plane boundary. */
export class AdminControlPlaneService {
  #audit = [];
  constructor({ health = {}, tenants = [], environments = [], projection = {}, now = () => new Date(), requestId = () => `req-${crypto.randomUUID()}`, cursorSecret, managedCredentials = false, policy = () => true, resolveSupportSession = () => null, auditSink, adapterTimeoutMs = 100, maxSnapshotAgeMs = 300000 } = {}) {
    if (typeof cursorSecret !== 'string' || cursorSecret.length < 32 || cursorSecret.length > 256) throw new TypeError('invalid_cursor_secret');
    this.health = safeClone(health); this.tenants = safeArray(tenants, 'tenants').map(normalizeTenant); this.environments = safeArray(environments, 'environments').map(normalizeEnvironment); this.projection = safeClone(projection);
    if (typeof now !== 'function' || typeof requestId !== 'function' || typeof resolveSupportSession !== 'function' || (auditSink !== undefined && typeof auditSink !== 'function')) throw new TypeError('invalid_adapter');
    if (!Number.isInteger(adapterTimeoutMs) || adapterTimeoutMs < 1 || adapterTimeoutMs > 5000 || !Number.isInteger(maxSnapshotAgeMs) || maxSnapshotAgeMs < 1 || maxSnapshotAgeMs > 3600000) throw new TypeError('invalid_adapter_bounds');
    this.now = now; this.requestId = requestId; this.cursorSecret = cursorSecret; this.managedCredentials = managedCredentials; this.policy = policy; this.resolveSupportSession = resolveSupportSession; this.auditSink = auditSink ?? (() => {}); this.adapterTimeoutMs = adapterTimeoutMs; this.maxSnapshotAgeMs = maxSnapshotAgeMs; this.operations = new Map(); this.idempotency = new Map();
  }
  #cursor(endpoint, offset, scope, snapshot) { const payload = Buffer.from(JSON.stringify({ endpoint, offset, scope, snapshot })).toString('base64url'); const mac = crypto.createHmac('sha256', this.cursorSecret).update(payload).digest('base64url'); return `${payload}.${mac}`; }
  #decodeCursor(token, endpoint, scope, snapshot) { try { if (typeof token !== 'string' || token.length < 16 || token.length > 2048) return null; const parts = token.split('.'); if (parts.length !== 2) return null; const [payload, mac] = parts; const expected = crypto.createHmac('sha256', this.cursorSecret).update(payload).digest('base64url'); if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null; const value = JSON.parse(Buffer.from(payload, 'base64url').toString()); return Object.keys(value).length === 4 && value.endpoint === endpoint && value.scope === scope && value.snapshot === snapshot && Number.isInteger(value.offset) && value.offset >= 0 ? value.offset : null; } catch { return null; } }
  #emit(event, fallback) { try { this.auditSink(Object.freeze(safeClone(event))); this.#audit.push(safeClone(event)); return null; } catch { return error(503, 'audit_unavailable', event.request_id ?? fallback); } }
  #deny(context, status, code) { const event = { action: context.action, actor: context.actorId, tenant_scope: context.tenantId ?? null, environment_scope: context.environmentId ?? null, request_id: context.requestId, decision: 'deny', reason: code, at: this.now().toISOString(), metadata_only: true }; return this.#emit(event, context.requestId) ?? error(status, code, context.requestId); }
  #allow(context, result) { const event = { action: context.action, actor: context.actorId, tenant_scope: context.tenantId ?? null, environment_scope: context.environmentId ?? null, request_id: context.requestId, decision: 'allow', reason: 'authorized', at: this.now().toISOString(), metadata_only: true, ...(context.support ? { support_session_id: context.support.id, case_id: context.support.case_id, support_scope: 'redacted_read', approved_by: context.support.approved_by } : {}) }; return this.#emit(event, context.requestId) ?? result; }
  #begin(actorValue, action, tenantId, environmentId, supportReference) {
    let requestId = 'request-unavailable'; try { requestId = safeString(this.requestId(), 'request_id'); } catch { return { failure: error(503, 'request_id_unavailable', requestId) }; }
    let actor; try { actor = normalizeActor(actorValue); } catch { return { failure: this.#deny({ action, requestId, actorId: null, tenantId: null, environmentId: null }, 401, 'authentication_required') }; }
    const context = { action, requestId, actorId: id(actor), tenantId: null, environmentId: null, actor };
    if (!actor.scopes.has('admin:read')) return { failure: this.#deny(context, 403, 'admin_scope_required') };
    try { if (tenantId !== undefined) context.tenantId = safeString(tenantId, 'tenant'); if (environmentId !== undefined) context.environmentId = safeString(environmentId, 'environment'); } catch { return { failure: this.#deny(context, 404, 'resource_not_found') }; }
    if (supportReference !== undefined) {
      if (typeof supportReference !== 'string' || supportReference.length < 16 || supportReference.length > 512) return { failure: this.#deny(context, 403, 'invalid_support_session') };
      let raw; const started = Date.now(); try { raw = this.resolveSupportSession(supportReference, Object.freeze({ actor_id: context.actorId, tenant_id: context.tenantId, environment_id: context.environmentId })); } catch { return { failure: this.#deny(context, 503, 'support_broker_unavailable') }; }
      if (Date.now() - started > this.adapterTimeoutMs) return { failure: this.#deny(context, 503, 'support_broker_timeout') };
      try {
        const support = safeRecord(raw, SUPPORT_KEYS, 'support_session'); const expiry = typeof support.expires_at === 'string' && RFC3339.test(support.expires_at) ? Date.parse(support.expires_at) : NaN;
        const environmentIds = safeArray(support.environment_ids ?? [], 'support_environment_scope', 100).map((value) => safeString(value, 'environment'));
        if (safeString(support.id, 'support_session') !== supportReference || safeString(support.actor_id, 'support_actor', { pattern: /^[^\u0000-\u001f\u007f]{1,256}$/ }) !== context.actorId || safeString(support.tenant_id, 'support_tenant') !== context.tenantId || safeString(support.case_id, 'support_case') === '' || safeString(support.reason_code, 'support_reason') === '' || safeString(support.approved_by, 'support_approver', { pattern: /^[^\u0000-\u001f\u007f]{1,256}$/ }) === context.actorId || support.step_up !== true || actor.step_up !== true || !Number.isFinite(expiry) || expiry <= this.now().getTime() || (context.environmentId && !environmentIds.includes(context.environmentId))) throw new TypeError('invalid_support_session');
        context.support = Object.freeze({ id: support.id, case_id: support.case_id, approved_by: support.approved_by, environmentIds: Object.freeze([...environmentIds]) });
      } catch { return { failure: this.#deny(context, 403, 'invalid_support_session') }; }
    } else if (context.tenantId && (!actor.tenantIds.has(context.tenantId) || (context.environmentId && !actor.environmentIds.has(context.environmentId)))) return { failure: this.#deny(context, 404, 'resource_not_found') };
    return { context };
  }
  healthRead(request = {}) {
    let input; try { input = safeRecord(request, new Set(['actor', 'signal']), 'health_request'); } catch { return this.#begin(undefined, 'admin.health.read').failure; } const { actor, signal } = input;
    const begun = this.#begin(actor, 'admin.health.read'); if (begun.failure) return begun.failure; const { context } = begun;
    if (signal?.aborted === true) return this.#deny(context, 499, 'request_cancelled');
    let components;
    try { components = Object.fromEntries(Object.entries(safeRecord(this.health, new Set(Object.keys(this.health)), 'health')).map(([name, value]) => { safeString(name, 'component'); const component = safeRecord(value, new Set(['status', 'observed_at']), 'health_component'); const status = STATUS.has(component.status) ? component.status : 'unknown'; const observed = component.observed_at ?? this.now().toISOString(); const observedMs = RFC3339.test(observed) ? Date.parse(observed) : NaN; if (!Number.isFinite(observedMs) || this.now().getTime() - observedMs > this.maxSnapshotAgeMs) throw new TypeError('stale_health'); return [name, { status, observed_at: observed, data_classification: 'operational_metadata' }]; })); } catch { return this.#deny(context, 503, 'health_dependency_unavailable'); }
    if (signal?.aborted === true) return this.#deny(context, 499, 'request_cancelled');
    const degraded = Object.values(components).some((value) => value.status !== 'healthy');
    return this.#allow(context, { status: 200, body: { request_id: context.requestId, status: degraded ? 'degraded' : 'healthy', components } });
  }
  tenantList(request = {}) {
    let input; try { input = safeRecord(request, new Set(['actor', 'limit', 'cursor', 'signal']), 'tenant_list_request'); } catch { return this.#begin(undefined, 'admin.tenants.list').failure; } const { actor, limit = 25, cursor = null, signal } = input;
    const begun = this.#begin(actor, 'admin.tenants.list'); if (begun.failure) return begun.failure; const { context } = begun;
    if (signal?.aborted === true) return this.#deny(context, 499, 'request_cancelled');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return this.#deny(context, 400, 'invalid_limit');
    const visible = this.tenants.filter((tenant) => context.actor.tenantIds.has(tenant.id)).sort((a, b) => a.id.localeCompare(b.id));
    const scope = crypto.createHash('sha256').update([...context.actor.tenantIds].sort().join('\n')).digest('hex'); const snapshot = crypto.createHash('sha256').update(visible.map((tenant) => tenant.id).join('\n')).digest('hex');
    const offset = cursor === null ? 0 : this.#decodeCursor(cursor, 'admin.tenants.list', scope, snapshot);
    if (offset === null || offset > visible.length) return this.#deny(context, 400, 'invalid_cursor');
    const data = visible.slice(offset, offset + limit).map((tenant) => ({ id: tenant.id, name: tenant.name, status: tenant.status, organization_id: tenant.organization_id, data_classification: 'tenant_metadata' }));
    const result = { status: 200, body: { request_id: context.requestId, data, page: { limit, next_cursor: offset + data.length < visible.length ? this.#cursor('admin.tenants.list', offset + data.length, scope, snapshot) : null } } };
    return signal?.aborted === true ? this.#deny(context, 499, 'request_cancelled') : this.#allow(context, result);
  }
  tenantRead(request = {}) {
    let input; try { input = safeRecord(request, new Set(['actor', 'tenantId', 'environmentId', 'supportSession', 'signal']), 'tenant_read_request'); } catch { return this.#begin(undefined, 'admin.tenant.read').failure; } const { actor, tenantId, environmentId, supportSession, signal } = input;
    const begun = this.#begin(actor, 'admin.tenant.read', tenantId, environmentId, supportSession); if (begun.failure) return begun.failure; const { context } = begun;
    if (signal?.aborted === true) return this.#deny(context, 499, 'request_cancelled');
    const tenant = this.tenants.find((value) => value.id === context.tenantId); if (!tenant) return this.#deny(context, 404, 'resource_not_found');
    const allowedEnvironmentIds = context.support ? new Set(context.support.environmentIds) : context.actor.environmentIds;
    const envs = this.environments.filter((environment) => environment.tenant_id === tenant.id && (!context.environmentId || environment.id === context.environmentId) && allowedEnvironmentIds.has(environment.id)).map((environment) => ({ id: environment.id, name: environment.name, status: environment.status, tenant_id: tenant.id, data_classification: 'tenant_metadata' }));
    if (context.environmentId && envs.length === 0) return this.#deny(context, 404, 'resource_not_found');
    let projection; try { const raw = this.projection[tenant.id] ?? {}; const p = safeRecord(raw, new Set(['status', 'watermark', 'indexed_count']), 'projection'); if ((p.watermark !== undefined && (!Number.isSafeInteger(p.watermark) || p.watermark < 0)) || (p.indexed_count !== undefined && (!Number.isSafeInteger(p.indexed_count) || p.indexed_count < 0))) throw new TypeError('invalid_projection'); projection = { status: STATUS.has(p.status) ? p.status : 'unknown', watermark: p.watermark ?? 0, indexed_count: p.indexed_count ?? 0, data_classification: 'operational_metadata' }; } catch { return this.#deny(context, 503, 'projection_dependency_unavailable'); }
    const result = { status: 200, body: { request_id: context.requestId, tenant: { id: tenant.id, name: tenant.name, status: tenant.status, organization_id: tenant.organization_id, data_classification: 'tenant_metadata' }, environments: envs, projection } };
    return signal?.aborted === true ? this.#deny(context, 499, 'request_cancelled') : this.#allow(context, result);
  }
  #writeBegin(actor, tenantId, environmentId, action) {
    const request_id = this.requestId();
    if (!id(actor)) return [request_id, error(401, 'authentication_required', request_id)];
    const scopes = new Set(Array.isArray(actor.admin_scopes) ? actor.admin_scopes : []);
    if (!scopes.has('admin:write')) return [request_id, error(403, 'admin_write_scope_required', request_id)];
    if (typeof tenantId !== 'string' || !tenantId.trim()) return [request_id, error(400, 'tenant_scope_required', request_id)];
    const allowed = actor.tenant_ids || actor.tenants;
    if (Array.isArray(allowed) && !allowed.includes(tenantId)) return [request_id, error(403, 'tenant_scope_required', request_id)];
    if (environmentId !== undefined && environmentId !== null) {
      const env = this.environments.find((e) => e.id === environmentId && e.tenant_id === tenantId);
      if (!env) return [request_id, error(404, 'environment_not_found', request_id)];
    }
    try { if (this.policy({ actor, tenantId, environmentId, action }) !== true) return [request_id, error(403, 'policy_denied', request_id)]; } catch { return [request_id, error(403, 'policy_denied', request_id)]; }
    return [request_id, null];
  }
  createAdministrativeOperation({ actor, tenantId, environmentId, type, reason, dryRun = true, idempotencyKey, changeTicket = null }) {
    const [request_id, failure] = this.#writeBegin(actor, tenantId, environmentId, 'admin.operation.create'); if (failure) return failure;
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 16 || idempotencyKey.length > 256) return error(400, 'invalid_idempotency_key', request_id);
    if (this.idempotency.has(idempotencyKey)) return this.idempotency.get(idempotencyKey);
    if (typeof type !== 'string' || !type.trim() || typeof reason !== 'string' || reason.trim().length < 10 || reason.length > 1000 || typeof dryRun !== 'boolean') return error(400, 'invalid_operation', request_id);
    const operation = { id: `op-${crypto.randomUUID()}`, type, tenant_id: tenantId, environment_id: environmentId ?? null, reason: reason.trim(), change_ticket: changeTicket ?? null, dry_run: dryRun, status: 'dry_run', created_by: id(actor), created_at: this.now().toISOString(), approvals: [], audit: [{ event: 'created', actor: id(actor), at: this.now().toISOString(), request_id }], rollback: { available: true, strategy: 'corrective-forward', evidence: null } };
    const result = { status: 202, body: { request_id, operation: clone(operation), data_classification: 'operational_metadata' } }; this.operations.set(operation.id, operation); this.idempotency.set(idempotencyKey, result); return clone(result);
  }
  listAdministrativeOperations({ actor, tenantId, environmentId }) { const begun = this.#begin(actor, 'admin.operations.list', tenantId, environmentId); if (begun.failure) return begun.failure; const { context } = begun; if (environmentId && !this.environments.some((e) => e.id === environmentId && e.tenant_id === tenantId)) return this.#deny(context, 404, 'resource_not_found'); const data = [...this.operations.values()].filter((o) => o.tenant_id === tenantId && (!environmentId || o.environment_id === environmentId)).map((o) => { const value = clone(o); delete value.reason; delete value.audit; return value; }); return this.#allow(context, { status: 200, body: { request_id: context.requestId, data, data_classification: 'operational_metadata' } }); }
  approveAdministrativeOperation({ actor, operationId, reason, dualControl = false, idempotencyKey }) { const op = this.operations.get(operationId); if (!op) return error(404, 'operation_not_found', this.requestId()); const [request_id, failure] = this.#writeBegin(actor, op.tenant_id, op.environment_id, 'admin.operation.approve'); if (failure) return failure; if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 16) return error(400, 'invalid_idempotency_key', request_id); if (this.idempotency.has(idempotencyKey)) return clone(this.idempotency.get(idempotencyKey)); if (op.created_by === id(actor)) return error(403, 'dual_control_required', request_id); if (typeof reason !== 'string' || reason.trim().length < 10) return error(400, 'approval_reason_required', request_id); if (dualControl !== true) return error(403, 'dual_control_required', request_id); op.approvals.push({ actor: id(actor), reason: reason.trim(), at: this.now().toISOString(), dual_control: true }); op.status = 'approved'; op.audit.push({ event: 'approved', actor: id(actor), at: this.now().toISOString(), request_id }); const result = { status: 200, body: { request_id, operation: clone(op), data_classification: 'operational_metadata' } }; this.idempotency.set(idempotencyKey, result); return result; }
  executeAdministrativeOperation({ actor, operationId, idempotencyKey }) { const op = this.operations.get(operationId); const request_id = this.requestId(); if (!op) return error(404, 'operation_not_found', request_id); const [rid, failure] = this.#writeBegin(actor, op.tenant_id, op.environment_id, 'admin.operation.execute'); if (failure) return failure; if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 16) return error(400, 'invalid_idempotency_key', rid); if (this.idempotency.has(idempotencyKey)) return clone(this.idempotency.get(idempotencyKey)); if (op.status !== 'approved') return error(409, 'operation_not_approved', rid); if (!this.managedCredentials || op.dry_run !== false) return error(503, 'managed_credentials_unavailable', rid); op.status = 'executed'; op.audit.push({ event: 'executed', actor: id(actor), at: this.now().toISOString(), request_id: rid }); const result = { status: 200, body: { request_id: rid, operation: clone(op), data_classification: 'operational_metadata' } }; this.idempotency.set(idempotencyKey, result); return result; }
  rollbackAdministrativeOperation({ actor, operationId, evidence, idempotencyKey }) { const op = this.operations.get(operationId); const request_id = this.requestId(); if (!op) return error(404, 'operation_not_found', request_id); const [rid, failure] = this.#writeBegin(actor, op.tenant_id, op.environment_id, 'admin.operation.rollback'); if (failure) return failure; if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 16) return error(400, 'invalid_idempotency_key', rid); if (this.idempotency.has(idempotencyKey)) return clone(this.idempotency.get(idempotencyKey)); if (!['approved', 'executed'].includes(op.status)) return error(409, 'operation_not_rollbackable', rid); if (!op.approvals.some((a) => a.actor !== id(actor) && a.dual_control === true)) return error(403, 'dual_control_required', rid); if (typeof evidence !== 'string' || evidence.trim().length < 10) return error(400, 'rollback_evidence_required', rid); op.status = 'rolled_back'; op.rollback.evidence = evidence.trim(); op.audit.push({ event: 'rolled_back', actor: id(actor), at: this.now().toISOString(), request_id: rid }); const result = { status: 200, body: { request_id: rid, operation: clone(op), data_classification: 'operational_metadata' } }; this.idempotency.set(idempotencyKey, result); return result; }
  audit() { return this.#audit.map((event) => clone(event)); }
}
