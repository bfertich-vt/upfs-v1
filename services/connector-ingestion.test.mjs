import test from "node:test";
import assert from "node:assert/strict";
import {
  ConnectorIngestionService,
  signProviderPayload,
  normalizeProviderTransaction,
} from "./connector-ingestion.mjs";
import { RawEvidenceIntakeService } from "./evidence-intake.mjs";
import { CanonicalTransactionService } from "./transaction-registry.mjs";

const tenantId = "11111111-1111-4111-8111-111111111111";
const environmentId = "22222222-2222-4222-8222-222222222222";
const accountId = "33333333-3333-4333-8333-333333333333";
const organizationId = "44444444-4444-4444-8444-444444444444";
const actor = {
  issuer: "https://issuer.example.invalid",
  subject: "synthetic-user",
  verified: true,
};
const payload = {
  provider_transaction_id: "provider-tx-1",
  account_id: accountId,
  amount: "-12.3400",
  currency: "USD",
  posted_at: "2026-07-31T12:00:00Z",
  description: "synthetic purchase",
  category: "FOOD_AND_DRINK",
};
const now = new Date("2026-07-31T12:01:00Z");
const make = (
  classify = async () => ({
    content: "clear",
    malware: "clear",
    prompt_injection: "clear",
  }),
  provider = "synthetic",
  overrides = {},
) => {
  const configuredProvider =
    typeof provider === "function" ? provider : () => provider;
  const evidence = new RawEvidenceIntakeService({
    deriveScope: (a) =>
      a?.subject === actor.subject
        ? {
            organization_id: organizationId,
            tenant_id: tenantId,
            environment_id: environmentId,
          }
        : null,
    scan: classify,
    now: () => now,
  });
  const canonical =
    overrides.canonical ??
    new CanonicalTransactionService({
      deriveScope: (a) =>
        a?.verified === true && a.subject === actor.subject
          ? { authorized: true, tenantId, environmentId }
          : null,
      now: () => now,
    });
  const service = new ConnectorIngestionService({
    evidence,
    canonical,
    now: () => now,
    connectors: [
      {
        id: "conn-1",
        organizationId,
        get provider() {
          return configuredProvider();
        },
        tenantId,
        environmentId,
        secret: "synthetic-secret",
        authorize: (a, t, e) =>
          a?.verified === true &&
          a.subject === actor.subject &&
          t === tenantId &&
          e === environmentId,
      },
    ],
  });
  return { service, evidence, canonical };
};
const args = (_service, extra = {}) => {
  const timestamp = extra.timestamp ?? Math.floor(now.getTime() / 1000);
  const nonce = extra.nonce ?? "nonce-0123456789";
  const body = extra.payload ?? payload;
  return {
    actor,
    connectorId: "conn-1",
    timestamp,
    nonce,
    payload: body,
    signature: signProviderPayload({
      secret: "synthetic-secret",
      timestamp,
      nonce,
      payload: body,
    }),
    idempotencyKey: extra.idempotencyKey ?? "idempotency-012345",
    ...extra,
  };
};
const pageArgs = (service, extra = {}) => {
  const page = extra.payload ?? {
    page_id: "page-1",
    cursor: "cursor-1",
    next_cursor: null,
    complete: true,
    transactions: [
      payload,
      { ...payload, provider_transaction_id: "provider-tx-2" },
    ],
  };
  return args(service, {
    nonce: "page-nonce-0123456789",
    idempotencyKey: "page-idempotency-012345",
    ...extra,
    payload: page,
  });
};

