import test from 'node:test';
import assert from 'node:assert/strict';

test('embedded PostgreSQL rehearsal is opt-in and truthful when runtime is unavailable', { timeout: 180000 }, async (t) => {
  if (process.env.UPFS_RUN_EMBEDDED_POSTGRES !== '1') {
    t.skip('set UPFS_RUN_EMBEDDED_POSTGRES=1 to run disposable embedded PostgreSQL');
    return;
  }
  const { main } = await import('./task-0014-embedded-postgres.mjs');
  const result = await main();
  assert.notEqual(result.status, 'failed', JSON.stringify(result));
  assert.ok(result.checks.some((check) => check.name === 'embedded-runtime' && check.status === 'passed'), JSON.stringify(result));
  assert.ok(result.checks.some((check) => check.name === 'embedded-tenant-isolation' && check.status === 'passed'), JSON.stringify(result));
});
