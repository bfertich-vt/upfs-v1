const MAX_LIMIT = 100;

function safeError(response, body) {
  const error = new Error(body?.code || `admin_request_failed_${response.status}`);
  error.status = response.status; error.code = body?.code; error.retryable = response.status >= 500;
  return error;
}

/** Contract-bound adapter. The UI only consumes redacted /admin/v1 responses. */
export function createAdminApi({ fetchImpl = globalThis.fetch, baseUrl = '', supportSession = null } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
  const request = async (path, options = {}) => {
    const headers = { accept: 'application/json', ...(options.body ? { 'content-type': 'application/json' } : {}), ...(supportSession ? { 'X-Support-Session': supportSession } : {}) };
    const response = await fetchImpl(`${baseUrl}${path}`, { credentials: 'include', ...options, headers: { ...headers, ...(options.headers || {}) } });
    let body = {}; try { body = await response.json(); } catch { /* empty */ }
    if (!response.ok) throw safeError(response, body);
    return body;
  };
  return {
    health: () => request('/admin/v1/health'),
    tenants: ({ limit = 25, cursor = null } = {}) => request(`/admin/v1/tenants?limit=${Math.min(MAX_LIMIT, Math.max(1, limit))}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`),
    tenant: (id) => request(`/admin/v1/tenants/${encodeURIComponent(id)}`)
  };
}

const text = (value) => String(value ?? '');
const el = (tag, content) => { const node = document.createElement(tag); if (content !== undefined) node.textContent = content; return node; };

export function createAdminConsole({ root, api } = {}) {
  if (!root || typeof root.replaceChildren !== 'function') throw new TypeError('root element is required');
  if (!api || typeof api.health !== 'function') throw new TypeError('admin API is required');
  const state = { view: 'dashboard', status: 'idle', health: null, tenants: [], selected: null, error: null };
  const render = () => {
    root.replaceChildren();
    const heading = el('h1', 'UPFS administration'); root.append(heading);
    const nav = el('nav'); nav.setAttribute('aria-label', 'Administration');
    [['dashboard', 'Dashboard'], ['tenants', 'Tenants'], ['health', 'Platform health']].forEach(([id, label]) => { const button = el('button', label); button.type = 'button'; button.setAttribute('aria-current', state.view === id ? 'page' : 'false'); button.addEventListener('click', () => { state.view = id; state.error = null; render(); load(); }); nav.append(button); }); root.append(nav);
    const status = el('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.textContent = state.status === 'loading' ? 'Loading administrative metadata…' : state.error ? (state.error.status === 403 ? 'You do not have permission to view this administrative data.' : 'Administrative data is temporarily unavailable.') : ''; root.append(status);
    const main = el('main'); main.setAttribute('aria-label', state.view); root.append(main);
    if (state.view === 'dashboard') renderDashboard(main); else if (state.view === 'tenants') renderTenants(main); else renderHealth(main);
  };
  const renderDashboard = (main) => { main.append(el('h2', 'Overview')); const cards = el('section'); cards.setAttribute('aria-label', 'Operational summary'); cards.append(el('p', `Platform: ${state.health?.status || 'Not loaded'}`), el('p', `Tenants loaded: ${state.tenants.length}`)); main.append(cards); };
  const renderHealth = (main) => { main.append(el('h2', 'Platform health')); if (!state.health) { main.append(el('p', 'No health observation loaded.')); return; } const table = el('table'); table.setAttribute('aria-label', 'Platform component health'); const head = el('tr'); ['Component', 'Status', 'Observed'].forEach((v) => { const th = el('th', v); th.scope = 'col'; head.append(th); }); const thead = el('thead'); thead.append(head); table.append(thead); const body = el('tbody'); Object.entries(state.health.components || {}).forEach(([name, value]) => { const row = el('tr'); [name, value.status, value.observed_at].forEach((v) => row.append(el('td', v))); body.append(row); }); table.append(body); main.append(table); };
  const renderTenants = (main) => { main.append(el('h2', 'Tenants')); if (!state.tenants.length) { main.append(el('p', 'No tenant metadata available.')); return; } const table = el('table'); table.setAttribute('aria-label', 'Tenant metadata'); const head = el('tr'); ['Name', 'Status', 'Organization'].forEach((v) => { const th = el('th', v); th.scope = 'col'; head.append(th); }); const thead = el('thead'); thead.append(head); table.append(thead); const body = el('tbody'); state.tenants.forEach((tenant) => { const row = el('tr'); const name = el('button', text(tenant.name)); name.type = 'button'; name.addEventListener('click', () => selectTenant(tenant.id)); const cell = el('td'); cell.append(name); row.append(cell, el('td', tenant.status), el('td', tenant.organization_id)); body.append(row); }); table.append(body); main.append(table); if (state.selected) { main.append(el('h3', `Tenant ${state.selected.tenant?.name || ''}`), el('p', `Projection: ${state.selected.projection?.status || 'unknown'}; indexed count: ${state.selected.projection?.indexed_count ?? 'unknown'}`)); } };
  const load = async () => { state.status = 'loading'; render(); try { if (!state.health) state.health = await api.health(); if (state.view === 'tenants' && !state.tenants.length) state.tenants = (await api.tenants()).data || []; state.status = 'success'; } catch (error) { state.error = error; state.status = 'error'; } render(); };
  const selectTenant = async (id) => { state.status = 'loading'; render(); try { state.selected = await api.tenant(id); state.status = 'success'; } catch (error) { state.error = error; state.status = 'error'; } render(); };
  render();
  return { load, selectTenant, snapshot: () => ({ ...state, tenants: [...state.tenants] }) };
}
