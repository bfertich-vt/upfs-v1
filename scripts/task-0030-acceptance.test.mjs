import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { evaluateAcceptance } from './task-0030-acceptance.mjs';

test('repository acceptance fails closed when historical artifacts are absent', () => {
  const report = evaluateAcceptance();
  assert.equal(report.synthetic_only, true);
  assert.equal(report.production_deployment, 'not-performed');
  assert.equal(report.status, 'failed');
  assert.equal(report.decision, 'NO-GO');
  assert.ok(report.checks.some((c) => c.id === 'artifact:native-postgres' && c.status === 'failed'));
  assert.ok(report.external_prerequisites.length >= 3);
});

test('missing evidence fails closed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'upfs-task-0030-'));
  fs.mkdirSync(path.join(root, 'docs/compliance'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/MASTER_PLAN.md'), '# plan');
  const report = evaluateAcceptance({ root });
  assert.equal(report.decision, 'NO-GO');
  assert.ok(report.checks.some((c) => c.id === 'artifact:native-postgres' && c.status === 'failed'));
  fs.rmSync(root, { recursive: true, force: true });
});

test('production deployment claim fails closed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'upfs-task-0030-'));
  fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
  for (const rel of ['task-0017-pg14-native-report.json','task-0015-release-report.json','task-0018-controls-report.json','task-0019-pilot-report.json','task-0020-authorization-report.json','task-0028-dr-report.json','task-0029-resilience-report.json']) fs.writeFileSync(path.join(root, rel.includes('/') ? rel : `artifacts/${rel}`), JSON.stringify({ status:'passed', synthetic_only:true, production_deployment:'performed' }));
  const report = evaluateAcceptance({ root });
  assert.equal(report.decision, 'NO-GO');
  assert.ok(report.checks.some((c) => c.id === 'synthetic-boundary' && c.status === 'failed'));
  fs.rmSync(root, { recursive: true, force: true });
});
