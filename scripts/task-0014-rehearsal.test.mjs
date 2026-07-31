import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

test('TASK-0014 rehearsal is reproducible and fails closed without external prerequisites', () => {
  const result = spawnSync(process.execPath, ['scripts/task-0014-rehearsal.mjs'], { encoding: 'utf8', env: { ...process.env, UPFS_DATABASE_URL: '' } });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(fs.readFileSync('artifacts/task-0014-rehearsal-report.json', 'utf8'));
  assert.equal(report.status, 'passed');
  assert.equal(report.synthetic_only, true);
  assert.equal(report.external_evidence[0].status, 'skipped');
  assert.ok(report.checks.some((c) => c.name === 'security-bola-denial' && c.status === 'passed'));
  assert.ok(report.checks.some((c) => c.name === 'recovery-restore-roundtrip' && c.status === 'passed'));
});
