import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConsoleApi, createConsoleShell } from '../console-shell.mjs';
import { createSearchApi, createSearchWorkbench } from '../transaction-search-workbench.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };
const contrast = (foreground, background) => {
  const luminance = (hex) => hex.match(/[a-f0-9]{2}/gi).map((part) => Number.parseInt(part, 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

class Element {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.listeners = {}; this.textContent = ''; this.value = ''; this.type = ''; this.name = ''; this.required = false; this.disabled = false; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  findAll(predicate) { const found = []; const walk = (node) => { for (const child of node.children) { if (predicate(child)) found.push(child); walk(child); } }; walk(this); return found; }
  querySelector(selector) { return this.findAll((node) => node.tagName === selector.toUpperCase())[0] ?? null; }
}
const text = (node) => [node.textContent, ...node.children.flatMap((child) => [text(child)])].join(' ');
const host = () => new Element('main');
const wait = () => new Promise((resolve) => setImmediate(resolve));

for (const page of ['console-shell.html', 'transaction-search-workbench.html']) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  check(/<!doctype html>/i.test(html), `${page} must declare HTML5 doctype`);
  check(/<html lang="en">/i.test(html), `${page} must declare language`);
  check(/<meta charset="utf-8">/i.test(html), `${page} must declare encoding`);
  check(/<meta name="viewport"/i.test(html), `${page} must declare viewport`);
  check(/<link rel="stylesheet" href="\.\/console\.css">/i.test(html), `${page} must load the shared accessible stylesheet`);
}
const stylesheet = fs.readFileSync(path.join(root, 'console.css'), 'utf8');
check(contrast('101828', 'ffffff') >= 4.5, 'foreground and background colors must meet normal-text contrast');
check(contrast('175cd3', 'ffffff') >= 3, 'focus indicator must meet non-text contrast');
check(/:focus-visible\s*\{[^}]*outline:\s*3px\s+solid\s+#175cd3/i.test(stylesheet), 'keyboard focus indicator must be visible');

globalThis.document = { createElement: (tag) => new Element(tag) };
const consoleHost = host();
let resolveDashboard;
const shell = createConsoleShell({ root: consoleHost, api: { dashboard: () => new Promise((resolve) => { resolveDashboard = resolve; }) } });
check(consoleHost.findAll((node) => node.tagName === 'NAV' && node.attributes['aria-label'] === 'Customer console').length === 1, 'console must expose a labelled navigation landmark');
check(consoleHost.findAll((node) => node.tagName === 'H1').length === 1, 'console must expose one page heading');
check(consoleHost.findAll((node) => node.tagName === 'H2').length >= 9, 'console navigation groups must be headings');
const nativeControls = consoleHost.findAll((node) => node.tagName === 'BUTTON' || node.tagName === 'INPUT');
check(nativeControls.length >= 9 && nativeControls.every((node) => !node.attributes.tabindex || node.attributes.tabindex === '0'), 'console keyboard controls must be native and have no positive tabindex');
const loading = shell.load();
check(consoleHost.findAll((node) => node.attributes.role === 'status' && node.attributes['aria-live'] === 'polite' && node.textContent === 'Loading...').length === 1, 'console must announce loading status');
resolveDashboard({ data: [] }); await loading;
check(consoleHost.findAll((node) => node.attributes.role === 'status' && node.textContent === 'No data available.').length === 1, 'console must announce empty status');

const forbiddenApi = createConsoleApi({ fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ code: 'forbidden', tenant_id: 'other-tenant', account_number: '999999999', message: 'private financial details' }) }) });
const forbiddenHost = host();
const forbiddenShell = createConsoleShell({ root: forbiddenHost, api: { dashboard: forbiddenApi.dashboard } });
await forbiddenShell.load();
check(text(forbiddenHost).includes('You do not have permission to view this page.'), 'console must expose a safe forbidden state');
check(!/other-tenant|999999999|private financial details/.test(text(forbiddenHost)), 'forbidden console state must not leak tenant or financial payloads');

const searchHost = host();
const workbench = createSearchWorkbench({ root: searchHost, api: { search: async () => { throw Object.assign(new Error('hidden'), { status: 403, code: 'forbidden' }); } } });
check(searchHost.findAll((node) => node.tagName === 'H1').length === 1, 'workbench must expose a page heading');
check(searchHost.findAll((node) => node.tagName === 'FORM' && node.attributes['aria-label'] === 'Search transactions').length === 1, 'workbench form must have a semantic label');
check(searchHost.findAll((node) => node.tagName === 'INPUT' && node.attributes['aria-label'] === 'Search transactions' && node.type === 'search').length === 1, 'workbench search input must be labelled and keyboard-native');
await workbench.search('coffee'); await wait();
check(searchHost.findAll((node) => node.attributes.role === 'status' && node.textContent === 'You do not have permission to search these transactions.').length === 1, 'workbench must announce a safe forbidden state');
check(!/hidden|tenant|account|amount/.test(text(searchHost)), 'workbench forbidden state must not leak server payload details');

const requestApi = createSearchApi({ fetchImpl: async (_url, options) => ({ ok: true, status: 200, json: async () => ({ data: [], page: {} }) }) });
await requestApi.search({ query: 'synthetic only' });
console.log(`${assertions} accessibility assertions passed against runnable customer-console modules`);
