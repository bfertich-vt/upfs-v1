import { randomUUID } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Tenant-scoped membership operations with deny-by-default authorization. */
export class MembershipService {
  #memberships = new Map();
  #idempotency = new Map();
  #audit = [];

  constructor({ authorize = () => false, now = () => new Date() } = {}) {
    this.authorize = authorize;
    this.now = now;
  }

  create({ actor, tenantId, memberId, roles = [], status = 'active', idempotencyKey }) {
    if (!actor?.subject || !actor.issuer) return this.#error(401, 'authentication_required');
    if (!idempotencyKey || idempotencyKey.length < 16) return this.#error(400, 'idempotency_key_required');
    if (!UUID.test(tenantId ?? '')) return this.#error(400, 'invalid_tenant_id');
    if (!memberId || typeof memberId !== 'string') return this.#error(400, 'member_required');
    if (!Array.isArray(roles) || roles.length === 0 || roles.some((r) => typeof r !== 'string' || !r.length)) return this.#error(400, 'roles_required');
    if (!['active', 'suspended'].includes(status)) return this.#error(400, 'invalid_status');
    if (!this.authorize(actor, tenantId, 'membership.create')) return this.#error(403, 'forbidden');
    const key = `${actor.issuer}|${actor.subject}|${idempotencyKey}`;
    const prior = this.#idempotency.get(key);
    if (prior) return prior;
    const createdAt = this.now().toISOString();
    const membership = { id: randomUUID(), tenant_id: tenantId, member_id: memberId, roles: [...new Set(roles)], status, created_at: createdAt, updated_at: createdAt };
    this.#memberships.set(membership.id, membership);
    const result = { status: 201, body: { ...membership }, headers: { etag: '"1"' } };
    this.#idempotency.set(key, result);
    this.#audit.push({ action: 'membership.create', actor: `${actor.issuer}|${actor.subject}`, tenant_id: tenantId, resource_id: membership.id, at: createdAt });
    return result;
  }

  get({ actor, tenantId, id }) {
    if (!actor?.subject || !actor.issuer) return this.#error(401, 'authentication_required');
    if (!UUID.test(tenantId ?? '')) return this.#error(400, 'invalid_tenant_id');
    if (!this.authorize(actor, tenantId, 'membership.read')) return this.#error(403, 'forbidden');
    const membership = this.#memberships.get(id);
    if (!membership || membership.tenant_id !== tenantId) return this.#error(404, 'membership_not_found');
    return { status: 200, body: { ...membership } };
  }

  list({ actor, tenantId }) {
    if (!actor?.subject || !actor.issuer) return this.#error(401, 'authentication_required');
    if (!UUID.test(tenantId ?? '')) return this.#error(400, 'invalid_tenant_id');
    if (!this.authorize(actor, tenantId, 'membership.read')) return this.#error(403, 'forbidden');
    return { status: 200, body: [...this.#memberships.values()].filter((m) => m.tenant_id === tenantId).map((m) => ({ ...m })) };
  }

  audit() { return this.#audit.map((entry) => ({ ...entry })); }
  #error(status, code) { return { status, body: { code } }; }
}
