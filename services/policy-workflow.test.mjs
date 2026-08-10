import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PolicyWorkflowService } from "./policy-workflow.mjs";

const publisher = {
  issuer: "issuer",
  subject: "alice",
  roles: ["workflow_creator"],
};
const approver = {
  issuer: "issuer",
  subject: "carol",
  roles: ["policy_approver", "workflow_approver"],
};
const secondApprover = {
  issuer: "issuer",
  subject: "dave",
  roles: ["workflow_approver"],
};
const wrongRole = { issuer: "issuer", subject: "erin", roles: ["viewer"] };
const outsider = {
  issuer: "issuer",
  subject: "mallory",
  roles: ["workflow_approver"],
};

const authorize = (actor, tenantId, environmentId) =>
  ["alice", "carol", "dave", "erin"].includes(actor?.subject) &&
  tenantId === "tenant-1" &&
  environmentId === "environment-1";

const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const resign = (bundle) => {
  bundle.sha256 = crypto
    .createHash("sha256")
    .update(
      canonical({
        schema_version: bundle.schema_version,
        scope: bundle.scope,
        data: bundle.data,
      }),
      "utf8",
    )
    .digest("hex");
  return bundle;
};

const makeService = (options = {}) => {
  let request = 0;
  return new PolicyWorkflowService({
    authorize,
    requestId: () => `request-${++request}`,
    now: () => new Date("2030-01-01T00:00:00.000Z"),
    ...options,
  });
};

const release = (overrides = {}) => ({
  tests_passed: true,
  impact_analysis: "evidence://policy-impact/payments-v1",
  approval: {
    actor: approver,
    reason: "Independent policy approval after bounded impact review.",
    evidence: ["evidence://policy-approval/payments-v1"],
  },
  shadow: { evaluations: 100, deny_delta_bps: 0 },
  rollout: { percentage: 100 },
  rollback: { to_policy_version: null },
  ...overrides,
});

const policy = (overrides = {}) => ({
  id: "payments",
  version: "1.0.0",
  rules: [
    "workflow:create",
    "workflow:approve",
    "workflow:read",
    "workflow:execute",
  ].map((action) => ({ action, effect: "allow" })),
  release: release(),
  ...overrides,
});

const publish = (service, overrides = {}) =>
  service.publishPolicy({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
    policy: policy(),
    idempotencyKey: "publish-policy-key-0001",
    ...overrides,
  });

const step = (overrides = {}) => ({
  id: "policy-check",
  type: "policy_check",
  classification: "retryable",
  timeout_ms: 5_000,
  retry: { max_attempts: 2, backoff_ms: 100 },
  ...overrides,
});

const workflow = (overrides = {}) => ({
  id: "workflow-1",
  definition_version: "1.0.0",
  tenant_id: "tenant-1",
  environment_id: "environment-1",
  steps: [step()],
  approval: { required: 1, roles: ["workflow_approver"] },
  ...overrides,
});

const create = (service, overrides = {}) =>
  service.createWorkflow({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
    workflow: workflow(),
    idempotencyKey: "create-workflow-key-0001",
    ...overrides,
  });

const approve = (service, overrides = {}) =>
  service.approve({
    actor: approver,
    tenantId: "tenant-1",
    environmentId: "environment-1",
    workflowId: "workflow-1",
    decision: "approve",
    reason: "Approved for bounded reference execution.",
    evidence: ["evidence://workflow-approval/1"],
    ifMatch: '"1"',
    idempotencyKey: "approve-workflow-key-0001",
    ...overrides,
  });

const start = (service, overrides = {}) =>
  service.transition({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
    workflowId: "workflow-1",
    status: "running",
    ifMatch: '"2"',
    idempotencyKey: "start-workflow-key-0001",
    ...overrides,
  });

