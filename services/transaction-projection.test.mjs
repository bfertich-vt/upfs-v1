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

test('cursor fails closed when the tenant projection changes between pages', () => {
  const p = service();
  p.consume({ actor, eventId: 'a', transaction: tx('a') });
  p.consume({ actor, eventId: 'b', transaction: tx('b') });
  const first = p.search({ actor, tenantId: 'tenant-a', query: 'USD', limit: 1 });
  p.consume({ actor, eventId: 'c', transaction: tx('c') });
  assert.equal(p.search({ actor, tenantId: 'tenant-a', query: 'USD', limit: 1, cursor: first.body.page.next_cursor }).body.code, 'invalid_cursor');
});

test('consume indexing failure is auditable and leaves projection truth unchanged for retry', () => {
  const p = new TransactionProjectionService({ authorize: (_actor, tenant) => tenant === 'tenant-a', now: () => new Date('2026-01-05T00:00:00Z'), indexDocument: () => { throw new Error('injected'); } });
  const failed = p.consume({ actor, eventId: 'failed', transaction: tx('a') });
  assert.deepEqual(failed, { status: 503, body: { code: 'projection_index_unavailable', details: { retryable: true } } });
  assert.equal(p.documents().length, 0);
  assert.equal(p.audit()[0].action, 'projection.consume_failed');
});

test('rebuild stages documents and rolls back when indexing or alias promotion fails', () => {
  let fail = false;
  const p = new TransactionProjectionService({ authorize: (_actor, tenant) => tenant === 'tenant-a', now: () => new Date('2026-01-05T00:00:00Z'), indexDocument: (_document, context) => { if (fail && context.operation === 'rebuild') throw new Error('injected'); } });
  p.consume({ actor, eventId: 'seed', transaction: tx('seed') });
  fail = true;
  const failed = p.rebuild({ actor, tenantId: 'tenant-a', canonicalTransactions: [tx('replacement', 'tenant-a', 2)], watermark: 2 });
  assert.equal(failed.body.code, 'projection_rebuild_failed');
  assert.deepEqual(p.documents().map((document) => document.id), ['seed']);
  assert.equal(p.audit().at(-1).action, 'projection.rebuild_failed');

  const aliasFailure = new TransactionProjectionService({ authorize: (_actor, tenant) => tenant === 'tenant-a', now: () => new Date('2026-01-05T00:00:00Z'), promoteAlias: () => { throw new Error('injected'); } });
  aliasFailure.consume({ actor, eventId: 'seed', transaction: tx('seed') });
  assert.equal(aliasFailure.rebuild({ actor, tenantId: 'tenant-a', canonicalTransactions: [tx('replacement', 'tenant-a', 2)], watermark: 2 }).body.details.alias_promoted, false);
  assert.deepEqual(aliasFailure.documents().map((document) => document.id), ['seed']);
});

test('reconciliation and rebuild reject malformed or cross-tenant canonical inputs without disclosure', () => {
  const p = service();
  p.consume({ actor, eventId: 'seed', transaction: tx('seed') });
  assert.equal(p.reconcile({ actor, tenantId: 'tenant-a', canonicalTransactions: [tx('foreign', 'tenant-b')] }).body.code, 'invalid_reconciliation_input');
  assert.equal(p.rebuild({ actor, tenantId: 'tenant-a', canonicalTransactions: [{ id: 'malformed', tenant_id: 'tenant-a' }], watermark: 1 }).body.code, 'invalid_rebuild_input');
  assert.deepEqual(p.documents().map((document) => document.id), ['seed']);
});

test('malformed actors, throwing authorization, and non-serializable payloads fail closed', () => {
  const p = service();
  assert.equal(p.consume({ actor: { issuer: Symbol('issuer'), subject: 'subject' }, eventId: 'bad-actor', transaction: tx('a') }).body.code, 'authentication_required');
  assert.equal(p.consume({ actor, eventId: 'bad-payload', transaction: { ...tx('a'), unexpected: 1n } }).body.code, 'invalid_projection_event');
  assert.equal(p.documents().length, 0);
  const throwing = new TransactionProjectionService({ authorize: () => { throw new Error('injected'); } });
  assert.equal(throwing.search({ actor, tenantId: 'tenant-a', query: 'USD' }).body.code, 'forbidden');
  assert.equal(throwing.audit().length, 0);
});

