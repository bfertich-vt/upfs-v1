import crypto from 'node:crypto';

const clone = (v) => v === null || typeof v !== 'object' ? v : Array.isArray(v) ? v.map(clone) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
const id = (actor) => actor?.issuer && actor?.subject ? `${actor.issuer}|${actor.subject}` : null;
const error = (status, code, request_id, details = {}) => ({ status, body: { request_id, code, details, retryable: status >= 500, docs: `https://docs.upfs.dev/errors/${code}` } });
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

/** Read-only admin control-plane reference. Production adapters must sit behind a private control-plane boundary. */
export class AdminControlPlaneService {
  #audit = [];
  constructor({ health = {}, tenants = [], environments = [], projection = {}, now = () => new Date(), requestId = () => `req-${crypto.randomUUID()}`, cursorSecret = 'upfs-admin-cursor-secret', managedCredentials = false, policy = () => true } = {}) {
    this.health = health; this.tenants = tenants.map(clone); this.environments = environments.map(clone); this.projection = projection; this.now = now; this.requestId = requestId; this.cursorSecret = cursorSecret; this.managedCredentials = managedCredentials; this.policy = policy; this.operations = new Map(); this.idempotency = new Map();
  }
  #cursor(endpoint, offset) { const payload = Buffer.from(JSON.stringify({ endpoint, offset })).toString('base64url'); const mac = crypto.createHmac('sha256', this.cursorSecret).update(payload).digest('base64url'); return `${payload}.${mac}`; }
  #decodeCursor(token, endpoint) { try { const [payload, mac] = String(token).split('.'); if (!payload || !mac) return null; const expected = crypto.createHmac('sha256', this.cursorSecret).update(payload).digest('base64url'); if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null; const value = JSON.parse(Buffer.from(payload, 'base64url').toString()); return value.endpoint === endpoint && Number.isInteger(value.offset) && value.offset >= 0 ? value.offset : null; } catch { return null; } }
  #recordDenied(action, actor, tenant_id, request_id, code) { this.#audit.push({ action, actor: id(actor), tenant_id: tenant_id ?? null, request_id, decision: 'deny', reason: code, at: this.now().toISOString(), metadata_only: true }); }
  #begin(actor, action, requestedTenant, supportSession) {
    const request_id = this.requestId();
    const deny = (status, code) => { this.#recordDenied(action, actor, requestedTenant, request_id, code); return [request_id, error(status, code, request_id)]; };
    if (!id(actor)) return deny(401, 'authentication_required');
    const scopes = new Set(Array.isArray(actor.admin_scopes) ? actor.admin_scopes : []);
    if (!scopes.has('admin:read')) return deny(403, 'admin_scope_required');
    if (requestedTenant !== undefined && requestedTenant !== null && (typeof requestedTenant !== 'string' || !requestedTenant.trim())) return deny(400, 'invalid_tenant_id');
    if (supportSession) {
      const expiry = typeof supportSession.expires_at === 'string' && RFC3339.test(supportSession.expires_at) ? Date.parse(supportSession.expires_at) : NaN;
      if (typeof supportSession.tenant_id !== 'string' || supportSession.tenant_id !== requestedTenant || typeof supportSession.case_id !== 'string' || supportSession.case_id.length < 1 || supportSession.case_id.length > 128 || typeof supportSession.reason !== 'string' || supportSession.reason.trim().length < 10 || supportSession.reason.length > 1000 || supportSession.approved !== true || supportSession.step_up !== true || !Number.isFinite(expiry) || expiry <= this.now().getTime()) return deny(403, 'invalid_support_session');
    }
    if (requestedTenant && !supportSession && !scopes.has('admin:tenant_metadata')) return deny(403, 'tenant_scope_required');
    this.#audit.push({ action, actor: id(actor), tenant_id: requestedTenant ?? null, request_id, decision: 'allow', at: this.now().toISOString(), ...(supportSession ? { case_id: supportSession.case_id, support_scope: 'redacted_read' } : {}) });
    return [request_id, null];
  }
  healthRead({ actor }) {
    const [request_id, failure] = this.#begin(actor, 'admin.health.read'); if (failure) return failure;
    const components = Object.fromEntries(Object.entries(this.health).map(([name, value]) => [name, { status: ['healthy', 'degraded', 'unavailable'].includes(value?.status) ? value.status : 'unknown', observed_at: value?.observed_at ?? this.now().toISOString(), data_classification: 'operational_metadata' }]));
    const degraded = Object.values(components).some((x) => x.status === 'degraded' || x.status === 'unavailable');
    return { status: 200, body: { request_id, status: degraded ? 'degraded' : 'healthy', components } };
  }
  tenantList({ actor, limit = 25, cursor = null, supportSession }) {
    const [request_id, failure] = this.#begin(actor, 'admin.tenants.list', undefined, supportSession); if (failure) return failure;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) { this.#recordDenied('admin.tenants.list', actor, undefined, request_id, 'invalid_limit'); return error(400, 'invalid_limit', request_id); }
    const offset = cursor === null ? 0 : this.#decodeCursor(cursor, 'admin.tenants.list');
    if (offset === null) { this.#recordDenied('admin.tenants.list', actor, undefined, request_id, 'invalid_cursor'); return error(400, 'invalid_cursor', request_id); }
    const data = this.tenants.slice(offset, offset + limit).map((t) => ({ id: t.id, name: t.name, status: t.status ?? 'active', organization_id: t.organization_id, data_classification: 'tenant_metadata' }));
    return { status: 200, body: { request_id, data, page: { limit, next_cursor: offset + data.length < this.tenants.length ? this.#cursor('admin.tenants.list', offset + data.length) : null } } };
  }
  tenantRead({ actor, tenantId, supportSession }) {
    const [request_id, failure] = this.#begin(actor, 'admin.tenant.read', tenantId, supportSession); if (failure) return failure;
    const tenant = this.tenants.find((x) => x.id === tenantId); if (!tenant) { this.#recordDenied('admin.tenant.read', actor, tenantId, request_id, 'resource_not_found'); return error(404, 'resource_not_found', request_id); }
    const envs = this.environments.filter((e) => e.tenant_id === tenantId).map((e) => ({ id: e.id, name: e.name, status: e.status ?? 'active', tenant_id: tenantId, data_classification: 'tenant_metadata' }));
    const p = this.projection[tenantId] ?? {};
    return { status: 200, body: { request_id, tenant: { id: tenant.id, name: tenant.name, status: tenant.status ?? 'active', organization_id: tenant.organization_id, data_classification: 'tenant_metadata' }, environments: envs, projection: { status: ['healthy', 'degraded', 'unavailable'].includes(p.status) ? p.status : 'unknown', watermark: Number.isInteger(p.watermark) ? p.watermark : 0, indexed_count: Number.isInteger(p.indexed_count) ? p.indexed_count : 0, data_classification: 'operational_metadata' } } };
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
  listAdministrativeOperations({ actor, tenantId, environmentId }) { const [request_id, failure] = this.#begin(actor, 'admin.operations.list', tenantId); if (failure) return failure; if (environmentId && !this.environments.some((e) => e.id === environmentId && e.tenant_id === tenantId)) return error(404, 'environment_not_found', request_id); const data = [...this.operations.values()].filter((o) => o.tenant_id === tenantId && (!environmentId || o.environment_id === environmentId)).map((o) => ({ ...clone(o), reason: undefined, audit: undefined })); return { status: 200, body: { request_id, data, data_classification: 'operational_metadata' } }; }
  approveAdministrativeOperation({ actor, operationId, reason, dualControl = false, idempotencyKey }) { const op = this.operations.get(operationId); if (!op) return error(404, 'operation_not_found', this.requestId()); const [request_id, failure] = this.#writeBegin(actor, op.tenant_id, op.environment_id, 'admin.operation.approve'); if (failure) return failure; if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 16) return error(400, 'invalid_idempotency_key', request_id); if (this.idempotency.has(idempotencyKey)) return clone(this.idempotency.get(idempotencyKey)); if (op.created_by === id(actor)) return error(403, 'dual_control_required', request_id); if (typeof reason !== 'string' || reason.trim().length < 10) return error(400, 'approval_reason_required', request_id); if (dualControl !== true) return error(403, 'dual_control_required', request_id); op.approvals.push({ actor: id(actor), reason: reason.trim(), at: this.now().toISOString(), dual_control: true }); op.status = 'approved'; op.audit.push({ event: 'approved', actor: id(actor), at: this.now().toISOString(), request_id }); const result = { status: 200, body: { request_id, operation: clone(op), data_classification: 'operational_metadata' } }; this.idempotency.set(idempotencyKey, result); return result; }
  executeAdministrativeOperation({ actor, operationId, idempotencyKey }) { const op = this.operations.get(operationId); const request_id = this.requestId(); if (!op) return error(404, 'operation_not_found', request_id); const [rid, failure] = this.#writeBegin(actor, op.tenant_id, op.environment_id, 'admin.operation.execute'); if (failure) return failure; if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 16) return error(400, 'invalid_idempotency_key', rid); if (this.idempotency.has(idempotencyKey)) return clone(this.idempotency.get(idempotencyKey)); if (op.status !== 'approved') return error(409, 'operation_not_approved', rid); if (!this.managedCredentials || op.dry_run !== false) return error(503, 'managed_credentials_unavailable', rid); op.status = 'executed'; op.audit.push({ event: 'executed', actor: id(actor), at: this.now().toISOString(), request_id: rid }); const result = { status: 200, body: { request_id: rid, operation: clone(op), data_classification: 'operational_metadata' } }; this.idempotency.set(idempotencyKey, result); return result; }
  rollbackAdministrativeOperation({ actor, operationId, evidence, idempotencyKey }) { const op = this.operations.get(operationId); const request_id = this.requestId(); if (!op) return error(404, 'operation_not_found', request_id); const [rid, failure] = this.#writeBegin(actor, op.tenant_id, op.environment_id, 'admin.operation.rollback'); if (failure) return failure; if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 16) return error(400, 'invalid_idempotency_key', rid); if (this.idempotency.has(idempotencyKey)) return clone(this.idempotency.get(idempotencyKey)); if (!['approved', 'executed'].includes(op.status)) return error(409, 'operation_not_rollbackable', rid); if (!op.approvals.some((a) => a.actor !== id(actor) && a.dual_control === true)) return error(403, 'dual_control_required', rid); if (typeof evidence !== 'string' || evidence.trim().length < 10) return error(400, 'rollback_evidence_required', rid); op.status = 'rolled_back'; op.rollback.evidence = evidence.trim(); op.audit.push({ event: 'rolled_back', actor: id(actor), at: this.now().toISOString(), request_id: rid }); const result = { status: 200, body: { request_id: rid, operation: clone(op), data_classification: 'operational_metadata' } }; this.idempotency.set(idempotencyKey, result); return result; }
  audit() { return this.#audit.map(clone); }
}