test("policy evaluation denies by default and returns exact governed decision provenance", () => {
  const service = makeService();
  const denied = service.evaluate({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
    action: "workflow:create",
    attributes: { purpose: "reference-test" },
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.reason_code, "no_policy");
  assert.equal(denied.body.policy_version, null);

  assert.equal(publish(service).status, 201);
  const allowed = service.evaluate({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
    action: "workflow:create",
    attributes: { purpose: "reference-test" },
  });
  assert.equal(allowed.status, 200);
  assert.deepEqual(
    {
      decision: allowed.body.decision,
      policy_id: allowed.body.policy_id,
      policy_version: allowed.body.policy_version,
      reason: allowed.body.reason_code,
      obligations: allowed.body.obligations,
      attributes: allowed.body.evaluated_attributes,
    },
    {
      decision: "allow",
      policy_id: "payments",
      policy_version: "payments:1.0.0.1",
      reason: "policy_allowed",
      obligations: [],
      attributes: { purpose: "reference-test" },
    },
  );
  assert.match(allowed.body.correlation_id, /^request-/u);
});

test("policy publication enforces tests, impact, independent approval, shadow, rollout, versioning, concurrency, and rollback targets", () => {
  const service = makeService();
  assert.equal(
    publish(service, {
      policy: policy({ release: release({ tests_passed: false }) }),
    }).body.code,
    "invalid_policy",
  );
  assert.equal(
    publish(service, {
      policy: policy({
        release: release({
          approval: {
            ...release().approval,
            actor: {
              ...publisher,
              roles: ["workflow_creator", "policy_approver"],
            },
          },
        }),
      }),
    }).body.code,
    "dual_control_required",
  );
  const first = publish(service);
  assert.equal(first.body.status, "active");
  assert.equal(first.headers.etag, '"1"');

  const secondPolicy = policy({
    version: "1.1.0",
    release: release({
      rollout: { percentage: 25 },
      rollback: { to_policy_version: "payments:1.0.0.1" },
    }),
  });
  assert.equal(
    publish(service, {
      policy: secondPolicy,
      idempotencyKey: "publish-policy-key-0002",
      ifMatch: '"0"',
    }).body.code,
    "precondition_failed",
  );
  const second = publish(service, {
    policy: secondPolicy,
    idempotencyKey: "publish-policy-key-0003",
    ifMatch: '"1"',
  });
  assert.equal(second.status, 201);
  assert.equal(second.body.status, "rolling_out");
  assert.equal(second.body.policy_version, "payments:1.1.0.2");

  assert.equal(
    publish(service, {
      policy: policy({
        version: "1.2.0",
        release: release({
          rollback: { to_policy_version: "payments:missing.9" },
        }),
      }),
      idempotencyKey: "publish-policy-key-0004",
      ifMatch: '"2"',
    }).body.code,
    "invalid_rollback_target",
  );
});

test("authorization and scope fail closed without cross-tenant or cross-environment disclosure", () => {
  const service = makeService();
  assert.equal(
    service.publishPolicy({
      actor: outsider,
      tenantId: "tenant-1",
      environmentId: "environment-1",
      policy: policy(),
      idempotencyKey: "unauthorized-key-0001",
    }).status,
    403,
  );
  assert.equal(publish(service).status, 201);
  assert.equal(create(service).status, 201);
  for (const scope of [
    ["tenant-2", "environment-1"],
    ["tenant-1", "environment-2"],
  ]) {
    const response = service.getWorkflow({
      actor: publisher,
      tenantId: scope[0],
      environmentId: scope[1],
      workflowId: "workflow-1",
    });
    assert.equal(response.status, 403);
    assert.equal(JSON.stringify(response).includes("workflow-1"), false);
  }
  assert.deepEqual(
    service.audit({
      actor: outsider,
      tenantId: "tenant-1",
      environmentId: "environment-1",
    }),
    [],
  );
});

test("closed input validation rejects accessors, proxies, circular and oversized values before dependencies run", () => {
  let authorizationCalls = 0;
  const service = makeService({
    authorize: (...args) => {
      authorizationCalls += 1;
      return authorize(...args);
    },
  });
  const accessor = {};
  Object.defineProperty(accessor, "actor", {
    enumerable: true,
    get() {
      throw new Error("must not execute");
    },
  });
  assert.equal(service.publishPolicy(accessor).body.code, "invalid_request");
  const hostile = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error("hostile");
      },
    },
  );
  assert.equal(service.publishPolicy(hostile).body.code, "invalid_request");
  const circular = {};
  circular.self = circular;
  assert.equal(service.publishPolicy(circular).body.code, "invalid_request");
  assert.equal(
    publish(service, {
      policy: policy({
        release: release({
          impact_analysis: `evidence://${"x".repeat(140_000)}`,
        }),
      }),
    }).body.code,
    "invalid_request",
  );
  assert.equal(authorizationCalls, 0);
});

