import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  RawEvidenceIntakeService,
  validateEvidence,
} from "./evidence-intake.mjs";

const ids = {
  organization_id: "11111111-1111-4111-8111-111111111111",
  tenant_id: "22222222-2222-4222-8222-222222222222",
  environment_id: "33333333-3333-4333-8333-333333333333",
};
const other = {
  organization_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  tenant_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  environment_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
};
const actor = {
  verified: true,
  issuer: "https://issuer.example.invalid",
  subject: "synthetic-user",
};
const content = "synthetic observation only";
const evidence = {
  id: "44444444-4444-4444-8444-444444444444",
  ...ids,
  correlation_id: "55555555-5555-4555-8555-555555555555",
  source: "synthetic-fixture",
  media_type: "text/plain",
  content,
  content_size: Buffer.byteLength(content),
  content_hash: crypto.createHash("sha256").update(content).digest("hex"),
  observed_at: "2026-01-02T03:04:05Z",
  provenance: {
    source_system: "synthetic-provider",
    source_record_id: "source-1",
    captured_at: "2026-01-02T03:05:00Z",
  },
};
const key = "0123456789abcdef";
const input = (overrides = {}) => ({
  actor,
  evidence,
  idempotencyKey: key,
  ifNoneMatch: "*",
  ...overrides,
});
const clear = { content: "clear", malware: "clear", prompt_injection: "clear" };

function make(options = {}) {
  return new RawEvidenceIntakeService({
    deriveScope: async ({ issuer, subject }) =>
      issuer === actor.issuer && subject === actor.subject ? ids : null,
    scan: async () => clear,
    now: () => new Date("2026-01-03T00:00:00Z"),
    ...options,
  });
}

test("quarantines immutable evidence and emits append-only redacted audit metadata", async () => {
  const service = make();
  const response = await service.intake(input());
  assert.equal(response.status, 201);
  assert.equal(response.body.status, "quarantined");
  assert.deepEqual(response.body.scan, clear);
  assert.equal(response.body.version, 1);
  const audit = service.audit();
  assert.equal(audit.length, 1);
  assert.equal(audit[0].outcome, "quarantined");
  const serialized = JSON.stringify(audit);
  assert.equal(serialized.includes(content), false);
  assert.equal(
    serialized.includes(evidence.provenance.source_record_id),
    false,
  );
  response.body.content = "tampered";
  response.body.scan.malware = "blocked";
  audit[0].tenant_id = other.tenant_id;
  const fetched = await service.get({ actor, id: evidence.id });
  assert.equal(fetched.body.content, content);
  assert.equal(fetched.body.scan.malware, "clear");
  assert.equal(service.audit()[0].tenant_id, ids.tenant_id);
});

test("derives scope from verified identity and denies forged or cross-scope access without disclosure", async () => {
  const service = make();
  assert.equal(
    (await service.intake(input({ actor: { ...actor, verified: false } }))).body
      .code,
    "authentication_required",
  );
  assert.equal(
    (await service.intake(input({ actor: { ...actor, subject: "unknown" } })))
      .body.code,
    "forbidden",
  );
  const forged = await service.intake(
    input({ evidence: { ...evidence, ...other } }),
  );
  assert.deepEqual(forged, {
    status: 404,
    body: { code: "resource_not_found", retryable: false },
  });
  await service.intake(input());
  const crossScope = make({ deriveScope: async () => other });
  assert.deepEqual(await crossScope.get({ actor, id: evidence.id }), {
    status: 404,
    body: { code: "resource_not_found", retryable: false },
  });
  assert.equal(JSON.stringify(forged).includes(ids.tenant_id), false);
});

test("binds idempotency to scope and payload and enforces conditional create", async () => {
  const service = make();
  assert.equal(
    (await service.intake(input({ ifNoneMatch: undefined }))).body.code,
    "precondition_required",
  );
  const first = await service.intake(input());
  assert.deepEqual(await service.intake(input()), first);
  const changedContent = "different synthetic content";
  const changed = {
    ...evidence,
    content: changedContent,
    content_size: Buffer.byteLength(changedContent),
    content_hash: crypto
      .createHash("sha256")
      .update(changedContent)
      .digest("hex"),
  };
  assert.equal(
    (await service.intake(input({ evidence: changed }))).body.code,
    "idempotency_conflict",
  );
  assert.equal(service.audit().length, 1);
  const competing = await service.intake(
    input({ idempotencyKey: "fedcba9876543210" }),
  );
  assert.equal(competing.body.code, "evidence_already_exists");
});

