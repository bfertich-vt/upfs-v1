import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSearchApi,
  createSearchWorkbench,
} from "./transaction-search-workbench.mjs";
import { evaluateConsoleAcceptance } from "../../scripts/task-0066-console-acceptance.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.textContent = "";
    this.value = "";
    this.disabled = false;
  }
  append(...children) {
    this.children.push(...children);
  }
  replaceChildren(...children) {
    this.children = children;
  }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
  addEventListener(name, handler) {
    this.listeners[name] = handler;
  }
  click() {
    this.listeners.click?.({ preventDefault() {} });
  }
  querySelector(selector) {
    const match = (node) =>
      selector === "button"
        ? node.tagName === "BUTTON"
        : selector === "input"
          ? node.tagName === "INPUT"
          : selector === "form"
            ? node.tagName === "FORM"
            : selector === "table"
              ? node.tagName === "TABLE"
              : false;
    const walk = (nodes) => {
      for (const node of nodes) {
        if (match(node)) return node;
        const found = walk(node.children || []);
        if (found) return found;
      }
      return null;
    };
    return walk(this.children);
  }
  querySelectorAll(selector) {
    const found = [];
    const walk = (nodes) =>
      nodes.forEach((node) => {
        if (
          (selector === "button" && node.tagName === "BUTTON") ||
          (selector === "td" && node.tagName === "TD")
        )
          found.push(node);
        walk(node.children || []);
      });
    walk(this.children);
    return found;
  }
}
globalThis.document = { createElement: (tag) => new FakeElement(tag) };
const root = () => new FakeElement("main");
const transaction = (id, overrides = {}) => ({
  id,
  tenant_id: "tenant-authorized",
  account_id: "account-redacted",
  amount: "1.00",
  currency: "USD",
  posted_at: "2026-01-01T00:00:00Z",
  schema_version: "1.0.0",
  evidence_refs: ["evidence-safe"],
  source_version: 1,
  projection_version: "1.0.0",
  ...overrides,
});
const response = (data = [], nextCursor = null) => ({
  request_id: "request-safe",
  data,
  page: { limit: 25, next_cursor: nextCursor },
  consistency: "eventually_consistent_projection",
  watermark: 4,
});

test("search API uses the supported endpoint, bounded request, and no tenant shortcut", async () => {
  let request;
  const api = createSearchApi({
    baseUrl: "https://api.test",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => response(),
      };
    },
  });
  await api.search({ query: "coffee", limit: 25, cursor: "cursor-1" });
  assert.equal(request.url, "https://api.test/v1/transactions/search");
  assert.equal(request.options.credentials, "include");
  assert.deepEqual(JSON.parse(request.options.body), {
    query: "coffee",
    limit: 25,
    cursor: "cursor-1",
  });
  assert.equal(
    Object.hasOwn(JSON.parse(request.options.body), "tenant_id"),
    false,
  );
});

test("API errors preserve permission and retry classification without leaking payload", async () => {
  const api = createSearchApi({
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      json: async () => ({ code: "forbidden", message: "denied" }),
    }),
  });
  await assert.rejects(
    api.search({ query: "x" }),
    (error) =>
      error.status === 403 &&
      error.code === "forbidden" &&
      error.retryable === false,
  );
});

test("search API never exposes server error text", async () => {
  const api = createSearchApi({
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      json: async () => ({
        code: "unavailable",
        message: "tenant-a account 123456 must-not-leak",
      }),
    }),
  });
  await assert.rejects(
    api.search({ query: "x" }),
    (error) => error.status === 503 && error.message === "search_unavailable",
  );
});

test("API server failures are retryable", async () => {
  const api = createSearchApi({
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      json: async () => ({ code: "unavailable" }),
    }),
  });
  await assert.rejects(
    api.search({ query: "x" }),
    (error) => error.status === 503 && error.retryable === true,
  );
});

test("workbench renders loading, empty, and safe text states with keyboard controls", async () => {
  let resolve;
  const api = {
    search: () =>
      new Promise((r) => {
        resolve = r;
      }),
  };
  const host = root();
  const workbench = createSearchWorkbench({ root: host, api });
  const input = host.querySelector("input");
  input.value = "coffee";
  host.querySelector("form").listeners.submit({ preventDefault() {} });
  assert.equal(host.querySelector("button").disabled, true);
  resolve(response());
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(
    host.children.some(
      (node) => node.textContent === "No transactions matched your search.",
    ),
    true,
  );
  assert.equal(workbench.snapshot().status, "empty");
});

