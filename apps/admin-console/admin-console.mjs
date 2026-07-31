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
    tenant: (id) => request(`/admin/v1/tenants/${encodeURIComponent(id)}`),
    managedIntegrations: ({ tenantId, environmentId }) => request(`/admin/v1/managed-integrations?tenant_id=${encodeURIComponent(tenantId)}&environment_id=${encodeURIComponent(environmentId)}`),
    operations: ({ tenantId, environmentId } = {}) => request(`/admin/v1/operations?tenant_id=${encodeURIComponent(tenantId)}${environmentId ? `&environment_id=${encodeURIComponent(environmentId)}` : ''}`),
    createOperation: ({ tenantId, environmentId, type, reason, dryRun = true, changeTicket, idempotencyKey }) => request('/admin/v1/operations', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ tenant_id: tenantId, environment_id: environmentId, type, reason, dry_run: dryRun, change_ticket: changeTicket }) }),
    approveOperation: ({ operationId, reason, dualControl = false }) => request(`/admin/v1/operations/${encodeURIComponent(operationId)}/approve`, { method: 'POST', body: JSON.stringify({ reason, dual_control: dualControl }) }),
    executeOperation: ({ operationId, idempotencyKey }) => request(`/admin/v1/operations/${encodeURIComponent(operationId)}/execute`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey } }),
    rollbackOperation: ({ operationId, evidence }) => request(`/admin/v1/operations/${encodeURIComponent(operationId)}/rollback`, { method: 'POST', body: JSON.stringify({ evidence }) }),
    module: (name) => { const allowed = new Set(['operations','releases','incidents','audit','data-quality','ingestion','workflows','policies','compliance']); if (!allowed.has(name)) throw Object.assign(new Error('unsupported_admin_module'), { code: 'unsupported_admin_module', status: 400 }); return request(`/admin/v1/${name}`); }
  };
}

const text = (value) => String(value ?? '');
const el = (tag, content) => { const node = document.createElement(tag); if (content !== undefined) node.textContent = content; return node; };

