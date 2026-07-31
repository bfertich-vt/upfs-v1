import { randomUUID } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** In-memory reference service for the identity/tenant foundation.
 * Persistence adapters can replace the maps without changing authorization semantics.
 */
export class IdentityFoundationService {
  #resources = new Map();
  #idempotency = new Map();
  #audit = [];

  constructor({ authorize = () => false, now = () => new Date() } = {}) {
    this.authorize = authorize;
    this.now = now;
  }

  create({ actor, kind, tenantId, idempotencyKey, ifMatch, attributes = {} }) {
    if (!actor?.subject || !actor.issuer) return this.#error(401, 'authentication_required');
    if (!idempotencyKey || idempotencyKey.length < 16) return this.#error(400, 'idempotency_key_required');
    if (!['identity', 'organization', 'tenant', 'environment', 'membership'].includes(kind)) return this.#error(400, 'unsupported_kind');
    if (!this.authorize(actor, kind, tenantId)) return this.#error(403, 'forbidden');
    const prior = this.#idempotency.get(`${actor.issuer}|${actor.subject}|${idempotencyKey}`);
    if (prior) return prior;
    if (kind !== 'organization' && kind !== 'identity' && !tenantId) return this.#error(400, 'tenant_required');
    if (tenantId && !UUID.test(tenantId)) return this.#error(400, 'invalid_tenant_id');
    if (ifMatch !== undefined && ifMatch !== '0') return this.#error(412, 'precondition_failed');
    const createdAt = this.now().toISOString();
    const resource = { id: randomUUID(), kind, version: 1, created_at: createdAt, status: 'active', ...(tenantId ? { tenant_id: tenantId } : {}), ...attributes };
    this.#resources.set(resource.id, resource);
    const result = { status: 201, body: resource, headers: { etag: '"1"' } };
    this.#idempotency.set(`${actor.issuer}|${actor.subject}|${idempotencyKey}`, result);
    this.#audit.push({ action: 'identity_foundation.create', actor: `${actor.issuer}|${actor.subject}`, tenant_id: tenantId ?? null, resource_id: resource.id, at: createdAt });
    return result;
  }

  audit() { return this.#audit.map((entry) => ({ ...entry })); }
  #error(status, code) { return { status, body: { code } }; }
}
