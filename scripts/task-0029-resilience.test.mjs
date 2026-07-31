import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateResilience, syntheticPlan, evidenceFor } from './task-0029-resilience.mjs';

const ready = { managed_target: true };
test('complete synthetic resilience evidence passes thresholds', () => { const r = evaluateResilience({ plan: syntheticPlan, infrastructure: ready }); assert.equal(r.status, 'passed'); assert.equal(r.decision, 'READY_FOR_APPROVAL'); });
test('missing managed target fails closed', () => { const r = evaluateResilience({ infrastructure: {} }); assert.equal(r.decision, 'NO-GO'); assert.ok(r.checks.some((x) => x.name === 'managed-target' && x.status === 'failed')); });
test('missing scenario cannot pass', () => { const p = structuredClone(syntheticPlan); p.scenarios = p.scenarios.slice(0, 5); const r = evaluateResilience({ plan: p, infrastructure: ready }); assert.equal(r.status, 'failed'); assert.ok(r.checks.some((x) => x.name === 'scenario-coverage' && x.status === 'failed')); });
test('tenant escape and threshold breach fail closed', () => { const evidence = evidenceFor(); evidence[0].observed.tenant_escape = 1; evidence[1].observed.p95_ms = 751; const r = evaluateResilience({ infrastructure: ready, evidence }); assert.equal(r.decision, 'NO-GO'); assert.ok(r.checks.some((x) => x.name === 'slo-rpo-rto' && x.status === 'failed')); });
test('tampered or incomplete evidence refs fail', () => { const r = evaluateResilience({ infrastructure: ready, evidence: [{ scenario: 'tenant-isolation', synthetic_only: true, deployment: 'not-performed', evidence_ref: 'sha256:bad' }] }); assert.equal(r.decision, 'NO-GO'); assert.ok(r.checks.some((x) => x.name === 'immutable-evidence-refs' && x.status === 'failed')); });
test('content mutation, duplicate refs, missing measurements, and failed status fail closed', () => {
  const evidence = evidenceFor(); evidence[0].observed.p95_ms = 1; const mutated = evaluateResilience({ infrastructure: ready, evidence }); assert.equal(mutated.decision, 'NO-GO');
  const duplicate = evidenceFor(); duplicate[1].evidence_ref = duplicate[0].evidence_ref; assert.equal(evaluateResilience({ infrastructure: ready, evidence: duplicate }).decision, 'NO-GO');
  const missing = evidenceFor(); delete missing[2].observed.projection_reconciled; assert.equal(evaluateResilience({ infrastructure: ready, evidence: missing }).decision, 'NO-GO');
  const failed = evidenceFor(); failed[0].status = 'failed'; assert.equal(evaluateResilience({ infrastructure: ready, evidence: failed }).decision, 'NO-GO');
});
test('workload dimensions and duration remain bounded', () => { const evidence = evidenceFor(); evidence[0].observed.operations = syntheticPlan.dimensions.max_operations + 1; assert.equal(evaluateResilience({ infrastructure: ready, evidence }).decision, 'NO-GO'); });
