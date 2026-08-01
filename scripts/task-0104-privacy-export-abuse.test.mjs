import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { evaluatePrivacyExportAbuse } from './task-0104-privacy-export-abuse.mjs';

const contract = JSON.parse(fs.readFileSync('contracts/task-0104-privacy-export-abuse.json'));
const clone = () => structuredClone(contract);
const digest = value => crypto.createHash('sha256').update(JSON.stringify({ scope: value.scope, source_refs: value.source_refs, evidence: value.evidence, deployment: value.deployment })).digest('hex');
test('accepts complete synthetic privacy export abuse evidence', () => assert.equal(evaluatePrivacyExportAbuse({ contract }).status, 'passed'));
for (const [name, mutate] of [
  ['rejects external deployment', value => { value.deployment = 'performed'; }], ['rejects scope mutation', value => { value.scope.environment_id = 'production'; }],
  ['rejects unverified request scope', value => { value.evidence.request_scope = 'unverified'; }], ['rejects missing approval', value => { value.evidence.approval = 'pending'; }],
  ['rejects unredacted export', value => { value.evidence.redaction = 'missing'; }], ['rejects missing expiry', value => { value.evidence.expiry = 'missing'; }],
  ['rejects missing rate limits', value => { value.evidence.rate_limits = 'missing'; }], ['rejects absent abuse detection', value => { value.evidence.abuse_detection = 'missing'; }],
  ['rejects mutable audit', value => { value.evidence.audit = 'mutable'; }], ['rejects unsafe deletion interaction', value => { value.evidence.deletion_interaction = 'executed'; }],
  ['rejects invalid workflow state', value => { value.evidence.state = 'executed'; }], ['rejects invalid replay', value => { value.evidence.replay = 'pending'; }],
  ['rejects invalid conflict', value => { value.evidence.conflict = 'accepted'; }], ['rejects malformed evidence reference', value => { value.evidence.ref = {}; }]
]) test(name, () => { const value = clone(); mutate(value); value.digest = digest(value); assert.equal(evaluatePrivacyExportAbuse({ contract: value }).status, 'failed'); });
test('rejects tampered canonical evidence', () => { const value = clone(); value.evidence.redaction = 'missing'; assert.equal(evaluatePrivacyExportAbuse({ contract: value }).status, 'failed'); });
