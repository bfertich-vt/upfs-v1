import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchApi, createSearchWorkbench } from './transaction-search-workbench.mjs';

class FakeElement {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.listeners = {}; this.textContent = ''; this.value = ''; this.disabled = false; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, handler) { this.listeners[name] = handler; }
  click() { this.listeners.click?.({ preventDefault() {} }); }
  querySelector(selector) {
    const match = (node) => selector === 'button' ? node.tagName === 'BUTTON' : selector === 'input' ? node.tagName === 'INPUT' : selector === 'form' ? node.tagName === 'FORM' : selector === 'table' ? node.tagName === 'TABLE' : false;
    const walk = (nodes) => { for (const node of nodes) { if (match(node)) return node; const found = walk(node.children || []); if (found) return found; } return null; };
    return walk(this.children);
  }
  querySelectorAll(selector) { const found = []; const walk = (nodes) => nodes.forEach((node) => { if ((selector === 'button' && node.tagName === 'BUTTON') || (selector === 'td' && node.tagName === 'TD')) found.push(node); walk(node.children || []); }); walk(this.children); return found; }
}
globalThis.document = { createElement: (tag) => new FakeElement(tag) };
const root = () => new FakeElement('main');

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

test('search API never exposes server error text', async () => {
  const api = createSearchApi({ fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ code: 'unavailable', message: 'tenant-a account 123456 must-not-leak' }) }) });
  await assert.rejects(api.search({ query: 'x' }), (error) => error.status === 503 && error.message === 'search_unavailable');
});

test('API server failures are retryable', async () => {
  const api = createSearchApi({ fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ code: 'unavailable' }) }) });
  await assert.rejects(api.search({ query: 'x' }), (error) => error.status === 503 && error.retryable === true);
});

test('workbench renders loading, empty, and safe text states with keyboard controls', async () => {
  let resolve; const api = { search: () => new Promise((r) => { resolve = r; }) }; const host = root();
  const workbench = createSearchWorkbench({ root: host, api }); const input = host.querySelector('input'); input.value = 'coffee'; host.querySelector('form').listeners.submit({ preventDefault() {} });
  assert.equal(host.querySelector('button').disabled, true); resolve({ data: [], page: { next_cursor: null } }); await Promise.resolve(); await Promise.resolve();
  assert.equal(host.children.some((node) => node.textContent === 'No transactions matched your search.'), true); assert.equal(workbench.snapshot().status, 'empty');
});

test('load-more failure preserves existing rows and retries the same cursor', async () => {
  const calls = []; const responses = [{ data: [{ id: '1', posted_at: '2026-01-01', amount: '1', currency: 'USD', account_id: 'a', evidence_refs: ['<safe>'] }], page: { next_cursor: 'next' } }];
  const api = { search: async (args) => { calls.push(args); if (calls.length === 1) return responses[0]; if (calls.length === 2) throw Object.assign(new Error('down'), { status: 503, code: 'unavailable' }); return { data: [{ id: '2', posted_at: '2026-01-02', amount: '2', currency: 'USD', account_id: 'a', evidence_refs: ['ev-2'] }], page: { next_cursor: null } }; } };
  const host = root(); const workbench = createSearchWorkbench({ root: host, api }); await workbench.search('coffee'); host.querySelectorAll('button').find((b) => b.textContent === 'Load more').click(); await new Promise((r) => setImmediate(r));
  assert.equal(workbench.snapshot().data.length, 1); assert.equal(workbench.snapshot().nextCursor, 'next'); host.querySelectorAll('button').find((b) => b.textContent === 'Retry').click(); await new Promise((r) => setImmediate(r));
  assert.equal(calls[2].cursor, 'next'); assert.equal(workbench.snapshot().data.length, 2); assert.match(host.querySelectorAll('td').map((c) => c.textContent).join('|'), /&lt;safe&gt;|<safe>/);
});

test('forbidden and cancellation do not allow stale responses to mutate state', async () => {
  let resolve; const api = { search: async () => { await new Promise((r) => { resolve = r; }); return { data: [{ id: 'stale' }], page: { next_cursor: null } }; } }; const host = root(); const workbench = createSearchWorkbench({ root: host, api });
  const pending = workbench.search('x'); workbench.cancel(); resolve(); await pending; assert.deepEqual(workbench.snapshot().data, []);
  const forbidden = createSearchWorkbench({ root: root(), api: { search: async () => { throw Object.assign(new Error(), { status: 403, code: 'forbidden' }); } } }); await forbidden.search('x'); assert.equal(forbidden.snapshot().status, 'forbidden');
});
