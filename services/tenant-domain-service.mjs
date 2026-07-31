/**
 * Small tenant-scoped domain service reference implementation.
 * Authorization is evaluated before every lookup and tenant ownership is
 * checked again so a client-supplied tenant id can never broaden scope.
 */
export class TenantDomainService {
  #resources = new Map();

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

  #error(status, code) { return { status, body: { code } }; }
}
