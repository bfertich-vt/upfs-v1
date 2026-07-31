import test from 'node:test';
import assert from 'node:assert/strict';
import { TransactionProjectionService, projectTransaction } from './transaction-projection.mjs';

const actor = { issuer: 'https://issuer.test', subject: 'user-1' };
const tx = (id, tenant_id = 'tenant-a', version = 1) => ({ id, tenant_id, account_id: `acct-${tenant_id}`, amount: '12.3400', currency: 'USD', posted_at: `2026-01-0${version}T00:00:00Z`, schema_version: '1.0.0', evidence_refs: [`ev-${id}`], version });
const service = () => new TransactionProjectionService({ authorize: (_actor, tenant) => tenant === 'tenant-a', requestId: () => 'req-fixed', now: () => new Date('2026-01-05T00:00:00Z') });

test('consumes idempotently and ignores out-of-order source versions', () => {
  const p = service();
  assert.equal(p.consume({ actor, eventId: 'event-2', transaction: tx('txn-1', 'tenant-a', 2), sourceVersion: 2 }).body.applied, true);
  assert.equal(p.consume({ actor, eventId: 'event-1', transaction: tx('txn-1', 'tenant-a', 1), sourceVersion: 1 }).body.reason, 'out_of_order');
  assert.equal(p.consume({ actor, eventId: 'event-2', transaction: tx('txn-1', 'tenant-a', 2), sourceVersion: 2 }).body.applied, true);
  assert.equal(p.documents()[0].source_version, 2);
});

test('same event id with changed payload is rejected', () => {
  const p = service();
  p.consume({ actor, eventId: 'event-1', transaction: tx('txn-1') });
  assert.equal(p.consume({ actor, eventId: 'event-1', transaction: { ...tx('txn-1'), amount: '99.00' } }).body.code, 'projection_event_conflict');
});

test('consume enforces tenant authorization and same-version conflicts', () => {
  const p = service();
  assert.equal(p.consume({ actor, eventId: 'cross', transaction: tx('x', 'tenant-b') }).body.code, 'forbidden');
  p.consume({ actor, eventId: 'v1', transaction: tx('x') });
  assert.equal(p.consume({ actor, eventId: 'v2', transaction: { ...tx('x'), amount: '99.00' } }).body.code, 'projection_version_conflict');
});

test('search is tenant scoped, cursor stable, bounded, and redacts projection internals', () => {
  const p = service();
  p.consume({ actor, eventId: 'a', transaction: { ...tx('txn-1'), description: 'Coffee shop' } });
  p.consume({ actor, eventId: 'b', transaction: { ...tx('txn-2'), description: 'Coffee market' } });
  assert.equal(p.search({ actor, tenantId: 'tenant-b', query: 'Coffee' }).status, 403);
  const first = p.search({ actor, tenantId: 'tenant-a', query: 'coffee', limit: 1 });
  assert.equal(first.status, 200); assert.equal(first.body.data.length, 1); assert.equal(first.body.data[0].source_hash, undefined); assert.equal(first.body.page.next_cursor !== null, true);
  const second = p.search({ actor, tenantId: 'tenant-a', query: 'coffee', limit: 1, cursor: first.body.page.next_cursor });
  assert.equal(second.body.data.length, 1); assert.notEqual(first.body.data[0].id, second.body.data[0].id);
  assert.equal(p.search({ actor, tenantId: 'tenant-a', query: 'coffee', limit: 101 }).body.code, 'invalid_limit');
  assert.equal(p.search({ actor, tenantId: 'tenant-a', query: 'coffee', limit: 1, cursor: 'bad' }).body.code, 'invalid_cursor');
  assert.equal(p.search({ actor, tenantId: 'tenant-a', query: '   ' }).body.code, 'invalid_query');
});

test('reconciliation detects drift and rebuild restores deterministic parity', () => {
  const p = service(); const records = [tx('txn-1'), tx('txn-2')];
  p.consume({ actor, eventId: 'a', transaction: records[0] });
  assert.equal(p.reconcile({ actor, tenantId: 'tenant-a', canonicalTransactions: records }).body.drift, true);
  const rebuilt = p.rebuild({ actor, tenantId: 'tenant-a', canonicalTransactions: records, watermark: 2 });
  assert.equal(rebuilt.body.count, 2);
  assert.equal(p.reconcile({ actor, tenantId: 'tenant-a', canonicalTransactions: records, watermark: 2 }).body.drift, false);
  assert.deepEqual(projectTransaction(records[0]), p.documents().find((d) => d.id === 'txn-1' && d.tenant_id === 'tenant-a') && (({ source_hash, projected_at, ...d }) => d)(p.documents().find((d) => d.id === 'txn-1' && d.tenant_id === 'tenant-a')));
});

test('authentication and authorization are deny by default', () => {
  const p = service();
  assert.equal(p.consume({ actor: null, eventId: 'a', transaction: tx('x') }).status, 401);
  assert.equal(p.rebuild({ actor, tenantId: 'tenant-b', canonicalTransactions: [] }).status, 403);
  assert.equal(p.search({ actor, tenantId: 'tenant-a', query: '' }).status, 400);
});

test('cursor tampering and invalid watermarks are rejected; rebuild clears stale event idempotency', () => {
  const p = service(); const records = [tx('a'), tx('b')];
  p.consume({ actor, eventId: 'old', transaction: records[0] }); p.consume({ actor, eventId: 'old-b', transaction: records[1] });
  const first = p.search({ actor, tenantId: 'tenant-a', query: 'USD', limit: 1 });
  const raw = JSON.parse(Buffer.from(first.body.page.next_cursor, 'base64url').toString()); raw.offset += 1;
  assert.equal(p.search({ actor, tenantId: 'tenant-a', query: 'USD', limit: 1, cursor: Buffer.from(JSON.stringify(raw)).toString('base64url') }).body.code, 'invalid_cursor');
  assert.equal(p.reconcile({ actor, tenantId: 'tenant-a', canonicalTransactions: records, watermark: 3 }).body.code, 'watermark_unavailable');
  p.rebuild({ actor, tenantId: 'tenant-a', canonicalTransactions: records, watermark: 2 });
  assert.equal(p.rebuild({ actor, tenantId: 'tenant-a', canonicalTransactions: records, watermark: 1 }).body.code, 'invalid_rebuild_watermark');
  assert.equal(p.consume({ actor, eventId: 'old', transaction: tx('a', 'tenant-a', 2), sourceVersion: 2 }).body.applied, true);
});
