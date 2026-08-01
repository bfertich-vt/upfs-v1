import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { evaluateControlLibraryRefresh } from './task-0101-control-library-refresh.mjs';

const contract = JSON.parse(fs.readFileSync('contracts/task-0101-control-library-refresh.json'));
const clone = () => structuredClone(contract);
const digest = value => crypto.createHash('sha256').update(JSON.stringify({
  scope: value.scope,
  source_refs: value.source_refs,
  evidence: value.evidence,
  deployment: value.deployment
})).digest('hex');

test('accepts complete synthetic control library refresh evidence', () => {
  assert.equal(evaluateControlLibraryRefresh({ contract }).status, 'passed');
});

for (const [name, mutate] of [
  ['rejects external deployment', value => { value.deployment = 'performed'; }],
  ['rejects scope mutation', value => { value.scope.tenant_id = 'other-tenant'; }],
  ['rejects unsynchronized owners', value => { value.evidence.owners = 'stale'; }],
  ['rejects unsynchronized frequency', value => { value.evidence.frequency = 'stale'; }],
  ['rejects unsynchronized systems', value => { value.evidence.systems = 'stale'; }],
  ['rejects unsynchronized procedure', value => { value.evidence.procedures = 'stale'; }],
  ['rejects unsynchronized evidence source', value => { value.evidence.evidence_sources = 'stale'; }],
  ['rejects unsynchronized reviewer', value => { value.evidence.reviewers = 'stale'; }],
  ['rejects unsynchronized exceptions', value => { value.evidence.exceptions = 'stale'; }],
  ['rejects unsynchronized remediation', value => { value.evidence.remediation = 'stale'; }],
  ['rejects unsynchronized retention', value => { value.evidence.retention = 'stale'; }],
  ['rejects certification claim', value => { value.evidence.review_status = 'soc2-certified'; }],
  ['rejects invalid workflow state', value => { value.evidence.state = 'executed'; }],
  ['rejects invalid replay result', value => { value.evidence.replay = 'pending'; }],
  ['rejects invalid conflict result', value => { value.evidence.conflict = 'accepted'; }],
  ['rejects malformed evidence reference', value => { value.evidence.ref = {}; }]
]) {
  test(name, () => {
    const value = clone();
    mutate(value);
    value.digest = digest(value);
    assert.equal(evaluateControlLibraryRefresh({ contract: value }).status, 'failed');
  });
}

test('rejects tampered canonical evidence', () => {
  const value = clone();
  value.evidence.retention = 'stale';
  assert.equal(evaluateControlLibraryRefresh({ contract: value }).status, 'failed');
});
