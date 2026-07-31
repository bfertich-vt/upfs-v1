import crypto from 'node:crypto';

const clone = (v) => v === null || typeof v !== 'object' ? v : Array.isArray(v) ? v.map(clone) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
const id = (actor) => actor?.issuer && actor?.subject ? `${actor.issuer}|${actor.subject}` : null;
const err = (status, code, request_id) => ({ status, body: { request_id, code } });
const pageToken = (offset) => Buffer.from(JSON.stringify({ offset })).toString('base64url');

/** Read-only admin control-plane reference. Production adapters must sit behind a private control-plane boundary. */
export class AdminControlPlaneService {
  #audit = [];
  constructor({ health = {}, tenants = [], environments = [], projection = {}, now = () => new Date(), requestId = () => `req-${crypto.randomUUID()}` } = {}) {
    this.health = health; this.tenants = tenants.map(clone); this.environments = environments.map(clone); this.projection = projection; this.now = now; this.requestId = requestId;
  }
  #begin(actor, action, requestedTenant, supportSession) {
    const request_id = this.requestId();
    if (!id(actor)) return [request_id, err(401, 'authentication_required', request_id)];
    const scopes = new Set(Array.isArray(actor.admin_scopes) ? actor.admin_scopes : []);
    if (!scopes.has('admin:read')) return [request_id, err(403, 'admin_scope_required', request_id)];
    if (requestedTenant !== undefined && requestedTenant !== null && typeof requestedTenant !== 'string') return [request_id, err(400, 'invalid_tenant_id', request_id)];
    if (requestedTenant && supportSession) {
      if (supportSession.tenant_id !== requestedTenant || typeof supportSession.case_id !== 'string' || typeof supportSession.reason !== 'string' || supportSession.reason.trim().length < 10 || supportSession.approved !== true || supportSession.step_up !== true || !Number.isFinite(Date.parse(supportSession.expires_at)) || Date.parse(supportSession.expires_at) <= this.now().getTime()) return [request_id, err(403, 'invalid_support_session', request_id)];
    }
    if (requestedTenant && !supportSession && !scopes.has('admin:tenant_metadata')) return [request_id, err(403, 'tenant_scope_required', request_id)];
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
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return err(400, 'invalid_limit', request_id);
    const offset = cursor === null ? 0 : Number(Buffer.from(cursor, 'base64url').toString());
    if (!Number.isInteger(offset) || offset < 0) return err(400, 'invalid_cursor', request_id);
    const data = this.tenants.slice(offset, offset + limit).map((t) => ({ id: t.id, name: t.name, status: t.status ?? 'active', organization_id: t.organization_id, data_classification: 'tenant_metadata' }));
    return { status: 200, body: { request_id, data, page: { limit, next_cursor: offset + data.length < this.tenants.length ? pageToken(offset + data.length) : null } } };
  }
  tenantRead({ actor, tenantId, supportSession }) {
    const [request_id, failure] = this.#begin(actor, 'admin.tenant.read', tenantId, supportSession); if (failure) return failure;
    const tenant = this.tenants.find((x) => x.id === tenantId); if (!tenant) return err(404, 'resource_not_found', request_id);
    const envs = this.environments.filter((e) => e.tenant_id === tenantId).map((e) => ({ id: e.id, name: e.name, status: e.status ?? 'active', tenant_id: tenantId, data_classification: 'tenant_metadata' }));
    const p = this.projection[tenantId] ?? {};
    return { status: 200, body: { request_id, tenant: { id: tenant.id, name: tenant.name, status: tenant.status ?? 'active', organization_id: tenant.organization_id, data_classification: 'tenant_metadata' }, environments: envs, projection: { status: ['healthy', 'degraded', 'unavailable'].includes(p.status) ? p.status : 'unknown', watermark: Number.isInteger(p.watermark) ? p.watermark : 0, indexed_count: Number.isInteger(p.indexed_count) ? p.indexed_count : 0, data_classification: 'operational_metadata' } } };
  }
  audit() { return this.#audit.map(clone); }
}
