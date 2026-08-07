import { createHash } from "node:crypto";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOURCE_KINDS = new Set(["organization", "tenant", "environment"]);
const TRANSITIONS = Object.freeze({
  active: new Set(["suspended", "deactivated"]),
  suspended: new Set(["active", "deactivated"]),
  deactivated: new Set(),
});
const REPOSITORY_METHODS = [
  "snapshot",
  "commitWithAudit",
  "appendAudit",
  "auditEvents",
];

export class FoundationError extends Error {
  constructor(code, message, { retryable = false } = {}) {
    super(message);
    this.name = "FoundationError";
    this.code = code;
    this.retryable = retryable;
  }
}

function fail(code, message, options) {
  throw new FoundationError(code, message, options);
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function requireText(value, name) {
  if (typeof value !== "string" || value.trim() === "")
    fail("INVALID_REQUEST", `${name} is required`);
  return value;
}

function requireUuid(value, name) {
  requireText(value, name);
  if (!UUID.test(value))
    fail("INVALID_REQUEST", `${name} must be an opaque UUID`);
  return value.toLowerCase();
}

function clone(value) {
  return structuredClone(value);
}

function boundedAdapterFailure() {
  return new FoundationError(
    "REPOSITORY_UNAVAILABLE",
    "Repository operation unavailable",
    {
      retryable: true,
    },
  );
}

function actorMembership(actor, scope, permission) {
  if (
    !actor ||
    actor.verified !== true ||
    typeof actor.actorId !== "string" ||
    !UUID.test(actor.actorId.trim())
  ) {
    fail("UNAUTHENTICATED", "Verified actor required");
  }
  const memberships = Array.isArray(actor.memberships) ? actor.memberships : [];
  const membership = memberships.find(
    (candidate) =>
      candidate.organizationId === scope.organizationId &&
      candidate.tenantId === scope.tenantId &&
      Array.isArray(candidate.environmentIds) &&
      candidate.environmentIds.includes(scope.environmentId) &&
      Array.isArray(candidate.permissions) &&
      candidate.permissions.includes(permission),
  );
  if (!membership) fail("NOT_FOUND", "Resource not found");
}

function requireScope(scope) {
  if (!scope || typeof scope !== "object")
    fail("INVALID_REQUEST", "scope is required");
  return {
    organizationId: requireUuid(scope.organizationId, "scope.organizationId"),
    tenantId: requireUuid(scope.tenantId, "scope.tenantId"),
    environmentId: requireUuid(scope.environmentId, "scope.environmentId"),
  };
}

function idempotencyNamespace(action, scope, key) {
  return canonical([
    scope.organizationId,
    scope.tenantId,
    scope.environmentId,
    action,
    key,
  ]);
}

function assertStateShape(state) {
  if (
    !state ||
    !(state.organizations instanceof Map) ||
    !(state.tenants instanceof Map) ||
    !(state.environments instanceof Map) ||
    !(state.idempotency instanceof Map)
  ) {
    throw boundedAdapterFailure();
  }
}

/**
 * Reference in-memory composition seam. Production composition must supply a
 * durable transactional repository whose commitWithAudit operation commits
 * domain, idempotency, and audit state atomically. This is not persistence.
 */
export class InMemoryFoundationRepository {
  #state = {
    organizations: new Map(),
    tenants: new Map(),
    environments: new Map(),
    idempotency: new Map(),
  };

  #audit = [];
  #injectAtomicFailure;

  constructor({ injectAtomicFailure = () => {} } = {}) {
    this.#injectAtomicFailure = injectAtomicFailure;
  }

  snapshot() {
    return clone(this.#state);
  }

  commitWithAudit(nextState, event) {
    assertStateShape(nextState);
    const nextAudit = [...this.#audit, Object.freeze(clone(event))];
    this.#injectAtomicFailure("before-atomic-commit", { event: clone(event) });
    this.#state = clone(nextState);
    this.#audit = nextAudit;
  }

  appendAudit(event) {
    this.#injectAtomicFailure("before-audit-append", { event: clone(event) });
    this.#audit = [...this.#audit, Object.freeze(clone(event))];
  }

  auditEvents() {
    return clone(this.#audit);
  }
}

export class IdentityOrganizationTenantEnvironmentService {
  constructor({
    repository,
    now = () => new Date().toISOString(),
    injectFailure = () => {},
  } = {}) {
    if (
      !repository ||
      REPOSITORY_METHODS.some(
        (method) => typeof repository[method] !== "function",
      )
    ) {
      fail("CONFIGURATION_ERROR", "Atomic foundation repository required");
    }
    this.repository = repository;
    this.now = now;
    this.injectFailure = injectFailure;
    try {
      assertStateShape(repository.snapshot());
      if (!Array.isArray(repository.auditEvents()))
        throw boundedAdapterFailure();
    } catch {
      fail("CONFIGURATION_ERROR", "Atomic foundation repository required");
    }
  }

  #auditEvent({ action, outcome, actor, scope, requestId, code }) {
    let sequence;
    try {
      sequence = this.repository.auditEvents().length + 1;
    } catch {
      throw boundedAdapterFailure();
    }
    return {
      sequence,
      occurredAt: this.now(),
      action,
      outcome,
      actorId:
        typeof actor?.actorId === "string" && actor.actorId.trim()
          ? actor.actorId
          : "unknown",
      organizationId: scope?.organizationId ?? "unknown",
      tenantId: scope?.tenantId ?? "unknown",
      environmentId: scope?.environmentId ?? "unknown",
      requestId,
      ...(code ? { code } : {}),
    };
  }

  #appendAttempt(event) {
    try {
      this.repository.appendAudit(event);
    } catch {
      throw boundedAdapterFailure();
    }
  }

  #snapshot() {
    try {
      const state = this.repository.snapshot();
      assertStateShape(state);
      return state;
    } catch (error) {
      if (error instanceof FoundationError) throw error;
      throw boundedAdapterFailure();
    }
  }

  #executeMutation({
    action,
    actor,
    scope: rawScope,
    permission,
    idempotencyKey,
    payload,
    operation,
  }) {
    const requestId = digest({
      action,
      idempotencyKey: idempotencyKey ?? null,
      payload,
    }).slice(0, 24);
    let scope;
    try {
      scope = requireScope(rawScope);
      actorMembership(actor, scope, permission);
      requireText(idempotencyKey, "idempotencyKey");
      const fingerprint = digest({ action, scope, payload });
      const replayKey = idempotencyNamespace(action, scope, idempotencyKey);
      const current = this.#snapshot();
      const replay = current.idempotency.get(replayKey);
      if (replay) {
        if (replay.fingerprint !== fingerprint) {
          fail(
            "IDEMPOTENCY_CONFLICT",
            "Idempotency key was used for a different request",
          );
        }
        this.#appendAttempt(
          this.#auditEvent({
            action,
            outcome: "replayed",
            actor,
            scope,
            requestId,
          }),
        );
        return clone(replay.response);
      }

      const next = clone(current);
      const response = operation(next, scope, requestId);
      next.idempotency.set(replayKey, {
        fingerprint,
        response: clone(response),
      });
      this.injectFailure("before-atomic-commit", { action, requestId });
      const event = this.#auditEvent({
        action,
        outcome: "succeeded",
        actor,
        scope,
        requestId,
      });
      try {
        this.repository.commitWithAudit(next, event);
      } catch {
        throw boundedAdapterFailure();
      }
      return clone(response);
    } catch (error) {
      const normalized =
        error instanceof FoundationError
          ? error
          : new FoundationError(
              "INJECTED_FAILURE",
              "Mutation failed before commit",
              { retryable: true },
            );
      if (normalized.code !== "REPOSITORY_UNAVAILABLE") {
        this.#appendAttempt(
          this.#auditEvent({
            action,
            outcome: "failed",
            actor,
            scope,
            requestId,
            code: normalized.code,
          }),
        );
      }
      throw normalized;
    }
  }

  createFoundation({
    actor,
    scope,
    idempotencyKey,
    organizationName,
    tenantName,
    environmentName,
  }) {
    const payload = { organizationName, tenantName, environmentName };
    return this.#executeMutation({
      action: "foundation.create",
      actor,
      scope,
      permission: "foundation:create",
      idempotencyKey,
      payload,
      operation: (next, verifiedScope, requestId) => {
        requireText(organizationName, "organizationName");
        requireText(tenantName, "tenantName");
        requireText(environmentName, "environmentName");
        if (
          next.organizations.has(verifiedScope.organizationId) ||
          next.tenants.has(verifiedScope.tenantId) ||
          next.environments.has(verifiedScope.environmentId)
        ) {
          fail("CONFLICT", "Foundation resource already exists");
        }
        const created_at = this.now();
        next.organizations.set(verifiedScope.organizationId, {
          id: verifiedScope.organizationId,
          kind: "organization",
          version: 1,
          created_at,
          status: "active",
        });
        next.tenants.set(verifiedScope.tenantId, {
          id: verifiedScope.tenantId,
          kind: "tenant",
          version: 1,
          created_at,
          status: "active",
          organization_id: verifiedScope.organizationId,
        });
        next.environments.set(verifiedScope.environmentId, {
          id: verifiedScope.environmentId,
          kind: "environment",
          version: 1,
          created_at,
          status: "active",
          organization_id: verifiedScope.organizationId,
          tenant_id: verifiedScope.tenantId,
        });
        return {
          requestId,
          scope: verifiedScope,
          version: 1,
          status: "active",
        };
      },
    });
  }

  readEnvironment({ actor, scope: rawScope }) {
    const requestId = digest({
      action: "environment.read",
      scope: rawScope ?? null,
    }).slice(0, 24);
    let scope;
    try {
      scope = requireScope(rawScope);
      actorMembership(actor, scope, "foundation:read");
      const state = this.#snapshot();
      const environment = state.environments.get(scope.environmentId);
      const tenant = state.tenants.get(scope.tenantId);
      const organization = state.organizations.get(scope.organizationId);
      if (
        !environment ||
        !tenant ||
        !organization ||
        environment.tenant_id !== scope.tenantId ||
        environment.organization_id !== scope.organizationId ||
        tenant.organization_id !== scope.organizationId ||
        organization.status !== "active" ||
        tenant.status !== "active"
      ) {
        fail("NOT_FOUND", "Resource not found");
      }
      this.#appendAttempt(
        this.#auditEvent({
          action: "environment.read",
          outcome: "succeeded",
          actor,
          scope,
          requestId,
        }),
      );
      return clone({ requestId, organization, tenant, environment });
    } catch (error) {
      const normalized =
        error instanceof FoundationError
          ? error
          : new FoundationError("INTERNAL_ERROR", "Read failed");
      if (normalized.code !== "REPOSITORY_UNAVAILABLE") {
        this.#appendAttempt(
          this.#auditEvent({
            action: "environment.read",
            outcome: "failed",
            actor,
            scope,
            requestId,
            code: normalized.code,
          }),
        );
      }
      throw normalized;
    }
  }

  transitionResource({
    actor,
    scope,
    kind,
    targetStatus,
    ifMatch,
    idempotencyKey,
  }) {
    const payload = { kind, targetStatus, ifMatch };
    return this.#executeMutation({
      action: "foundation.transition",
      actor,
      scope,
      permission: "foundation:manage",
      idempotencyKey,
      payload,
      operation: (next, verifiedScope, requestId) => {
        if (!RESOURCE_KINDS.has(kind))
          fail("INVALID_REQUEST", "Unsupported resource kind");
        if (!Number.isInteger(ifMatch) || ifMatch < 1)
          fail("PRECONDITION_REQUIRED", "Valid If-Match required");
        const collection = next[`${kind}s`];
        const id = verifiedScope[`${kind}Id`];
        const resource = collection.get(id);
        if (!resource) fail("NOT_FOUND", "Resource not found");
        const organization = next.organizations.get(
          verifiedScope.organizationId,
        );
        const tenant = next.tenants.get(verifiedScope.tenantId);
        if (
          !organization ||
          !tenant ||
          tenant.organization_id !== verifiedScope.organizationId ||
          (kind !== "organization" && organization.status !== "active") ||
          (kind === "environment" && tenant.status !== "active")
        ) {
          fail("NOT_FOUND", "Resource not found");
        }
        if (resource.version !== ifMatch)
          fail("PRECONDITION_FAILED", "Resource version is stale");
        if (!TRANSITIONS[resource.status]?.has(targetStatus)) {
          fail("INVALID_TRANSITION", "Lifecycle transition is not allowed");
        }
        if (
          kind === "tenant" &&
          resource.organization_id !== verifiedScope.organizationId
        ) {
          fail("NOT_FOUND", "Resource not found");
        }
        if (
          kind === "environment" &&
          (resource.organization_id !== verifiedScope.organizationId ||
            resource.tenant_id !== verifiedScope.tenantId)
        ) {
          fail("NOT_FOUND", "Resource not found");
        }
        resource.status = targetStatus;
        resource.version += 1;
        collection.set(id, resource);
        return {
          requestId,
          kind,
          id,
          status: resource.status,
          version: resource.version,
        };
      },
    });
  }
}