test("load-more failure preserves existing rows and retries the same cursor", async () => {
  const calls = [];
  const responses = [
    response([transaction("1", { evidence_refs: ["<safe>"] })], "next"),
  ];
  const api = {
    search: async (args) => {
      calls.push(args);
      if (calls.length === 1) return responses[0];
      if (calls.length === 2)
        throw Object.assign(new Error("down"), {
          status: 503,
          code: "unavailable",
        });
      return response([
        transaction("2", {
          posted_at: "2026-01-02T00:00:00Z",
          evidence_refs: ["ev-2"],
        }),
      ]);
    },
  };
  const host = root();
  const workbench = createSearchWorkbench({ root: host, api });
  await workbench.search("coffee");
  host
    .querySelectorAll("button")
    .find((b) => b.textContent === "Load more")
    .click();
  await new Promise((r) => setImmediate(r));
  assert.equal(workbench.snapshot().data.length, 1);
  assert.equal(workbench.snapshot().nextCursor, "next");
  host
    .querySelectorAll("button")
    .find((b) => b.textContent === "Retry")
    .click();
  await new Promise((r) => setImmediate(r));
  assert.equal(calls[2].cursor, "next");
  assert.equal(workbench.snapshot().data.length, 2);
  assert.match(
    host
      .querySelectorAll("td")
      .map((c) => c.textContent)
      .join("|"),
    /&lt;safe&gt;|<safe>/,
  );
});

test("forbidden and cancellation do not allow stale responses to mutate state", async () => {
  let resolve;
  const api = {
    search: async () => {
      await new Promise((r) => {
        resolve = r;
      });
      return response([transaction("stale")]);
    },
  };
  const host = root();
  const workbench = createSearchWorkbench({ root: host, api });
  const pending = workbench.search("x");
  workbench.cancel();
  resolve();
  await pending;
  assert.deepEqual(workbench.snapshot().data, []);
  const forbidden = createSearchWorkbench({
    root: root(),
    api: {
      search: async () => {
        throw Object.assign(new Error(), { status: 403, code: "forbidden" });
      },
    },
  });
  await forbidden.search("x");
  assert.equal(forbidden.snapshot().status, "forbidden");
});

test("adapter rejects unbounded or malformed query, limit, and cursor before network access", async () => {
  let calls = 0;
  const api = createSearchApi({
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, json: async () => ({}) };
    },
  });
  await assert.rejects(
    api.search({ query: { toString: () => "coerce" } }),
    TypeError,
  );
  await assert.rejects(api.search({ query: "x", limit: 0 }), TypeError);
  await assert.rejects(api.search({ query: "x", limit: 101 }), TypeError);
  await assert.rejects(
    api.search({ query: "x", cursor: "x".repeat(2049) }),
    TypeError,
  );
  assert.equal(calls, 0);
});

test("workbench strips tenant, account, amount, and description fields from observable state", async () => {
  const host = root();
  const workbench = createSearchWorkbench({
    root: host,
    api: {
      search: async () =>
        response([
          transaction("tx-1", {
            tenant_id: "other-tenant-secret",
            account_id: "account-secret",
            amount: "999.99",
            description: "private description",
          }),
        ]),
    },
  });
  await workbench.search("coffee");
  const serialized = JSON.stringify(workbench.snapshot());
  assert.doesNotMatch(
    serialized,
    /other-tenant-secret|account-secret|999\.99|private description/,
  );
  assert.match(serialized, /tx-1|evidence-safe/);
});

test("malformed response fails closed without rendering server or financial payloads", async () => {
  const host = root();
  const workbench = createSearchWorkbench({
    root: host,
    api: {
      search: async () => ({
        data: { tenant_id: "leak", amount: "9000" },
        page: null,
      }),
    },
  });
  await workbench.search("coffee");
  assert.equal(workbench.snapshot().status, "error");
  assert.equal(workbench.snapshot().error.code, "search_unavailable");
  assert.doesNotMatch(
    host.children.map((node) => node.textContent).join("|"),
    /leak|9000|invalid response/,
  );
});

test("complete response validation rejects malformed items atomically and corrected retry succeeds", async () => {
  const malformed = [
    {},
    transaction("missing", { posted_at: undefined }),
    transaction("date", { posted_at: "2026-02-30T00:00:00Z" }),
    transaction("currency", { currency: "usd" }),
    transaction("amount", { amount: 1n }),
    transaction("extra", { provider_secret: "must-not-leak" }),
    transaction("evidence", { evidence_refs: ["x".repeat(2049)] }),
  ];
  for (const item of malformed) {
    const calls = [];
    const workbench = createSearchWorkbench({
      root: root(),
      api: {
        search: async () => {
          calls.push(true);
          return response([transaction("valid"), item]);
        },
      },
    });
    await workbench.search("coffee");
    assert.equal(workbench.snapshot().status, "error");
    assert.deepEqual(workbench.snapshot().data, []);
    assert.equal(
      workbench.snapshot().error.message,
      "Search failed. Try again.",
    );
    assert.equal(calls.length, 1);
  }
  let call = 0;
  const workbench = createSearchWorkbench({
    root: root(),
    api: {
      search: async () =>
        ++call === 1 ? response([{}]) : response([transaction("corrected")]),
    },
  });
  await workbench.search("coffee");
  await workbench.search("coffee");
  assert.equal(workbench.snapshot().data[0].id, "corrected");
});