test("workflow creation binds immutable definition and policy provenance with atomic history and outbox", () => {
  const service = makeService();
  publish(service);
  const definition = workflow();
  const created = create(service, { workflow: definition });
  definition.steps[0].id = "mutated-after-call";
  assert.equal(created.status, 201);
  assert.equal(created.body.definition.steps[0].id, "policy-check");
  assert.equal(created.body.policy_version, "payments:1.0.0.1");
  assert.equal(created.body.status, "pending_approval");
  assert.match(created.body.definition_digest, /^[a-f0-9]{64}$/u);

  const read = service.getWorkflow({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
    workflowId: "workflow-1",
  });
  assert.equal(read.history.length, 1);
  assert.equal(read.history[0].type, "created");
  const exported = service.exportState({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
  });
  assert.equal(exported.body.data.outbox.length, 1);
  assert.equal(exported.body.data.outbox[0].sequence, 1);
});

test("approval enforces creator separation, role scope, quorum, stale concurrency, and operation replay", () => {
  const service = makeService();
  publish(service);
  create(service, {
    workflow: workflow({
      approval: { required: 2, roles: ["workflow_approver"] },
    }),
  });
  assert.equal(
    approve(service, { actor: publisher }).body.code,
    "dual_control_required",
  );
  assert.equal(
    approve(service, { actor: wrongRole }).body.code,
    "approval_role_required",
  );
  const first = approve(service);
  assert.equal(first.body.status, "pending_approval");
  assert.equal(first.headers.etag, '"2"');
  assert.deepEqual(approve(service), first);
  assert.equal(
    approve(service, {
      actor: secondApprover,
      ifMatch: '"1"',
      idempotencyKey: "approve-workflow-key-0002",
    }).body.code,
    "precondition_failed",
  );
  const second = approve(service, {
    actor: secondApprover,
    ifMatch: '"2"',
    idempotencyKey: "approve-workflow-key-0003",
  });
  assert.equal(second.body.status, "approved");
  assert.equal(second.body.approval.decisions.length, 2);
  assert.equal(
    second.body.approval.decisions[0].policy_version,
    "payments:1.0.0.1",
  );
});

test("irreversible actions require an action request and verified postcondition before terminal success", () => {
  const service = makeService();
  publish(service);
  create(service, {
    workflow: workflow({
      steps: [
        step({
          id: "send-payment",
          type: "action",
          classification: "irreversible",
          retry: { max_attempts: 0, backoff_ms: 0 },
          action_request: { adapter: "payments", action: "send" },
          postcondition: "provider-confirmed",
        }),
      ],
    }),
  });
  approve(service);
  start(service);
  const unverified = service.executeStep({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
    workflowId: "workflow-1",
    stepId: "send-payment",
    outcome: {
      result: "succeeded",
      action_request_id: "workflow-1:send-payment",
      postcondition_verified: false,
    },
    ifMatch: '"3"',
    idempotencyKey: "execute-step-key-0001",
  });
  assert.equal(unverified.body.code, "irreversible_action_unverified");
  const succeeded = service.executeStep({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
    workflowId: "workflow-1",
    stepId: "send-payment",
    outcome: {
      result: "succeeded",
      action_request_id: "workflow-1:send-payment",
      postcondition_verified: true,
    },
    ifMatch: '"3"',
    idempotencyKey: "execute-step-key-0002",
  });
  assert.equal(succeeded.body.status, "succeeded");
  assert.equal(succeeded.body.checkpoints[0].postcondition_verified, true);
  assert.equal(
    succeeded.body.checkpoints[0].action_request_id,
    "workflow-1:send-payment",
  );
  assert.equal(
    service.transition({
      actor: publisher,
      tenantId: "tenant-1",
      environmentId: "environment-1",
      workflowId: "workflow-1",
      status: "running",
      ifMatch: '"4"',
      idempotencyKey: "terminal-reopen-key-0001",
    }).body.code,
    "invalid_transition",
  );
});

