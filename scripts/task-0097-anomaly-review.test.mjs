import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { evaluateAnomalyReview } from './task-0097-anomaly-review.mjs';

const contract = JSON.parse(fs.readFileSync('contracts/task-0097-anomaly-review.json'));
const clone = () => structuredClone(contract);
const digest = value => crypto.createHash('sha256').update(JSON.stringify({
  scope: value.scope,
  source_refs: value.source_refs,
  evidence: value.evidence,
  deployment: value.deployment
})).digest('hex');

test('accepts complete synthetic anomaly review evidence', () => {
  assert.equal(evaluateAnomalyReview({ contract }).status, 'passed');
});

for (const [name, mutate] of [
  ['rejects external deployment', value => { value.deployment = 'performed'; }],
  ['rejects missing quarantine', value => { value.evidence.quarantine = false; }],
  ['rejects missing reconciliation', value => { value.evidence.reconciliation = false; }],
  ['rejects unassigned owner', value => { value.evidence.owner = ' '; }],
  ['rejects malformed owner', value => { value.evidence.owner = { id: 'quality-owner' }; }],
  ['rejects missing remediation', value => { value.evidence.remediation = false; }],
  ['rejects missing corrective-forward evidence', value => { value.evidence.corrective_forward = false; }],
  ['rejects invalid durable workflow state', value => { value.evidence.state = 'approved'; }],
  ['rejects invalid replay result', value => { value.evidence.replay = 'pending'; }],
  ['rejects invalid conflict result', value => { value.evidence.conflict = 'accepted'; }],
  ['rejects a scope mutation even with a matching digest', value => { value.scope.tenant_id = 'other-tenant'; }]
]) {
  test(name, () => {
    const value = clone();
    mutate(value);
    value.digest = digest(value);
    assert.equal(evaluateAnomalyReview({ contract: value }).status, 'failed');
  });
}

test('rejects tampered canonical evidence', () => {
  const value = clone();
  value.evidence.owner = 'other-owner';
  assert.equal(evaluateAnomalyReview({ contract: value }).status, 'failed');
});
