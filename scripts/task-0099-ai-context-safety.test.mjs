import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { evaluateAiContextSafety } from './task-0099-ai-context-safety.mjs';

const contract = JSON.parse(fs.readFileSync('contracts/task-0099-ai-context-safety.json'));
const clone = () => structuredClone(contract);
const digest = value => crypto.createHash('sha256').update(JSON.stringify({
  scope: value.scope,
  source_refs: value.source_refs,
  evidence: value.evidence,
  deployment: value.deployment
})).digest('hex');

test('accepts complete synthetic AI context safety evidence', () => {
  assert.equal(evaluateAiContextSafety({ contract }).status, 'passed');
});

for (const [name, mutate] of [
  ['rejects external deployment', value => { value.deployment = 'performed'; }],
  ['rejects scope mutation', value => { value.scope.tenant_id = 'other-tenant'; }],
  ['rejects missing citations', value => { value.evidence.citations = 'missing'; }],
  ['rejects unverified authorization', value => { value.evidence.authorization = 'unverified'; }],
  ['rejects missing redaction', value => { value.evidence.redaction = 'missing'; }],
  ['rejects unbounded prompt', value => { value.evidence.prompt_bounds = 'unbounded'; }],
  ['rejects model failure that can pass', value => { value.evidence.model_failure = 'fallback-answer'; }],
  ['rejects a write-capable context', value => { value.evidence.write_boundary = 'write-enabled'; }],
  ['rejects truth claim', value => { value.evidence.truth_boundary = 'truth-claim'; }],
  ['rejects invalid workflow state', value => { value.evidence.state = 'executed'; }],
  ['rejects invalid replay result', value => { value.evidence.replay = 'pending'; }],
  ['rejects invalid conflict result', value => { value.evidence.conflict = 'accepted'; }],
  ['rejects malformed evidence reference', value => { value.evidence.ref = { ref: 'evidence://ai' }; }]
]) {
  test(name, () => {
    const value = clone();
    mutate(value);
    value.digest = digest(value);
    assert.equal(evaluateAiContextSafety({ contract: value }).status, 'failed');
  });
}

test('rejects a tampered canonical payload', () => {
  const value = clone();
  value.evidence.redaction = 'missing';
  assert.equal(evaluateAiContextSafety({ contract: value }).status, 'failed');
});
