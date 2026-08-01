import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = (checks, name, ok, details) => checks.push({ name, status: ok ? 'passed' : 'failed', details });
export function evaluatePromotion({ environment, approval, artifact, health, reconciliation, managed, manifest, deployment = 'not-performed', synthetic_only = true } = {}) {
  const checks = [];
  check(checks, 'boundary', synthetic_only === true && deployment === 'not-performed', 'synthetic rehearsal does not deploy');
  check(checks, 'environment', ['pilot', 'production'].includes(environment), 'protected environment required');
  check(checks, 'approval', approval?.approved === true && typeof approval?.approver === 'string' && approval.approver.trim() && typeof approval?.evidence === 'string' && approval.evidence.trim() && approval?.expires_at && Date.parse(approval.expires_at) > Date.now(), 'unexpired approval evidence required');
  check(checks, 'dual-control', environment !== 'production' || approval?.dual_control === true, 'production requires dual control');
  check(checks, 'immutable-artifact', artifact?.immutable === true && artifact?.signature_verified === true && typeof artifact?.digest === 'string' && /^[a-f0-9]{64}$/.test(artifact.digest), 'immutable signed artifact digest required');
  check(checks, 'managed-binding', managed?.managed === true && managed?.environment === environment && typeof managed?.signing_key_reference === 'string', 'managed signing and environment binding required');
  check(checks, 'health', health?.passed === true, 'automatic health gate required');
  check(checks, 'reconciliation', reconciliation?.zero_drift === true, 'post-deploy reconciliation must be zero drift');
  check(checks, 'rollout', manifest?.rollout?.strategy === 'canary' && manifest.rollout.approval_required === true && manifest.rollout.rollback === 'corrective-forward' && manifest.rollout.health_gate_required === true, 'canary and corrective-forward rollback policy required');
  return { schema_version: 'upfs.promotion-report.v1', status: checks.every(c => c.status === 'passed') ? 'passed' : 'failed', decision: checks.every(c => c.status === 'passed') ? 'READY_FOR_EXTERNAL_APPROVAL' : 'NO-GO_EXTERNAL_PREREQUISITES', synthetic_only, deployment, checks };
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'infra/protected-environment-manifest.json')));
  const report = evaluatePromotion({ manifest, environment: 'pilot' });
  fs.writeFileSync(path.join(root, 'artifacts/task-0034-promotion-report.json'), JSON.stringify({ ...report, generated_at: new Date().toISOString() }, null, 2) + '\n');
  console.log(`TASK-0034 promotion: ${report.decision}`);
}