test("maps signed provider payload through quarantined evidence into canonical transaction", async () => {
  const { service, evidence, canonical } = make();
  const result = await service.ingest(args(service));
  assert.equal(result.status, 201);
  assert.match(result.body.id, /^[0-9a-f-]{36}$/);
  assert.equal(result.body.tenant_id, tenantId);
  assert.equal(result.body.environment_id, environmentId);
  assert.deepEqual(result.body.provider_categories, [
    { provider: "synthetic", category: "FOOD_AND_DRINK" },
  ]);
  assert.deepEqual(result.body.evidence_refs.length, 1);
  const quarantined = await evidence.get({
    actor,
    id: result.body.evidence_id,
  });
  assert.equal(quarantined.body.status, "quarantined");
  assert.equal(quarantined.body.organization_id, organizationId);
  assert.match(quarantined.body.correlation_id, /^[0-9a-f-]{36}$/);
  assert.equal(
    quarantined.body.content_size,
    Buffer.byteLength(JSON.stringify(payload)),
  );
  assert.equal(
    quarantined.body.provenance.source_record_id,
    payload.provider_transaction_id,
  );
  assert.equal(canonical.audit()[0].action, "transaction.upsert");
  assert.equal(service.audit()[0].action, "connector.ingest.canonicalized");
});
test("rejects forged signatures, stale timestamps, replay, and idempotency conflicts", async () => {
  const { service } = make();
  assert.equal(
    (await service.ingest(args(service, { signature: "0".repeat(64) }))).status,
    401,
  );
  assert.equal(
    (
      await service.ingest(
        args(service, { timestamp: 1, nonce: "nonce-stale-012345" }),
      )
    ).body.code,
    "signature_timestamp_out_of_window",
  );
  const first = await service.ingest(args(service));
  assert.equal(
    (await service.ingest(args(service))).body.code,
    "replay_detected",
  );
  const conflict = await service.ingest(
    args(service, {
      nonce: "nonce-unique-012345",
      payload: { ...payload, amount: "1.00" },
    }),
  );
  assert.equal(conflict.body.code, "idempotency_conflict");
  assert.equal(first.status, 201);
});
test("enforces authenticated actor and connector-derived tenant/environment scope", async () => {
  const { service, evidence, canonical } = make();
  assert.equal(
    (
      await service.ingest(
        args(service, { actor: undefined, nonce: "nonce-auth-012345" }),
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await service.ingest({
        ...args(service, { nonce: "nonce-forbid-012345" }),
        actor: { issuer: actor.issuer, subject: "other", verified: true },
      })
    ).status,
    403,
  );
  for (const malformedActor of [
    { ...actor, issuer: "   " },
    { ...actor, subject: "\t\r\n" },
    { ...actor, issuer: "issuer\u0000spoof" },
    { ...actor, subject: "subject\tspoof" },
    { ...actor, issuer: "issuer\u0080spoof" },
    { ...actor, subject: "subject\u0085spoof" },
    { ...actor, subject: "subject\u009fspoof" },
    { ...actor, issuer: "issuer\u0000mixed\u0085spoof" },
  ]) {
    const result = await service.ingest(
      args(service, {
        actor: malformedActor,
        nonce: `nonce-malformed-${malformedActor.subject.length}`.padEnd(
          20,
          "x",
        ),
      }),
    );
    assert.deepEqual(result, {
      status: 401,
      body: { code: "authentication_required", retryable: false },
    });
  }
  assert.deepEqual(evidence.audit(), []);
  assert.deepEqual(canonical.audit(), []);
  assert.deepEqual(service.audit(), []);
});

test("canonically trims a valid actor before connector authorization and persistence", async () => {
  const { service } = make();
  const result = await service.ingest(
    args(service, {
      actor: {
        ...actor,
        issuer: `  ${actor.issuer}  `,
        subject: `  ${actor.subject}  `,
      },
      nonce: "nonce-trimmed-012345",
      idempotencyKey: "idempotency-trimmed-01",
    }),
  );
  assert.equal(result.status, 201);
  assert.equal(result.body.created_by, `${actor.issuer}|${actor.subject}`);
  assert.equal(service.audit()[0].actor, `${actor.issuer}|${actor.subject}`);
});
test("ignores forged client scope and keeps audit free of transaction payload data", async () => {
  const { service } = make();
  const forgedActor = {
    ...actor,
    tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    environmentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  };
  const result = await service.ingest(
    args(service, { actor: forgedActor, nonce: "nonce-forged-012345" }),
  );
  assert.equal(result.status, 201);
  assert.equal(result.body.tenant_id, tenantId);
  assert.equal(result.body.environment_id, environmentId);
  const audit = JSON.stringify(service.audit());
  for (const leaked of [payload.amount, payload.description, payload.category])
    assert.equal(audit.includes(leaked), false);
});
test("quarantines scanner failures or suspicious evidence without canonical write", async () => {
  const { service, canonical } = make(async () => ({
    content: "clear",
    malware: "blocked",
    prompt_injection: "clear",
  }));
  const result = await service.ingest(args(service));
  assert.equal(result.status, 422);
  assert.equal(result.body.code, "malware_detected");
  assert.deepEqual(canonical.audit(), []);
  assert.deepEqual(service.audit(), []);
});
test("rejects malformed provider payload before evidence intake", async () => {
  assert.equal(
    normalizeProviderTransaction({
      ...payload,
      posted_at: "2026-99-99T00:00:00Z",
    }).error,
    "invalid_provider_field",
  );
  const { service, evidence } = make();
  const result = await service.ingest(
    args(service, {
      nonce: "nonce-invalid-012345",
      payload: { ...payload, amount: "not-money" },
    }),
  );
  assert.equal(result.status, 400);
  assert.deepEqual(evidence.audit(), []);
});
test("applies provider schema bounds and preserves strict category handling", () => {
  assert.equal(
    normalizeProviderTransaction({
      ...payload,
      provider_transaction_id: "x".repeat(301),
    }).error,
    "invalid_provider_field",
  );
  assert.equal(
    normalizeProviderTransaction({ ...payload, account_id: "x".repeat(301) })
      .error,
    "invalid_provider_field",
  );
  assert.equal(
    normalizeProviderTransaction({ ...payload, category: "x".repeat(301) })
      .error,
    "invalid_provider_field",
  );
  assert.equal(
    normalizeProviderTransaction({ ...payload, category: 42 }).error,
    "invalid_provider_field",
  );
  for (const category of [
    "",
    "   ",
    " FOOD",
    "FOOD ",
    "FOOD\tBAD",
    "FOOD\u0000BAD",
    "FOOD\u0080BAD",
    "FOOD\u0085BAD",
    "FOOD\u009fBAD",
    "FOOD\u0000MIXED\u0085BAD",
  ])
    assert.equal(
      normalizeProviderTransaction({ ...payload, category }).error,
      "invalid_provider_field",
    );
  assert.equal(
    normalizeProviderTransaction({ ...payload, category: "x" }).value.category,
    "x",
  );
  assert.equal(
    normalizeProviderTransaction({ ...payload, category: "CAFÉ_☕" }).value
      .category,
    "CAFÉ_☕",
  );
  assert.equal(
    normalizeProviderTransaction({ ...payload, category: "x".repeat(300) })
      .value.category.length,
    300,
  );
  assert.equal(
    normalizeProviderTransaction({
      ...payload,
      posted_at: "2024-02-29T00:00:00Z",
    }).value.posted_at,
    "2024-02-29T00:00:00Z",
  );
  assert.equal(
    normalizeProviderTransaction({
      ...payload,
      posted_at: "2026-02-30T00:00:00Z",
    }).error,
    "invalid_provider_field",
  );
});

test("rejects non-canonical category before any state mutation and permits corrected retry", async () => {
  for (const [index, category] of [
    "",
    "   ",
    " FOOD",
    "FOOD ",
    "FOOD\tBAD",
    "FOOD\u0000BAD",
    "FOOD\u0080BAD",
    "FOOD\u0085BAD",
    "FOOD\u009fBAD",
    "FOOD\u0000MIXED\u0085BAD",
    "x".repeat(301),
  ].entries()) {
    const { service, evidence, canonical } = make();
    const nonce = `nonce-category-${String(index).padStart(4, "0")}`;
    const idempotencyKey = `idempotency-category-${index}`;
    const invalid = await service.ingest(
      args(service, {
        nonce,
        idempotencyKey,
        payload: { ...payload, category },
      }),
    );
    assert.equal(invalid.status, 400);
    assert.deepEqual(invalid.body, {
      code: "invalid_provider_field",
      retryable: false,
    });
    assert.deepEqual(evidence.audit(), []);
    assert.deepEqual(canonical.audit(), []);
    assert.deepEqual(service.audit(), []);

    const corrected = await service.ingest(
      args(service, {
        nonce,
        idempotencyKey,
        payload: { ...payload, category: "CORRECTED_CATEGORY" },
      }),
    );
    assert.equal(corrected.status, 201);
    assert.deepEqual(corrected.body.provider_categories, [
      { provider: "synthetic", category: "CORRECTED_CATEGORY" },
    ]);
  }
});

test("rejects configured provider before evidence or replay state and permits corrected retry", async () => {
  for (const [index, provider] of [
    "",
    "   ",
    " provider",
    "provider ",
    "provider\u0000bad",
    "provider\u0080bad",
    "provider\u0085bad",
    "provider\u009fbad",
    "provider\u0000mixed\u0085bad",
    "x".repeat(101),
  ].entries()) {
    let configuredProvider = provider;
    const { service, evidence, canonical } = make(
      undefined,
      () => configuredProvider,
    );
    const nonce = `nonce-provider-${String(index).padStart(4, "0")}`;
    const idempotencyKey = `idempotency-provider-${index}`;
    const invalid = await service.ingest(
      args(service, { nonce, idempotencyKey }),
    );
    assert.deepEqual(invalid, {
      status: 400,
      body: { code: "invalid_provider_category", retryable: false },
    });
    assert.deepEqual(evidence.audit(), []);
    assert.deepEqual(canonical.audit(), []);
    assert.deepEqual(service.audit(), []);

    configuredProvider = "x".repeat(100);
    const retried = await service.ingest(
      args(service, { nonce, idempotencyKey }),
    );
    assert.equal(retried.status, 201);
    assert.equal(retried.body.provider_categories[0].provider.length, 100);
  }

  const one = make(undefined, "é");
  assert.equal((await one.service.ingest(args(one.service))).status, 201);
});

test("canonicalizes a signed provider page deterministically and preserves page provenance", async () => {
  const { service, evidence, canonical } = make();
  const first = await service.ingestPage(pageArgs(service));
  assert.equal(first.status, 201);
  assert.equal(first.body.complete, true);
  assert.equal(first.body.results.length, 2);
  assert.equal(canonical.audit().length, 2);
  const rawPage = await evidence.get({ actor, id: first.body.evidence_id });
  assert.equal(rawPage.status, 200);
  assert.equal(rawPage.body.provenance.source_record_id, "page-1");
  assert.equal(rawPage.body.tenant_id, tenantId);
  const replay = await service.ingestPage(
    pageArgs(service, { nonce: "page-replay-01234567" }),
  );
  assert.deepEqual(replay, first);
});

test("quarantines malformed page and webhook drift with raw page evidence but no canonical mutation", async () => {
  const { service, evidence, canonical } = make();
  const malformed = {
    page_id: "page-drift",
    complete: true,
    transactions: [payload],
    unexpected_provider_field: "drift",
  };
  const result = await service.ingestPage(
    pageArgs(service, {
      nonce: "page-drift-012345678",
      idempotencyKey: "page-drift-idempotency",
      payload: malformed,
    }),
  );
  assert.equal(result.status, 422);
  assert.equal(result.body.code, "provider_page_quarantined");
  assert.deepEqual(canonical.audit(), []);
  const raw = await evidence.get({
    actor,
    id: result.body.details.evidence_id,
  });
  assert.equal(raw.status, 200);
  assert.equal(raw.body.provenance.source_record_id, "page-drift");
  assert.equal(JSON.parse(raw.body.content).unexpected_provider_field, "drift");
});

test("partial sync fails closed per item while retaining page evidence and redacted audit", async () => {
  const { service, evidence, canonical } = make();
  const page = {
    page_id: "page-partial",
    complete: true,
    transactions: [payload, { ...payload, amount: "malformed-money" }],
  };
  const result = await service.ingestPage(
    pageArgs(service, {
      nonce: "page-partial-0123456",
      idempotencyKey: "page-partial-idempotency",
      payload: page,
    }),
  );
  assert.equal(result.status, 207);
  assert.equal(result.body.complete, false);
  assert.deepEqual(
    result.body.results.map(({ status }) => status),
    [201, 400],
  );
  assert.equal(canonical.audit().length, 1);
  assert.equal(
    (await evidence.get({ actor, id: result.body.evidence_id })).status,
    200,
  );
  const audit = JSON.stringify(service.audit());
  assert.equal(audit.includes("malformed-money"), false);
  assert.equal(audit.includes(payload.description), false);
  assert.match(audit, /connector\.page\.partial_quarantine/);
});

test("page authorization denial is mutation-free and discloses no connector scope", async () => {
  const { service, evidence, canonical } = make();
  const denied = await service.ingestPage(
    pageArgs(service, {
      actor: { ...actor, subject: "cross-tenant-attacker" },
      nonce: "page-denied-01234567",
    }),
  );
  assert.deepEqual(denied, {
    status: 403,
    body: { code: "forbidden", retryable: false },
  });
  assert.deepEqual(evidence.audit(), []);
  assert.deepEqual(canonical.audit(), []);
  assert.deepEqual(service.audit(), []);
  const corrected = await service.ingestPage(
    pageArgs(service, { nonce: "page-denied-01234567" }),
  );
  assert.equal(corrected.status, 201);
});

test("serializes concurrent replay so only one canonical effect is committed", async () => {
  const { service, canonical } = make();
  const [one, two] = await Promise.all([
    service.ingest(args(service)),
    service.ingest(args(service)),
  ]);
  assert.deepEqual([one.status, two.status].sort(), [201, 409]);
  assert.equal(canonical.audit().length, 1);
});

test("injected canonical failure preserves raw provenance and allows corrective-forward retry", async () => {
  let fail = true;
  const durableCanonical = new CanonicalTransactionService({
    deriveScope: () => ({ authorized: true, tenantId, environmentId }),
    now: () => now,
  });
  const canonical = {
    upsert(input) {
      if (fail) throw new Error("synthetic injected canonical outage");
      return durableCanonical.upsert(input);
    },
    audit: () => durableCanonical.audit(),
  };
  const { service, evidence } = make(undefined, "synthetic", { canonical });
  const page = {
    page_id: "page-failure",
    complete: true,
    transactions: [payload],
  };
  const first = await service.ingestPage(
    pageArgs(service, {
      nonce: "page-failure-0123456",
      idempotencyKey: "page-failure-idempotency",
      payload: page,
    }),
  );
  assert.equal(first.status, 207);
  assert.equal(first.body.results[0].code, "provider_item_failed");
  assert.equal(
    (await evidence.get({ actor, id: first.body.evidence_id })).status,
    200,
  );
  fail = false;
  const corrected = await service.ingestPage(
    pageArgs(service, {
      nonce: "page-corrected-012345",
      idempotencyKey: "page-corrected-idempotency",
      payload: { ...page, page_id: "page-corrected" },
    }),
  );
  assert.equal(corrected.status, 201);
  assert.equal(durableCanonical.audit().length, 1);
});
