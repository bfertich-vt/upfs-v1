import assert from "node:assert/strict";
import test from "node:test";

import {
  FoundationError,
  IdentityOrganizationTenantEnvironmentService,
  InMemoryFoundationRepository,
} from "./identity-organization-tenant-and-environment-foundation.mjs";

const scope = Object.freeze({
  organizationId: "10000000-0000-4000-8000-000000000001",
  tenantId: "20000000-0000-4000-8000-000000000001",
  environmentId: "30000000-0000-4000-8000-000000000001",
});
const otherScope = Object.freeze({
  organizationId: "10000000-0000-4000-8000-000000000002",
  tenantId: "20000000-0000-4000-8000-000000000002",
  environmentId: "30000000-0000-4000-8000-000000000002",
});
const actorId = "40000000-0000-4000-8000-000000000001";

function actorFor(
  targetScope = scope,
  permissions = ["foundation:create", "foundation:read", "foundation:manage"],
) {
  return {
    actorId,
    verified: true,
    memberships: [
      {
        ...targetScope,
        environmentIds: [targetScope.environmentId],
        permissions,
      },
    ],
  };
}

function setup(options = {}) {
  const repository =
    options.repository ??
    new InMemoryFoundationRepository(options.repositoryOptions);
  let tick = 0;
  const service = new IdentityOrganizationTenantEnvironmentService({
    repository,
    now: () => `2026-08-07T00:00:${String(tick++).padStart(2, "0")}.000Z`,
    injectFailure: options.injectFailure,
  });
  return { repository, service };
}

function create(service, overrides = {}) {
  return service.createFoundation({
    actor: actorFor(),
    scope,
    idempotencyKey: "create-1",
    organizationName: "Organization A",
    tenantName: "Tenant A",
    environmentName: "Production-like A",
    ...overrides,
  });
}

function expectCode(code, fn) {
  assert.throws(
    fn,
    (error) => error instanceof FoundationError && error.code === code,
  );
}

test("creates schema-shaped UUID resources and reads deterministic tenant scope", () => {
  const { service } = setup();
  const result = create(service);
  assert.equal(result.status, "active");
  const read = service.readEnvironment({ actor: actorFor(), scope });
  assert.deepEqual(Object.keys(read.organization).sort(), [
    "created_at",
    "id",
    "kind",
    "status",
    "version",
  ]);
  assert.deepEqual(Object.keys(read.tenant).sort(), [
    "created_at",
    "id",
    "kind",
    "organization_id",
    "status",
    "version",
  ]);
  assert.deepEqual(Object.keys(read.environment).sort(), [
    "created_at",
    "id",
    "kind",
    "organization_id",
    "status",
    "tenant_id",
    "version",
  ]);
  assert.equal(read.environment.tenant_id, scope.tenantId);
  assert.match(read.environment.created_at, /^2026-08-07T/);
});

test("rejects missing, invalid, empty, whitespace, wrong-type, and non-UUID actors", () => {
  for (const actor of [
    undefined,
    { actorId, verified: false },
    { ...actorFor(), actorId: "" },
    { ...actorFor(), actorId: "   " },
    { ...actorFor(), actorId: 42 },
    { ...actorFor(), actorId: "not-a-uuid" },
  ]) {
    const { service } = setup();
    expectCode("UNAUTHENTICATED", () => create(service, { actor }));
  }
  const { service } = setup();
  expectCode("NOT_FOUND", () =>
    create(service, { actor: actorFor(scope, []) }),
  );
});

test("rejects malformed UUID scope before any domain mutation", () => {
  for (const field of ["organizationId", "tenantId", "environmentId"]) {
    const malformed = { ...scope, [field]: "not-a-uuid" };
    const { repository, service } = setup();
    expectCode("INVALID_REQUEST", () => create(service, { scope: malformed }));
    assert.equal(repository.snapshot().organizations.size, 0);
  }
});

test("same caller key succeeds independently across verified tenant scopes", () => {
  const { service } = setup();
  create(service, { idempotencyKey: "same" });
  const other = create(service, {
    actor: actorFor(otherScope),
    scope: otherScope,
    idempotencyKey: "same",
    organizationName: "Organization B",
    tenantName: "Tenant B",
    environmentName: "Environment B",
  });
  assert.equal(other.scope.tenantId, otherScope.tenantId);
  expectCode("IDEMPOTENCY_CONFLICT", () =>
    create(service, { idempotencyKey: "same", tenantName: "Changed" }),
  );
});

test("audits every replay without duplicating the domain mutation or leaking payload", () => {
  const { repository, service } = setup();
  const original = create(service, { organizationName: "SECRET-NAME" });
  assert.deepEqual(
    create(service, { organizationName: "SECRET-NAME" }),
    original,
  );
  assert.equal(repository.snapshot().organizations.size, 1);
  assert.deepEqual(
    repository.auditEvents().map(({ outcome }) => outcome),
    ["succeeded", "replayed"],
  );
  assert.doesNotMatch(
    JSON.stringify(repository.auditEvents()),
    /SECRET-NAME|credential|token/i,
  );
});

