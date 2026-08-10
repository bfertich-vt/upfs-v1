import crypto from "node:crypto";

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const STEP_TYPES = new Set(["policy_check", "approval", "timer", "action"]);
const CLASSIFICATIONS = new Set([
  "retryable",
  "manually_recoverable",
  "compensatable",
  "irreversible",
]);
const TERMINAL = new Set(["succeeded", "failed", "cancelled", "denied"]);
const MAX_NODES = 2_000;
const MAX_BYTES = 128 * 1024;

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

const digest = (value) =>
  crypto.createHash("sha256").update(canonical(value), "utf8").digest("hex");

const cloneKnown = (value) => JSON.parse(JSON.stringify(value));

const readClosedData = (
  input,
  { maxNodes = MAX_NODES, maxBytes = MAX_BYTES } = {},
) => {
  let nodes = 0;
  const seen = new Set();
  const visit = (value, depth) => {
    nodes += 1;
    if (nodes > maxNodes || depth > 20) throw new TypeError("unsafe_input");
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new TypeError("unsafe_input");
      return value;
    }
    if (typeof value === "string") {
      if (
        value.length > 8_192 ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)
      ) {
        throw new TypeError("unsafe_input");
      }
      return value;
    }
    if (typeof value !== "object") throw new TypeError("unsafe_input");
    if (seen.has(value)) throw new TypeError("unsafe_input");
    seen.add(value);
    let prototype;
    let descriptors;
    let symbols;
    try {
      prototype = Object.getPrototypeOf(value);
      descriptors = Object.getOwnPropertyDescriptors(value);
      symbols = Object.getOwnPropertySymbols(value);
    } catch {
      throw new TypeError("unsafe_input");
    }
    if (symbols.length > 0) throw new TypeError("unsafe_input");
    const array = Array.isArray(value);
    if (
      prototype !== (array ? Array.prototype : Object.prototype) &&
      prototype !== null
    ) {
      throw new TypeError("unsafe_input");
    }
    const output = array ? [] : {};
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (array && key === "length") continue;
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw new TypeError("unsafe_input");
      }
      if (array && !/^(0|[1-9][0-9]*)$/u.test(key))
        throw new TypeError("unsafe_input");
      output[key] = visit(descriptor.value, depth + 1);
    }
    if (array && Object.keys(output).length !== value.length)
      throw new TypeError("unsafe_input");
    seen.delete(value);
    return output;
  };
  const output = visit(input, 0);
  if (Buffer.byteLength(canonical(output), "utf8") > maxBytes)
    throw new TypeError("unsafe_input");
  return output;
};

const keysAre = (value, allowed) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => allowed.includes(key));

const keysExactly = (value, required, optional = []) =>
  keysAre(value, [...required, ...optional]) &&
  required.every((key) => Object.hasOwn(value, key));

const validTimestamp = (value) =>
  typeof value === "string" &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString() === value;

const nullableIdentifier = (value) => value === null || IDENTIFIER.test(value);

const validStringArray = (value, maxItems = 32, maxLength = 512) =>
  Array.isArray(value) &&
  value.length <= maxItems &&
  value.every((item) => boundedText(item, maxLength, true));

const boundedText = (value, max = 2_048, required = false) =>
  typeof value === "string" &&
  value.length <= max &&
  (!required || value.length > 0);

const validActor = (actor) =>
  keysAre(actor, ["issuer", "subject", "roles"]) &&
  IDENTIFIER.test(actor.issuer ?? "") &&
  IDENTIFIER.test(actor.subject ?? "") &&
  Array.isArray(actor.roles ?? []) &&
  (actor.roles ?? []).length <= 32 &&
  (actor.roles ?? []).every((role) => IDENTIFIER.test(role));

const actorId = (actor) => `${actor.issuer}|${actor.subject}`;

const responseError = (status, code, requestId = null) => ({
  status,
  body: { request_id: requestId, code, details: {}, retryable: status >= 500 },
});

const blankState = () => ({
  policies: [],
  workflows: [],
  idempotency: [],
  audit: [],
  history: [],
  outbox: [],
});

export class PolicyWorkflowService {
  #state = blankState();
  #authorize;
  #persist;
  #now;
  #requestId;

  constructor({
    authorize = () => false,
    persist = () => {},
    now = () => new Date(),
    requestId = () => `req-${crypto.randomUUID()}`,
    state,
  } = {}) {
    if (typeof authorize !== "function" || typeof persist !== "function") {
      throw new TypeError("invalid_dependencies");
    }
    if (typeof now !== "function" || typeof requestId !== "function") {
      throw new TypeError("invalid_dependencies");
    }
    this.#authorize = authorize;
    this.#persist = persist;
    this.#now = now;
    this.#requestId = requestId;
    if (state !== undefined) this.#state = this.#verifyBundle(state);
  }

