import assert from 'node:assert/strict';
import test from 'node:test';
import { TenantDomainService } from './tenant-domain-service.mjs';

const actor = { issuer: 'https://issuer.example', subject: 'user-1' };

test('denies unauthenticated and unauthorized domain reads', () => {
  const service = new TenantDomainService({ authorize: () => false });
  service.seed({ id: 'resource-1', tenantId: 'tenant-a' });
  assert.equal(service.get({ tenantId: 'tenant-a', id: 'resource-1' }).status, 401);
  assert.equal(service.get({ actor, tenantId: 'tenant-a', id: 'resource-1' }).status, 403);
});

test('denies cross-tenant identifiers without disclosing existence', () => {
  const service = new TenantDomainService({ authorize: (_actor, tenantId) => tenantId === 'tenant-a' });
  service.seed({ id: 'resource-b', tenantId: 'tenant-b', attributes: { name: 'synthetic' } });
  const result = service.get({ actor, tenantId: 'tenant-a', id: 'resource-b' });
  assert.deepEqual(result, { status: 404, body: { code: 'resource_not_found' } });
});

test('returns resources only within the authorized tenant', () => {
  const service = new TenantDomainService({ authorize: () => true });
  service.seed({ id: 'resource-a', tenantId: 'tenant-a' });
  assert.equal(service.get({ actor, tenantId: 'tenant-a', id: 'resource-a' }).status, 200);
});

test('creates and lists tenant-scoped memberships with idempotent audit', () => {
  const service = new TenantDomainService({ authorize: () => true });
  const actor = { issuer: 'https://issuer.example', subject: 'admin' };
  const first = service.createMembership({ actor, tenantId: 'tenant-a', subject: 'user-a', role: 'viewer', idempotencyKey: 'membership-key-001' });
  const replay = service.createMembership({ actor, tenantId: 'tenant-a', subject: 'user-a', role: 'viewer', idempotencyKey: 'membership-key-001' });
  assert.deepEqual(replay, first);
  assert.equal(service.listMemberships({ actor, tenantId: 'tenant-a' }).body.length, 1);
  assert.equal(service.audit().length, 1);
});

test('denies cross-tenant membership listing', () => {
  const service = new TenantDomainService({ authorize: (_actor, tenantId) => tenantId === 'tenant-a' });
  const actor = { issuer: 'https://issuer.example', subject: 'admin' };
  assert.equal(service.listMemberships({ actor, tenantId: 'tenant-b' }).status, 403);
});
