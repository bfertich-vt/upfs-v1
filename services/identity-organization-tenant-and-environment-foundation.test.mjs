import assert from "node:assert/strict";
import test from "node:test";

import {
  FoundationError,
  IdentityOrganizationTenantEnvironmentService,
  InMemoryFoundationRepository,
} from "./identity-organization-tenant-and-environment-foundation.mjs";

const scope = Object.freeze({
  organizationId: "org-a",
  tenantId: "tenant-a",
  environmentId: "env-a",
});
const otherScope = Object.freeze({
  organizationId: "org-b",
  tenantId: "tenant-b",
  environmentId: "env-b",
});

function actorFor(
  targetScope = scope,
  permissions = ["foundation:create", "foundation:read", "foundation:manage"],
) {
  return {
    actorId: "actor-1",
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
  const repository = new InMemoryFoundationRepository();
  let tick = 0;
  const service = new IdentityOrganizationTenantEnvironmentService({
    repository,
    now: () => `2026-08-07T00:00:0${tick++}.000Z`,
    ...options,
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

test("creates and reads a deterministic tenant-scoped foundation", () => {
  const { service } = setup();
  const result = create(service);
  assert.deepEqual(result, {
    requestId: result.requestId,
    scope,
    version: 1,
    status: "active",
  });
  assert.equal(result.requestId, create(service).requestId);
  const read = service.readEnvironment({ actor: actorFor(), scope });
  assert.equal(read.organization.id, scope.organizationId);
  assert.equal(read.tenant.organizationId, scope.organizationId);
  assert.equal(read.environment.tenantId, scope.tenantId);
});

test("denies missing, invalid, and unauthorized actors without existence disclosure", () => {
  for (const actor of [undefined, { actorId: "actor-1", verified: false }]) {
    const { service } = setup();
    expectCode("UNAUTHENTICATED", () => create(service, { actor }));
  }
  const { service } = setup();
  expectCode("NOT_FOUND", () =>
    create(service, { actor: actorFor(scope, []) }),
  );
});

test("rejects forged scope and cross-tenant reads and writes with the same opaque denial", () => {
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

test("idempotent replay returns the original result and changed payload fails", () => {
  const { service } = setup();
  const original = create(service);
  assert.deepEqual(create(service), original);
  expectCode("IDEMPOTENCY_CONFLICT", () =>
    create(service, { tenantName: "Changed" }),
  );
});

test("enforces optimistic concurrency and lifecycle constraints", () => {
  const { service } = setup();
  create(service);
  const suspended = service.transitionResource({
    actor: actorFor(),
    scope,
    kind: "environment",
    targetStatus: "suspended",
    ifMatch: 1,
    idempotencyKey: "suspend-1",
  });
  assert.equal(suspended.version, 2);
  expectCode("PRECONDITION_FAILED", () =>
    service.transitionResource({
      actor: actorFor(),
      scope,
      kind: "environment",
      targetStatus: "active",
      ifMatch: 1,
      idempotencyKey: "stale-1",
    }),
  );
  service.transitionResource({
    actor: actorFor(),
    scope,
    kind: "environment",
    targetStatus: "decommissioned",
    ifMatch: 2,
    idempotencyKey: "decommission-1",
  });
  expectCode("INVALID_TRANSITION", () =>
    service.transitionResource({
      actor: actorFor(),
      scope,
      kind: "environment",
      targetStatus: "active",
      ifMatch: 3,
      idempotencyKey: "resurrect-1",
    }),
  );
});

test("injected failure is atomic, auditable, retryable, and supports corrective forward", () => {
  let failOnce = true;
  const { repository, service } = setup({
    injectFailure(stage) {
      if (stage === "before-commit" && failOnce) {
        failOnce = false;
        throw new Error("synthetic failure");
      }
    },
  });
  expectCode("INJECTED_FAILURE", () => create(service));
  assert.equal(repository.snapshot().organizations.size, 0);
  assert.equal(repository.auditEvents().at(-1).outcome, "failed");
  const recovered = create(service);
  assert.equal(recovered.status, "active");
  assert.equal(repository.snapshot().organizations.size, 1);
});

test("audit is append-only and excludes payloads, names, credentials, and tokens", () => {
  const { repository, service } = setup();
  create(service, { organizationName: "TOP-SECRET-NAME" });
  service.readEnvironment({ actor: actorFor(), scope });
  const events = repository.auditEvents();
  assert.deepEqual(
    events.map((event) => event.sequence),
    [1, 2],
  );
  events[0].outcome = "tampered";
  assert.equal(repository.auditEvents()[0].outcome, "succeeded");
  const serialized = JSON.stringify(repository.auditEvents());
  assert.doesNotMatch(serialized, /TOP-SECRET-NAME|credential|token/i);
});

test("requires If-Match and rejects unknown lifecycle resources", () => {
  const { service } = setup();
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
      idempotencyKey: "unknown-kind",
    }),
  );
});
