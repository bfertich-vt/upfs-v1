import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalTransaction, generateRegistry } from './registry-generator.mjs';

test('generates deterministic registry with provenance', () => {
  const registry = generateRegistry({ version: '1.0.0', entities: [{ name: 'transaction', schema: { type: 'object' }, provenance: { source: 'spec', ref: 'r1' } }] });
  assert.equal(registry.entities[0].provenance.source, 'spec');
  assert.equal(registry.digest.length, 64);
});
test('rejects incomplete registry and transaction provenance', () => {
  assert.throws(() => generateRegistry({ version: '1.0.0', entities: [] }), /invalid_registry/);
  assert.throws(() => canonicalTransaction({ transaction_id: 't1', tenant_id: 't1' }), /invalid_transaction/);
  assert.throws(() => canonicalTransaction({ transaction_id: 't1', tenant_id: 't1', amount: '1', currency: 'USD', occurred_at: '2026-01-01T00:00:00Z' }), /provenance_required/);
});
