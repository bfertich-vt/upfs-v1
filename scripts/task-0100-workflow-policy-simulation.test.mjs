import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { evaluateWorkflowPolicySimulation } from './task-0100-workflow-policy-simulation.mjs';

const contract = JSON.parse(fs.readFileSync('contracts/task-0100-workflow-policy-simulation.json'));
const clone = () => structuredClone(contract);
const digest = value => crypto.createHash('sha256').update(JSON.stringify({
  scope: value.scope,
  source_refs: value.source_refs,
  evidence: value.evidence,
  deployment: value.deployment
})).digest('hex');

test('accepts complete synthetic workflow policy simulation evidence', () => {
  assert.equal(evaluateWorkflowPolicySimulation({ contract }).status, 'passed');
});

for (const [name, mutate] of [
  ['rejects external deployment', value => { value.deployment = 'performed'; }],
  ['rejects scope mutation', value => { value.scope.environment_id = 'production'; }],
  ['rejects non-default-deny policy', value => { value.evidence.policy_decision = 'allow'; }],
  ['rejects incomplete approval quorum', value => { value.evidence.approval_quorum = 'pending'; }],
  ['rejects missing idempotent replay', value => { value.evidence.idempotency = 'duplicate'; }],
  ['rejects missing concurrency check', value => { value.evidence.concurrency = 'unconditional'; }],
  ['rejects mutable audit', value => { value.evidence.audit = 'mutable'; }],
  ['rejects unredacted export', value => { value.evidence.export = 'unredacted'; }],
  ['rejects unverified recovery', value => { value.evidence.recovery = 'unverified'; }],
  ['rejects invalid workflow state', value => { value.evidence.state = 'executed'; }],
  ['rejects invalid replay state', value => { value.evidence.replay = 'pending'; }],
  ['rejects invalid conflict state', value => { value.evidence.conflict = 'accepted'; }],
  ['rejects malformed evidence reference', value => { value.evidence.ref = { id: 'workflow' }; }]
]) {
  test(name, () => {
    const value = clone();
    mutate(value);
    value.digest = digest(value);
    assert.equal(evaluateWorkflowPolicySimulation({ contract: value }).status, 'failed');
  });
}

test('rejects tampered canonical evidence', () => {
  const value = clone();
  value.evidence.approval_quorum = 'pending';
  assert.equal(evaluateWorkflowPolicySimulation({ contract: value }).status, 'failed');
});