test("serial concurrent conditional creates publish exactly one atomic record", async () => {
  const service = make();
  const [a, b] = await Promise.all([
    service.intake(input()),
    service.intake(input({ idempotencyKey: "fedcba9876543210" })),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  assert.equal(service.audit().length, 1);
});

test("fails closed for scanner exceptions, timeout, malformed output, and unsafe classifications", async () => {
  const cases = [
    {
      scan: async () => {
        throw new Error(`secret:${content}`);
      },
      code: "scanner_unavailable",
      status: 503,
    },
    {
      scan: async () => new Promise(() => {}),
      scannerTimeoutMs: 10,
      code: "scanner_unavailable",
      status: 503,
    },
    {
      scan: async () => ({ malware: "clear" }),
      code: "scanner_invalid_result",
      status: 503,
    },
    {
      scan: async () => ({ ...clear, malware: "blocked" }),
      code: "malware_detected",
      status: 422,
    },
    {
      scan: async () => ({ ...clear, content: "suspicious" }),
      code: "content_rejected",
      status: 422,
    },
    {
      scan: async () => ({ ...clear, prompt_injection: "suspicious" }),
      code: "prompt_injection_detected",
      status: 422,
    },
  ];
  for (const entry of cases) {
    const service = make(entry);
    const response = await service.intake(input());
    assert.equal(response.status, entry.status);
    assert.equal(response.body.code, entry.code);
    assert.equal(JSON.stringify(response).includes(content), false);
    assert.deepEqual(service.audit(), []);
    assert.equal((await service.get({ actor, id: evidence.id })).status, 404);
  }
});

test("injected commit failure rolls back record, idempotency, and audit and permits corrective-forward retry", async () => {
  let fail = true;
  const service = make({
    beforeCommit: async () => {
      if (fail) throw new Error(`database:${content}`);
    },
  });
  const rejected = await service.intake(input());
  assert.deepEqual(rejected, {
    status: 503,
    body: { code: "commit_failed", retryable: true },
  });
  assert.equal((await service.get({ actor, id: evidence.id })).status, 404);
  assert.deepEqual(service.audit(), []);
  fail = false;
  assert.equal((await service.intake(input())).status, 201);
  assert.equal(service.audit().length, 1);
});

test("runtime validator rejects schema, correlation, provenance, timestamp, media, size, hash, and control drift", () => {
  assert.equal(validateEvidence(evidence), null);
  const cases = [
    [{ ...evidence, id: "not-a-uuid" }, "invalid_identifier"],
    [{ ...evidence, correlation_id: "not-a-uuid" }, "invalid_identifier"],
    [{ ...evidence, source: "unsafe\nsource" }, "invalid_metadata"],
    [
      { ...evidence, media_type: "application/octet-stream" },
      "invalid_metadata",
    ],
    [{ ...evidence, content: "bad\u0000content" }, "invalid_content"],
    [{ ...evidence, content_size: 999 }, "invalid_content_size"],
    [{ ...evidence, content_hash: "0".repeat(64) }, "invalid_content_hash"],
    [
      { ...evidence, observed_at: "2026-99-99T00:00:00Z" },
      "invalid_observed_at",
    ],
    [
      {
        ...evidence,
        provenance: {
          ...evidence.provenance,
          captured_at: "2026-01-01T00:00:00Z",
        },
      },
      "invalid_provenance",
    ],
    [
      {
        ...evidence,
        provenance: { ...evidence.provenance, source_record_id: "bad\nvalue" },
      },
      "invalid_provenance",
    ],
    [{ ...evidence, extra: true }, "invalid_evidence"],
  ];
  for (const [candidate, expected] of cases)
    assert.equal(validateEvidence(candidate), expected);
  const unicode = "café — exact UTF-8";
  const valid = {
    ...evidence,
    content: unicode,
    content_size: Buffer.byteLength(unicode, "utf8"),
    content_hash: crypto
      .createHash("sha256")
      .update(unicode, "utf8")
      .digest("hex"),
  };
  assert.equal(validateEvidence(valid), null);
});

test("strict UTC timestamp validation rejects normalized calendar and noncanonical values", () => {
  const invalid = [
    "2023-02-29T00:00:00Z",
    "2024-02-30T00:00:00Z",
    "2024-02-31T00:00:00Z",
    "1900-02-29T00:00:00Z",
    "2024-00-01T00:00:00Z",
    "2024-13-01T00:00:00Z",
    "2024-04-31T00:00:00Z",
    "2024-01-00T00:00:00Z",
    "2024-01-32T00:00:00Z",
    "2024-01-01T24:00:00Z",
    "2024-01-01T00:60:00Z",
    "2024-01-01T00:00:60Z",
    "2024-01-01t00:00:00Z",
    "2024-01-01T00:00:00z",
    "2024-01-01T00:00Z",
    "2024-1-01T00:00:00Z",
    "2024-01-1T00:00:00Z",
    "2024-01-01T00:00:00+00:00",
    "2024-01-01T00:00:00.1234567890Z",
    " 2024-01-01T00:00:00Z",
  ];
  for (const timestamp of invalid) {
    assert.equal(
      validateEvidence({ ...evidence, observed_at: timestamp }),
      "invalid_observed_at",
      `observed_at ${timestamp}`,
    );
    assert.equal(
      validateEvidence({
        ...evidence,
        provenance: { ...evidence.provenance, captured_at: timestamp },
      }),
      "invalid_provenance",
      `captured_at ${timestamp}`,
    );
  }

  for (const timestamp of [
    "0001-01-01T00:00:00Z",
    "2000-02-29T23:59:59Z",
    "2024-02-29T00:00:00.1Z",
    "2024-12-31T23:59:59.123456789Z",
    "9999-12-31T23:59:59.999999999Z",
  ]) {
    const candidate = {
      ...evidence,
      observed_at: timestamp,
      provenance: { ...evidence.provenance, captured_at: timestamp },
    };
    assert.equal(validateEvidence(candidate), null, timestamp);
  }

  assert.equal(
    validateEvidence({
      ...evidence,
      observed_at: "2026-01-02T03:04:05.000000002Z",
      provenance: {
        ...evidence.provenance,
        captured_at: "2026-01-02T03:04:05.000000001Z",
      },
    }),
    "invalid_provenance",
  );
});

test("malformed derived scope is bounded to identical denial without mutation or leakage", async () => {
  const throwingGetter = {};
  Object.defineProperty(throwingGetter, "organization_id", {
    enumerable: true,
    get() {
      throw new Error(`getter:${content}`);
    },
  });
  const throwingProxy = new Proxy(ids, {
    ownKeys() {
      throw new Error(`proxy:${content}`);
    },
  });
  const throwingToString = {
    toString() {
      throw new Error(`toString:${content}`);
    },
  };
  const malformed = [
    { ...ids, organization_id: Symbol("secret") },
    { ...ids, organization_id: 1n },
    { ...ids, organization_id: throwingToString },
    { ...ids, organization_id: [] },
    { ...ids, organization_id: null },
    { ...ids, organization_id: undefined },
    { ...ids, extra: "not-allowed" },
    { organization_id: ids.organization_id },
    throwingGetter,
    throwingProxy,
    null,
  ];
  const denial = {
    status: 403,
    body: { code: "forbidden", retryable: false },
  };
  for (const scope of malformed) {
    let scannerCalls = 0;
    const service = make({
      deriveScope: async () => scope,
      scan: async () => {
        scannerCalls += 1;
        return clear;
      },
    });
    const response = await service.intake(input());
    assert.deepEqual(response, denial);
    assert.equal(JSON.stringify(response).includes(content), false);
    assert.equal(scannerCalls, 0);
    assert.deepEqual(service.audit(), []);
    assert.deepEqual(await service.get({ actor, id: evidence.id }), {
      status: 404,
      body: { code: "resource_not_found", retryable: false },
    });
  }
});

test("derived scope rejects every unexpected own key and descriptor before scanner or state", async () => {
  const localSymbol = Symbol("hidden-local");
  const globalSymbol = Symbol.for("hidden-global");
  const malformed = [
    Object.assign({ ...ids }, { [localSymbol]: "secret" }),
    Object.assign({ ...ids }, { [globalSymbol]: "secret" }),
    Object.assign({ ...ids }, { [Symbol.iterator]: () => [] }),
    Object.defineProperty({ ...ids }, "hidden", {
      value: "secret",
      enumerable: false,
    }),
    Object.defineProperty({ ...ids }, localSymbol, {
      value: "secret",
      enumerable: false,
    }),
    { ...ids, "tenant\uff3fid": ids.tenant_id },
    Object.defineProperty({ ...ids }, "organization_id", {
      get() {
        throw new Error(`accessor:${content}`);
      },
      enumerable: true,
    }),
    new Proxy({ ...ids }, {
      ownKeys() {
        throw new Error(`ownKeys:${content}`);
      },
    }),
    new Proxy({ ...ids }, {
      getOwnPropertyDescriptor() {
        throw new Error(`descriptor:${content}`);
      },
    }),
    new Proxy(Object.preventExtensions({ ...ids }), {
      ownKeys() {
        return ["organization_id", "tenant_id"];
      },
    }),
    new Proxy({ ...ids }, {
      ownKeys() {
        return [
          "organization_id",
          "tenant_id",
          "tenant_id",
          "environment_id",
        ];
      },
    }),
    Object.assign(Object.create({ inherited: "secret" }), ids),
  ];

  for (const scope of malformed) {
    let scannerCalls = 0;
    const service = make({
      deriveScope: async () => scope,
      scan: async () => {
        scannerCalls += 1;
        return clear;
      },
    });
    assert.deepEqual(await service.intake(input()), {
      status: 403,
      body: { code: "forbidden", retryable: false },
    });
    assert.equal(scannerCalls, 0);
    assert.deepEqual(service.audit(), []);
    assert.deepEqual(await service.get({ actor, id: evidence.id }), {
      status: 404,
      body: { code: "resource_not_found", retryable: false },
    });
  }
});

test("malformed derived scope denies get before scoped record lookup", async () => {
  let scope = ids;
  const service = make({ deriveScope: async () => scope });
  assert.equal((await service.intake(input())).status, 201);
  const auditBefore = service.audit();
  scope = Object.assign({ ...ids }, { [Symbol.for("hidden")]: true });
  assert.deepEqual(await service.get({ actor, id: evidence.id }), {
    status: 404,
    body: { code: "resource_not_found", retryable: false },
  });
  assert.deepEqual(service.audit(), auditBefore);
  scope = Object.assign(Object.create(null), ids);
  assert.equal((await service.get({ actor, id: evidence.id })).status, 200);
});

test("scope shape rejection retains no state and valid plain or null-prototype retry succeeds", async () => {
  for (const corrected of [
    { ...ids },
    Object.assign(Object.create(null), ids),
  ]) {
    let scope = Object.assign({ ...ids }, { [Symbol("hidden")]: true });
    let scannerCalls = 0;
    const service = make({
      deriveScope: async () => scope,
      scan: async () => {
        scannerCalls += 1;
        return clear;
      },
    });
    assert.equal((await service.intake(input())).body.code, "forbidden");
    assert.equal(scannerCalls, 0);
    assert.deepEqual(service.audit(), []);
    scope = corrected;
    assert.equal((await service.intake(input())).status, 201);
    assert.equal(scannerCalls, 1);
    assert.equal(service.audit().length, 1);
  }
});

test("malformed scope denial permits corrected retry without retained state", async () => {
  let scope = { ...ids, organization_id: Symbol("secret") };
  let scannerCalls = 0;
  const service = make({
    deriveScope: async () => scope,
    scan: async () => {
      scannerCalls += 1;
      return clear;
    },
  });
  assert.equal((await service.intake(input())).body.code, "forbidden");
  assert.equal(scannerCalls, 0);
  assert.deepEqual(service.audit(), []);
  scope = ids;
  assert.equal((await service.intake(input())).status, 201);
  assert.equal(scannerCalls, 1);
  assert.equal(service.audit().length, 1);
});

test("malformed actor, idempotency, clock, and get identifiers fail closed without leakage", async () => {
  const service = make();
  assert.equal(
    (
      await service.intake(
        input({ actor: { ...actor, issuer: "bad\nissuer" } }),
      )
    ).status,
    401,
  );
  assert.equal(
    (await service.intake(input({ idempotencyKey: "short" }))).body.code,
    "idempotency_key_required",
  );
  assert.equal(
    (await service.get({ actor, id: "bad" })).body.code,
    "resource_not_found",
  );
  const clock = make({ now: () => new Date("invalid") });
  assert.equal((await clock.intake(input())).body.code, "clock_unavailable");
  assert.deepEqual(clock.audit(), []);
});
