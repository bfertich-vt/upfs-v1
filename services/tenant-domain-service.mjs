/**
 * Small tenant-scoped domain service reference implementation.
 * Authorization is evaluated before every lookup and tenant ownership is
 * checked again so a client-supplied tenant id can never broaden scope.
 */
export class TenantDomainService {
  #resources = new Map();
  #idempotency = new Map();
  #audit = [];

  constructor({ authorize = () => false } = {}) {
    this.authorize = authorize;
  }

  seed({ id, tenantId, attributes = {} }) {
    const resource = { id, tenant_id: tenantId, ...attributes };
    this.#resources.set(id, resource);
    return { ...resource };
  }

  get({ actor, tenantId, id }) {
    if (!actor?.subject || !actor.issuer) return this.#error(401, 'authentication_required');
    if (!this.authorize(actor, tenantId)) return this.#error(403, 'forbidden');
    const resource = this.#resources.get(id);
    // Deliberately use the same envelope for an unknown or cross-tenant id.
    if (!resource || resource.tenant_id !== tenantId) return this.#error(404, 'resource_not_found');
    return { status: 200, body: { ...resource } };
  }

  createMembership({ actor, tenantId, subject, role, idempotencyKey }) {
    if (!actor?.subject || !actor.issuer) return this.#error(401, 'authentication_required');
    if (!this.authorize(actor, tenantId)) return this.#error(403, 'forbidden');
    if (!idempotencyKey || idempotencyKey.length < 16) return this.#error(400, 'idempotency_key_required');
    const key = `${actor.issuer}|${actor.subject}|${tenantId}|${idempotencyKey}`;
    if (this.#idempotency.has(key)) return this.#idempotency.get(key);
    const resource = { id: `${tenantId}:${subject}`, kind: 'membership', tenant_id: tenantId, subject, role, status: 'active' };
    this.#resources.set(resource.id, resource);
    const result = { status: 201, body: { ...resource } };
    this.#idempotency.set(key, result);
    this.#audit.push({ action: 'membership.create', tenant_id: tenantId, subject, actor: actor.subject });
    return result;
  }

  listMemberships({ actor, tenantId }) {
    if (!actor?.subject || !actor.issuer) return this.#error(401, 'authentication_required');
    if (!this.authorize(actor, tenantId)) return this.#error(403, 'forbidden');
    return { status: 200, body: [...this.#resources.values()].filter((r) => r.kind === 'membership' && r.tenant_id === tenantId).map((r) => ({ ...r })) };
  }

  audit() { return this.#audit.map((entry) => ({ ...entry })); }

  #error(status, code) { return { status, body: { code } }; }
}