test("atomically rejects injected service and repository audit/commit failure then retries", () => {
  let serviceFailure = true;
  const first = setup({
    injectFailure() {
      if (serviceFailure) {
        serviceFailure = false;
        throw new Error("sensitive service detail");
      }
    },
  });
  expectCode("INJECTED_FAILURE", () => create(first.service));
  assert.equal(first.repository.snapshot().organizations.size, 0);
  assert.equal(first.repository.snapshot().idempotency.size, 0);
  assert.equal(first.repository.auditEvents().at(-1).outcome, "failed");
  assert.equal(create(first.service).status, "active");

  let repositoryFailure = true;
  const second = setup({
    repositoryOptions: {
      injectAtomicFailure(stage) {
        if (stage === "before-atomic-commit" && repositoryFailure) {
          repositoryFailure = false;
          throw new Error("sensitive audit store detail");
        }
      },
    },
  });
  expectCode("REPOSITORY_UNAVAILABLE", () => create(second.service));
  assert.equal(second.repository.snapshot().organizations.size, 0);
  assert.equal(second.repository.snapshot().idempotency.size, 0);
  assert.equal(second.repository.auditEvents().length, 0);
  assert.equal(create(second.service).status, "active");
});

test("validates adapter shape and bounds throwing adapter failures", () => {
  for (const repository of [
    undefined,
    {},
    { snapshot() {}, commitWithAudit() {}, appendAudit() {}, auditEvents() {} },
  ]) {
    expectCode(
      "CONFIGURATION_ERROR",
      () => new IdentityOrganizationTenantEnvironmentService({ repository }),
    );
  }
  const state = new InMemoryFoundationRepository();
  const repository = {
    snapshot: () => state.snapshot(),
    auditEvents: () => state.auditEvents(),
    appendAudit: (event) => state.appendAudit(event),
    commitWithAudit() {
      throw new TypeError("secret adapter internals");
    },
  };
  const { service } = setup({ repository });
  assert.throws(
    () => create(service),
    (error) =>
      error instanceof FoundationError &&
      error.code === "REPOSITORY_UNAVAILABLE" &&
      !error.message.includes("secret"),
  );
});

test("denies forged and cross-tenant reads and writes without disclosure", () => {
  const { service } = setup();
  create(service);
  const foreignActor = actorFor(otherScope);
  expectCode("NOT_FOUND", () =>
    service.readEnvironment({ actor: foreignActor, scope }),
  );
  expectCode("NOT_FOUND", () =>
    service.transitionResource({
      actor: foreignActor,
      scope,
      kind: "environment",
      targetStatus: "suspended",
      ifMatch: 1,
      idempotencyKey: "foreign-write",
    }),
  );
  expectCode("NOT_FOUND", () =>
    service.readEnvironment({ actor: actorFor(), scope: otherScope }),
  );
});

test("uses deactivated lifecycle and denies child access after tenant deactivation", () => {
  const { service } = setup();
  create(service);
  const result = service.transitionResource({
    actor: actorFor(),
    scope,
    kind: "tenant",
    targetStatus: "deactivated",
    ifMatch: 1,
    idempotencyKey: "tenant-deactivate",
  });
  assert.equal(result.status, "deactivated");
  expectCode("NOT_FOUND", () =>
    service.readEnvironment({ actor: actorFor(), scope }),
  );
  expectCode("NOT_FOUND", () =>
    service.transitionResource({
      actor: actorFor(),
      scope,
      kind: "environment",
      targetStatus: "suspended",
      ifMatch: 1,
      idempotencyKey: "child-after-parent",
    }),
  );
  expectCode("INVALID_TRANSITION", () =>
    service.transitionResource({
      actor: actorFor(),
      scope,
      kind: "tenant",
      targetStatus: "active",
      ifMatch: 2,
      idempotencyKey: "resurrect-tenant",
    }),
  );
});

test("enforces optimistic concurrency, valid suspension recovery, and terminal deactivation", () => {
  const { service } = setup();
  create(service);
  const suspended = service.transitionResource({
    actor: actorFor(),
    scope,
    kind: "environment",
    targetStatus: "suspended",
    ifMatch: 1,
    idempotencyKey: "suspend",
  });
  assert.equal(suspended.version, 2);
  expectCode("PRECONDITION_FAILED", () =>
    service.transitionResource({
      actor: actorFor(),
      scope,
      kind: "environment",
      targetStatus: "active",
      ifMatch: 1,
      idempotencyKey: "stale",
    }),
  );
  const active = service.transitionResource({
    actor: actorFor(),
    scope,
    kind: "environment",
    targetStatus: "active",
    ifMatch: 2,
    idempotencyKey: "recover",
  });
  assert.equal(active.status, "active");
  service.transitionResource({
    actor: actorFor(),
    scope,
    kind: "environment",
    targetStatus: "deactivated",
    ifMatch: 3,
    idempotencyKey: "deactivate",
  });
  expectCode("INVALID_TRANSITION", () =>
    service.transitionResource({
      actor: actorFor(),
      scope,
      kind: "environment",
      targetStatus: "active",
      ifMatch: 4,
      idempotencyKey: "resurrect",
    }),
  );
});

test("requires If-Match, valid kind, and preserves immutable audit copies", () => {
  const { repository, service } = setup();
  create(service);
  expectCode("PRECONDITION_REQUIRED", () =>
    service.transitionResource({
      actor: actorFor(),
      scope,
      kind: "tenant",
      targetStatus: "suspended",
      idempotencyKey: "missing-version",
    }),
  );
  expectCode("INVALID_REQUEST", () =>
    service.transitionResource({
      actor: actorFor(),
      scope,
      kind: "account",
      targetStatus: "suspended",
      ifMatch: 1,
      idempotencyKey: "bad-kind",
    }),
  );
  const copy = repository.auditEvents();
  copy[0].outcome = "tampered";
  assert.equal(repository.auditEvents()[0].outcome, "succeeded");
});