test("retry, timeout, cancellation, and compensation transitions are bounded and fail closed", () => {
  const retryService = makeService();
  publish(retryService);
  create(retryService);
  approve(retryService);
  start(retryService);
  const retrying = retryService.executeStep({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
    workflowId: "workflow-1",
    stepId: "policy-check",
    outcome: { result: "timed_out", failure_code: "dependency_timeout" },
    ifMatch: '"3"',
    idempotencyKey: "timeout-step-key-0001",
  });
  assert.equal(retrying.body.status, "retrying");
  assert.equal(retrying.body.checkpoints[0].attempts, 1);
  assert.match(retrying.body.checkpoints[0].retry_after, /^2030-01-01T/u);
  const cancelled = retryService.transition({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
    workflowId: "workflow-1",
    status: "cancelled",
    ifMatch: '"4"',
    idempotencyKey: "cancel-workflow-key-0001",
  });
  assert.equal(cancelled.body.status, "cancelled");

  const compensationService = makeService();
  publish(compensationService);
  create(compensationService, {
    workflow: workflow({
      steps: [
        step({
          id: "reserve",
          type: "action",
          classification: "compensatable",
          retry: { max_attempts: 0, backoff_ms: 0 },
          compensation: { adapter: "ledger", action: "release" },
        }),
      ],
    }),
  });
  approve(compensationService);
  start(compensationService);
  const failed = compensationService.executeStep({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
    workflowId: "workflow-1",
    stepId: "reserve",
    outcome: { result: "failed", failure_code: "adapter_failure" },
    ifMatch: '"3"',
    idempotencyKey: "compensate-trigger-key-0001",
  });
  assert.equal(failed.body.status, "compensating");
  const compensated = compensationService.compensate({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
    workflowId: "workflow-1",
    stepId: "reserve",
    evidence: "evidence://compensation/release-1",
    ifMatch: '"4"',
    idempotencyKey: "compensate-step-key-0001",
  });
  assert.equal(compensated.body.status, "failed");
  assert.equal(compensated.body.checkpoints[0].status, "compensated");
});

test("operation-scoped idempotency replays exactly and rejects substituted requests", () => {
  const service = makeService();
  const shared = "shared-operation-key-0001";
  const first = publish(service, { idempotencyKey: shared });
  assert.deepEqual(publish(service, { idempotencyKey: shared }), first);
  assert.equal(create(service, { idempotencyKey: shared }).status, 201);
  assert.equal(
    create(service, {
      idempotencyKey: shared,
      workflow: workflow({ definition_version: "2.0.0" }),
    }).body.code,
    "idempotency_conflict",
  );
});

test("injected persistence failures roll back state, history, audit, outbox, and idempotency atomically", () => {
  let fail = false;
  const service = makeService({
    persist: () => {
      if (fail) throw new Error("injected persistence failure");
    },
  });
  publish(service);
  const before = service.exportState({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
  }).body;
  fail = true;
  const failed = create(service);
  assert.equal(failed.status, 503);
  assert.equal(failed.body.code, "persistence_unavailable");
  fail = false;
  const after = service.exportState({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
  }).body;
  assert.deepEqual(after, before);
  assert.equal(create(service).status, 201);
});

test("clock and request correlation dependency failures deny without partial workflow mutation", () => {
  const noRequest = makeService({ requestId: () => null });
  assert.equal(publish(noRequest).body.code, "request_id_unavailable");
  const badClock = makeService({ now: () => new Date("invalid") });
  assert.equal(publish(badClock).body.code, "persistence_unavailable");
  const healthyClock = makeService();
  assert.equal(publish(healthyClock).status, 201);
});

test("integrity-bound scoped recovery preserves state and rejects corruption, substitution, duplicates, and foreign scope", () => {
  const service = makeService();
  publish(service);
  create(service);
  approve(service);
  const exported = service.exportState({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
  });
  assert.equal(exported.status, 200);
  assert.match(exported.body.sha256, /^[a-f0-9]{64}$/u);
  const recovered = makeService({ state: exported.body });
  assert.equal(
    recovered.getWorkflow({
      actor: publisher,
      tenantId: "tenant-1",
      environmentId: "environment-1",
      workflowId: "workflow-1",
    }).body.status,
    "approved",
  );

  const corrupt = structuredClone(exported.body);
  corrupt.data.workflows[0].status = "succeeded";
  assert.throws(
    () => makeService({ state: corrupt }),
    /invalid_recovery_digest/u,
  );

  const substituted = structuredClone(exported.body);
  substituted.sha256 = "0".repeat(64);
  assert.throws(
    () => makeService({ state: substituted }),
    /invalid_recovery_digest/u,
  );

  const duplicate = structuredClone(exported.body);
  duplicate.data.workflows.push(structuredClone(duplicate.data.workflows[0]));
  resign(duplicate);
  assert.throws(
    () => makeService({ state: duplicate }),
    /invalid_recovery_state/u,
  );

  const foreign = structuredClone(exported.body);
  foreign.data.workflows[0].tenant_id = "tenant-2";
  resign(foreign);
  assert.throws(
    () => makeService({ state: foreign }),
    /recovery_scope_mismatch/u,
  );

  const malformed = structuredClone(exported.body);
  malformed.data.workflows[0].status = "invented-terminal";
  resign(malformed);
  assert.throws(
    () => makeService({ state: malformed }),
    /recovery_scope_mismatch/u,
  );

  const unexpected = structuredClone(exported.body);
  unexpected.data.workflows[0].secret = "must-not-load";
  resign(unexpected);
  assert.throws(
    () => makeService({ state: unexpected }),
    /recovery_scope_mismatch/u,
  );

  const accessor = structuredClone(exported.body);
  Object.defineProperty(accessor.data.workflows[0], "status", {
    enumerable: true,
    get() {
      throw new Error("must not execute");
    },
  });
  assert.throws(() => makeService({ state: accessor }), /unsafe_input/u);
});

