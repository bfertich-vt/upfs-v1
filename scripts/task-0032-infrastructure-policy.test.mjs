import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateInfrastructurePolicy, manifest } from './task-0032-infrastructure-policy.mjs';
test('synthetic protected manifest passes policy', () => assert.equal(evaluateInfrastructurePolicy().status, 'passed'));
test('literal secret fails closed', () => { const c = structuredClone(manifest); c.secrets_signing.secret_ref = 'super-secret'; assert.equal(evaluateInfrastructurePolicy({ candidate: c }).status, 'failed'); });
test('missing protected cell fails closed', () => { const c = structuredClone(manifest); delete c.environments.production.cell; assert.equal(evaluateInfrastructurePolicy({ candidate: c }).status, 'failed'); });
test('rollout cannot bypass approval or corrective-forward rollback', () => { const c = structuredClone(manifest); c.rollout.approval_required = false; c.rollout.rollback = 'in-place'; assert.equal(evaluateInfrastructurePolicy({ candidate: c }).status, 'failed'); });
