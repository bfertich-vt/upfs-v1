import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const check = (checks, name, passed, details) => { checks.push({ name, status: passed ? 'passed' : 'failed', details }); return passed; };
const sha256 = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonicalEvidence = (e) => ({ scenario: e.scenario, status: e.status, synthetic_only: e.synthetic_only, deployment: e.deployment, observed: e.observed });

export const syntheticPlan = {
  schema_version: 'upfs.resilience.v1', version: '2026-07-31.1', synthetic_only: true,
  dimensions: { tenants: 2, operations: 500, duration_minutes: 15, max_tenants: 50, max_operations: 100000, max_duration_minutes: 1440 },
  objectives: { availability_percent: 99, read_p95_ms: 750, freshness_minutes: 15, projection_lag_minutes: 15, rpo_minutes: 15, rto_minutes: 60 },
  scenarios: ['tenant-isolation', 'backpressure', 'projection-lag', 'dependency-failure', 'restore', 'corrective-forward']
};

export const evidenceFor = (plan = syntheticPlan) => plan.scenarios.map((scenario, i) => {
  const observed = { tenant_escape: 0, p95_ms: 420 + i * 10, lag_minutes: 4 + i, rpo_minutes: 5 + i, rto_minutes: 20 + i, corrective_forward: true, duration_minutes: 1, operations: plan.dimensions.operations, tenants: plan.dimensions.tenants };
  if (scenario === 'backpressure') observed.backpressure_rejected_bounded = true;
  if (scenario === 'projection-lag') observed.projection_reconciled = true;
  if (scenario === 'dependency-failure') observed.dependency_recovered = true;
  if (scenario === 'restore') observed.restore_verified = true;
  return { scenario, status: 'passed', synthetic_only: true, deployment: 'not-performed', observed, evidence_ref: `sha256:${sha256({ scenario, status: 'passed', synthetic_only: true, deployment: 'not-performed', observed })}` };
});

export function evaluateResilience({ plan = syntheticPlan, infrastructure = {}, evidence = evidenceFor(plan) } = {}) {
  const checks = [], p = plan || {};
  check(checks, 'schema-version', p.schema_version === 'upfs.resilience.v1' && typeof p.version === 'string', 'versioned resilience plan required');
  const d = p.dimensions || {}, bounded = Number.isInteger(d.tenants) && d.tenants > 0 && d.tenants <= (d.max_tenants || 0) && Number.isInteger(d.operations) && d.operations > 0 && d.operations <= (d.max_operations || 0) && Number.isInteger(d.duration_minutes) && d.duration_minutes > 0 && d.duration_minutes <= (d.max_duration_minutes || 0);
  check(checks, 'bounded-dimensions', bounded, 'tenant, operation, and duration dimensions must be positive and bounded');
  const required = ['tenant-isolation', 'backpressure', 'projection-lag', 'dependency-failure', 'restore', 'corrective-forward'];
  check(checks, 'scenario-coverage', Array.isArray(p.scenarios) && required.every((x) => p.scenarios.includes(x)), 'required synthetic scenarios must be covered');
  const managed = infrastructure.managed_target === true;
  check(checks, 'managed-target', managed, 'managed load/observability target is required; missing target fails closed');
  const obj = p.objectives || {};
  const refs = Array.isArray(evidence) && evidence.length === required.length && evidence.every((e) => {
    return typeof e.evidence_ref === 'string' && /^sha256:[a-f0-9]{64}$/.test(e.evidence_ref) && e.evidence_ref === `sha256:${sha256(canonicalEvidence(e))}`;
  }) && new Set(evidence.map((x) => x.evidence_ref)).size === evidence.length;
  check(checks, 'immutable-evidence-refs', refs, 'every scenario requires an immutable SHA-256 evidence reference');
  const names = new Set((evidence || []).map((e) => e.scenario));
  check(checks, 'evidence-integrity', names.size === required.length && required.every((s) => names.has(s)) && (evidence || []).every((e) => e.synthetic_only === true && e.deployment === 'not-performed'), 'evidence must be synthetic, complete, and non-deploying');
  const scenarioEvidence = (e) => e.observed && Number.isFinite(e.observed.duration_minutes) && e.observed.duration_minutes > 0 && e.observed.duration_minutes <= d.duration_minutes && e.observed.operations === d.operations && e.observed.tenants === d.tenants && (e.scenario !== 'backpressure' || e.observed.backpressure_rejected_bounded === true) && (e.scenario !== 'projection-lag' || e.observed.projection_reconciled === true) && (e.scenario !== 'dependency-failure' || e.observed.dependency_recovered === true) && (e.scenario !== 'restore' || e.observed.restore_verified === true);
  const thresholds = (evidence || []).every((e) => e.status === 'passed' && scenarioEvidence(e) && e.observed.tenant_escape === 0 && e.observed.p95_ms <= obj.read_p95_ms && e.observed.lag_minutes <= obj.projection_lag_minutes && e.observed.rpo_minutes <= obj.rpo_minutes && e.observed.rto_minutes <= obj.rto_minutes && e.observed.corrective_forward === true);
  check(checks, 'slo-rpo-rto', thresholds, 'SLO, RPO, RTO, isolation, and corrective-forward thresholds must pass');
  const passed = checks.every((x) => x.status === 'passed');
  return { schema_version: 'upfs.resilience.report.v1', status: passed ? 'passed' : 'failed', decision: passed ? 'READY_FOR_APPROVAL' : 'NO-GO', synthetic_only: true, production_deployment: 'not-performed', checks, evidence };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const report = evaluateResilience({ infrastructure: {} });
  const target = path.join(process.cwd(), 'artifacts/task-0029-resilience-report.json'); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, JSON.stringify({ ...report, generated_at: new Date().toISOString() }, null, 2) + '\n');
  console.log(`TASK-0029 resilience evaluation: ${report.decision}`);
}