test("recovery closes every nested record and atomically rejects re-signed hostile state", () => {
  const service = makeService();
  publish(service);
  create(service);
  approve(service);
  const exported = service.exportState({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
  }).body;
  const baseline = structuredClone(exported);
  const assertResignedRejected = (mutate) => {
    const hostile = structuredClone(exported);
    mutate(hostile);
    resign(hostile);
    let error;
    try {
      makeService({ state: hostile });
    } catch (caught) {
      error = caught;
    }
    assert.ok(error instanceof TypeError);
    assert.equal(String(error).includes("customer-financial-data"), false);
    assert.deepEqual(
      service.exportState({
        actor: publisher,
        tenantId: "tenant-1",
        environmentId: "environment-1",
      }).body,
      baseline,
    );
  };

  const hostileMutations = [
    (bundle) => {
      bundle.secret = "customer-financial-data";
    },
    (bundle) => {
      bundle.scope.secret = "customer-financial-data";
    },
    (bundle) => {
      bundle.data.secret = [];
    },
    (bundle) => {
      delete bundle.data.audit;
    },
    (bundle) => {
      bundle.data.policies[0].secret = "customer-financial-data";
    },
    (bundle) => {
      bundle.data.policies[0].rules[0].secret = "customer-financial-data";
    },
    (bundle) => {
      bundle.data.policies[0].release.approval.secret =
        "customer-financial-data";
    },
    (bundle) => {
      delete bundle.data.policies[0].published_by;
    },
    (bundle) => {
      bundle.data.workflows[0].secret = "customer-financial-data";
    },
    (bundle) => {
      bundle.data.workflows[0].definition.steps[0].retry.secret =
        "customer-financial-data";
    },
    (bundle) => {
      bundle.data.workflows[0].approval.secret = "customer-financial-data";
    },
    (bundle) => {
      bundle.data.workflows[0].approval.decisions[0].secret =
        "customer-financial-data";
    },
    (bundle) => {
      delete bundle.data.workflows[0].approval.decisions[0].policy_version;
    },
    (bundle) => {
      bundle.data.workflows[0].checkpoints[0].secret =
        "customer-financial-data";
    },
    (bundle) => {
      bundle.data.workflows[0].checkpoints[0].attempts = "zero";
    },
    (bundle) => {
      bundle.data.idempotency[0].secret = "customer-financial-data";
    },
    (bundle) => {
      delete bundle.data.idempotency[0].result;
    },
    (bundle) => {
      bundle.data.idempotency[0].result.secret = "customer-financial-data";
    },
    (bundle) => {
      bundle.data.idempotency[0].result.body.secret = "customer-financial-data";
    },
    (bundle) => {
      delete bundle.data.idempotency[0].result.headers.etag;
    },
    (bundle) => {
      bundle.data.audit[0].secret = "customer-financial-data";
    },
    (bundle) => {
      delete bundle.data.audit[0].request_id;
    },
    (bundle) => {
      bundle.data.history[0].secret = "customer-financial-data";
    },
    (bundle) => {
      bundle.data.history[0].sequence = 2;
    },
    (bundle) => {
      bundle.data.outbox[0].secret = "customer-financial-data";
    },
    (bundle) => {
      bundle.data.outbox[0].payload.secret = "customer-financial-data";
    },
    (bundle) => {
      bundle.data.outbox[0].payload.status = "substituted";
    },
    (bundle) => {
      bundle.data.history.push(structuredClone(bundle.data.history[0]));
    },
    (bundle) => {
      bundle.data.outbox.push(structuredClone(bundle.data.outbox[0]));
    },
  ];
  hostileMutations.forEach(assertResignedRejected);

  const unsafeValues = [
    (() => {
      const bundle = structuredClone(exported);
      Object.defineProperty(bundle.data.audit[0], "secret", {
        enumerable: true,
        get() {
          throw new Error("customer-financial-data");
        },
      });
      return bundle;
    })(),
    (() => {
      const bundle = structuredClone(exported);
      bundle.data.audit[0] = new Proxy(bundle.data.audit[0], {
        ownKeys() {
          throw new Error("customer-financial-data");
        },
      });
      return bundle;
    })(),
    (() => {
      const bundle = structuredClone(exported);
      bundle.data.audit[0][Symbol("secret")] = "customer-financial-data";
      return bundle;
    })(),
    (() => {
      const bundle = structuredClone(exported);
      bundle.data.history = new Array(2);
      bundle.data.history[0] = structuredClone(exported.data.history[0]);
      return bundle;
    })(),
    (() => {
      const bundle = structuredClone(exported);
      bundle.data.audit[0].cycle = bundle;
      return bundle;
    })(),
    (() => {
      const bundle = structuredClone(exported);
      bundle.data.audit[0].action = "x".repeat(8_193);
      return bundle;
    })(),
  ];
  for (const hostile of unsafeValues) {
    assert.throws(
      () => makeService({ state: hostile }),
      (error) =>
        error instanceof TypeError &&
        !String(error).includes("customer-financial-data"),
    );
  }

  const corrected = makeService({ state: baseline });
  assert.equal(
    corrected.getWorkflow({
      actor: publisher,
      tenantId: "tenant-1",
      environmentId: "environment-1",
      workflowId: "workflow-1",
    }).body.status,
    "approved",
  );
});

