import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { contract, evaluateManagedAdapters } from './task-0033-managed-adapters.mjs';

const base = () => {
  const environments = Object.fromEntries(contract.protected_environments.map(environment => [environment, {
    environment, managed: true, protected: true,
    health: { reachable: true, authenticated: true, policy_compliant: true },
    rotation: { version: 'v1', rotated_at: '2026-07-01T00:00:00Z', next_rotation_due: '2030-12-01T00:00:00Z' },
    references: { secret_ref: 'secret://managed/ref', config_ref: 'config://managed/ref', signing_key_ref: 'key://managed/ref' }
  }]));
  const manifest = { providers: contract.providers, environments };
  return { ...manifest, manifest, manifest_sha256: crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex'), synthetic_only: true, deployment: 'not-performed', schema_version: contract.schema_version };
};
test('valid managed adapter contract passes', () => { const report = evaluateManagedAdapters({ candidate: base() }); assert.equal(report.status, 'passed', JSON.stringify(report.checks)); });
for (const mutation of [
  c => { c.providers.postgresql = 'synthetic'; },
  c => { c.environments.pilot.environment = 'production'; },
  c => { c.environments.production.rotation.next_rotation_due = '2020-01-01T00:00:00Z'; },
  c => { c.environments.pilot.health.authenticated = false; },
  c => { c.manifest.providers.backup = 'tampered'; },
  c => { c.environments.pilot.references.secret_ref = 'literal-secret'; }
]) test('managed adapter mutation fails closed', () => { const c = base(); mutation(c); assert.equal(evaluateManagedAdapters({ candidate: c }).status, 'failed'); });
