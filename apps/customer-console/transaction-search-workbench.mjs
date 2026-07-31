const DEFAULT_LIMIT = 25;
const MAX_QUERY = 500;

const escapeText = (value) => String(value ?? '');
const isErrorResponse = (value) => value && typeof value.status === 'number' && value.status >= 400;

/**
 * Contract-only API adapter. The bearer token and tenant scope belong to the
 * host application's authenticated session; the customer console never sends
 * a client-supplied tenant identifier to the search endpoint.
 */
export function createSearchApi({ fetchImpl = globalThis.fetch, baseUrl = '' } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
  return {
    async search({ query, limit = DEFAULT_LIMIT, cursor = null, signal } = {}) {
      const response = await fetchImpl(`${baseUrl}/v1/transactions/search`, {
        method: 'POST',
        credentials: 'include',
        signal,
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ query, limit, ...(cursor ? { cursor } : {}) })
      });
      let body;
      try { body = await response.json(); } catch { body = {}; }
      if (!response.ok) {
        const error = new Error(body?.message || body?.code || `search_failed_${response.status}`);
        error.status = response.status; error.code = body?.code; error.retryable = response.status >= 500;
        throw error;
      }
      return body;
    }
  };
}

export function createSearchWorkbench({ root, api, limit = DEFAULT_LIMIT, onState = () => {} } = {}) {
  if (!root || typeof root.querySelector !== 'function') throw new TypeError('root element is required');
  if (!api || typeof api.search !== 'function') throw new TypeError('search API is required');
  const state = { status: 'idle', query: '', data: [], nextCursor: null, requestId: null, watermark: 0, consistency: null, error: null, loadingMore: false, retryCursor: null };
  let requestSerial = 0;
  const notify = () => { onState(snapshot()); render(); };
  const snapshot = () => ({ ...state, data: state.data.map((item) => ({ ...item, evidence_refs: [...(item.evidence_refs || [])] })) });
  const setState = (patch) => Object.assign(state, patch);
  const search = async (query = state.query, cursor = null) => {
    const normalized = String(query).trim();
    if (!normalized || normalized.length > MAX_QUERY) { setState({ status: 'error', error: { code: 'invalid_query', message: 'Enter a search term (1–500 characters).' }, retryCursor: null }); notify(); return; }
    const serial = ++requestSerial;
    setState({ status: cursor ? (state.data.length ? 'success' : 'loading') : 'loading', loadingMore: Boolean(cursor), query: normalized, error: null }); notify();
    try {
      const result = await api.search({ query: normalized, limit, cursor });
      if (serial !== requestSerial) return;
      setState({ status: result.data?.length ? 'success' : (cursor && state.data.length ? 'success' : 'empty'), loadingMore: false, data: cursor ? [...state.data, ...(result.data || [])] : (result.data || []), nextCursor: result.page?.next_cursor ?? null, requestId: result.request_id ?? null, watermark: result.watermark ?? 0, consistency: result.consistency ?? null, error: null, retryCursor: null }); notify();
    } catch (error) {
      if (serial !== requestSerial) return;
      setState({ status: 'forbidden' === error.code || error.status === 403 ? 'forbidden' : 'error', loadingMore: false, retryCursor: cursor, error: { code: error.code, status: error.status, message: error.status === 403 ? 'You do not have permission to search these transactions.' : 'Search failed. Try again.' } }); notify();
    }
  };
  const render = () => {
    root.replaceChildren();
    const heading = document.createElement('h1'); heading.textContent = 'Transaction search'; root.append(heading);
    const form = document.createElement('form'); form.setAttribute('aria-label', 'Search transactions');
    const input = document.createElement('input'); input.type = 'search'; input.name = 'query'; input.maxLength = MAX_QUERY; input.required = true; input.value = state.query; input.setAttribute('aria-label', 'Search transactions');
    const button = document.createElement('button'); button.type = 'submit'; button.textContent = 'Search'; button.disabled = state.status === 'loading'; form.append(input, button); root.append(form);
    form.addEventListener('submit', (event) => { event.preventDefault(); search(input.value); });
    const status = document.createElement('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    if (state.status === 'loading') status.textContent = 'Searching…';
    else if (state.status === 'empty') status.textContent = 'No transactions matched your search.';
    else if (state.status === 'forbidden') status.textContent = state.error.message;
    else if (state.status === 'error') status.textContent = state.error.message;
    else if (state.status === 'success') status.textContent = `${state.data.length} transaction${state.data.length === 1 ? '' : 's'} loaded.`;
    root.append(status);
    if (state.status === 'success' || (state.status === 'empty' && state.data.length)) {
      const table = document.createElement('table'); table.setAttribute('aria-label', 'Transaction results');
      const header = document.createElement('tr'); ['Date', 'Amount', 'Currency', 'Account', 'Evidence'].forEach((label) => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; header.append(th); });
      const thead = document.createElement('thead'); thead.append(header); table.append(thead); const body = document.createElement('tbody');
      state.data.forEach((item) => { const row = document.createElement('tr'); [item.posted_at, item.amount, item.currency, item.account_id].forEach((value) => { const cell = document.createElement('td'); cell.textContent = escapeText(value); row.append(cell); }); const evidence = document.createElement('td'); evidence.textContent = (item.evidence_refs || []).map(escapeText).join(', ') || 'None'; row.append(evidence); body.append(row); }); table.append(body); root.append(table);
    }
    const meta = document.createElement('small'); if (state.consistency) meta.textContent = `Projection: ${state.consistency}; watermark ${state.watermark}.`; root.append(meta);
    if (state.nextCursor) { const more = document.createElement('button'); more.type = 'button'; more.textContent = state.loadingMore ? 'Loading…' : 'Load more'; more.disabled = state.loadingMore; more.addEventListener('click', () => search(state.query, state.nextCursor)); root.append(more); }
    if (state.status === 'error' && state.query) { const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Retry'; retry.addEventListener('click', () => search(state.query, state.retryCursor)); root.append(retry); }
  };
  render();
  return { search, snapshot, cancel: () => { requestSerial += 1; setState({ loadingMore: false, error: null }); notify(); } };
}
