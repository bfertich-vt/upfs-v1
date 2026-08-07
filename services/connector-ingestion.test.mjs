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
) => {
  const configuredProvider =
    typeof provider === "function" ? provider : () => provider;
  const evidence = new RawEvidenceIntakeService({
    authorize: (_a, t, e) => t === tenantId && e === environmentId,
    classify,
    now: () => now,
  });
  const canonical = new CanonicalTransactionService({
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
  assert.equal(
    evidence.get({
      actor,
      tenantId,
      environmentId,
      id: result.body.evidence_id,
    }).body.status,
    "quarantined",
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
  assert.equal(result.body.code, "evidence_quarantined");
  assert.deepEqual(canonical.audit(), []);
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