export function createAdminConsole({ root, api } = {}) {
  if (!root || typeof root.replaceChildren !== 'function') throw new TypeError('root element is required');
  if (!api || typeof api.health !== 'function') throw new TypeError('admin API is required');
  const modules = ['operations', 'releases', 'incidents', 'audit', 'data-quality', 'ingestion', 'workflows', 'policies', 'compliance'];
  const state = { view: 'dashboard', status: 'idle', health: null, tenants: [], selected: null, moduleData: {}, integration: null, error: null };
  const render = () => {
    root.replaceChildren();
    const heading = el('h1', 'UPFS administration'); root.append(heading);
    const nav = el('nav'); nav.setAttribute('aria-label', 'Administration');
    [['dashboard', 'Dashboard'], ['tenants', 'Tenants'], ['health', 'Platform health'], ...modules.map((name) => [name, name.replace('-', ' ')])].forEach(([id, label]) => { const button = el('button', label); button.type = 'button'; button.setAttribute('aria-current', state.view === id ? 'page' : 'false'); button.addEventListener('click', () => { state.view = id; state.error = null; render(); load(); }); nav.append(button); }); root.append(nav);
    const status = el('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.textContent = state.status === 'loading' ? 'Loading administrative metadata…' : state.error ? (state.error.status === 403 ? 'You do not have permission to view this administrative data.' : 'Administrative data is temporarily unavailable.') : ''; root.append(status);
    const main = el('main'); main.setAttribute('aria-label', state.view); root.append(main);
    if (state.view === 'dashboard') renderDashboard(main); else if (state.view === 'tenants') renderTenants(main); else if (state.view === 'health') renderHealth(main); else renderModule(main, state.view);
  };
  const renderDashboard = (main) => { main.append(el('h2', 'Overview')); const cards = el('section'); cards.setAttribute('aria-label', 'Operational summary'); cards.append(el('p', `Platform: ${state.health?.status || 'Not loaded'}`), el('p', `Tenants loaded: ${state.tenants.length}`)); main.append(cards); };
  const renderHealth = (main) => { main.append(el('h2', 'Platform health')); if (!state.health) { main.append(el('p', 'No health observation loaded.')); return; } const table = el('table'); table.setAttribute('aria-label', 'Platform component health'); const head = el('tr'); ['Component', 'Status', 'Observed'].forEach((v) => { const th = el('th', v); th.scope = 'col'; head.append(th); }); const thead = el('thead'); thead.append(head); table.append(thead); const body = el('tbody'); Object.entries(state.health.components || {}).forEach(([name, value]) => { const row = el('tr'); [name, value.status, value.observed_at].forEach((v) => row.append(el('td', v))); body.append(row); }); table.append(body); main.append(table); };
  const renderTenants = (main) => { main.append(el('h2', 'Tenants')); if (!state.tenants.length) { main.append(el('p', 'No tenant metadata available.')); return; } const table = el('table'); table.setAttribute('aria-label', 'Tenant metadata'); const head = el('tr'); ['Name', 'Status', 'Organization'].forEach((v) => { const th = el('th', v); th.scope = 'col'; head.append(th); }); const thead = el('thead'); thead.append(head); table.append(thead); const body = el('tbody'); state.tenants.forEach((tenant) => { const row = el('tr'); const name = el('button', text(tenant.name)); name.type = 'button'; name.addEventListener('click', () => selectTenant(tenant.id)); const cell = el('td'); cell.append(name); row.append(cell, el('td', tenant.status), el('td', tenant.organization_id)); body.append(row); }); table.append(body); main.append(table); if (state.selected) { main.append(el('h3', `Tenant ${state.selected.tenant?.name || ''}`), el('p', `Projection: ${state.selected.projection?.status || 'unknown'}; indexed count: ${state.selected.projection?.indexed_count ?? 'unknown'}`)); const integration = state.integration; main.append(el('h4', 'Managed integration status')); if (!integration || integration.status === 'unavailable') main.append(el('p', 'Managed integration status unavailable (provider not configured or scope denied).')); else { const statusTable = el('table'); statusTable.setAttribute('aria-label', 'Managed integration status'); const statusBody = el('tbody'); ['observability', 'deployment', 'backup'].forEach((kind) => { const row = el('tr'); row.append(el('th', kind), el('td', integration[kind]?.status || 'unknown')); statusBody.append(row); }); statusTable.append(statusBody); main.append(statusTable); } } };
  const renderModule = (main, name) => { main.append(el('h2', name.replace('-', ' '))); const data = state.moduleData[name]; if (!data) { main.append(el('p', 'No operational metadata loaded.')); return; } const table = el('table'); table.setAttribute('aria-label', `${name} operational metadata`); const body = el('tbody'); Object.entries(data).filter(([key]) => !/secret|token|password|content/i.test(key)).forEach(([key, value]) => { const row = el('tr'); row.append(el('th', key), el('td', typeof value === 'object' ? JSON.stringify(value) : text(value))); body.append(row); }); table.append(body); main.append(table); };
  const load = async () => { state.status = 'loading'; render(); try { if (!state.health) state.health = await api.health(); if (state.view === 'tenants' && !state.tenants.length) state.tenants = (await api.tenants()).data || []; if (modules.includes(state.view) && !state.moduleData[state.view]) state.moduleData[state.view] = await api.module(state.view); state.status = 'success'; } catch (error) { state.error = error; state.status = 'error'; } render(); };
  const selectTenant = async (id) => { state.status = 'loading'; render(); try { state.selected = await api.tenant(id); const environment = state.selected.environments?.[0]; if (environment && api.managedIntegrations) { try { state.integration = await api.managedIntegrations({ tenantId: id, environmentId: environment.id }); } catch (error) { state.integration = { status: 'unavailable', code: error.code }; } } state.status = 'success'; } catch (error) { state.error = error; state.status = 'error'; } render(); };
  render();
  return { load, selectTenant, snapshot: () => ({ ...state, tenants: [...state.tenants] }) };
}
