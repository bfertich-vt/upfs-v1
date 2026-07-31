import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyToken } from './token-verification.mjs';

test('denies missing token or verifier', () => {
  assert.equal(verifyToken('', null).ok, false);
  assert.equal(verifyToken('token', null).ok, false);
});
test('denies invalid claims and accepts verified claims', () => {
  assert.equal(verifyToken('token', () => ({})).ok, false);
  assert.deepEqual(verifyToken('token', () => ({ issuer: 'https://issuer.example', subject: 'u1' })), { ok: true, claims: { issuer: 'https://issuer.example', subject: 'u1' } });
});
