import assert from 'node:assert/strict';
import test from 'node:test';
import { MembershipService } from './membership-service.mjs';

const actor = { issuer: 'https://issuer.example', subject: 'admin-1' };
const tenantA = '00000000-0000-4000-8000-000000000001';
const tenantB = '00000000-0000-4000-8000-000000000002';

test('creates and reads tenant membership with idempotent audit', () => {
  const service = new MembershipService({ authorize: (_a, tenant) => tenant === tenantA, now: () => new Date('2026-01-01T00:00:00Z') });
  const first = service.create({ actor, tenantId: tenantA, memberId: 'user-7', roles: ['viewer'], idempotencyKey: 'membership-key-001' });
  assert.equal(first.status, 201);
  assert.equal(service.get({ actor, tenantId: tenantA, id: first.body.id }).status, 200);
  assert.deepEqual(service.create({ actor, tenantId: tenantA, memberId: 'user-7', roles: ['viewer'], idempotencyKey: 'membership-key-001' }), first);
  assert.equal(service.audit().length, 1);
});

test('denies cross-tenant reads without disclosing membership', () => {
  const service = new MembershipService({ authorize: (_a, tenant) => tenant === tenantA });
  const created = service.create({ actor, tenantId: tenantA, memberId: 'user-7', roles: ['viewer'], idempotencyKey: 'membership-key-002' });
  assert.equal(service.get({ actor, tenantId: tenantB, id: created.body.id }).status, 403);
  const open = new MembershipService({ authorize: () => true });
  const c = open.create({ actor, tenantId: tenantA, memberId: 'user-7', roles: ['viewer'], idempotencyKey: 'membership-key-003' });
  assert.equal(open.get({ actor, tenantId: tenantB, id: c.body.id }).body.code, 'membership_not_found');
});