test('every public boundary rejects non-primitive tenant scope before authorization or state', () => {
  let authorizationCalls = 0;
  const p = new TransactionProjectionService({ authorize: () => { authorizationCalls += 1; return true; }, requestId: () => 'req-fixed', now: () => new Date('2026-01-05T00:00:00Z') });
  const invalidScopes = [Symbol('tenant'), 1n, {}, [], () => 'tenant-a', ' tenant-a', 'tenant-a\u0000'];
  for (const tenantId of invalidScopes) {
    assert.equal(p.reconcile({ actor, tenantId, canonicalTransactions: [] }).body.code, 'forbidden');
    assert.equal(p.rebuild({ actor, tenantId, canonicalTransactions: [] }).body.code, 'forbidden');
    assert.equal(p.search({ actor, tenantId, query: 'USD' }).body.code, 'forbidden');
  }
  assert.equal(authorizationCalls, 0);
  assert.equal(p.documents().length, 0);
  assert.equal(p.audit().length, 0);
});

test('non-serializable canonical extras fail consistently without adapters or state mutation', () => {
  const circular = { nested: {} }; circular.nested.self = circular;
  const throwing = {}; Object.defineProperty(throwing, 'value', { enumerable: true, get: () => { throw new Error('getter'); } });
  const malformedExtras = [1n, Symbol('value'), () => 'value', circular, throwing];
  let indexCalls = 0; let aliasCalls = 0;
  const p = new TransactionProjectionService({ authorize: (_actor, tenant) => tenant === 'tenant-a', requestId: () => 'req-fixed', now: () => new Date('2026-01-05T00:00:00Z'), indexDocument: () => { indexCalls += 1; }, promoteAlias: () => { aliasCalls += 1; } });
  p.consume({ actor, eventId: 'seed', transaction: tx('seed') });
  const original = p.documents(); const initialAuditCount = p.audit().length;
  for (const [index, extra] of malformedExtras.entries()) {
    const malformed = { ...tx(`bad-${index}`, 'tenant-a', 2), extra };
    assert.equal(p.consume({ actor, eventId: `consume-${index}`, transaction: malformed }).body.code, 'invalid_projection_event');
    assert.equal(p.reconcile({ actor, tenantId: 'tenant-a', canonicalTransactions: [malformed] }).body.code, 'invalid_reconciliation_input');
    assert.equal(p.rebuild({ actor, tenantId: 'tenant-a', canonicalTransactions: [malformed], watermark: 2 }).body.code, 'invalid_rebuild_input');
  }
  assert.deepEqual(p.documents(), original);
  assert.equal(p.audit().length, initialAuditCount);
  assert.equal(indexCalls, 1);
  assert.equal(aliasCalls, 0);
  assert.equal(p.consume({ actor, eventId: 'corrected', transaction: tx('corrected', 'tenant-a', 2) }).body.applied, true);
});

test('throwing top-level accessors and service adapters return bounded envelopes', () => {
  const getterInput = {}; Object.defineProperty(getterInput, 'actor', { enumerable: true, get: () => { throw new Error('getter'); } });
  const p = service();
  assert.equal(p.consume(getterInput).body.code, 'invalid_projection_event');
  assert.equal(p.reconcile(getterInput).body.code, 'invalid_reconciliation_input');
  assert.equal(p.rebuild(getterInput).body.code, 'invalid_rebuild_input');
  assert.equal(p.search(getterInput).body.code, 'invalid_query');
  assert.equal(p.documents().length, 0); assert.equal(p.audit().length, 0);

  const clockFailure = new TransactionProjectionService({ authorize: () => true, now: () => { throw new Error('clock'); }, requestId: () => 'req-fixed' });
  assert.equal(clockFailure.consume({ actor, eventId: 'clock', transaction: tx('clock') }).body.code, 'projection_clock_unavailable');
  assert.equal(clockFailure.reconcile({ actor, tenantId: 'tenant-a', canonicalTransactions: [] }).body.code, 'projection_clock_unavailable');
  assert.equal(clockFailure.rebuild({ actor, tenantId: 'tenant-a', canonicalTransactions: [] }).body.code, 'projection_clock_unavailable');
  assert.equal(clockFailure.documents().length, 0); assert.equal(clockFailure.audit().length, 0);

  const requestFailure = new TransactionProjectionService({ authorize: () => true, requestId: () => { throw new Error('request'); } });
  assert.equal(requestFailure.search({ actor, tenantId: 'tenant-a', query: 'USD' }).body.code, 'projection_search_unavailable');
  assert.equal(requestFailure.audit().length, 0);
});