test("accessors, proxies, symbols, sparse arrays, and circular values fail closed without leakage", async () => {
  const getter = transaction("getter");
  Object.defineProperty(getter, "id", {
    enumerable: true,
    get() {
      throw new Error("tenant-secret");
    },
  });
  const throwingProxy = new Proxy(transaction("proxy"), {
    ownKeys() {
      throw new Error("account-secret");
    },
  });
  const symbol = transaction("symbol");
  symbol[Symbol("hidden")] = "financial-secret";
  const sparse = response([transaction("valid")]);
  sparse.data.length = 2;
  const circular = transaction("circular");
  circular.description = circular;
  for (const payload of [
    response([getter]),
    response([throwingProxy]),
    response([symbol]),
    sparse,
    response([circular]),
  ]) {
    const host = root();
    const workbench = createSearchWorkbench({
      root: host,
      api: { search: async () => payload },
    });
    await workbench.search("coffee");
    assert.equal(workbench.snapshot().status, "error");
    assert.doesNotMatch(
      JSON.stringify(workbench.snapshot()),
      /tenant-secret|account-secret|financial-secret/,
    );
  }
});

test("request controls and unsafe Unicode are rejected before fetch", async () => {
  let fetches = 0;
  const api = createSearchApi({
    fetchImpl: async () => {
      fetches += 1;
      return { ok: true, json: async () => response() };
    },
  });
  for (const query of [
    "coffee\u0000secret",
    "coffee\u0085secret",
    "coffee\u202esecret",
    "coffee\ud800",
  ])
    await assert.rejects(api.search({ query }), TypeError);
  for (const cursor of [
    "next\nline",
    "next\u009f",
    "next+unsafe",
    "next\udfff",
  ])
    await assert.rejects(api.search({ query: "coffee", cursor }), TypeError);
  assert.equal(fetches, 0);
});

test("failed continuation preserves prior rows and cursor without partial append", async () => {
  let call = 0;
  const api = {
    search: async () =>
      ++call === 1
        ? response([transaction("first")], "next")
        : response([transaction("second"), {}]),
  };
  const workbench = createSearchWorkbench({ root: root(), api });
  await workbench.search("coffee");
  await workbench.search("coffee", "next");
  assert.equal(workbench.snapshot().status, "error");
  assert.deepEqual(
    workbench.snapshot().data.map((item) => item.id),
    ["first"],
  );
  assert.equal(workbench.snapshot().nextCursor, "next");
  assert.equal(workbench.snapshot().retryCursor, "next");
});

test("projection reconciliation mismatch is surfaced and retry preserves source-neutral query", async () => {
  const calls = [];
  const host = root();
  const workbench = createSearchWorkbench({
    root: host,
    api: {
      search: async (args) => {
        calls.push(args);
        if (calls.length === 1)
          throw Object.assign(new Error("canonical details must not render"), {
            status: 409,
            code: "projection_reconciliation_required",
          });
        return { ...response(), watermark: 7 };
      },
    },
  });
  await workbench.search("coffee");
  assert.equal(workbench.snapshot().status, "stale");
  assert.match(
    workbench.snapshot().error.message,
    /Source records are unchanged/,
  );
  assert.doesNotMatch(workbench.snapshot().error.message, /canonical details/);
  host
    .querySelectorAll("button")
    .find((button) => button.textContent === "Retry")
    .click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls[1].query, "coffee");
  assert.equal(calls[1].cursor, null);
});

test("new search aborts prior request and late resolution cannot overwrite fresh results", async () => {
  let firstResolve;
  let firstSignal;
  const api = {
    search: ({ query, signal }) =>
      query === "first"
        ? new Promise((resolve) => {
            firstResolve = resolve;
            firstSignal = signal;
          })
        : Promise.resolve(
            response([
              transaction("fresh", {
                posted_at: "2026-02-01T00:00:00Z",
                evidence_refs: [],
              }),
            ]),
          ),
  };
  const workbench = createSearchWorkbench({ root: root(), api });
  const first = workbench.search("first");
  await workbench.search("second");
  assert.equal(firstSignal.aborted, true);
  firstResolve(response([transaction("stale", { evidence_refs: [] })]));
  await first;
  assert.equal(workbench.snapshot().data[0].id, "fresh");
});

test("cancel aborts in-flight API work and returns keyboard UI to idle safely", async () => {
  let signal;
  const host = root();
  const workbench = createSearchWorkbench({
    root: host,
    api: {
      search: ({ signal: value }) => {
        signal = value;
        return new Promise(() => {});
      },
    },
  });
  workbench.search("coffee");
  workbench.cancel();
  assert.equal(signal.aborted, true);
  assert.equal(workbench.snapshot().status, "idle");
  assert.equal(host.querySelector("button").disabled, false);
});

test("versioned TASK-0066 console contract accepts the current workbench source binding", () => {
  const review = JSON.parse(
    fs.readFileSync(
      path.join(repositoryRoot, "contracts/task-0066-console-acceptance.json"),
      "utf8",
    ),
  );
  const result = evaluateConsoleAcceptance({ review });
  assert.equal(result.status, "passed");
  assert.equal(
    result.checks.find((check) => check.name === "implementation")?.status,
    "passed",
  );
});
