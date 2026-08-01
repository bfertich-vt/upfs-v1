import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const contract = JSON.parse(fs.readFileSync(path.join(root, 'contracts/task-0033-managed-adapters.json')));
const fail = (checks, name, details) => checks.push({ name, status: 'failed', details });
const pass = (checks, name, details) => checks.push({ name, status: 'passed', details });
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const ref = (value, scheme) => typeof value === 'string' && value.startsWith(`${scheme}://`) && !/[\r\n]/.test(value);

export function evaluateManagedAdapters({ candidate, expected = contract, now = new Date() } = {}) {
  const c = candidate || {};
  const checks = [];
  if (c.schema_version !== expected.schema_version) fail(checks, 'schema', 'versioned managed-adapter contract is required'); else pass(checks, 'schema', 'schema version matches');
  const providers = c.providers || {};
  for (const [name, provider] of Object.entries(expected.providers)) {
    if (providers[name] !== provider) fail(checks, `provider-${name}`, `${name} provider identity does not match approved external provider`); else pass(checks, `provider-${name}`, 'provider identity matches');
  }
  const environments = c.environments || {};
  for (const env of expected.protected_environments) {
    const e = environments[env] || {};
    if (e.environment !== env || e.managed !== true || e.protected !== true) fail(checks, `environment-${env}`, 'provider responses must bind to the protected environment'); else pass(checks, `environment-${env}`, 'environment binding present');
    const health = e.health || {};
    for (const signal of expected.required_health_signals) if (health[signal] !== true) fail(checks, `health-${env}-${signal}`, 'required managed adapter health signal is missing');
    if (expected.required_health_signals.every(signal => health[signal] === true)) pass(checks, `health-${env}`, 'provider health signals passed');
    const rotation = e.rotation || {};
    const rotationValid = typeof rotation.version === 'string' && rotation.version.length > 0 && typeof rotation.rotated_at === 'string' && !Number.isNaN(Date.parse(rotation.rotated_at)) && typeof rotation.next_rotation_due === 'string' && !Number.isNaN(Date.parse(rotation.next_rotation_due)) && new Date(rotation.next_rotation_due) > now;
    if (!rotationValid) fail(checks, `rotation-${env}`, 'versioned rotation metadata and a future rotation deadline are required'); else pass(checks, `rotation-${env}`, 'rotation metadata is valid and current');
    const refs = e.references || {};
    if (!(ref(refs.secret_ref, 'secret') && ref(refs.config_ref, 'config') && ref(refs.signing_key_ref, 'key'))) fail(checks, `references-${env}`, 'managed references must use approved schemes'); else pass(checks, `references-${env}`, 'managed references are bound');
  }
  const expectedDigest = c.manifest_sha256;
  if (typeof expectedDigest !== 'string' || !/^[a-f0-9]{64}$/.test(expectedDigest)) fail(checks, 'drift', 'immutable manifest digest is required');
  else if (expectedDigest !== hash(c.manifest)) fail(checks, 'drift', 'managed adapter manifest drift detected');
  else pass(checks, 'drift', 'managed adapter manifest digest matches');
  const clean = c.synthetic_only === true && c.deployment === 'not-performed';
  if (!clean) fail(checks, 'boundary', 'evaluation must remain synthetic-only and deployment-free'); else pass(checks, 'boundary', 'synthetic boundary preserved');
  return { schema_version: 'upfs.managed-adapter-report.v1', status: checks.every(x => x.status === 'passed') ? 'passed' : 'failed', decision: checks.every(x => x.status === 'passed') ? 'READY_FOR_EXTERNAL_APPROVAL' : 'NO-GO_EXTERNAL_PREREQUISITES', synthetic_only: true, deployment: 'not-performed', checks };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const report = evaluateManagedAdapters();
  fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'artifacts/task-0033-managed-adapters-report.json'), JSON.stringify({ ...report, generated_at: new Date().toISOString() }, null, 2) + '\n');
  console.log(`TASK-0033 managed adapters: ${report.decision}`);
}
