import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { evaluateAuthorization } from './task-0020-authorization.mjs';

const files = {
  'artifacts/task-0017-pg14-native-report.json': { status: 'passed', native_evidence: true },
  'artifacts/task-0015-release-report.json': { status: 'passed', manifest: 'artifacts/upfs-release-manifest.json', release_id: 'synthetic-abc', external_deployment: 'not-performed' },
  'artifacts/task-0018-controls-report.json': { status: 'passed' },
  'artifacts/task-0019-pilot-report.json': { status: 'passed', synthetic_only: true, production_deployment: 'not-performed', external_contact: 'not-performed' },
  'docs/compliance/control-library.json': { schema_version: 'controls' },
  'docs/runbooks/controlled-pilot-runbook.md': 'runbook'
};
function fixture() { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'upfs-task-0020-')); for (const [file, value] of Object.entries(files)) { const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value)); } return root; }
const complete = { decision: 'GO', approvals: Object.fromEntries(['release_approver', 'security_approver', 'data_owner', 'incident_commander', 'external_deployment'].map((name) => [name, { approved: true, name: 'named-approver', date: '2026-07-31T00:00:00Z' }])), risks: [{ id: 'R-1', owner: 'security', status: 'accepted', mitigation: 'pause and remediate' }], slos: [{ signal: 'availability', objective: '>=99%', pause_threshold: '<99%' }], rollback: { strategy: 'corrective-forward', owner: 'release', trigger: 'failed health gate', verification: 'reconciliation' } };
test('fails closed with missing evidence and approvals', () => { const root = fixture(); fs.rmSync(path.join(root, 'artifacts/task-0017-pg14-native-report.json')); const report = evaluateAuthorization({ root, authorization: {} }); assert.equal(report.decision, 'NO-GO'); assert.ok(report.checks.some((c) => c.name === 'evidence-native-postgres' && c.status === 'failed')); fs.rmSync(root, { recursive: true, force: true }); });
test('complete package can reach GO only with explicit approvals and all gates', () => { const root = fixture(); const report = evaluateAuthorization({ root, authorization: complete }); assert.equal(report.decision, 'GO'); assert.equal(report.production_deployment, 'not-performed'); fs.rmSync(root, { recursive: true, force: true }); });
test('tampered or non-passed native evidence cannot authorize', () => { const root = fixture(); fs.writeFileSync(path.join(root, 'artifacts/task-0017-pg14-native-report.json'), JSON.stringify({ status: 'passed', native_evidence: false })); const report = evaluateAuthorization({ root, authorization: complete }); assert.equal(report.decision, 'NO-GO'); assert.ok(report.checks.some((c) => c.name === 'native-evidence' && c.status === 'failed')); fs.rmSync(root, { recursive: true, force: true }); });
