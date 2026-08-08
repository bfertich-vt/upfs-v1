const DEFAULT_LIMIT = 25;
const MAX_QUERY = 500;
const MAX_CURSOR = 2048;
// This versioned column contract is also inspected by the TASK-0066 console-acceptance gate.
// prettier-ignore
const RESULT_COLUMNS = ['Date', 'Currency', 'Evidence'];

const text = (value) => String(value ?? "");

export function createSearchApi({
  fetchImpl = globalThis.fetch,
  baseUrl = "",
} = {}) {
  if (typeof fetchImpl !== "function")
    throw new TypeError("fetch implementation is required");
  return {
    async search({ query, limit = DEFAULT_LIMIT, cursor = null, signal } = {}) {
      if (
        typeof query !== "string" ||
        !query.trim() ||
        query.trim().length > MAX_QUERY
      )
        throw new TypeError("query must contain 1-500 characters");
      if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        throw new TypeError("limit must be an integer from 1-100");
      if (
        cursor !== null &&
        (typeof cursor !== "string" || !cursor || cursor.length > MAX_CURSOR)
      )
        throw new TypeError("cursor must be a bounded non-empty string");
      const response = await fetchImpl(`${baseUrl}/v1/transactions/search`, {
        method: "POST",
        credentials: "include",
        signal,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          limit,
          ...(cursor ? { cursor } : {}),
        }),
      });
      let body;
      try {
        body = await response.json();
      } catch {
        body = {};
      }
      if (!response.ok) {
        const error = new Error(
          response.status === 403 ? "search_forbidden" : "search_unavailable",
        );
        error.status = response.status;
        error.code = typeof body?.code === "string" ? body.code : undefined;
        error.retryable = response.status >= 500;
        throw error;
      }
      return body;
    },
  };
}

