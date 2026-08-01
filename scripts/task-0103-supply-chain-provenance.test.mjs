import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { evaluateSupplyChainProvenance } from './task-0103-supply-chain-provenance.mjs';

const contract = JSON.parse(fs.readFileSync('contracts/task-0103-supply-chain-provenance.json'));
const clone = () => structuredClone(contract);
const digest = value => crypto.createHash('sha256').update(JSON.stringify({ scope: value.scope, source_refs: value.source_refs, evidence: value.evidence, deployment: value.deployment })).digest('hex');
test('accepts complete synthetic supply chain provenance evidence', () => assert.equal(evaluateSupplyChainProvenance({ contract }).status, 'passed'));
for (const [name, mutate] of [
  ['rejects external deployment', value => { value.deployment = 'performed'; }],
  ['rejects scope mutation', value => { value.scope.tenant_id = 'other-tenant'; }],
  ['rejects unverified pins', value => { value.evidence.pins = 'floating'; }],
  ['rejects unreviewed advisories', value => { value.evidence.advisories = 'unknown'; }],
  ['rejects absent SBOM', value => { value.evidence.sbom = 'missing'; }],
  ['rejects unverified provenance', value => { value.evidence.provenance = 'unverified'; }],
  ['rejects missing signature verification', value => { value.evidence.signatures = 'missing'; }],
  ['rejects untracked remediation', value => { value.evidence.remediation = 'missing'; }],
  ['rejects invalid workflow state', value => { value.evidence.state = 'executed'; }],
  ['rejects invalid replay', value => { value.evidence.replay = 'pending'; }],
  ['rejects invalid conflict', value => { value.evidence.conflict = 'accepted'; }],
  ['rejects malformed evidence reference', value => { value.evidence.ref = {}; }]
]) test(name, () => { const value = clone(); mutate(value); value.digest = digest(value); assert.equal(evaluateSupplyChainProvenance({ contract: value }).status, 'failed'); });
test('rejects tampered canonical evidence', () => { const value = clone(); value.evidence.sbom = 'missing'; assert.equal(evaluateSupplyChainProvenance({ contract: value }).status, 'failed'); });
