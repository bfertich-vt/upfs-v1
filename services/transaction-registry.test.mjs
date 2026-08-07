import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CanonicalTransactionService,
  generateRegistry,
  validateTransaction,
} from "./transaction-registry.mjs";

const ids = {
  tenant: "11111111-1111-4111-8111-111111111111",
  environment: "22222222-2222-4222-8222-222222222222",
  otherTenant: "33333333-3333-4333-8333-333333333333",
  otherEnvironment: "44444444-4444-4444-8444-444444444444",
  account: "55555555-5555-4555-8555-555555555555",
  transaction: "66666666-6666-4666-8666-666666666666",
};
const actor = {
  issuer: "https://issuer.example.invalid",
  subject: "user-1",
  verified: true,
  membership: "ignored-request-data",
};
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const tx = {
  id: ids.transaction,
  tenant_id: ids.tenant,
  environment_id: ids.environment,
  account_id: ids.account,
  amount: "12.34",
  currency: "USD",
  posted_at: "2026-01-01T00:00:00Z",
  schema_version: "1.1.0",
  lifecycle_state: "active",
  valid_time: { from: "2026-01-01T00:00:00Z", to: null },
  source_observations: ["observation:1"],
  evidence_refs: ["evidence:1"],
  confidence: 0.95,
  data_classification: "restricted",
  provider_categories: [
    { provider: "synthetic-provider", category: "FOOD_AND_DRINK" },
  ],
  taxonomy: {
    domain: "spend",
    family: "living",
    class: "food",
    subclass: "restaurant",
    intent: "purchase",
    cash_flow_role: "outflow",
    tax_relevance: "none",
    recurrence: "one_time",
  },
  provenance: [
    {
      kind: "source_mapping",
      actor: "connector:synthetic",
      at: "2026-01-01T00:00:00Z",
      source_ref: "observation:1",
    },
  ],
};

function service(options = {}) {
  return new CanonicalTransactionService({
    deriveScope: (_actor, permission) =>
      permission.startsWith("transaction:")
        ? {
            authorized: true,
            tenantId: ids.tenant,
            environmentId: ids.environment,
          }
        : null,
    now: () => new Date("2026-01-02T00:00:00Z"),
    ...options,
  });
}

test("validates the canonical financial, taxonomy, bitemporal, and evidence model", () => {
  assert.equal(validateTransaction(tx), null);
  for (const candidate of [
    { ...tx, amount: "01.00" },
    { ...tx, amount: "-0.00" },
    { ...tx, amount: "1.23456" },
    { ...tx, currency: "usd" },
    { ...tx, taxonomy: { ...tx.taxonomy, surprise: "unsafe" } },
    { ...tx, provider_categories: [] },
    {
      ...tx,
      valid_time: { from: "2026-01-02T00:00:00Z", to: "2026-01-01T00:00:00Z" },
    },
    { ...tx, evidence_refs: ["evidence:1", "evidence:1"] },
    { ...tx, source_observations: [""] },
    { ...tx, confidence: Number.NaN },
    { ...tx, provenance: [{ ...tx.provenance[0], source_ref: "" }] },
    { ...tx, tenant_id: "tenant-a" },
    { ...tx, unknown: "mass-assignment" },
  ])
    assert.notEqual(validateTransaction(candidate), null);
});