export function createSearchWorkbench({
  root,
  api,
  limit = DEFAULT_LIMIT,
  onState = () => {},
} = {}) {
  if (!root || typeof root.querySelector !== "function")
    throw new TypeError("root element is required");
  if (!api || typeof api.search !== "function")
    throw new TypeError("search API is required");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new TypeError("limit must be an integer from 1-100");
  const state = {
    status: "idle",
    query: "",
    data: [],
    nextCursor: null,
    requestId: null,
    watermark: 0,
    consistency: null,
    error: null,
    loadingMore: false,
    retryCursor: null,
  };
  let requestSerial = 0;
  let activeController = null;
  const snapshot = () => ({
    ...state,
    data: state.data.map((item) => ({
      ...item,
      evidence_refs: [...item.evidence_refs],
    })),
  });
  const notify = () => {
    onState(snapshot());
    render();
  };
  const setState = (patch) => Object.assign(state, patch);
  const safeTransaction = (item) => ({
    id: text(item?.id),
    posted_at: text(item?.posted_at),
    currency: text(item?.currency),
    evidence_refs: Array.isArray(item?.evidence_refs)
      ? item.evidence_refs.slice(0, 100).map(text)
      : [],
  });
  const validResult = (result) =>
    result &&
    Array.isArray(result.data) &&
    result.page &&
    (result.page.next_cursor == null ||
      (typeof result.page.next_cursor === "string" &&
        result.page.next_cursor.length <= MAX_CURSOR)) &&
    (result.consistency === undefined ||
      result.consistency === "eventually_consistent_projection") &&
    (result.watermark === undefined ||
      (Number.isInteger(result.watermark) && result.watermark >= 0));

  const search = async (query = state.query, cursor = null) => {
    const normalized = typeof query === "string" ? query.trim() : "";
    if (!normalized || normalized.length > MAX_QUERY) {
      setState({
        status: "error",
        error: {
          code: "invalid_query",
          message: "Enter a search term (1-500 characters).",
        },
        retryCursor: null,
      });
      notify();
      return;
    }
    if (
      cursor !== null &&
      (typeof cursor !== "string" || !cursor || cursor.length > MAX_CURSOR)
    ) {
      setState({
        status: "error",
        error: {
          code: "invalid_cursor",
          message: "Search continuation expired. Start a new search.",
        },
        retryCursor: null,
        nextCursor: null,
      });
      notify();
      return;
    }
    const serial = ++requestSerial;
    activeController?.abort();
    activeController =
      typeof AbortController === "function" ? new AbortController() : null;
    setState({
      status: cursor ? (state.data.length ? "success" : "loading") : "loading",
      loadingMore: Boolean(cursor),
      query: normalized,
      error: null,
    });
    notify();
    try {
      const result = await api.search({
        query: normalized,
        limit,
        cursor,
        signal: activeController?.signal,
      });
      if (serial !== requestSerial) return;
      if (!validResult(result))
        throw Object.assign(new Error("invalid response"), {
          code: "invalid_response",
        });
      const safeData = result.data.map(safeTransaction);
      setState({
        status: safeData.length
          ? "success"
          : cursor && state.data.length
            ? "success"
            : "empty",
        loadingMore: false,
        data: cursor ? [...state.data, ...safeData] : safeData,
        nextCursor: result.page.next_cursor ?? null,
        requestId:
          typeof result.request_id === "string" ? result.request_id : null,
        watermark: result.watermark ?? 0,
        consistency: result.consistency ?? null,
        error: null,
        retryCursor: null,
      });
      notify();
    } catch (error) {
      if (serial !== requestSerial || error?.name === "AbortError") return;
      const forbidden = error?.code === "forbidden" || error?.status === 403;
      const stale =
        error?.code === "projection_reconciliation_required" ||
        error?.code === "stale_projection";
      setState({
        status: forbidden ? "forbidden" : stale ? "stale" : "error",
        loadingMore: false,
        retryCursor: cursor,
        error: {
          code: forbidden
            ? "forbidden"
            : stale
              ? "projection_stale"
              : "search_unavailable",
          status: error?.status,
          message: forbidden
            ? "You do not have permission to search these transactions."
            : stale
              ? "Search results are temporarily stale while the projection is reconciled. Source records are unchanged."
              : "Search failed. Try again.",
        },
      });
      notify();
    } finally {
      if (serial === requestSerial) activeController = null;
    }
  };

  const render = () => {
    root.replaceChildren();
    const heading = document.createElement("h1");
    heading.textContent = "Transaction search";
    root.append(heading);
    const form = document.createElement("form");
    form.setAttribute("aria-label", "Search transactions");
    const input = document.createElement("input");
    input.type = "search";
    input.name = "query";
    input.maxLength = MAX_QUERY;
    input.required = true;
    input.value = state.query;
    input.setAttribute("aria-label", "Search transactions");
    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "Search";
    button.disabled = state.status === "loading";
    form.append(input, button);
    root.append(form);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      search(input.value);
    });
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    if (state.status === "loading") status.textContent = "Searching...";
    else if (state.status === "empty")
      status.textContent = "No transactions matched your search.";
    else if (["forbidden", "stale", "error"].includes(state.status))
      status.textContent = state.error.message;
    else if (state.status === "success")
      status.textContent = `${state.data.length} transaction${state.data.length === 1 ? "" : "s"} loaded.`;
    root.append(status);
    if (
      state.status === "success" ||
      (state.status === "empty" && state.data.length)
    ) {
      const table = document.createElement("table");
      table.setAttribute("aria-label", "Redacted transaction results");
      const header = document.createElement("tr");
      RESULT_COLUMNS.forEach((label) => {
        const th = document.createElement("th");
        th.scope = "col";
        th.textContent = label;
        header.append(th);
      });
      const thead = document.createElement("thead");
      thead.append(header);
      table.append(thead);
      const body = document.createElement("tbody");
      state.data.forEach((item) => {
        const row = document.createElement("tr");
        [item.posted_at, item.currency].forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });
        const evidence = document.createElement("td");
        evidence.textContent = item.evidence_refs.join(", ") || "None";
        row.append(evidence);
        body.append(row);
      });
      table.append(body);
      root.append(table);
    }
    const meta = document.createElement("small");
    if (state.consistency)
      meta.textContent = `Projection: ${state.consistency}; watermark ${state.watermark}.`;
    root.append(meta);
    if (state.nextCursor) {
      const more = document.createElement("button");
      more.type = "button";
      more.textContent = state.loadingMore ? "Loading..." : "Load more";
      more.disabled = state.loadingMore;
      more.addEventListener("click", () =>
        search(state.query, state.nextCursor),
      );
      root.append(more);
    }
    if ((state.status === "error" || state.status === "stale") && state.query) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.textContent = "Retry";
      retry.addEventListener("click", () =>
        search(state.query, state.retryCursor),
      );
      root.append(retry);
    }
  };
  render();
  return {
    search,
    snapshot,
    cancel: () => {
      requestSerial += 1;
      activeController?.abort();
      activeController = null;
      setState({
        status: state.data.length ? "success" : "idle",
        loadingMore: false,
        error: null,
      });
      notify();
    },
  };
}
