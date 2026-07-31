import assert from 'node:assert/strict';
import test from 'node:test';
import { MembershipService } from './membership-service.mjs';
import { TenantDomainService } from './tenant-domain-service.mjs';
import { verifyBearerToken } from './token-boundary.mjs';

const tenantA = '00000000-0000-4000-8000-000000000001';
const tenantB = '00000000-0000-4000-8000-000000000002';
const authorization = { verify: async (token) => ({ issuer: 'https://issuer.example', subject: token }) };

async function actorFrom(header = 'Bearer admin-1') {
  const result = await verifyBearerToken(header, authorization);
  return result.status === 200 ? result.actor : undefined;
}

test('unauthenticated requests are denied at token boundary and services', async () => {
  const token = await verifyBearerToken(undefined, authorization);
  assert.deepEqual(token, { status: 401, body: { code: 'authentication_required' } });

  const tenant = new TenantDomainService({ authorize: () => true });
  const membership = new MembershipService({ authorize: () => true });
  assert.equal(tenant.get({ actor: token.actor, tenantId: 'tenant-a', id: 'resource-1' }).status, 401);
  assert.equal(membership.list({ actor: token.actor, tenantId: tenantA }).status, 401);
});

test('authenticated but unauthorized requests stay forbidden across both services', async () => {
  const actor = await actorFrom();
  const tenant = new TenantDomainService({ authorize: () => false });
  const membership = new MembershipService({ authorize: () => false });
  tenant.seed({ id: 'resource-a', tenantId: tenantA, attributes: { secret: 'do-not-leak' } });

  assert.equal(tenant.get({ actor, tenantId: tenantA, id: 'resource-a' }).status, 403);
  assert.equal(membership.list({ actor, tenantId: tenantA }).status, 403);
});

test('cross-tenant identifiers return non-disclosing not-found envelopes', async () => {
  const actor = await actorFrom();
  const tenant = new TenantDomainService({ authorize: () => true });
  const membership = new MembershipService({ authorize: () => true, now: () => new Date('2026-01-01T00:00:00Z') });
  tenant.seed({ id: 'resource-a', tenantId: tenantA, attributes: { secret: 'do-not-leak' } });
  const created = membership.create({ actor, tenantId: tenantA, memberId: 'user-7', roles: ['viewer'], idempotencyKey: 'integration-key-001' });
  assert.equal(created.status, 201);

  assert.deepEqual(tenant.get({ actor, tenantId: tenantB, id: 'resource-a' }), { status: 404, body: { code: 'resource_not_found' } });
  assert.deepEqual(membership.get({ actor, tenantId: tenantB, id: created.body.id }), { status: 404, body: { code: 'membership_not_found' } });
});
