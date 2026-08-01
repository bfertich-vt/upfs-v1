import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { evaluateThreatModelDelta } from './task-0102-threat-model-delta.mjs';

const contract = JSON.parse(fs.readFileSync('contracts/task-0102-threat-model-delta.json'));
const clone = () => structuredClone(contract);
const digest = value => crypto.createHash('sha256').update(JSON.stringify({ scope: value.scope, source_refs: value.source_refs, evidence: value.evidence, deployment: value.deployment })).digest('hex');
test('accepts complete synthetic threat model delta evidence', () => assert.equal(evaluateThreatModelDelta({ contract }).status, 'passed'));
for (const [name, mutate] of [
  ['rejects external deployment', value => { value.deployment = 'performed'; }],
  ['rejects scope mutation', value => { value.scope.environment_id = 'production'; }],
  ['rejects missing version', value => { value.evidence.version = ''; }],
  ['rejects unreviewed boundary', value => { value.evidence.new_boundaries = 'missing'; }],
  ['rejects unreviewed abuse case', value => { value.evidence.abuse_cases = 'missing'; }],
  ['rejects unbounded residual risk', value => { value.evidence.residual_risks = 'accepted'; }],
  ['rejects untracked mitigation', value => { value.evidence.mitigations = 'missing'; }],
  ['rejects malformed owner', value => { value.evidence.owner = {}; }],
  ['rejects invalid approval', value => { value.evidence.approval_state = 'pending'; }],
  ['rejects malformed approval reference', value => { value.evidence.approval_ref = 'evidence://approval'; }],
  ['rejects invalid state', value => { value.evidence.state = 'executed'; }],
  ['rejects invalid replay', value => { value.evidence.replay = 'pending'; }],
  ['rejects invalid conflict', value => { value.evidence.conflict = 'accepted'; }]
]) test(name, () => { const value = clone(); mutate(value); value.digest = digest(value); assert.equal(evaluateThreatModelDelta({ contract: value }).status, 'failed'); });
test('rejects tampered canonical evidence', () => { const value = clone(); value.evidence.owner = 'other'; assert.equal(evaluateThreatModelDelta({ contract: value }).status, 'failed'); });
