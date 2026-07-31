import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDR, syntheticContract } from './task-0028-dr.mjs';

const ready = { managed_backup: true, managed_routing: true, managed_failover: true, evidence: { backup_lag_minutes: 4, failover_minutes: 12, corrective_forward: true, synthetic_only: true, deployment: 'not-performed' } };
test('valid versioned contract passes synthetic RPO/RTO evidence', () => { const r = evaluateDR({ contract: syntheticContract, infrastructure: ready }); assert.equal(r.status, 'passed'); assert.equal(r.decision, 'READY_FOR_APPROVAL'); assert.equal(r.production_deployment, 'not-performed'); });
test('missing managed infrastructure fails closed', () => { const r = evaluateDR({ contract: syntheticContract, infrastructure: {} }); assert.equal(r.decision, 'NO-GO'); assert.ok(r.checks.some((x) => x.name === 'managed-infrastructure' && x.status === 'failed')); });
test('invalid routing and missing policy cannot pass', () => { const c = structuredClone(syntheticContract); c.policy.checked = false; c.tenant_routing[0].cell = 'cell-b'; const r = evaluateDR({ contract: c, infrastructure: ready }); assert.equal(r.status, 'failed'); assert.ok(r.checks.some((x) => x.name === 'policy-checked' && x.status === 'failed')); assert.ok(r.checks.some((x) => x.name === 'tenant-routing' && x.status === 'failed')); });
test('RPO/RTO breach fails closed', () => { const r = evaluateDR({ contract: syntheticContract, infrastructure: { ...ready, evidence: { ...ready.evidence, backup_lag_minutes: 16 } } }); assert.equal(r.decision, 'NO-GO'); assert.ok(r.checks.some((x) => x.name === 'rpo-rto-evidence' && x.status === 'failed')); });