test("rejects whitespace and control-only canonical metadata without mutation or leakage", () => {
  const candidates = [
    { ...tx, source_observations: ["   "] },
    { ...tx, source_observations: ["observation:\tunsafe"] },
    { ...tx, evidence_refs: ["\r\n"] },
    {
      ...tx,
      provider_categories: [{ provider: "   ", category: "FOOD" }],
    },
    {
      ...tx,
      provider_categories: [{ provider: "synthetic", category: " \t " }],
    },
    ...Object.keys(tx.taxonomy).map((field) => ({
      ...tx,
      taxonomy: { ...tx.taxonomy, [field]: "   " },
    })),
    { ...tx, taxonomy: { ...tx.taxonomy, family: "living\u0000unsafe" } },
    ...["kind", "actor", "source_ref"].map((field) => ({
      ...tx,
      provenance: [{ ...tx.provenance[0], [field]: "   " }],
    })),
    {
      ...tx,
      provenance: [{ ...tx.provenance[0], actor: "connector:\tunsafe" }],
    },
    {
      ...tx,
      provenance: [{ ...tx.provenance[0], source_ref: "\n" }],
    },
  ];
  const s = service();
  for (const [index, transaction] of candidates.entries()) {
    const result = s.upsert({
      actor,
      transaction,
      idempotencyKey: `invalid-metadata-${index}`.padEnd(20, "x"),
    });
    assert.equal(result.status, 400);
    assert.match(result.body.code, /^invalid_/);
    assert.equal(JSON.stringify(result).includes("unsafe"), false);
  }
  assert.deepEqual(s.audit(), []);
  assert.equal(
    s.upsert({ actor, transaction: tx, idempotencyKey: "valid-after-invalid" })
      .status,
    201,
  );
  assert.equal(s.history({ actor, id: tx.id }).body.length, 1);
});

test("requires canonical metadata boundaries and accepts valid normal values", () => {
  for (const candidate of [
    { ...tx, evidence_refs: [" evidence:1"] },
    { ...tx, source_observations: ["observation:1 "] },
    {
      ...tx,
      provider_categories: [
        { provider: "synthetic-provider", category: " FOOD_AND_DRINK" },
      ],
    },
    { ...tx, taxonomy: { ...tx.taxonomy, class: "food " } },
    {
      ...tx,
      provenance: [{ ...tx.provenance[0], source_ref: " observation:1" }],
    },
  ])
    assert.notEqual(validateTransaction(candidate), null);
  assert.equal(validateTransaction(tx), null);
});

test("keeps every bounded canonical metadata string in schema parity", () => {
  const cases = [
    {
      name: "source observation",
      maximum: 300,
      withValue: (value) => ({ ...tx, source_observations: [value] }),
    },
    {
      name: "evidence reference",
      maximum: 300,
      withValue: (value) => ({ ...tx, evidence_refs: [value] }),
    },
    {
      name: "provider",
      maximum: 100,
      withValue: (value) => ({
        ...tx,
        provider_categories: [
          { ...tx.provider_categories[0], provider: value },
        ],
      }),
    },
    {
      name: "provider category",
      maximum: 300,
      withValue: (value) => ({
        ...tx,
        provider_categories: [
          { ...tx.provider_categories[0], category: value },
        ],
      }),
    },
    ...Object.keys(tx.taxonomy).map((field) => ({
      name: `taxonomy ${field}`,
      maximum: 100,
      withValue: (value) => ({
        ...tx,
        taxonomy: { ...tx.taxonomy, [field]: value },
      }),
    })),
    {
      name: "provenance kind",
      maximum: 100,
      withValue: (value) => ({
        ...tx,
        provenance: [{ ...tx.provenance[0], kind: value }],
      }),
    },
    {
      name: "provenance actor",
      maximum: 300,
      withValue: (value) => ({
        ...tx,
        provenance: [{ ...tx.provenance[0], actor: value }],
      }),
    },
    {
      name: "provenance source reference",
      maximum: 300,
      withValue: (value) => ({
        ...tx,
        provenance: [{ ...tx.provenance[0], source_ref: value }],
      }),
    },
  ];

  for (const { name, maximum, withValue } of cases) {
    assert.notEqual(validateTransaction(withValue("")), null, `${name}: zero`);
    assert.equal(validateTransaction(withValue("x")), null, `${name}: one`);
    assert.equal(
      validateTransaction(withValue("x".repeat(maximum))),
      null,
      `${name}: exact maximum`,
    );
    assert.notEqual(
      validateTransaction(withValue("x".repeat(maximum + 1))),
      null,
      `${name}: over maximum`,
    );
    for (const [label, value] of [
      ["whitespace", "   "],
      ["leading whitespace", " value"],
      ["trailing whitespace", "value "],
      ["control", "value\u0000"],
      ["mixed control", "safe\tunsafe"],
      ["C1 lower boundary", "value\u0080"],
      ["C1 representative", "value\u0085"],
      ["C1 upper boundary", "value\u009f"],
      ["mixed C0/C1", "safe\u0000middle\u0085unsafe"],
    ])
      assert.notEqual(
        validateTransaction(withValue(value)),
        null,
        `${name}: ${label}`,
      );
  }
});