  #request() {
    try {
      const value = this.#requestId();
      return IDENTIFIER.test(value) ? value : null;
    } catch {
      return null;
    }
  }

  #timestamp() {
    try {
      const value = this.#now();
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.valueOf()))
        throw new TypeError("clock_unavailable");
      return date.toISOString();
    } catch {
      throw new TypeError("clock_unavailable");
    }
  }

  #input(value) {
    try {
      return { ok: true, value: readClosedData(value) };
    } catch {
      return { ok: false };
    }
  }

  #scope(actor, tenantId, environmentId, action) {
    if (
      !validActor(actor) ||
      !IDENTIFIER.test(tenantId ?? "") ||
      !IDENTIFIER.test(environmentId ?? "") ||
      !IDENTIFIER.test(action ?? "")
    ) {
      return false;
    }
    try {
      const result = this.#authorize(
        cloneKnown(actor),
        tenantId,
        environmentId,
        action,
      );
      if (result === true) return true;
      const safe = readClosedData(result, { maxNodes: 128, maxBytes: 8_192 });
      return (
        keysAre(safe, ["tenantId", "environmentId", "actions"]) &&
        safe.tenantId === tenantId &&
        safe.environmentId === environmentId &&
        Array.isArray(safe.actions) &&
        safe.actions.includes(action)
      );
    } catch {
      return false;
    }
  }

  #atomic(mutator, requestId) {
    const draft = cloneKnown(this.#state);
    let result;
    try {
      result = mutator(draft);
      this.#persist(cloneKnown(draft));
    } catch {
      return responseError(503, "persistence_unavailable", requestId);
    }
    this.#state = draft;
    return cloneKnown(result);
  }

  #idempotency(state, key, value) {
    const requestHash = digest(value);
    const prior = state.idempotency.find((entry) => entry.key === key);
    if (!prior) return { requestHash };
    if (prior.request_hash !== requestHash) return { conflict: true };
    return { replay: cloneKnown(prior.result) };
  }

  #saveIdempotency(state, key, requestHash, result) {
    state.idempotency.push({
      key,
      request_hash: requestHash,
      result: cloneKnown(result),
    });
  }

  #idempotencyKey(operation, actor, tenantId, environmentId, key) {
    return `${operation}|${actorId(actor)}|${tenantId}|${environmentId}|${key}`;
  }

  #audit(
    state,
    action,
    actor,
    tenantId,
    environmentId,
    requestId,
    fields = {},
  ) {
    state.audit.push({
      action,
      actor: actor ? actorId(actor) : null,
      tenant_id: tenantId ?? null,
      environment_id: environmentId ?? null,
      request_id: requestId,
      at: this.#timestamp(),
      ...cloneKnown(fields),
    });
  }

  #append(state, workflow, event, requestId) {
    const record = {
      sequence:
        state.history.filter((item) => item.workflow_key === workflow.key)
          .length + 1,
      workflow_key: workflow.key,
      tenant_id: workflow.tenant_id,
      environment_id: workflow.environment_id,
      workflow_id: workflow.id,
      at: this.#timestamp(),
      ...cloneKnown(event),
    };
    state.history.push(record);
    state.outbox.push({
      event_id: digest({
        workflow: workflow.key,
        sequence: record.sequence,
        requestId,
      }),
      type: `workflow.${event.type}.v1`,
      tenant_id: workflow.tenant_id,
      environment_id: workflow.environment_id,
      workflow_id: workflow.id,
      sequence: record.sequence,
      payload: cloneKnown(record),
    });
  }

  #policyValid(policy) {
    if (!keysExactly(policy, ["id", "version", "rules", "release"]))
      return false;
    if (
      !IDENTIFIER.test(policy.id ?? "") ||
      !IDENTIFIER.test(policy.version ?? "")
    )
      return false;
    if (
      !Array.isArray(policy.rules) ||
      policy.rules.length < 1 ||
      policy.rules.length > 128
    )
      return false;
    if (
      !policy.rules.every(
        (rule) =>
          keysExactly(
            rule,
            ["action", "effect"],
            ["resource_type", "when", "obligations"],
          ) &&
          IDENTIFIER.test(rule.action ?? "") &&
          ["allow", "deny"].includes(rule.effect) &&
          (rule.resource_type === undefined ||
            IDENTIFIER.test(rule.resource_type)) &&
          (rule.when === undefined ||
            (keysAre(rule.when, Object.keys(rule.when)) &&
              Object.keys(rule.when).length <= 32 &&
              Object.values(rule.when).every((value) =>
                ["string", "number", "boolean"].includes(typeof value),
              ))) &&
          (rule.obligations === undefined ||
            (Array.isArray(rule.obligations) &&
              rule.obligations.length <= 32 &&
              rule.obligations.every((value) => IDENTIFIER.test(value)))),
      )
    ) {
      return false;
    }
    const release = policy.release;
    if (
      !keysExactly(release, [
        "tests_passed",
        "impact_analysis",
        "approval",
        "shadow",
        "rollout",
        "rollback",
      ])
    ) {
      return false;
    }
    if (
      release.tests_passed !== true ||
      !boundedText(release.impact_analysis, 512, true)
    )
      return false;
    if (
      !keysExactly(release.approval, ["actor", "reason", "evidence"]) ||
      !validActor(release.approval.actor) ||
      !release.approval.actor.roles.includes("policy_approver") ||
      !boundedText(release.approval.reason, 2_048, true) ||
      !Array.isArray(release.approval.evidence) ||
      release.approval.evidence.length < 1 ||
      release.approval.evidence.length > 32 ||
      !release.approval.evidence.every((item) => boundedText(item, 512, true))
    ) {
      return false;
    }
    if (
      !keysExactly(release.shadow, ["evaluations", "deny_delta_bps"]) ||
      !Number.isSafeInteger(release.shadow.evaluations) ||
      release.shadow.evaluations < 1 ||
      !Number.isSafeInteger(release.shadow.deny_delta_bps) ||
      Math.abs(release.shadow.deny_delta_bps) > 10_000
    ) {
      return false;
    }
    if (
      !keysExactly(release.rollout, ["percentage"]) ||
      !Number.isSafeInteger(release.rollout.percentage) ||
      release.rollout.percentage < 0 ||
      release.rollout.percentage > 100
    ) {
      return false;
    }
    return (
      keysExactly(release.rollback, ["to_policy_version"]) &&
      (release.rollback.to_policy_version === null ||
        IDENTIFIER.test(release.rollback.to_policy_version))
    );
  }

  publishPolicy(input) {
    const requestId = this.#request();
    if (!requestId) return responseError(503, "request_id_unavailable");
    const parsed = this.#input(input);
    if (
      !parsed.ok ||
      !keysAre(parsed.value, [
        "actor",
        "tenantId",
        "environmentId",
        "policy",
        "idempotencyKey",
        "ifMatch",
      ])
    ) {
      return responseError(400, "invalid_request", requestId);
    }
    const { actor, tenantId, environmentId, policy, idempotencyKey, ifMatch } =
      parsed.value;
    if (!validActor(actor))
      return responseError(401, "authentication_required", requestId);
    if (!this.#scope(actor, tenantId, environmentId, "policy:publish")) {
      return responseError(403, "forbidden", requestId);
    }
    if (!this.#policyValid(policy))
      return responseError(400, "invalid_policy", requestId);
    if (actorId(actor) === actorId(policy.release.approval.actor)) {
      return responseError(403, "dual_control_required", requestId);
    }
    if (
      !this.#scope(
        policy.release.approval.actor,
        tenantId,
        environmentId,
        "policy:approve",
      )
    ) {
      return responseError(403, "approval_forbidden", requestId);
    }
    if (!IDENTIFIER.test(idempotencyKey ?? "") || idempotencyKey.length < 16) {
      return responseError(400, "idempotency_key_required", requestId);
    }
    const operationKey = this.#idempotencyKey(
      "publishPolicy",
      actor,
      tenantId,
      environmentId,
      idempotencyKey,
    );
    const request = {
      tenantId,
      environmentId,
      policy,
      ifMatch: ifMatch ?? null,
    };
    return this.#atomic((state) => {
      const idem = this.#idempotency(state, operationKey, request);
      if (idem.conflict)
        return responseError(409, "idempotency_conflict", requestId);
      if (idem.replay) return idem.replay;
      const records = state.policies.filter(
        (item) =>
          item.tenant_id === tenantId &&
          item.environment_id === environmentId &&
          item.id === policy.id,
      );
      const current = records.at(-1);
      if (
        (current && ifMatch !== `"${current.number}"`) ||
        (!current && ifMatch !== undefined)
      ) {
        return responseError(412, "precondition_failed", requestId);
      }
      if (
        policy.release.rollback.to_policy_version !== null &&
        !records.some(
          (item) =>
            item.policy_version === policy.release.rollback.to_policy_version,
        )
      ) {
        return responseError(400, "invalid_rollback_target", requestId);
      }
      const number = (current?.number ?? 0) + 1;
      const record = {
        id: policy.id,
        declared_version: policy.version,
        rules: cloneKnown(policy.rules),
        release: cloneKnown(policy.release),
        tenant_id: tenantId,
        environment_id: environmentId,
        number,
        policy_version: `${policy.id}:${policy.version}.${number}`,
        status:
          policy.release.rollout.percentage === 0
            ? "shadow"
            : policy.release.rollout.percentage === 100
              ? "active"
              : "rolling_out",
        published_at: this.#timestamp(),
        published_by: actorId(actor),
      };
      state.policies.push(record);
      this.#audit(
        state,
        "policy.publish",
        actor,
        tenantId,
        environmentId,
        requestId,
        {
          resource_id: record.id,
          policy_version: record.policy_version,
          approved_by: actorId(policy.release.approval.actor),
          rollout_percentage: record.release.rollout.percentage,
        },
      );
      const result = {
        status: 201,
        body: { ...cloneKnown(record), request_id: requestId },
        headers: { etag: `"${number}"` },
      };
      this.#saveIdempotency(state, operationKey, idem.requestHash, result);
      return result;
    }, requestId);
  }

  #decision(
    state,
    actor,
    tenantId,
    environmentId,
    action,
    resource,
    attributes,
    requestId,
  ) {
    const active = state.policies.filter(
      (policy) =>
        policy.tenant_id === tenantId &&
        policy.environment_id === environmentId &&
        policy.status !== "shadow",
    );
    const latestById = new Map();
    active.forEach((policy) => latestById.set(policy.id, policy));
    const policy = [...latestById.values()]
      .reverse()
      .find((candidate) =>
        candidate.rules.some((rule) => rule.action === action),
      );
    let reason = "no_policy";
    let decision = "deny";
    let obligations = [];
    if (policy) {
      const rule = policy.rules.find(
        (candidate) =>
          candidate.action === action &&
          (!candidate.resource_type ||
            candidate.resource_type === resource.type),
      );
      const matches = rule?.when
        ? Object.entries(rule.when).every(
            ([key, value]) => attributes[key] === value,
          )
        : true;
      if (rule?.effect === "allow" && matches) {
        decision = "allow";
        reason = "policy_allowed";
        obligations = rule.obligations ?? [];
      } else reason = rule ? "policy_denied" : "no_matching_rule";
    }
    return {
      decision,
      policy_id: policy?.id ?? null,
      policy_version: policy?.policy_version ?? null,
      reason_code: reason,
      obligations: cloneKnown(obligations),
      evaluated_attributes: cloneKnown(attributes),
      correlation_id: requestId,
    };
  }

  evaluate(input) {
    const requestId = this.#request();
    if (!requestId) return responseError(503, "request_id_unavailable");
    const parsed = this.#input(input);
    if (
      !parsed.ok ||
      !keysAre(parsed.value, [
        "actor",
        "tenantId",
        "environmentId",
        "action",
        "resource",
        "attributes",
      ])
    ) {
      return responseError(400, "invalid_request", requestId);
    }
    const {
      actor,
      tenantId,
      environmentId,
      action,
      resource = {},
      attributes = {},
    } = parsed.value;
    if (!validActor(actor)) {
      const denied = {
        decision: "deny",
        policy_id: null,
        policy_version: null,
        reason_code: "authentication_required",
        obligations: [],
        evaluated_attributes: {},
        correlation_id: requestId,
      };
      return this.#atomic((state) => {
        this.#audit(
          state,
          "policy.evaluate",
          null,
          null,
          null,
          requestId,
          denied,
        );
        return { status: 403, body: denied };
      }, requestId);
    }
    if (
      !keysAre(resource, ["type", "id"]) ||
      !keysAre(attributes, Object.keys(attributes))
    ) {
      return responseError(400, "invalid_request", requestId);
    }
    const authorized = this.#scope(
      actor,
      tenantId,
      environmentId,
      `policy:${action}`,
    );
    return this.#atomic((state) => {
      const decision = authorized
        ? this.#decision(
            state,
            actor,
            tenantId,
            environmentId,
            action,
            resource,
            attributes,
            requestId,
          )
        : {
            decision: "deny",
            policy_id: null,
            policy_version: null,
            reason_code: "forbidden",
            obligations: [],
            evaluated_attributes: {},
            correlation_id: requestId,
          };
      this.#audit(
        state,
        "policy.evaluate",
        actor,
        tenantId,
        environmentId,
        requestId,
        decision,
      );
      return {
        status: decision.decision === "allow" ? 200 : 403,
        body: decision,
      };
    }, requestId);
  }

  #workflowValid(workflow) {
    if (
      !keysExactly(workflow, [
        "id",
        "definition_version",
        "tenant_id",
        "environment_id",
        "steps",
        "approval",
      ]) ||
      !IDENTIFIER.test(workflow.id ?? "") ||
      !IDENTIFIER.test(workflow.definition_version ?? "") ||
      !IDENTIFIER.test(workflow.tenant_id ?? "") ||
      !IDENTIFIER.test(workflow.environment_id ?? "") ||
      !Array.isArray(workflow.steps) ||
      workflow.steps.length < 1 ||
      workflow.steps.length > 64 ||
      new Set(workflow.steps.map((step) => step.id)).size !==
        workflow.steps.length
    ) {
      return false;
    }
    if (
      !keysExactly(workflow.approval, ["required", "roles"]) ||
      !Number.isSafeInteger(workflow.approval.required) ||
      workflow.approval.required < 1 ||
      workflow.approval.required > 16 ||
      !Array.isArray(workflow.approval.roles) ||
      workflow.approval.roles.length < 1 ||
      workflow.approval.roles.length > 16 ||
      !workflow.approval.roles.every((role) => IDENTIFIER.test(role))
    ) {
      return false;
    }
    return workflow.steps.every((step) => {
      if (
        !keysExactly(
          step,
          ["id", "type", "classification", "timeout_ms", "retry"],
          ["timer", "action_request", "postcondition", "compensation"],
        ) ||
        !IDENTIFIER.test(step.id ?? "") ||
        !STEP_TYPES.has(step.type) ||
        !CLASSIFICATIONS.has(step.classification) ||
        !Number.isSafeInteger(step.timeout_ms) ||
        step.timeout_ms < 1 ||
        step.timeout_ms > 86_400_000 ||
        !keysExactly(step.retry, ["max_attempts", "backoff_ms"]) ||
        !Number.isSafeInteger(step.retry.max_attempts) ||
        step.retry.max_attempts < 0 ||
        step.retry.max_attempts > 10 ||
        !Number.isSafeInteger(step.retry.backoff_ms) ||
        step.retry.backoff_ms < 0 ||
        step.retry.backoff_ms > 86_400_000
      ) {
        return false;
      }
      if (
        step.type === "timer" &&
        (!keysExactly(step.timer, ["delay_ms"]) ||
          !Number.isSafeInteger(step.timer.delay_ms) ||
          step.timer.delay_ms < 1 ||
          step.timer.delay_ms > 31_536_000_000)
      ) {
        return false;
      }
      if (step.type !== "timer" && step.timer !== undefined) return false;
      if (step.classification === "irreversible") {
        if (
          !keysExactly(step.action_request, ["adapter", "action"]) ||
          !IDENTIFIER.test(step.action_request.adapter ?? "") ||
          !IDENTIFIER.test(step.action_request.action ?? "") ||
          !boundedText(step.postcondition, 512, true) ||
          step.compensation !== undefined
        ) {
          return false;
        }
      }
      if (
        step.classification === "compensatable" &&
        (!keysExactly(step.compensation, ["adapter", "action"]) ||
          !IDENTIFIER.test(step.compensation.adapter ?? "") ||
          !IDENTIFIER.test(step.compensation.action ?? ""))
      ) {
        return false;
      }
      return true;
    });
  }

  createWorkflow(input) {
    const requestId = this.#request();
    if (!requestId) return responseError(503, "request_id_unavailable");
    const parsed = this.#input(input);
    if (
      !parsed.ok ||
      !keysAre(parsed.value, [
        "actor",
        "tenantId",
        "environmentId",
        "workflow",
        "idempotencyKey",
      ])
    ) {
      return responseError(400, "invalid_request", requestId);
    }
    const { actor, tenantId, environmentId, workflow, idempotencyKey } =
      parsed.value;
    if (!validActor(actor))
      return responseError(401, "authentication_required", requestId);
    if (!this.#scope(actor, tenantId, environmentId, "workflow:create")) {
      return responseError(403, "forbidden", requestId);
    }
    if (
      !this.#workflowValid(workflow) ||
      workflow.tenant_id !== tenantId ||
      workflow.environment_id !== environmentId
    ) {
      return responseError(400, "invalid_workflow", requestId);
    }
    if (!IDENTIFIER.test(idempotencyKey ?? "") || idempotencyKey.length < 16) {
      return responseError(400, "idempotency_key_required", requestId);
    }
    const operationKey = this.#idempotencyKey(
      "createWorkflow",
      actor,
      tenantId,
      environmentId,
      idempotencyKey,
    );
    return this.#atomic((state) => {
      const idem = this.#idempotency(state, operationKey, workflow);
      if (idem.conflict)
        return responseError(409, "idempotency_conflict", requestId);
      if (idem.replay) return idem.replay;
      const key = `${tenantId}|${environmentId}|${workflow.id}`;
      if (state.workflows.some((item) => item.key === key)) {
        return responseError(409, "workflow_exists", requestId);
      }
      const decision = this.#decision(
        state,
        actor,
        tenantId,
        environmentId,
        "workflow:create",
        { type: "workflow", id: workflow.id },
        {},
        requestId,
      );
      if (decision.decision !== "allow") {
        this.#audit(
          state,
          "workflow.create.denied",
          actor,
          tenantId,
          environmentId,
          requestId,
          {
            resource_id: workflow.id,
            policy_version: decision.policy_version,
            reason_code: decision.reason_code,
          },
        );
        return responseError(403, "policy_denied", requestId);
      }
      const created = this.#timestamp();
      const record = {
        key,
        id: workflow.id,
        tenant_id: tenantId,
        environment_id: environmentId,
        definition_version: workflow.definition_version,
        definition: cloneKnown(workflow),
        definition_digest: digest(workflow),
        policy_version: decision.policy_version,
        created_by: actorId(actor),
        created_at: created,
        status: "pending_approval",
        version: 1,
        approval: { ...cloneKnown(workflow.approval), decisions: [] },
        checkpoints: workflow.steps.map((step) => ({
          step_id: step.id,
          status: "pending",
          attempts: 0,
          action_request_id: null,
          postcondition_verified: false,
        })),
      };
      state.workflows.push(record);
      this.#append(
        state,
        record,
        { type: "created", status: record.status, version: 1 },
        requestId,
      );
      this.#audit(
        state,
        "workflow.create",
        actor,
        tenantId,
        environmentId,
        requestId,
        {
          resource_id: record.id,
          definition_version: record.definition_version,
          policy_version: record.policy_version,
          status: record.status,
        },
      );
      const result = {
        status: 201,
        body: { ...cloneKnown(record), request_id: requestId },
        headers: { etag: '"1"' },
      };
      this.#saveIdempotency(state, operationKey, idem.requestHash, result);
      return result;
    }, requestId);
  }

  approve(input) {
    const requestId = this.#request();
    if (!requestId) return responseError(503, "request_id_unavailable");
    const parsed = this.#input(input);
    if (
      !parsed.ok ||
      !keysAre(parsed.value, [
        "actor",
        "tenantId",
        "environmentId",
        "workflowId",
        "decision",
        "reason",
        "evidence",
        "ifMatch",
        "idempotencyKey",
      ])
    ) {
      return responseError(400, "invalid_request", requestId);
    }
    const {
      actor,
      tenantId,
      environmentId,
      workflowId,
      decision,
      reason,
      evidence,
      ifMatch,
      idempotencyKey,
    } = parsed.value;
    if (!validActor(actor))
      return responseError(401, "authentication_required", requestId);
    if (!this.#scope(actor, tenantId, environmentId, "workflow:approve")) {
      return responseError(403, "forbidden", requestId);
    }
    if (
      !IDENTIFIER.test(workflowId ?? "") ||
      !["approve", "deny"].includes(decision) ||
      !boundedText(reason, 2_048, true) ||
      !Array.isArray(evidence) ||
      evidence.length < 1 ||
      evidence.length > 32 ||
      !evidence.every((item) => boundedText(item, 512, true)) ||
      !IDENTIFIER.test(idempotencyKey ?? "") ||
      idempotencyKey.length < 16
    ) {
      return responseError(400, "invalid_approval", requestId);
    }
    const operationKey = this.#idempotencyKey(
      "approve",
      actor,
      tenantId,
      environmentId,
      idempotencyKey,
    );
    const request = { workflowId, decision, reason, evidence, ifMatch };
    return this.#atomic((state) => {
      const idem = this.#idempotency(state, operationKey, request);
      if (idem.conflict)
        return responseError(409, "idempotency_conflict", requestId);
      if (idem.replay) return idem.replay;
      const workflow = state.workflows.find(
        (item) => item.key === `${tenantId}|${environmentId}|${workflowId}`,
      );
      if (!workflow) return responseError(404, "resource_not_found", requestId);
      if (ifMatch !== `"${workflow.version}"`) {
        return responseError(412, "precondition_failed", requestId);
      }
      if (workflow.status !== "pending_approval") {
        return responseError(409, "approval_closed", requestId);
      }
      if (workflow.created_by === actorId(actor)) {
        return responseError(403, "dual_control_required", requestId);
      }
      if (!actor.roles.some((role) => workflow.approval.roles.includes(role))) {
        return responseError(403, "approval_role_required", requestId);
      }
      if (
        workflow.approval.decisions.some(
          (item) => item.actor === actorId(actor),
        )
      ) {
        return responseError(409, "duplicate_approval", requestId);
      }
      const policyDecision = this.#decision(
        state,
        actor,
        tenantId,
        environmentId,
        "workflow:approve",
        { type: "workflow", id: workflow.id },
        { decision },
        requestId,
      );
      if (policyDecision.decision !== "allow") {
        return responseError(403, "policy_denied", requestId);
      }
      workflow.approval.decisions.push({
        actor: actorId(actor),
        roles: cloneKnown(actor.roles),
        decision,
        reason,
        evidence: cloneKnown(evidence),
        policy_version: policyDecision.policy_version,
        at: this.#timestamp(),
      });
      workflow.version += 1;
      if (decision === "deny") workflow.status = "denied";
      else if (
        workflow.approval.decisions.filter(
          (item) => item.decision === "approve",
        ).length >= workflow.approval.required
      ) {
        workflow.status = "approved";
      }
      this.#append(
        state,
        workflow,
        {
          type: "approval",
          decision,
          status: workflow.status,
          version: workflow.version,
        },
        requestId,
      );
      this.#audit(
        state,
        "workflow.approve",
        actor,
        tenantId,
        environmentId,
        requestId,
        {
          resource_id: workflow.id,
          decision,
          policy_version: policyDecision.policy_version,
          status: workflow.status,
        },
      );
      const result = {
        status: 200,
        body: { ...cloneKnown(workflow), request_id: requestId },
        headers: { etag: `"${workflow.version}"` },
      };
      this.#saveIdempotency(state, operationKey, idem.requestHash, result);
      return result;
    }, requestId);
  }

  transition(input) {
    const requestId = this.#request();
    if (!requestId) return responseError(503, "request_id_unavailable");
    const parsed = this.#input(input);
    if (
      !parsed.ok ||
      !keysAre(parsed.value, [
        "actor",
        "tenantId",
        "environmentId",
        "workflowId",
        "status",
        "ifMatch",
        "idempotencyKey",
      ])
    ) {
      return responseError(400, "invalid_request", requestId);
    }
    const {
      actor,
      tenantId,
      environmentId,
      workflowId,
      status,
      ifMatch,
      idempotencyKey,
    } = parsed.value;
    if (!validActor(actor))
      return responseError(401, "authentication_required", requestId);
    if (!this.#scope(actor, tenantId, environmentId, "workflow:execute")) {
      return responseError(403, "forbidden", requestId);
    }
    if (!IDENTIFIER.test(idempotencyKey ?? "") || idempotencyKey.length < 16) {
      return responseError(400, "idempotency_key_required", requestId);
    }
    const operationKey = this.#idempotencyKey(
      "transition",
      actor,
      tenantId,
      environmentId,
      idempotencyKey,
    );
    const request = { workflowId, status, ifMatch };
    return this.#atomic((state) => {
      const idem = this.#idempotency(state, operationKey, request);
      if (idem.conflict)
        return responseError(409, "idempotency_conflict", requestId);
      if (idem.replay) return idem.replay;
      const workflow = state.workflows.find(
        (item) => item.key === `${tenantId}|${environmentId}|${workflowId}`,
      );
      if (!workflow) return responseError(404, "resource_not_found", requestId);
      if (ifMatch !== `"${workflow.version}"`) {
        return responseError(412, "precondition_failed", requestId);
      }
      const legal = {
        approved: ["running", "cancelled"],
        running: ["cancelled"],
        retrying: ["running", "cancelled"],
        failed: ["retrying", "cancelled"],
        pending_approval: ["cancelled"],
      };
      if (!legal[workflow.status]?.includes(status)) {
        return responseError(409, "invalid_transition", requestId);
      }
      const policyDecision = this.#decision(
        state,
        actor,
        tenantId,
        environmentId,
        "workflow:execute",
        { type: "workflow", id: workflow.id },
        { target_status: status },
        requestId,
      );
      if (policyDecision.decision !== "allow") {
        return responseError(403, "policy_denied", requestId);
      }
      workflow.status = status;
      workflow.version += 1;
      this.#append(
        state,
        workflow,
        { type: "transition", status, version: workflow.version },
        requestId,
      );
      this.#audit(
        state,
        "workflow.transition",
        actor,
        tenantId,
        environmentId,
        requestId,
        {
          resource_id: workflow.id,
          policy_version: policyDecision.policy_version,
          status,
        },
      );
      const result = {
        status: 200,
        body: { ...cloneKnown(workflow), request_id: requestId },
        headers: { etag: `"${workflow.version}"` },
      };
      this.#saveIdempotency(state, operationKey, idem.requestHash, result);
      return result;
    }, requestId);
  }

  executeStep(input) {
    const requestId = this.#request();
    if (!requestId) return responseError(503, "request_id_unavailable");
    const parsed = this.#input(input);
    if (
      !parsed.ok ||
      !keysAre(parsed.value, [
        "actor",
        "tenantId",
        "environmentId",
        "workflowId",
        "stepId",
        "outcome",
        "ifMatch",
        "idempotencyKey",
      ])
    ) {
      return responseError(400, "invalid_request", requestId);
    }
    const {
      actor,
      tenantId,
      environmentId,
      workflowId,
      stepId,
      outcome,
      ifMatch,
      idempotencyKey,
    } = parsed.value;
    if (!validActor(actor))
      return responseError(401, "authentication_required", requestId);
    if (!this.#scope(actor, tenantId, environmentId, "workflow:execute")) {
      return responseError(403, "forbidden", requestId);
    }
    if (
      !IDENTIFIER.test(stepId ?? "") ||
      !keysAre(outcome, [
        "result",
        "postcondition_verified",
        "action_request_id",
        "failure_code",
      ]) ||
      !["succeeded", "failed", "timed_out"].includes(outcome.result) ||
      (outcome.postcondition_verified !== undefined &&
        typeof outcome.postcondition_verified !== "boolean") ||
      (outcome.action_request_id !== undefined &&
        !IDENTIFIER.test(outcome.action_request_id)) ||
      (outcome.failure_code !== undefined &&
        !IDENTIFIER.test(outcome.failure_code)) ||
      !IDENTIFIER.test(idempotencyKey ?? "") ||
      idempotencyKey.length < 16
    ) {
      return responseError(400, "invalid_step_outcome", requestId);
    }
    const operationKey = this.#idempotencyKey(
      "executeStep",
      actor,
      tenantId,
      environmentId,
      idempotencyKey,
    );
    const request = { workflowId, stepId, outcome, ifMatch };
    return this.#atomic((state) => {
      const idem = this.#idempotency(state, operationKey, request);
      if (idem.conflict)
        return responseError(409, "idempotency_conflict", requestId);
      if (idem.replay) return idem.replay;
      const workflow = state.workflows.find(
        (item) => item.key === `${tenantId}|${environmentId}|${workflowId}`,
      );
      if (!workflow) return responseError(404, "resource_not_found", requestId);
      if (ifMatch !== `"${workflow.version}"`) {
        return responseError(412, "precondition_failed", requestId);
      }
      if (workflow.status !== "running") {
        return responseError(409, "workflow_not_running", requestId);
      }
      const step = workflow.definition.steps.find((item) => item.id === stepId);
      const checkpoint = workflow.checkpoints.find(
        (item) => item.step_id === stepId,
      );
      if (!step || !checkpoint || checkpoint.status === "succeeded") {
        return responseError(409, "invalid_step", requestId);
      }
      const priorIncomplete = workflow.checkpoints
        .slice(0, workflow.checkpoints.indexOf(checkpoint))
        .some((item) => item.status !== "succeeded");
      if (priorIncomplete)
        return responseError(409, "step_order_required", requestId);
      const policyDecision = this.#decision(
        state,
        actor,
        tenantId,
        environmentId,
        "workflow:execute",
        { type: "workflow_step", id: step.id },
        { classification: step.classification },
        requestId,
      );
      if (policyDecision.decision !== "allow") {
        return responseError(403, "policy_denied", requestId);
      }
      if (step.classification === "irreversible") {
        const expectedActionRequest = `${workflow.id}:${step.id}`;
        if (
          outcome.action_request_id !== expectedActionRequest ||
          (outcome.result === "succeeded" &&
            outcome.postcondition_verified !== true)
        ) {
          return responseError(
            409,
            "irreversible_action_unverified",
            requestId,
          );
        }
        checkpoint.action_request_id = expectedActionRequest;
      }
      checkpoint.attempts += 1;
      checkpoint.postcondition_verified =
        outcome.postcondition_verified === true;
      checkpoint.failure_code = outcome.failure_code ?? null;
      if (outcome.result === "succeeded") checkpoint.status = "succeeded";
      else if (
        step.classification === "retryable" &&
        checkpoint.attempts <= step.retry.max_attempts
      ) {
        checkpoint.status = "retrying";
        workflow.status = "retrying";
        checkpoint.retry_after = new Date(
          Date.parse(this.#timestamp()) + step.retry.backoff_ms,
        ).toISOString();
      } else if (step.classification === "compensatable") {
        checkpoint.status = "compensation_required";
        workflow.status = "compensating";
      } else {
        checkpoint.status = outcome.result;
        workflow.status = "failed";
      }
      if (workflow.checkpoints.every((item) => item.status === "succeeded")) {
        workflow.status = "succeeded";
      }
      workflow.version += 1;
      this.#append(
        state,
        workflow,
        {
          type: "checkpoint",
          step_id: step.id,
          checkpoint_status: checkpoint.status,
          workflow_status: workflow.status,
          version: workflow.version,
        },
        requestId,
      );
      this.#audit(
        state,
        "workflow.step",
        actor,
        tenantId,
        environmentId,
        requestId,
        {
          resource_id: workflow.id,
          step_id: step.id,
          classification: step.classification,
          policy_version: policyDecision.policy_version,
          checkpoint_status: checkpoint.status,
          workflow_status: workflow.status,
        },
      );
      const result = {
        status: 200,
        body: { ...cloneKnown(workflow), request_id: requestId },
        headers: { etag: `"${workflow.version}"` },
      };
      this.#saveIdempotency(state, operationKey, idem.requestHash, result);
      return result;
    }, requestId);
  }

  compensate(input) {
    const requestId = this.#request();
    if (!requestId) return responseError(503, "request_id_unavailable");
    const parsed = this.#input(input);
    if (
      !parsed.ok ||
      !keysAre(parsed.value, [
        "actor",
        "tenantId",
        "environmentId",
        "workflowId",
        "stepId",
        "evidence",
        "ifMatch",
        "idempotencyKey",
      ])
    ) {
      return responseError(400, "invalid_request", requestId);
    }
    const {
      actor,
      tenantId,
      environmentId,
      workflowId,
      stepId,
      evidence,
      ifMatch,
      idempotencyKey,
    } = parsed.value;
    if (!validActor(actor))
      return responseError(401, "authentication_required", requestId);
    if (!this.#scope(actor, tenantId, environmentId, "workflow:execute")) {
      return responseError(403, "forbidden", requestId);
    }
    if (
      !IDENTIFIER.test(stepId ?? "") ||
      !boundedText(evidence, 512, true) ||
      !IDENTIFIER.test(idempotencyKey ?? "") ||
      idempotencyKey.length < 16
    ) {
      return responseError(400, "invalid_compensation", requestId);
    }
    const operationKey = this.#idempotencyKey(
      "compensate",
      actor,
      tenantId,
      environmentId,
      idempotencyKey,
    );
    const request = { workflowId, stepId, evidence, ifMatch };
    return this.#atomic((state) => {
      const idem = this.#idempotency(state, operationKey, request);
      if (idem.conflict)
        return responseError(409, "idempotency_conflict", requestId);
      if (idem.replay) return idem.replay;
      const workflow = state.workflows.find(
        (item) => item.key === `${tenantId}|${environmentId}|${workflowId}`,
      );
      if (!workflow) return responseError(404, "resource_not_found", requestId);
      if (ifMatch !== `"${workflow.version}"`) {
        return responseError(412, "precondition_failed", requestId);
      }
      const step = workflow.definition.steps.find((item) => item.id === stepId);
      const checkpoint = workflow.checkpoints.find(
        (item) => item.step_id === stepId,
      );
      if (
        workflow.status !== "compensating" ||
        step?.classification !== "compensatable" ||
        checkpoint?.status !== "compensation_required"
      ) {
        return responseError(409, "compensation_not_required", requestId);
      }
      checkpoint.status = "compensated";
      checkpoint.compensation_evidence = evidence;
      workflow.status = "failed";
      workflow.version += 1;
      this.#append(
        state,
        workflow,
        {
          type: "compensation",
          step_id: stepId,
          status: "failed",
          version: workflow.version,
        },
        requestId,
      );
      this.#audit(
        state,
        "workflow.compensate",
        actor,
        tenantId,
        environmentId,
        requestId,
        {
          resource_id: workflow.id,
          step_id: stepId,
          status: workflow.status,
        },
      );
      const result = {
        status: 200,
        body: { ...cloneKnown(workflow), request_id: requestId },
        headers: { etag: `"${workflow.version}"` },
      };
      this.#saveIdempotency(state, operationKey, idem.requestHash, result);
      return result;
    }, requestId);
  }

  getWorkflow(input) {
    const requestId = this.#request();
    if (!requestId) return responseError(503, "request_id_unavailable");
    const parsed = this.#input(input);
    if (
      !parsed.ok ||
      !keysAre(parsed.value, [
        "actor",
        "tenantId",
        "environmentId",
        "workflowId",
      ])
    ) {
      return responseError(400, "invalid_request", requestId);
    }
    const { actor, tenantId, environmentId, workflowId } = parsed.value;
    if (!validActor(actor))
      return responseError(401, "authentication_required", requestId);
    if (!this.#scope(actor, tenantId, environmentId, "workflow:read")) {
      return responseError(403, "forbidden", requestId);
    }
    const workflow = this.#state.workflows.find(
      (item) => item.key === `${tenantId}|${environmentId}|${workflowId}`,
    );
    if (!workflow) return responseError(404, "resource_not_found", requestId);
    return {
      status: 200,
      body: { ...cloneKnown(workflow), request_id: requestId },
      history: cloneKnown(
        this.#state.history.filter(
          (item) => item.workflow_key === workflow.key,
        ),
      ),
    };
  }

  audit(input) {
    const parsed = this.#input(input);
    if (
      !parsed.ok ||
      !keysAre(parsed.value, ["actor", "tenantId", "environmentId"])
    )
      return [];
    const { actor, tenantId, environmentId } = parsed.value;
    if (
      !validActor(actor) ||
      !this.#scope(actor, tenantId, environmentId, "workflow:audit")
    ) {
      return [];
    }
    return cloneKnown(
      this.#state.audit.filter(
        (item) =>
          item.tenant_id === tenantId && item.environment_id === environmentId,
      ),
    );
  }

  exportState(input) {
    const parsed = this.#input(input);
    if (
      !parsed.ok ||
      !keysAre(parsed.value, ["actor", "tenantId", "environmentId"])
    ) {
      return responseError(400, "invalid_request");
    }
    const { actor, tenantId, environmentId } = parsed.value;
    if (
      !validActor(actor) ||
      !this.#scope(actor, tenantId, environmentId, "workflow:export")
    ) {
      return responseError(403, "forbidden");
    }
    const keys = new Set(
      this.#state.workflows
        .filter(
          (item) =>
            item.tenant_id === tenantId &&
            item.environment_id === environmentId,
        )
        .map((item) => item.key),
    );
    const data = {
      policies: this.#state.policies.filter(
        (item) =>
          item.tenant_id === tenantId && item.environment_id === environmentId,
      ),
      workflows: this.#state.workflows.filter((item) => keys.has(item.key)),
      idempotency: this.#state.idempotency.filter((item) =>
        item.key.includes(`|${tenantId}|${environmentId}|`),
      ),
      audit: this.#state.audit.filter(
        (item) =>
          item.tenant_id === tenantId && item.environment_id === environmentId,
      ),
      history: this.#state.history.filter((item) =>
        keys.has(item.workflow_key),
      ),
      outbox: this.#state.outbox.filter((item) =>
        keys.has(
          `${item.tenant_id}|${item.environment_id}|${item.workflow_id}`,
        ),
      ),
    };
    const safe = cloneKnown(data);
    return {
      status: 200,
      body: {
        schema_version: "upfs.policy-workflow.reference-state.v1",
        scope: { tenant_id: tenantId, environment_id: environmentId },
        data: safe,
        sha256: digest({
          schema_version: "upfs.policy-workflow.reference-state.v1",
          scope: { tenant_id: tenantId, environment_id: environmentId },
          data: safe,
        }),
      },
    };
  }

  #verifyBundle(input) {
    const bundle = readClosedData(input, {
      maxNodes: 20_000,
      maxBytes: 2 * 1024 * 1024,
    });
    if (!keysExactly(bundle, ["schema_version", "scope", "data", "sha256"])) {
      throw new TypeError("invalid_recovery_state");
    }
    if (
      bundle.schema_version !== "upfs.policy-workflow.reference-state.v1" ||
      !keysExactly(bundle.scope, ["tenant_id", "environment_id"]) ||
      !IDENTIFIER.test(bundle.scope.tenant_id ?? "") ||
      !IDENTIFIER.test(bundle.scope.environment_id ?? "") ||
      !keysExactly(bundle.data, [
        "policies",
        "workflows",
        "idempotency",
        "audit",
        "history",
        "outbox",
      ]) ||
      !Object.values(bundle.data).every(Array.isArray)
    ) {
      throw new TypeError("invalid_recovery_state");
    }
    const expected = digest({
      schema_version: bundle.schema_version,
      scope: bundle.scope,
      data: bundle.data,
    });
    if (bundle.sha256 !== expected)
      throw new TypeError("invalid_recovery_digest");
    const { tenant_id: tenantId, environment_id: environmentId } = bundle.scope;
    const validPolicyRecord = (item) =>
      keysExactly(item, [
        "id",
        "declared_version",
        "rules",
        "release",
        "tenant_id",
        "environment_id",
        "number",
        "policy_version",
        "status",
        "published_at",
        "published_by",
      ]) &&
      this.#policyValid({
        id: item.id,
        version: item.declared_version,
        rules: item.rules,
        release: item.release,
      }) &&
      Number.isSafeInteger(item.number) &&
      item.number > 0 &&
      item.policy_version ===
        `${item.id}:${item.declared_version}.${item.number}` &&
      ["shadow", "rolling_out", "active"].includes(item.status) &&
      validTimestamp(item.published_at) &&
      boundedText(item.published_by, 512, true);
    const validDecision = (item) =>
      keysExactly(item, [
        "actor",
        "roles",
        "decision",
        "reason",
        "evidence",
        "policy_version",
        "at",
      ]) &&
      boundedText(item.actor, 512, true) &&
      validStringArray(item.roles, 32, 200) &&
      ["approve", "deny"].includes(item.decision) &&
      boundedText(item.reason, 2_048, true) &&
      validStringArray(item.evidence) &&
      IDENTIFIER.test(item.policy_version ?? "") &&
      validTimestamp(item.at);
    const checkpointKeys = [
      "step_id",
      "status",
      "attempts",
      "action_request_id",
      "postcondition_verified",
    ];
    const validCheckpoint = (checkpoint) =>
      keysExactly(checkpoint, checkpointKeys, [
        "failure_code",
        "retry_after",
        "compensation_evidence",
      ]) &&
      IDENTIFIER.test(checkpoint.step_id ?? "") &&
      [
        "pending",
        "retrying",
        "succeeded",
        "failed",
        "timed_out",
        "compensation_required",
        "compensated",
      ].includes(checkpoint.status) &&
      Number.isSafeInteger(checkpoint.attempts) &&
      checkpoint.attempts >= 0 &&
      checkpoint.attempts <= 1_000 &&
      nullableIdentifier(checkpoint.action_request_id) &&
      typeof checkpoint.postcondition_verified === "boolean" &&
      (checkpoint.failure_code === undefined ||
        nullableIdentifier(checkpoint.failure_code)) &&
      (checkpoint.retry_after === undefined ||
        validTimestamp(checkpoint.retry_after)) &&
      (checkpoint.compensation_evidence === undefined ||
        boundedText(checkpoint.compensation_evidence, 512, true));
    const validWorkflowRecord = (item) =>
      keysExactly(item, [
        "key",
        "id",
        "tenant_id",
        "environment_id",
        "definition_version",
        "definition",
        "definition_digest",
        "policy_version",
        "created_by",
        "created_at",
        "status",
        "version",
        "approval",
        "checkpoints",
      ]) &&
      this.#workflowValid(item.definition) &&
      item.definition_version === item.definition.definition_version &&
      IDENTIFIER.test(item.policy_version ?? "") &&
      boundedText(item.created_by, 512, true) &&
      validTimestamp(item.created_at) &&
      (TERMINAL.has(item.status) ||
        [
          "pending_approval",
          "approved",
          "running",
          "retrying",
          "compensating",
        ].includes(item.status)) &&
      Number.isSafeInteger(item.version) &&
      item.version > 0 &&
      keysExactly(item.approval, ["required", "roles", "decisions"]) &&
      Number.isSafeInteger(item.approval.required) &&
      item.approval.required >= 1 &&
      item.approval.required <= 16 &&
      validStringArray(item.approval.roles, 16, 200) &&
      Array.isArray(item.approval.decisions) &&
      item.approval.decisions.length <= 16 &&
      item.approval.decisions.every(validDecision) &&
      Array.isArray(item.checkpoints) &&
      item.checkpoints.length === item.definition.steps.length &&
      item.checkpoints.every(
        (checkpoint, index) =>
          validCheckpoint(checkpoint) &&
          checkpoint.step_id === item.definition.steps[index].id &&
          checkpoint.attempts <=
            item.definition.steps[index].retry.max_attempts + 1,
      );
    const auditSchemas = {
      "policy.publish": [
        "resource_id",
        "policy_version",
        "approved_by",
        "rollout_percentage",
      ],
      "policy.evaluate": [
        "decision",
        "policy_id",
        "policy_version",
        "reason_code",
        "obligations",
        "evaluated_attributes",
        "correlation_id",
      ],
      "workflow.create.denied": [
        "resource_id",
        "policy_version",
        "reason_code",
      ],
      "workflow.create": [
        "resource_id",
        "definition_version",
        "policy_version",
        "status",
      ],
      "workflow.approve": [
        "resource_id",
        "decision",
        "policy_version",
        "status",
      ],
      "workflow.transition": ["resource_id", "policy_version", "status"],
      "workflow.step": [
        "resource_id",
        "step_id",
        "classification",
        "policy_version",
        "checkpoint_status",
        "workflow_status",
      ],
      "workflow.compensate": ["resource_id", "step_id", "status"],
    };
    const auditBase = [
      "action",
      "actor",
      "tenant_id",
      "environment_id",
      "request_id",
      "at",
    ];
    const validAudit = (item) => {
      const extra = auditSchemas[item?.action];
      if (!extra || !keysExactly(item, [...auditBase, ...extra])) return false;
      if (
        !(item.actor === null || boundedText(item.actor, 512, true)) ||
        !nullableIdentifier(item.tenant_id) ||
        !nullableIdentifier(item.environment_id) ||
        !IDENTIFIER.test(item.request_id ?? "") ||
        !validTimestamp(item.at)
      ) {
        return false;
      }
      if (item.action === "policy.evaluate") {
        return (
          ["allow", "deny"].includes(item.decision) &&
          nullableIdentifier(item.policy_id) &&
          nullableIdentifier(item.policy_version) &&
          IDENTIFIER.test(item.reason_code ?? "") &&
          validStringArray(item.obligations) &&
          keysAre(
            item.evaluated_attributes,
            Object.keys(item.evaluated_attributes),
          ) &&
          Object.keys(item.evaluated_attributes).length <= 32 &&
          Object.values(item.evaluated_attributes).every((value) =>
            ["string", "number", "boolean"].includes(typeof value),
          ) &&
          IDENTIFIER.test(item.correlation_id ?? "")
        );
      }
      return extra.every((key) => {
        const value = item[key];
        if (key === "rollout_percentage")
          return Number.isFinite(value) && value >= 0 && value <= 100;
        if (key === "policy_version") return nullableIdentifier(value);
        if (key === "approved_by") return boundedText(value, 512, true);
        return IDENTIFIER.test(value ?? "");
      });
    };
    const historySchemas = {
      created: ["status", "version"],
      approval: ["decision", "status", "version"],
      transition: ["status", "version"],
      checkpoint: [
        "step_id",
        "checkpoint_status",
        "workflow_status",
        "version",
      ],
      compensation: ["step_id", "status", "version"],
    };
    const historyBase = [
      "sequence",
      "workflow_key",
      "tenant_id",
      "environment_id",
      "workflow_id",
      "at",
      "type",
    ];
    const validHistory = (item) => {
      const extra = historySchemas[item?.type];
      return (
        extra &&
        keysExactly(item, [...historyBase, ...extra]) &&
        Number.isSafeInteger(item.sequence) &&
        item.sequence > 0 &&
        boundedText(item.workflow_key, 610, true) &&
        IDENTIFIER.test(item.tenant_id ?? "") &&
        IDENTIFIER.test(item.environment_id ?? "") &&
        IDENTIFIER.test(item.workflow_id ?? "") &&
        validTimestamp(item.at) &&
        Number.isSafeInteger(item.version) &&
        item.version > 0 &&
        (item.decision === undefined ||
          ["approve", "deny"].includes(item.decision)) &&
        (item.step_id === undefined || IDENTIFIER.test(item.step_id)) &&
        (item.status === undefined || IDENTIFIER.test(item.status)) &&
        (item.checkpoint_status === undefined ||
          IDENTIFIER.test(item.checkpoint_status)) &&
        (item.workflow_status === undefined ||
          IDENTIFIER.test(item.workflow_status))
      );
    };
    const validResult = (result) => {
      if (
        !keysExactly(result, ["status", "body", "headers"]) ||
        ![200, 201].includes(result.status) ||
        !keysExactly(result.headers, ["etag"]) ||
        !/^"[1-9][0-9]*"$/u.test(result.headers.etag ?? "") ||
        !result.body ||
        typeof result.body !== "object" ||
        !IDENTIFIER.test(result.body.request_id ?? "")
      ) {
        return false;
      }
      const body = { ...result.body };
      delete body.request_id;
      return validPolicyRecord(body) || validWorkflowRecord(body);
    };
    if (
      bundle.data.policies.some(
        (item) =>
          !validPolicyRecord(item) ||
          item.tenant_id !== tenantId ||
          item.environment_id !== environmentId,
      ) ||
      bundle.data.workflows.some(
        (item) =>
          !validWorkflowRecord(item) ||
          item.tenant_id !== tenantId ||
          item.environment_id !== environmentId ||
          item.key !== `${tenantId}|${environmentId}|${item.id}` ||
          item.definition_digest !== digest(item.definition),
      ) ||
      bundle.data.audit.some(
        (item) =>
          !validAudit(item) ||
          (item.tenant_id !== null && item.tenant_id !== tenantId) ||
          (item.environment_id !== null &&
            item.environment_id !== environmentId),
      ) ||
      bundle.data.history.some(
        (item) =>
          !validHistory(item) ||
          item.tenant_id !== tenantId ||
          item.environment_id !== environmentId,
      ) ||
      bundle.data.outbox.some(
        (item) =>
          !keysExactly(item, [
            "event_id",
            "type",
            "tenant_id",
            "environment_id",
            "workflow_id",
            "sequence",
            "payload",
          ]) ||
          !/^[a-f0-9]{64}$/u.test(item.event_id ?? "") ||
          !/^workflow\.[A-Za-z0-9._/-]+\.v1$/u.test(item.type ?? "") ||
          !Number.isSafeInteger(item.sequence) ||
          item.sequence < 1 ||
          item.tenant_id !== tenantId ||
          item.environment_id !== environmentId ||
          !validHistory(item.payload) ||
          item.payload.sequence !== item.sequence ||
          item.payload.tenant_id !== tenantId ||
          item.payload.environment_id !== environmentId ||
          item.payload.workflow_id !== item.workflow_id,
      )
    ) {
      throw new TypeError("recovery_scope_mismatch");
    }
    const unique = (array, key) =>
      new Set(array.map(key)).size === array.length;
    if (
      !unique(bundle.data.policies, (item) => item.policy_version) ||
      !unique(bundle.data.workflows, (item) => item.key) ||
      !unique(bundle.data.idempotency, (item) => item.key) ||
      !unique(bundle.data.outbox, (item) => item.event_id) ||
      bundle.data.idempotency.some((item) => {
        if (
          !keysExactly(item, ["key", "request_hash", "result"]) ||
          !/^[a-f0-9]{64}$/u.test(item.request_hash ?? "") ||
          !boundedText(item.key, 1_024, true) ||
          !validResult(item.result)
        ) {
          return true;
        }
        const segments = item.key.split("|");
        return (
          segments.length !== 6 ||
          segments[3] !== tenantId ||
          segments[4] !== environmentId
        );
      }) ||
      bundle.data.history.some(
        (item) =>
          !bundle.data.workflows.some(
            (workflow) => workflow.key === item.workflow_key,
          ),
      ) ||
      bundle.data.history.some(
        (item, index, all) =>
          all
            .filter((candidate) => candidate.workflow_key === item.workflow_key)
            .filter((candidate) => candidate.sequence <= item.sequence)
            .length !== item.sequence,
      ) ||
      bundle.data.outbox.some(
        (item) =>
          !bundle.data.history.some(
            (history) =>
              history.workflow_id === item.workflow_id &&
              history.sequence === item.sequence &&
              canonical(history) === canonical(item.payload),
          ),
      )
    ) {
      throw new TypeError("invalid_recovery_state");
    }
    return cloneKnown(bundle.data);
  }
}