test('canonical arrays with accessors and coercible version objects fail without mutation', () => {
  const p = service();
  const accessorList = []; Object.defineProperty(accessorList, 0, { enumerable: true, get: () => { throw new Error('getter'); } }); accessorList.length = 1;
  assert.equal(p.reconcile({ actor, tenantId: 'tenant-a', canonicalTransactions: accessorList }).body.code, 'invalid_reconciliation_input');
  assert.equal(p.rebuild({ actor, tenantId: 'tenant-a', canonicalTransactions: accessorList }).body.code, 'invalid_rebuild_input');
  const coercible = { ...tx('bad'), version: {} };
  assert.equal(p.consume({ actor, eventId: 'bad-version', transaction: coercible }).body.code, 'invalid_projection_event');
  assert.equal(p.rebuild({ actor, tenantId: 'tenant-a', canonicalTransactions: [coercible], watermark: 1 }).body.code, 'invalid_rebuild_input');
  assert.equal(p.documents().length, 0); assert.equal(p.audit().length, 0);
});

test('actor boundary rejects accessors, proxies, custom shapes, and coercion hazards before adapters', () => {
  const getterIssuer = { subject: 'user-1' }; Object.defineProperty(getterIssuer, 'issuer', { enumerable: true, get: () => { throw new Error('issuer getter'); } });
  const getterSubject = { issuer: 'https://issuer.test' }; Object.defineProperty(getterSubject, 'subject', { enumerable: true, get: () => { throw new Error('subject getter'); } });
  const symbolKey = { ...actor, [Symbol('extra')]: 'hidden' };
  const nonEnumerable = { ...actor }; Object.defineProperty(nonEnumerable, 'extra', { value: 'hidden', enumerable: false });
  const nullClaim = { issuer: 'https://issuer.test', subject: null };
  const claimHazards = [
    { issuer: Symbol('issuer'), subject: 'user-1' },
    { issuer: 1n, subject: 'user-1' },
    { issuer: { toString: () => 'https://issuer.test' }, subject: 'user-1' },
    { issuer: 'https://issuer.test', subject: Symbol('subject') },
    { issuer: 'https://issuer.test', subject: 1n },
    { issuer: 'https://issuer.test', subject: {} },
  ];
  const customPrototype = Object.assign(Object.create({ inherited: true }), actor);
  const transparentProxy = new Proxy({ ...actor }, {});
  const throwingProxy = new Proxy({ ...actor }, { getPrototypeOf: () => { throw new Error('proxy'); } });
  const malformedActors = [getterIssuer, getterSubject, symbolKey, nonEnumerable, { ...actor, extra: true }, nullClaim, customPrototype, transparentProxy, throwingProxy, ...claimHazards];

  const operations = [
    (p, malformedActor) => p.consume({ actor: malformedActor, eventId: 'event', transaction: tx('txn') }),
    (p, malformedActor) => p.reconcile({ actor: malformedActor, tenantId: 'tenant-a', canonicalTransactions: [] }),
    (p, malformedActor) => p.rebuild({ actor: malformedActor, tenantId: 'tenant-a', canonicalTransactions: [] }),
    (p, malformedActor) => p.search({ actor: malformedActor, tenantId: 'tenant-a', query: 'USD' }),
  ];
  for (const operation of operations) {
    for (const malformedActor of malformedActors) {
      let authorizationCalls = 0; let indexCalls = 0; let aliasCalls = 0;
      const p = new TransactionProjectionService({ authorize: () => { authorizationCalls += 1; return true; }, indexDocument: () => { indexCalls += 1; }, promoteAlias: () => { aliasCalls += 1; }, requestId: () => 'req-fixed', now: () => new Date('2026-01-05T00:00:00Z') });
      assert.deepEqual(operation(p, malformedActor), { status: 401, body: { code: 'authentication_required' } });
      assert.equal(authorizationCalls, 0); assert.equal(indexCalls, 0); assert.equal(aliasCalls, 0);
      assert.equal(p.documents().length, 0); assert.equal(p.audit().length, 0);
    }
  }
});

test('accessor-free null-prototype actor remains valid and permits corrected retry', () => {
  let authorizationCalls = 0;
  const p = new TransactionProjectionService({ authorize: (verified, tenant) => { authorizationCalls += 1; assert.deepEqual(verified, actor); return tenant === 'tenant-a'; }, requestId: () => 'req-fixed', now: () => new Date('2026-01-05T00:00:00Z') });
  const malformed = { subject: 'user-1' }; Object.defineProperty(malformed, 'issuer', { enumerable: true, get: () => { throw new Error('issuer getter'); } });
  assert.equal(p.consume({ actor: malformed, eventId: 'same', transaction: tx('txn') }).body.code, 'authentication_required');
  const corrected = Object.assign(Object.create(null), actor);
  assert.equal(p.consume({ actor: corrected, eventId: 'same', transaction: tx('txn') }).body.applied, true);
  assert.equal(authorizationCalls, 1); assert.equal(p.documents().length, 1); assert.equal(p.audit().length, 1);
});