test("derives tenant and environment scope from verified actor and rejects forged scope without disclosure", () => {
  const s = service();
  assert.equal(
    s.upsert({
      actor: { ...actor, verified: false },
      transaction: tx,
      idempotencyKey: "idempotency-key-01",
    }).status,
    404,
  );
  assert.equal(
    s.upsert({
      actor,
      transaction: { ...tx, tenant_id: ids.otherTenant },
      idempotencyKey: "idempotency-key-02",
    }).body.code,
    "resource_not_found",
  );
  assert.equal(
    s.upsert({
      actor,
      transaction: { ...tx, environment_id: ids.otherEnvironment },
      idempotencyKey: "idempotency-key-03",
    }).body.code,
    "resource_not_found",
  );
  assert.equal(s.get({ actor: null, id: tx.id }).status, 401);
});

test("fails closed before scope or state mutation for malformed actor claims", () => {
  let scopeCalls = 0;
  const s = service({
    deriveScope: () => {
      scopeCalls += 1;
      return {
        authorized: true,
        tenantId: ids.tenant,
        environmentId: ids.environment,
      };
    },
  });
  for (const malformedActor of [
    { ...actor, issuer: "   " },
    { ...actor, subject: "\t\r\n" },
    { ...actor, issuer: "https://issuer.invalid\u0000spoof" },
    { ...actor, subject: "user\tspoof" },
    { ...actor, issuer: "https://issuer.invalid\u0080spoof" },
    { ...actor, subject: "user\u0085spoof" },
    { ...actor, subject: "user\u009fspoof" },
    { ...actor, issuer: "issuer\u0000mixed\u0085spoof" },
  ]) {
    const result = s.upsert({
      actor: malformedActor,
      transaction: tx,
      idempotencyKey: "malformed-actor-key",
    });
    assert.deepEqual(result, {
      status: 404,
      body: { code: "resource_not_found", retryable: false },
    });
  }
  assert.equal(scopeCalls, 0);
  assert.deepEqual(s.audit(), []);
  assert.equal(
    s.upsert({ actor, transaction: tx, idempotencyKey: "malformed-actor-key" })
      .status,
    201,
  );
  assert.equal(s.history({ actor, id: tx.id }).body.length, 1);
});

test("accepts valid Unicode outside the C0/C1 control ranges", () => {
  const candidate = {
    ...tx,
    source_observations: ["observation:café"],
    evidence_refs: ["evidence:東京"],
    provider_categories: [{ provider: "Synthetíc", category: "CAFÉ_☕" }],
    taxonomy: { ...tx.taxonomy, family: "生活" },
    provenance: [
      {
        ...tx.provenance[0],
        actor: "connector:équipe",
        source_ref: "observation:東京",
      },
    ],
  };
  assert.equal(validateTransaction(candidate), null);
});

