import assert from 'node:assert/strict';
import test from 'node:test';
import { IdentityFoundationService } from './identity-foundation.mjs';

const actor = { issuer: 'https://issuer.example', subject: 'user-1' };
const key = 'idempotency-key-001';
const tenantId = '00000000-0000-4000-8000-000000000001';
const allowed = new IdentityFoundationService({ authorize: () => true, now: () => new Date('2026-01-01T00:00:00Z') });

test('creates tenant-scoped resource and records audit', () => {
  const result = allowed.create({ actor, kind: 'environment', tenantId, idempotencyKey: key });
  assert.equal(result.status, 201);
  assert.equal(result.body.tenant_id, tenantId);
  assert.equal(result.headers.etag, '"1"');
  assert.equal(allowed.audit().length, 1);
});

test('replays idempotent request without creating a second resource', () => {
  const first = allowed.create({ actor, kind: 'tenant', idempotencyKey: 'replay-key-001' });
  const second = allowed.create({ actor, kind: 'tenant', idempotencyKey: 'replay-key-001' });
  assert.deepEqual(second, first);
  // Replays return the original result and do not append a second audit event.
  assert.equal(allowed.audit().length, 1);
});

test('denies unauthorized and stale writes', () => {
  const denied = new IdentityFoundationService({ authorize: () => false });
  assert.equal(denied.create({ actor, kind: 'organization', idempotencyKey: key }).status, 403);
  assert.equal(allowed.create({ actor, kind: 'environment', tenantId, idempotencyKey: 'stale-key-001600', ifMatch: '"9"' }).status, 412);
});

test('supports identity resources and rejects non-UUID tenant identifiers', () => {
  const identity = allowed.create({ actor, kind: 'identity', idempotencyKey: 'identity-key-001' });
  assert.equal(identity.status, 201);
  assert.equal(allowed.create({ actor, kind: 'membership', tenantId: 'tenant-1', idempotencyKey: 'bad-tenant-key-001' }).body.code, 'invalid_tenant_id');
});
