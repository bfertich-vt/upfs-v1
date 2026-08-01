import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { evaluateProviderSchemaDrift } from './task-0098-provider-schema-drift.mjs';

const contract = JSON.parse(fs.readFileSync('contracts/task-0098-provider-schema-drift.json'));
const clone = () => structuredClone(contract);
const digest = value => crypto.createHash('sha256').update(JSON.stringify({
  scope: value.scope,
  source_refs: value.source_refs,
  evidence: value.evidence,
  deployment: value.deployment
})).digest('hex');

test('accepts complete synthetic provider schema drift review evidence', () => {
  assert.equal(evaluateProviderSchemaDrift({ contract }).status, 'passed');
});

for (const [name, mutate] of [
  ['rejects external deployment', value => { value.deployment = 'performed'; }],
  ['rejects scope mutation', value => { value.scope.environment_id = 'production'; }],
  ['rejects unquarantined drift', value => { value.evidence.quarantine = false; }],
  ['rejects absent schema version', value => { value.evidence.schema_version = ''; }],
  ['rejects malformed mapping version', value => { value.evidence.mapping_version = {}; }],
  ['rejects wrong drift state', value => { value.evidence.drift = 'ignored'; }],
  ['rejects invalid approval reference', value => { value.evidence.approval_ref = 'evidence://approval'; }],
  ['rejects unapproved mapping', value => { value.evidence.approval_state = 'pending'; }],
  ['rejects invalid workflow state', value => { value.evidence.state = 'executed'; }],
  ['rejects invalid replay result', value => { value.evidence.replay = 'pending'; }],
  ['rejects invalid conflict result', value => { value.evidence.conflict = 'accepted'; }],
  ['rejects missing corrective-forward evidence', value => { value.evidence.corrective_forward = false; }]
]) {
  test(name, () => {
    const value = clone();
    mutate(value);
    value.digest = digest(value);
    assert.equal(evaluateProviderSchemaDrift({ contract: value }).status, 'failed');
  });
}

test('rejects a tampered canonical payload', () => {
  const value = clone();
  value.evidence.provider_id = 'other-provider';
  assert.equal(evaluateProviderSchemaDrift({ contract: value }).status, 'failed');
});
