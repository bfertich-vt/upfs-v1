/** Source-backed customer-console page contracts (specs/02_ui/console_experience.md). */
export const PAGE_CONTRACTS = Object.freeze({
  dashboard: Object.freeze({ purpose: 'Tenant-scoped health and activity overview', personas: ['tenant_admin', 'operator'], permission: 'console.read', data_classification: 'operational_metadata', kpis: ['projection_watermark', 'ingestion_status'], widgets: ['health_summary', 'recent_activity'], tables: [], filters: ['time_range'], actions: ['open_search'], bulk_limit: 0, states: ['loading', 'success', 'empty', 'forbidden', 'error'], api: 'GET /v1/console/dashboard', events: [], audit: 'read-only access is audited', performance_budget_ms: 1000, accessibility: 'landmarks, labelled status, keyboard navigation', documentation: 'specs/02_ui/console_experience.md', acceptance: 'tenant-scoped synthetic response renders without financial payloads', non_goals: ['mutating account or transaction state'] }),
  data: Object.freeze({ purpose: 'Inspect tenant data quality and projection freshness', personas: ['tenant_admin', 'data_steward'], permission: 'console.data.read', data_classification: 'operational_metadata', kpis: ['indexed_count', 'quarantine_count', 'freshness_seconds'], widgets: ['projection_freshness', 'quality_summary'], tables: ['data_quality'], filters: ['status'], actions: ['open_search'], bulk_limit: 0, states: ['loading', 'success', 'empty', 'forbidden', 'error'], api: 'GET /v1/console/data', events: [], audit: 'read-only access is audited', performance_budget_ms: 1000, accessibility: 'table headers and live status', documentation: 'specs/02_ui/console_experience.md', acceptance: 'tenant-scoped synthetic response renders classification and freshness', non_goals: ['editing canonical facts', 'bulk mutation'] })
});

export function createConsoleApi({ fetchImpl = globalThis.fetch, baseUrl = '' } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
  const get = async (path, signal) => {
    const response = await fetchImpl(`${baseUrl}${path}`, { credentials: 'include', headers: { accept: 'application/json' }, signal });
    let body = {}; try { body = await response.json(); } catch { /* empty body */ }
    if (!response.ok) { const error = new Error(body?.message || body?.code || `console_failed_${response.status}`); error.status = response.status; error.code = body?.code; throw error; }
    return body;
  };
  return { dashboard: ({ signal } = {}) => get('/v1/console/dashboard', signal), data: ({ signal } = {}) => get('/v1/console/data', signal) };
}

export function createConsoleShell({ root, api, initialPage = 'dashboard' } = {}) {
  if (!root || typeof root.replaceChildren !== 'function') throw new TypeError('root element is required');
  if (!api) throw new TypeError('console API is required');
  const state = { page: initialPage, status: 'idle', payload: null, error: null };
  const render = () => { root.replaceChildren(); const nav = document.createElement('nav'); nav.setAttribute('aria-label', 'Customer console'); for (const [id, label] of [['dashboard', 'Overview'], ['data', 'Data'], ['search', 'Search']]) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.setAttribute('aria-current', state.page === id ? 'page' : 'false'); button.addEventListener('click', () => { state.page = id; load(); }); nav.append(button); } root.append(nav); const main = document.createElement('main'); main.setAttribute('aria-live', 'polite'); const heading = document.createElement('h1'); heading.textContent = PAGE_CONTRACTS[state.page]?.purpose || 'Search'; main.append(heading); const status = document.createElement('p'); status.textContent = state.status === 'loading' ? 'Loading…' : state.status === 'error' ? (state.error?.status === 403 ? 'You do not have permission to view this page.' : 'Unable to load this page.') : state.status === 'empty' ? 'No data available.' : state.status === 'success' ? 'Data loaded.' : ''; main.append(status); if (state.status === 'success') { const pre = document.createElement('pre'); pre.textContent = JSON.stringify(state.payload); main.append(pre); } root.append(main); };
  const load = async () => { if (!api[state.page]) { state.status = 'idle'; render(); return; } state.status = 'loading'; state.error = null; render(); try { state.payload = await api[state.page](); state.status = state.payload?.data?.length === 0 ? 'empty' : 'success'; } catch (error) { state.status = 'error'; state.error = { status: error.status, code: error.code }; } render(); };
  render(); return { load, snapshot: () => ({ ...state }) };
}