test("canonically trims valid actor boundaries for authorization and attribution", () => {
  let derivedActor;
  const s = service({
    deriveScope: (candidate) => {
      derivedActor = candidate;
      return {
        authorized: true,
        tenantId: ids.tenant,
        environmentId: ids.environment,
      };
    },
  });
  const result = s.upsert({
    actor: {
      ...actor,
      issuer: `  ${actor.issuer}  `,
      subject: `  ${actor.subject}  `,
    },
    transaction: tx,
    idempotencyKey: "trimmed-actor-key-01",
  });
  assert.equal(result.status, 201);
  assert.equal(derivedActor.issuer, actor.issuer);
  assert.equal(derivedActor.subject, actor.subject);
  assert.equal(result.body.created_by, `${actor.issuer}|${actor.subject}`);
  assert.equal(result.body.updated_by, `${actor.issuer}|${actor.subject}`);
  assert.equal(
    result.body.provenance.at(-1).actor,
    `${actor.issuer}|${actor.subject}`,
  );
  assert.equal(s.audit()[0].actor, `${actor.issuer}|${actor.subject}`);
});

test("supports payload-bound replay, optimistic concurrency, and safe returned copies", () => {
  const s = service();
  const args = { actor, transaction: tx, idempotencyKey: "idempotency-key-01" };
  const first = s.upsert(args);
  assert.equal(first.status, 201);
  const replay = s.upsert(args);
  assert.equal(replay.body.version, 1);
  replay.body.amount = "999.00";
  assert.equal(s.get({ actor, id: tx.id }).body.amount, "12.34");
  assert.equal(
    s.upsert({ ...args, transaction: { ...tx, amount: "9.00" } }).status,
    409,
  );
  assert.equal(
    s.upsert({
      ...args,
      idempotencyKey: "idempotency-key-02",
      transaction: { ...tx, amount: "9.00" },
      ifMatch: '"0"',
    }).status,
    412,
  );
  assert.equal(
    s.upsert({
      ...args,
      idempotencyKey: "idempotency-key-03",
      transaction: { ...tx, amount: "9.00" },
      ifMatch: '"1"',
    }).body.version,
    2,
  );
  assert.equal(
    s.upsert({
      ...args,
      idempotencyKey: "idempotency-key-04",
      transaction: { ...tx, amount: "8.00" },
      ifMatch: '"1"',
    }).status,
    412,
  );
  assert.deepEqual(
    s
      .history({ actor, id: tx.id })
      .body.map((record) => [record.version, record.amount]),
    [
      [1, "12.34"],
      [2, "9.00"],
    ],
  );
});

test("rejects server-managed field injection", () => {
  const s = service();
  for (const field of ["system_time", "created_by", "updated_by", "version"]) {
    const candidate = {
      ...tx,
      [field]: field === "version" ? 99 : "attacker-controlled",
    };
    assert.equal(
      s.upsert({
        actor,
        transaction: candidate,
        idempotencyKey: `idempotency-${field}-value`,
      }).body.code,
      "server_managed_field",
    );
  }
});

test("returns identical non-disclosing result for absent and cross-scope records", () => {
  const s = service();
  s.upsert({ actor, transaction: tx, idempotencyKey: "idempotency-key-01" });
  const absent = s.get({ actor, id: ids.otherTenant });
  const crossScope = new CanonicalTransactionService({
    deriveScope: () => ({
      authorized: true,
      tenantId: ids.otherTenant,
      environmentId: ids.otherEnvironment,
    }),
  }).get({ actor, id: tx.id });
  assert.deepEqual(crossScope, absent);
});

test("failure injection is atomic, audited, retryable, and correctable forward", () => {
  let fail = true;
  const s = service({
    beforeCommit: () => {
      if (fail) throw new Error("synthetic");
    },
  });
  const args = { actor, transaction: tx, idempotencyKey: "idempotency-key-01" };
  assert.deepEqual(s.upsert(args), {
    status: 503,
    body: { code: "write_failed", retryable: true },
  });
  assert.equal(s.get({ actor, id: tx.id }).status, 404);
  fail = false;
  assert.equal(s.upsert(args).status, 201);
  assert.deepEqual(
    s
      .audit()
      .filter((event) => event.action === "transaction.upsert")
      .map((event) => event.outcome),
    ["failed", "created"],
  );
});

