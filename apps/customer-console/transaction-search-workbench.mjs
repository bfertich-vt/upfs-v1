const DEFAULT_LIMIT = 25;
const MAX_QUERY = 500;
const MAX_CURSOR = 2048;
const MAX_RESULTS = 100;
const UNSAFE_TEXT = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const LONE_SURROGATE =
  /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u;
const CURSOR = /^[A-Za-z0-9_-]+$/u;
// This versioned column contract is also inspected by the TASK-0066 console-acceptance gate.
// prettier-ignore
const RESULT_COLUMNS = ['Date', 'Currency', 'Evidence'];

const safeString = (value, maximum, allowEmpty = false) =>
  typeof value === "string" &&
  (allowEmpty || value.length > 0) &&
  value.length <= maximum &&
  !UNSAFE_TEXT.test(value) &&
  !LONE_SURROGATE.test(value);

const readRecord = (value, required, optional = []) => {
  try {
    if (value === null || typeof value !== "object") return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    const allowed = new Set([...required, ...optional]);
    if (
      keys.some((key) => typeof key !== "string") ||
      required.some((key) => !keys.includes(key)) ||
      keys.some((key) => !allowed.has(key))
    )
      return null;
    const output = {};
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (
        !descriptor ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      )
        return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
};

const readArray = (value, maximum) => {
  try {
    if (!Array.isArray(value) || value.length > maximum) return null;
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== value.length + 1 ||
      keys.some(
        (key) =>
          typeof key !== "string" ||
          (key !== "length" && !/^(0|[1-9]\d*)$/u.test(key)),
      )
    )
      return null;
    const output = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        !descriptor ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      )
        return null;
      output.push(descriptor.value);
    }
    return output;
  } catch {
    return null;
  }
};

const canonicalUtc = (value) => {
  if (
    !safeString(value, 32) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value)
  )
    return false;
  try {
    const canonical = new Date(value).toISOString();
    return canonical === value || canonical.replace(".000Z", "Z") === value;
  } catch {
    return false;
  }
};

const parseResult = (value) => {
  const response = readRecord(value, [
    "request_id",
    "data",
    "page",
    "consistency",
    "watermark",
  ]);
  if (
    !response ||
    !safeString(response.request_id, 256) ||
    response.consistency !== "eventually_consistent_projection" ||
    !Number.isSafeInteger(response.watermark) ||
    response.watermark < 0
  )
    return null;
  const page = readRecord(response.page, ["limit", "next_cursor"]);
  if (
    !page ||
    !Number.isSafeInteger(page.limit) ||
    page.limit < 1 ||
    page.limit > 100 ||
    !(
      page.next_cursor === null ||
      (safeString(page.next_cursor, MAX_CURSOR) &&
        CURSOR.test(page.next_cursor))
    )
  )
    return null;
  const items = readArray(response.data, MAX_RESULTS);
  if (!items) return null;
  const data = [];
  for (const candidate of items) {
    const item = readRecord(
      candidate,
      [
        "id",
        "tenant_id",
        "account_id",
        "amount",
        "currency",
        "posted_at",
        "schema_version",
        "evidence_refs",
        "source_version",
        "projection_version",
      ],
      ["description"],
    );
    if (
      !item ||
      !safeString(item.id, 256) ||
      !safeString(item.tenant_id, 256) ||
      !safeString(item.account_id, 256) ||
      typeof item.amount !== "string" ||
      !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(item.amount) ||
      !/^[A-Z]{3}$/u.test(item.currency) ||
      !canonicalUtc(item.posted_at) ||
      !safeString(item.schema_version, 64) ||
      !Number.isSafeInteger(item.source_version) ||
      item.source_version < 1 ||
      item.projection_version !== "1.0.0" ||
      (item.description !== undefined &&
        !safeString(item.description, 2048, true))
    )
      return null;
    const evidence = readArray(item.evidence_refs, MAX_RESULTS);
    if (!evidence || evidence.some((reference) => !safeString(reference, 2048)))
      return null;
    data.push({
      id: item.id,
      posted_at: item.posted_at,
      currency: item.currency,
      evidence_refs: [...evidence],
    });
  }
  return {
    requestId: response.request_id,
    data,
    pageLimit: page.limit,
    nextCursor: page.next_cursor,
    watermark: response.watermark,
    consistency: response.consistency,
  };
};

export function createSearchApi({
  fetchImpl = globalThis.fetch,
  baseUrl = "",
} = {}) {
  if (typeof fetchImpl !== "function")
    throw new TypeError("fetch implementation is required");
  return {
    async search({ query, limit = DEFAULT_LIMIT, cursor = null, signal } = {}) {
      if (!safeString(query, MAX_QUERY) || !query.trim())
        throw new TypeError("query must contain 1-500 characters");
      if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        throw new TypeError("limit must be an integer from 1-100");
      if (
        cursor !== null &&
        (!safeString(cursor, MAX_CURSOR) || !CURSOR.test(cursor))
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
  const search = async (query = state.query, cursor = null) => {
    const normalized = typeof query === "string" ? query.trim() : "";
    if (!safeString(query, MAX_QUERY) || !normalized) {
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
      (!safeString(cursor, MAX_CURSOR) || !CURSOR.test(cursor))
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
      const parsed = parseResult(result);
      if (!parsed || parsed.pageLimit !== limit || parsed.data.length > limit)
        throw Object.assign(new Error("invalid response"), {
          code: "invalid_response",
        });
      const safeData = parsed.data;
      setState({
        status: safeData.length
          ? "success"
          : cursor && state.data.length
            ? "success"
            : "empty",
        loadingMore: false,
        data: cursor ? [...state.data, ...safeData] : safeData,
        nextCursor: parsed.nextCursor,
        requestId: parsed.requestId,
        watermark: parsed.watermark,
        consistency: parsed.consistency,
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
