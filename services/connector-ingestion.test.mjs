import test from 'node:test';
import assert from 'node:assert/strict';
import { ConnectorIngestionService, signProviderPayload, normalizeProviderTransaction } from './connector-ingestion.mjs';
import { RawEvidenceIntakeService } from './evidence-intake.mjs';
import { CanonicalTransactionService } from './transaction-registry.mjs';

const actor = { issuer: 'https://issuer.example.invalid', subject: 'synthetic-user' };
const payload = { provider_transaction_id: 'provider-tx-1', account_id: 'account-1', amount: '-12.3400', currency: 'USD', posted_at: '2026-07-31T12:00:00Z', description: 'synthetic purchase' };
const now = new Date('2026-07-31T12:01:00Z');
const make = (classify = async () => ({ content: 'clear', malware: 'clear', prompt_injection: 'clear' })) => {
  const evidence = new RawEvidenceIntakeService({ authorize: (_a, t, e) => t === 'tenant-a' && e === 'env-test', classify, now: () => now });
  const canonical = new CanonicalTransactionService({ authorize: (_a, t) => t === 'tenant-a', now: () => now });
  const service = new ConnectorIngestionService({ evidence, canonical, now: () => now, connectors: [{ id: 'conn-1', provider: 'synthetic', tenantId: 'tenant-a', environmentId: 'env-test', secret: 'synthetic-secret', authorize: (a, t, e) => a?.subject === actor.subject && t === 'tenant-a' && e === 'env-test' }] });
  return { service, evidence, canonical };
};
const args = (_service, extra = {}) => { const timestamp = extra.timestamp ?? Math.floor(now.getTime() / 1000); const nonce = extra.nonce ?? 'nonce-0123456789'; const body = extra.payload ?? payload; return { actor, connectorId: 'conn-1', timestamp, nonce, payload: body, signature: signProviderPayload({ secret: 'synthetic-secret', timestamp, nonce, payload: body }), idempotencyKey: extra.idempotencyKey ?? 'idempotency-012345', ...extra }; };

test('maps signed provider payload through quarantined evidence into canonical transaction', async () => { const { service, evidence, canonical } = make(); const result = await service.ingest(args(service)); assert.equal(result.status, 201); assert.match(result.body.id, /^txn-/); assert.deepEqual(result.body.evidence_refs.length, 1); assert.equal(evidence.get({ actor, tenantId: 'tenant-a', environmentId: 'env-test', id: result.body.evidence_id }).body.status, 'quarantined'); assert.equal(canonical.audit()[0].action, 'transaction.upsert'); assert.equal(service.audit()[0].action, 'connector.ingest.canonicalized'); });
test('rejects forged signatures, stale timestamps, replay, and idempotency conflicts', async () => { const { service } = make(); assert.equal((await service.ingest(args(service, { signature: '0'.repeat(64) }))).status, 401); assert.equal((await service.ingest(args(service, { timestamp: 1, nonce: 'nonce-stale-012345' }))).body.code, 'signature_timestamp_out_of_window'); const first = await service.ingest(args(service)); assert.equal((await service.ingest(args(service))).body.code, 'replay_detected'); const conflict = await service.ingest(args(service, { nonce: 'nonce-unique-012345', payload: { ...payload, amount: '1.00' } })); assert.equal(conflict.body.code, 'idempotency_conflict'); assert.equal(first.status, 201); });
test('enforces authenticated actor and connector-derived tenant/environment scope', async () => { const { service } = make(); assert.equal((await service.ingest(args(service, { actor: undefined, nonce: 'nonce-auth-012345' }))).status, 401); assert.equal((await service.ingest({ ...args(service, { nonce: 'nonce-forbid-012345' }), actor: { issuer: actor.issuer, subject: 'other' } })).status, 403); });
test('quarantines scanner failures or suspicious evidence without canonical write', async () => { const { service, canonical } = make(async () => ({ content: 'clear', malware: 'blocked', prompt_injection: 'clear' })); const result = await service.ingest(args(service)); assert.equal(result.status, 422); assert.equal(result.body.code, 'evidence_quarantined'); assert.deepEqual(canonical.audit(), []); });
test('rejects malformed provider payload before evidence intake', async () => { assert.equal(normalizeProviderTransaction({ ...payload, posted_at: '2026-99-99T00:00:00Z' }).error, 'invalid_provider_field'); const { service, evidence } = make(); const result = await service.ingest(args(service, { nonce: 'nonce-invalid-012345', payload: { ...payload, amount: 'not-money' } })); assert.equal(result.status, 400); assert.deepEqual(evidence.audit(), []); });
test('applies provider schema bounds and preserves strict category handling', () => {
  assert.equal(normalizeProviderTransaction({ ...payload, provider_transaction_id: 'x'.repeat(301) }).error, 'invalid_provider_field');
  assert.equal(normalizeProviderTransaction({ ...payload, account_id: 'x'.repeat(301) }).error, 'invalid_provider_field');
  assert.equal(normalizeProviderTransaction({ ...payload, category: 'x'.repeat(301) }).error, 'invalid_provider_field');
  assert.equal(normalizeProviderTransaction({ ...payload, category: 42 }).error, 'invalid_provider_field');
  assert.equal(normalizeProviderTransaction({ ...payload, posted_at: '2024-02-29T00:00:00Z' }).value.posted_at, '2024-02-29T00:00:00Z');
  assert.equal(normalizeProviderTransaction({ ...payload, posted_at: '2026-02-30T00:00:00Z' }).error, 'invalid_provider_field');
});