test("audit is append-only copied metadata and excludes financial or provider payloads", () => {
  const s = service();
  s.upsert({
    actor,
    transaction: { ...tx, description: "synthetic private description" },
    idempotencyKey: "idempotency-key-01",
  });
  const audit = s.audit();
  const serialized = JSON.stringify(audit);
  for (const secret of [
    "12.34",
    "FOOD_AND_DRINK",
    "synthetic private description",
    "observation:1",
    "evidence:1",
  ])
    assert.equal(serialized.includes(secret), false);
  audit[0].outcome = "tampered";
  assert.notEqual(s.audit()[0].outcome, "tampered");
});

test("registry is deterministic and binds source path, schema identity, version, and raw-byte digest", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "upfs-registry-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const schemaDir = path.join(root, "contracts", "schemas");
  fs.mkdirSync(schemaDir, { recursive: true });
  const raw =
    '{"$id":"https://schemas.example.invalid/test/2.3.4","type":"object"}\n';
  fs.writeFileSync(path.join(schemaDir, "test.schema.json"), raw);
  const output = path.join(root, "artifacts", "schema-registry.json");
  const first = generateRegistry({ schemaDir, output, repositoryRoot: root });
  const firstBytes = fs.readFileSync(output);
  const second = generateRegistry({ schemaDir, output, repositoryRoot: root });
  assert.deepEqual(second, first);
  assert.deepEqual(fs.readFileSync(output), firstBytes);
  assert.deepEqual(first.schemas[0], {
    schema_id: "https://schemas.example.invalid/test/2.3.4",
    schema_version: "2.3.4",
    source_path: "contracts/schemas/test.schema.json",
    sha256: crypto.createHash("sha256").update(raw).digest("hex"),
  });
});

test("registry fails closed on malformed identity and preserves prior artifact on injected publication failure", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "upfs-registry-failure-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const schemaDir = path.join(root, "contracts", "schemas");
  const output = path.join(root, "artifacts", "schema-registry.json");
  fs.mkdirSync(schemaDir, { recursive: true });
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, "trusted-prior\n");
  fs.writeFileSync(
    path.join(schemaDir, "bad.json"),
    '{"$id":"http://unsafe.invalid/schema"}\n',
  );
  assert.throws(
    () => generateRegistry({ schemaDir, output, repositoryRoot: root }),
    /invalid_schema_identity/,
  );
  assert.equal(fs.readFileSync(output, "utf8"), "trusted-prior\n");
  fs.writeFileSync(
    path.join(schemaDir, "bad.json"),
    '{"$id":"https://schemas.example.invalid/test/1.0.0"}\n',
  );
  assert.throws(
    () =>
      generateRegistry({
        schemaDir,
        output,
        repositoryRoot: root,
        beforePublish: () => {
          throw new Error("injected");
        },
      }),
    /injected/,
  );
  assert.equal(fs.readFileSync(output, "utf8"), "trusted-prior\n");
  assert.equal(
    fs.readdirSync(path.dirname(output)).some((name) => name.includes(".tmp-")),
    false,
  );
});

test("committed registry matches deterministic regeneration and every source digest", (t) => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "upfs-registry-drift-"),
  );
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const output = path.join(temporary, "schema-registry.json");
  const registry = generateRegistry({
    schemaDir: path.join(repositoryRoot, "contracts", "schemas"),
    output,
    repositoryRoot,
  });
  const committed = fs.readFileSync(
    path.join(repositoryRoot, "artifacts", "schema-registry.json"),
  );
  assert.deepEqual(fs.readFileSync(output), committed);
  for (const entry of registry.schemas) {
    const bytes = fs.readFileSync(path.join(repositoryRoot, entry.source_path));
    assert.equal(
      crypto.createHash("sha256").update(bytes).digest("hex"),
      entry.sha256,
    );
  }
  const tampered = Buffer.concat([committed, Buffer.from("tampered")]);
  assert.notDeepEqual(tampered, fs.readFileSync(output));
});
