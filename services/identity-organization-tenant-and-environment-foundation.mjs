import { createHash } from "node:crypto";

const RESOURCE_KINDS = new Set(["organization", "tenant", "environment"]);
const TRANSITIONS = Object.freeze({
  active: new Set(["suspended", "decommissioned"]),
  suspended: new Set(["active", "decommissioned"]),
  decommissioned: new Set(),
});

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
  if (typeof value !== "string" || value.trim() === "") {
    fail("INVALID_REQUEST", `${name} is required`);
  }
  return value;
}

function clone(value) {
  return structuredClone(value);
}

function actorMembership(actor, scope, permission) {
  if (!actor || actor.verified !== true || typeof actor.actorId !== "string") {
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
  return membership;
}

function requireScope(scope) {
  if (!scope || typeof scope !== "object")
    fail("INVALID_REQUEST", "scope is required");
  return {
    organizationId: requireText(scope.organizationId, "scope.organizationId"),
    tenantId: requireText(scope.tenantId, "scope.tenantId"),
    environmentId: requireText(scope.environmentId, "scope.environmentId"),
  };
}

/**
 * Reference in-memory composition seam. Production composition must supply a
 * durable transactional repository with equivalent atomic and append-only
 * semantics; this class is not production persistence.
 */
export class InMemoryFoundationRepository {
  #state = {
    organizations: new Map(),
    tenants: new Map(),
    environments: new Map(),
    idempotency: new Map(),
  };

  #audit = [];

  snapshot() {
    return clone(this.#state);
  }

  commit(nextState) {
    this.#state = clone(nextState);
  }

  appendAudit(event) {
    this.#audit.push(Object.freeze(clone(event)));
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
    if (!repository)
      fail("CONFIGURATION_ERROR", "Durable or reference repository required");
    this.repository = repository;
    this.now = now;
    this.injectFailure = injectFailure;
  }

  #audit({ action, outcome, actor, scope, requestId, code }) {
    this.repository.appendAudit({
      sequence: this.repository.auditEvents().length + 1,
      occurredAt: this.now(),
      action,
      outcome,
      actorId: typeof actor?.actorId === "string" ? actor.actorId : "unknown",
      organizationId: scope?.organizationId ?? "unknown",
      tenantId: scope?.tenantId ?? "unknown",
      environmentId: scope?.environmentId ?? "unknown",
      requestId,
      ...(code ? { code } : {}),
    });
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
      const current = this.repository.snapshot();
      const replay = current.idempotency.get(idempotencyKey);
      if (replay) {
        if (replay.fingerprint !== fingerprint) {
          fail(
            "IDEMPOTENCY_CONFLICT",
            "Idempotency key was used for a different request",
          );
        }
        return clone(replay.response);
      }

      const next = clone(current);
      const response = operation(next, scope, requestId);
      next.idempotency.set(idempotencyKey, {
        fingerprint,
        response: clone(response),
      });
      this.injectFailure("before-commit", { action, requestId });
      this.repository.commit(next);
      this.#audit({ action, outcome: "succeeded", actor, scope, requestId });
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
      this.#audit({
        action,
        outcome: "failed",
        actor,
        scope,
        requestId,
        code: normalized.code,
      });
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
        next.organizations.set(verifiedScope.organizationId, {
          id: verifiedScope.organizationId,
          name: organizationName,
          status: "active",
          version: 1,
        });
        next.tenants.set(verifiedScope.tenantId, {
          id: verifiedScope.tenantId,
          organizationId: verifiedScope.organizationId,
          name: tenantName,
          status: "active",
          version: 1,
        });
        next.environments.set(verifiedScope.environmentId, {
          id: verifiedScope.environmentId,
          organizationId: verifiedScope.organizationId,
          tenantId: verifiedScope.tenantId,
          name: environmentName,
          status: "active",
          version: 1,
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
      const state = this.repository.snapshot();
      const environment = state.environments.get(scope.environmentId);
      const tenant = state.tenants.get(scope.tenantId);
      const organization = state.organizations.get(scope.organizationId);
      if (
        !environment ||
        !tenant ||
        !organization ||
        environment.tenantId !== scope.tenantId ||
        environment.organizationId !== scope.organizationId ||
        tenant.organizationId !== scope.organizationId
      ) {
        fail("NOT_FOUND", "Resource not found");
      }
      this.#audit({
        action: "environment.read",
        outcome: "succeeded",
        actor,
        scope,
        requestId,
      });
      return clone({ requestId, organization, tenant, environment });
    } catch (error) {
      const normalized =
        error instanceof FoundationError
          ? error
          : new FoundationError("INTERNAL_ERROR", "Read failed");
      this.#audit({
        action: "environment.read",
        outcome: "failed",
        actor,
        scope,
        requestId,
        code: normalized.code,
      });
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
        if (resource.version !== ifMatch)
          fail("PRECONDITION_FAILED", "Resource version is stale");
        if (!TRANSITIONS[resource.status]?.has(targetStatus)) {
          fail("INVALID_TRANSITION", "Lifecycle transition is not allowed");
        }
        if (
          kind === "tenant" &&
          resource.organizationId !== verifiedScope.organizationId
        ) {
          fail("NOT_FOUND", "Resource not found");
        }
        if (
          kind === "environment" &&
          (resource.organizationId !== verifiedScope.organizationId ||
            resource.tenantId !== verifiedScope.tenantId)
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
