import crypto from 'node:crypto';

const clone = (v) => v === null || typeof v !== 'object' ? v : Array.isArray(v) ? v.map(clone) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
const id = (actor) => actor?.issuer && actor?.subject ? `${actor.issuer}|${actor.subject}` : null;
const error = (status, code, request_id, details = {}) => ({ status, body: { request_id, code, details, retryable: status >= 500, docs: `https://docs.upfs.dev/errors/${code}` } });
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

/** Read-only admin control-plane reference. Production adapters must sit behind a private control-plane boundary. */
export class AdminControlPlaneService {
  #audit = [];
  constructor({ health = {}, tenants = [], environments = [], projection = {}, now = () => new Date(), requestId = () => `req-${crypto.randomUUID()}`, cursorSecret = 'upfs-admin-cursor-secret' } = {}) {
    this.health = health; this.tenants = tenants.map(clone); this.environments = environments.map(clone); this.projection = projection; this.now = now; this.requestId = requestId; this.cursorSecret = cursorSecret;
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
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return error(400, 'invalid_limit', request_id);
    const offset = cursor === null ? 0 : this.#decodeCursor(cursor, 'admin.tenants.list');
    if (offset === null) return error(400, 'invalid_cursor', request_id);
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
  audit() { return this.#audit.map(clone); }
}
