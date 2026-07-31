import crypto from 'node:crypto';

const clone = (v) => v === null || typeof v !== 'object' ? v : Array.isArray(v) ? v.map(clone) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
const hash = (v) => crypto.createHash('sha256').update(JSON.stringify(v), 'utf8').digest('hex');
const actorOk = (a) => typeof a?.issuer === 'string' && a.issuer.length > 0 && typeof a?.subject === 'string' && a.subject.length > 0;
const err = (status, code) => ({ status, body: { code, retryable: status >= 500 } });

/** API-backed in-memory reference for policy decisions and durable workflow state.
 * PostgreSQL + transactional outbox are the production boundary; maps model the
 * same append-only transitions and are intentionally restart-scoped for tests.
 */
export class PolicyWorkflowService {
  #policies = new Map(); #workflows = new Map(); #idempotency = new Map(); #audit = []; #history = new Map();
  constructor({ authorize = () => false, now = () => new Date(), policyVersion = 'policy-v1', requestId = () => `req-${crypto.randomUUID()}` } = {}) { this.authorize = authorize; this.now = now; this.policyVersion = policyVersion; this.requestId = requestId; }

  publishPolicy({ actor, tenantId, environmentId, policy, idempotencyKey }) {
    if (!actorOk(actor)) return err(401, 'authentication_required');
    if (!tenantId || !environmentId || !this.authorize(actor, tenantId, environmentId, 'policy:publish')) return err(403, 'forbidden');
    if (!idempotencyKey || idempotencyKey.length < 16) return err(400, 'idempotency_key_required');
    if (!policy?.id || !Array.isArray(policy.rules)) return err(400, 'invalid_policy');
    const key = this.#key(actor, tenantId, environmentId, idempotencyKey), ph = hash(policy), prior = this.#idempotency.get(key);
    if (prior) return prior.hash === ph ? clone(prior.result) : err(409, 'idempotency_conflict');
    const version = (this.#policies.get(`${tenantId}|${environmentId}|${policy.id}`)?.version ?? 0) + 1;
    const record = { ...clone(policy), tenant_id: tenantId, environment_id: environmentId, version, policy_version: `${policy.id}:${version}`, published_at: this.now().toISOString() };
    this.#policies.set(`${tenantId}|${environmentId}|${policy.id}`, record);
    const result = { status: 201, body: { ...clone(record), request_id: this.requestId() }, headers: { etag: `"${version}"` } };
    this.#idempotency.set(key, { hash: ph, result }); this.#auditEvent('policy.publish', actor, tenantId, environmentId, { resource_id: policy.id, policy_version: record.policy_version }); return clone(result);
  }

  evaluate({ actor, tenantId, environmentId, action, resource = {}, attributes = {} }) {
    const correlationId = this.requestId();
    if (!actorOk(actor)) return this.#decision(correlationId, tenantId, environmentId, 'deny', 'authentication_required');
    if (!tenantId || !environmentId || !this.authorize(actor, tenantId, environmentId, `policy:${action}`)) return this.#decision(correlationId, tenantId, environmentId, 'deny', 'forbidden');
    const policy = [...this.#policies.values()].filter((p) => p.tenant_id === tenantId && p.environment_id === environmentId).sort((a, b) => b.version - a.version)[0];
    if (!policy) return this.#decision(correlationId, tenantId, environmentId, 'deny', 'no_policy');
    const rule = policy.rules.find((r) => r.action === action && (!r.resource_type || r.resource_type === resource.type));
    const allow = Boolean(rule?.effect === 'allow' && (typeof rule.when !== 'function' || rule.when({ actor, tenantId, environmentId, resource, attributes })));
    return this.#decision(correlationId, tenantId, environmentId, allow ? 'allow' : 'deny', allow ? 'policy_allowed' : (rule ? 'policy_denied' : 'no_matching_rule'), policy, attributes);
  }

  createWorkflow({ actor, tenantId, environmentId, workflow, idempotencyKey }) {
    if (!actorOk(actor)) return err(401, 'authentication_required');
    if (!tenantId || !environmentId || workflow?.tenant_id !== tenantId || workflow?.environment_id !== environmentId) return err(403, 'scope_mismatch');
    if (!this.authorize(actor, tenantId, environmentId, 'workflow:create')) return err(403, 'forbidden');
    if (!idempotencyKey || idempotencyKey.length < 16) return err(400, 'idempotency_key_required');
    if (!workflow.id || !Array.isArray(workflow.steps) || workflow.steps.length === 0) return err(400, 'invalid_workflow');
    const key = this.#key(actor, tenantId, environmentId, idempotencyKey), wh = hash(workflow), prior = this.#idempotency.get(key); if (prior) return prior.hash === wh ? clone(prior.result) : err(409, 'idempotency_conflict');
    const record = { ...clone(workflow), status: 'pending_approval', version: 1, created_at: this.now().toISOString(), approval: { required: Math.max(1, workflow.approval?.required ?? 1), decisions: [] } };
    this.#workflows.set(`${tenantId}|${environmentId}|${workflow.id}`, record); this.#history.set(record.id, [{ type: 'created', status: record.status, at: record.created_at }]);
    const result = { status: 201, body: { ...clone(record), request_id: this.requestId() }, headers: { etag: '"1"' } }; this.#idempotency.set(key, { hash: wh, result }); this.#auditEvent('workflow.create', actor, tenantId, environmentId, { resource_id: record.id, status: record.status }); return clone(result);
  }

  approve({ actor, tenantId, environmentId, workflowId, decision, reason = '', evidence = [], ifMatch }) {
    if (!actorOk(actor)) return err(401, 'authentication_required'); if (!this.authorize(actor, tenantId, environmentId, 'workflow:approve')) return err(403, 'forbidden');
    const r = this.#workflows.get(`${tenantId}|${environmentId}|${workflowId}`); if (!r) return err(404, 'resource_not_found'); if (ifMatch !== undefined && ifMatch !== `"${r.version}"`) return err(412, 'precondition_failed');
    if (!['approve', 'deny'].includes(decision)) return err(400, 'invalid_approval'); if (r.approval.decisions.some((d) => d.actor === `${actor.issuer}|${actor.subject}`)) return err(409, 'duplicate_approval');
    r.approval.decisions.push({ actor: `${actor.issuer}|${actor.subject}`, decision, reason, evidence: [...evidence], policy_version: r.policy_version ?? this.policyVersion, at: this.now().toISOString() }); r.version++;
    if (decision === 'deny') r.status = 'denied'; else if (r.approval.decisions.filter((d) => d.decision === 'approve').length >= r.approval.required) r.status = 'approved';
    this.#history.get(r.id).push({ type: 'approval', status: r.status, version: r.version, at: this.now().toISOString() }); this.#auditEvent('workflow.approve', actor, tenantId, environmentId, { resource_id: r.id, decision, status: r.status }); return { status: 200, body: clone(r), headers: { etag: `"${r.version}"` } };
  }

  transition({ actor, tenantId, environmentId, workflowId, status, ifMatch }) {
    if (!actorOk(actor)) return err(401, 'authentication_required'); if (!this.authorize(actor, tenantId, environmentId, 'workflow:execute')) return err(403, 'forbidden'); const r = this.#workflows.get(`${tenantId}|${environmentId}|${workflowId}`); if (!r) return err(404, 'resource_not_found'); if (ifMatch !== `"${r.version}"`) return err(412, 'precondition_failed');
    if (status === 'running' && r.status !== 'approved') return err(409, 'approval_required'); if (!['running', 'succeeded', 'failed', 'retrying', 'cancelled'].includes(status)) return err(400, 'invalid_transition'); if (['succeeded', 'failed', 'cancelled'].includes(r.status)) return err(409, 'terminal_workflow');
    r.status = status; r.version++; this.#history.get(r.id).push({ type: 'transition', status, version: r.version, at: this.now().toISOString() }); this.#auditEvent('workflow.transition', actor, tenantId, environmentId, { resource_id: r.id, status }); return { status: 200, body: clone(r), headers: { etag: `"${r.version}"` } };
  }
  getWorkflow({ actor, tenantId, environmentId, workflowId }) { if (!actorOk(actor)) return err(401, 'authentication_required'); if (!this.authorize(actor, tenantId, environmentId, 'workflow:read')) return err(403, 'forbidden'); const r = this.#workflows.get(`${tenantId}|${environmentId}|${workflowId}`); return r ? { status: 200, body: clone(r), history: clone(this.#history.get(r.id)) } : err(404, 'resource_not_found'); }
  audit() { return clone(this.#audit); } history(id) { return clone(this.#history.get(id) ?? []); }
  #key(a, t, e, k) { return `${a.issuer}|${a.subject}|${t}|${e}|${k}`; }
  #decision(correlationId, tenantId, environmentId, decision, reason, policy = null, attributes = {}) { const d = { decision, policy_version: policy?.policy_version ?? this.policyVersion, reason_code: reason, obligations: [], evaluated_attributes: clone(attributes), correlation_id: correlationId }; this.#audit.push({ action: 'policy.evaluate', tenant_id: tenantId ?? null, environment_id: environmentId ?? null, ...d, at: this.now().toISOString() }); return { status: decision === 'allow' ? 200 : 403, body: d }; }
  #auditEvent(action, actor, tenantId, environmentId, extra) { this.#audit.push({ action, actor: `${actor.issuer}|${actor.subject}`, tenant_id: tenantId, environment_id: environmentId, at: this.now().toISOString(), ...extra }); }
}
