import test from 'node:test';
import assert from 'node:assert/strict';
import { nativePlan, main, safeDetails, distinctTargets } from './task-0017-native-postgres.mjs';

test('TASK-0017 fails closed when native PostgreSQL prerequisites are missing', async () => {
  const result = await main({ UPFS_DATABASE_URL: '', UPFS_RESTORE_DATABASE_URL: '' });
  assert.equal(result.status, 'skipped');
  assert.equal(result.native_evidence, false);
  assert.ok(result.checks.some((check) => check.name === 'native-prerequisites' && check.status === 'skipped'));
});

test('TASK-0017 native plan uses separate source and restore targets', () => {
  const plan = nativePlan({ sourceUrl: 'postgres://source', restoreUrl: 'postgres://restore', archivePath: 'x.dump', psql: 'psql', pgDump: 'pg_dump', pgRestore: 'pg_restore' });
  assert.equal(plan.dump.args.at(-1), 'postgres://source');
  assert.equal(plan.restore.args.at(-1), 'x.dump');
  assert.ok(plan.restore.args.includes('postgres://restore'));
});

test('TASK-0017 does not retain connection URLs in details', () => {
  assert.equal(safeDetails('failed postgres://user:secret@host/db'), 'failed postgres://[redacted]');
});

test('TASK-0017 rejects equivalent source and restore targets after normalization', () => {
  assert.throws(() => distinctTargets('postgres://alice:one@HOST/db', 'postgresql://bob:two@host:5432/db'), /distinct/);
});

test('TASK-0017 rejects malformed database targets', () => {
  assert.throws(() => distinctTargets('not-a-url', 'postgres://host/db'), /PostgreSQL URL/);
});
