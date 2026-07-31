import assert from 'node:assert/strict';
import test from 'node:test';
import { CanonicalTransactionService, validateTransaction } from './transaction-registry.mjs';

const tx = { id: 't1', tenant_id: 'tenant-a', account_id: 'a1', amount: '12.34', currency: 'USD', posted_at: '2026-01-01T00:00:00Z', schema_version: '1.0.0', evidence_refs: ['ev1'] };
const actor = { issuer: 'issuer', subject: 'user' };
test('rejects malformed canonical transaction', () => assert.equal(validateTransaction({ ...tx, amount: '12.3.4' }), 'invalid_transaction'));
test('enforces strict scalar types and amount precision', () => {
  assert.equal(validateTransaction({ ...tx, amount: '1.23456' }), 'invalid_transaction');
  assert.equal(validateTransaction({ ...tx, amount: 1 }), 'invalid_transaction');
  assert.equal(validateTransaction({ ...tx, currency: new String('USD') }), 'invalid_transaction');
});
test('enforces strict RFC3339 date-time and evidence references', () => {
  assert.equal(validateTransaction({ ...tx, posted_at: '2026-01-01' }), 'invalid_transaction');
  assert.equal(validateTransaction({ ...tx, evidence_refs: ['ev1', 'ev1'] }), 'invalid_transaction');
  assert.equal(validateTransaction({ ...tx, evidence_refs: [''] }), 'invalid_transaction');
  assert.equal(validateTransaction({ ...tx, evidence_refs: [1] }), 'invalid_transaction');
});
test('enforces tenant authorization and scope', () => { const s = new CanonicalTransactionService({ authorize: (_, t) => t === 'tenant-a' }); assert.equal(s.upsert({ actor, tenantId: 'tenant-b', transaction: { ...tx, tenant_id: 'tenant-b' }, idempotencyKey: '1234567890123456' }).status, 403); });
test('supports idempotent writes and optimistic concurrency', () => { const s = new CanonicalTransactionService({ authorize: () => true }); const args = { actor, tenantId: 'tenant-a', transaction: tx, idempotencyKey: '1234567890123456' }; const first = s.upsert(args); assert.equal(s.upsert(args).body.version, 1); assert.equal(s.upsert({ ...args, idempotencyKey: '2234567890123456', transaction: { ...tx, amount: '9.00' }, ifMatch: '"0"' }).status, 412); assert.equal(first.body.provenance[0].kind, 'canonicalized'); });
