import assert from 'node:assert/strict';
import test from 'node:test';
import { TenantDomainService } from './tenant-domain-service.mjs';
import { verifyBearerToken } from './token-boundary.mjs';

const actor = { issuer: 'https://issuer.example', subject: 'admin' };

test('integration denies missing bearer token before tenant lookup', async () => {
  const auth = await verifyBearerToken(undefined, { verify: async () => actor });
  assert.equal(auth.status, 401);
});

test('integration denies unauthorized tenant membership access', () => {
  const service = new TenantDomainService({ authorize: (_actor, tenantId) => tenantId === 'tenant-a' });
  assert.equal(service.listMemberships({ actor, tenantId: 'tenant-b' }).status, 403);
});

test('integration does not disclose cross-tenant resource existence', () => {
  const service = new TenantDomainService({ authorize: () => true });
  service.seed({ id: 'resource-1', tenantId: 'tenant-a' });
  assert.equal(service.get({ actor, tenantId: 'tenant-b', id: 'resource-1' }).status, 404);
});
