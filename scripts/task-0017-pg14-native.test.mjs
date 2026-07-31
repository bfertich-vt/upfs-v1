import test from 'node:test';
import assert from 'node:assert/strict';
import { main } from './task-0017-pg14-native.mjs';

test('PG14 native pairing is opt-in and network-free by default', async () => {
  const result = await main({ UPFS_RUN_PG14_NATIVE: '0', PATH: '' });
  assert.equal(result.status, 'skipped');
  assert.equal(result.native_evidence, false);
  assert.ok(result.checks.some((check) => check.name === 'pg14-opt-in' && check.status === 'skipped'));
});