test("audit and outbox are metadata-only, ordered, policy-bound, and omit supplied reason/evidence payloads", () => {
  const service = makeService();
  publish(service);
  create(service);
  approve(service, {
    reason: "sensitive-free bounded operator rationale",
    evidence: ["evidence://approval/private-reference"],
  });
  start(service);
  const audit = service.audit({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
  });
  assert.ok(audit.length >= 4);
  assert.ok(audit.every((entry) => entry.tenant_id === "tenant-1"));
  assert.ok(
    audit
      .filter((entry) => entry.action.startsWith("workflow."))
      .every((entry) => entry.resource_id === "workflow-1"),
  );
  const serialized = JSON.stringify(audit);
  assert.equal(
    serialized.includes("sensitive-free bounded operator rationale"),
    false,
  );
  assert.equal(serialized.includes("private-reference"), false);
  const exported = service.exportState({
    actor: publisher,
    tenantId: "tenant-1",
    environmentId: "environment-1",
  }).body;
  const sequences = exported.data.outbox.map((event) => event.sequence);
  assert.deepEqual(sequences, [1, 2, 3]);
  assert.ok(
    exported.data.outbox.every((event) => event.type.startsWith("workflow.")),
  );
});

test("workflow definitions fail closed when typed retry, timer, compensation, or irreversible controls are incomplete", () => {
  const service = makeService();
  publish(service);
  const timerWithoutConfiguration = step({ type: "timer" });
  const compensatableWithoutAction = step({ classification: "compensatable" });
  const invalidDefinitions = [
    workflow({ steps: [step({ retry: { max_attempts: 99, backoff_ms: 0 } })] }),
    workflow({ steps: [timerWithoutConfiguration] }),
    workflow({ steps: [compensatableWithoutAction] }),
    workflow({
      steps: [
        step({
          classification: "irreversible",
          type: "action",
          retry: { max_attempts: 0, backoff_ms: 0 },
          action_request: { adapter: "payments", action: "send" },
        }),
      ],
    }),
  ];
  invalidDefinitions.forEach((definition, index) => {
    assert.equal(
      create(service, {
        workflow: definition,
        idempotencyKey: `invalid-workflow-key-000${index}`,
      }).body.code,
      "invalid_workflow",
    );
  });
});
