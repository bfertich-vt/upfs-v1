import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchApi } from './transaction-search-workbench.mjs';

test('search API uses the supported endpoint, bounded request, and no tenant shortcut', async () => {
  let request;
  const api = createSearchApi({ baseUrl: 'https://api.test', fetchImpl: async (url, options) => { request = { url, options }; return { ok: true, status: 200, json: async () => ({ data: [], page: { next_cursor: null }, consistency: 'eventually_consistent_projection', watermark: 4 }) }; } });
  await api.search({ query: 'coffee', limit: 25, cursor: 'cursor-1' });
  assert.equal(request.url, 'https://api.test/v1/transactions/search');
  assert.equal(request.options.credentials, 'include');
  assert.deepEqual(JSON.parse(request.options.body), { query: 'coffee', limit: 25, cursor: 'cursor-1' });
  assert.equal(Object.hasOwn(JSON.parse(request.options.body), 'tenant_id'), false);
});

test('API errors preserve permission and retry classification without leaking payload', async () => {
  const api = createSearchApi({ fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ code: 'forbidden', message: 'denied' }) }) });
  await assert.rejects(api.search({ query: 'x' }), (error) => error.status === 403 && error.code === 'forbidden' && error.retryable === false);
});

test('API server failures are retryable', async () => {
  const api = createSearchApi({ fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ code: 'unavailable' }) }) });
  await assert.rejects(api.search({ query: 'x' }), (error) => error.status === 503 && error.retryable === true);
});
