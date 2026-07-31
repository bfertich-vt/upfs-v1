import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { backupRestorePlan, loadThreshold, tenantIsolationSql } from './task-0014-rehearsal.mjs';

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

test('backup and restore failure injection never reorders or silently passes', () => {
  const plan = backupRestorePlan({ dumpAvailable: true, restoreAvailable: true, sourceUrl: 'source', restoreUrl: 'restore', archivePath: 'backup.dump' });
  assert.equal(plan[0].command, 'pg_dump');
  assert.equal(plan[1].command, 'pg_restore');
  assert.equal(backupRestorePlan({ dumpAvailable: false, restoreAvailable: true, sourceUrl: 'source', restoreUrl: 'restore', archivePath: 'backup.dump' })[0].available, false);
});

test('tenant isolation query scopes by escaped authorization-derived tenant', () => {
  assert.match(tenantIsolationSql('tenant-a'), /tenant_id = 'tenant-a'/);
  assert.match(tenantIsolationSql("tenant-a' OR 1=1 --"), /tenant-a'' OR 1=1/);
});

test('load threshold failure injection fails slow or incomplete runs', () => {
  assert.equal(loadThreshold({ completed: 12500, elapsedMs: 100 }), true);
  assert.equal(loadThreshold({ completed: 12499, elapsedMs: 100 }), false);
  assert.equal(loadThreshold({ completed: 12500, elapsedMs: 2000 }), false);
});
