import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyBearerToken } from './token-boundary.mjs';

test('missing token is denied', async () => {
  assert.equal((await verifyBearerToken(undefined, { verify: async () => ({}) })).status, 401);
});

test('invalid token is denied', async () => {
  const result = await verifyBearerToken('Bearer bad', { verify: async () => { throw new Error('bad'); } });
  assert.equal(result.status, 401);
});

test('valid token yields verified actor', async () => {
  const result = await verifyBearerToken('Bearer good', { verify: async (token) => ({ issuer: 'https://issuer', subject: token }) });
  assert.equal(result.status, 200);
  assert.equal(result.actor.subject, 'good');
});
