import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'contracts/task-0031-external-readiness.json')));
const manifestPath = path.join(root, 'infra/protected-environment-manifest.json');
export const manifest = JSON.parse(fs.readFileSync(manifestPath));
const check = (checks, name, passed, details) => checks.push({ name, status: passed ? 'passed' : 'failed', details });
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function evaluateInfrastructurePolicy({ candidate = manifest, readinessContract = contract } = {}) {
  const checks = [];
  check(checks, 'schema', candidate?.schema_version === 'upfs.protected-environment-manifest.v1' && typeof candidate?.manifest_version === 'string', 'versioned manifest required');
  check(checks, 'synthetic-boundary', candidate?.synthetic_only === true && candidate?.deployment === 'not-performed', 'manifest must be synthetic and deployment-free');
  const envs = candidate?.environments || {};
  check(checks, 'protected-environments', ['pilot', 'production'].every(e => envs[e]?.protected === true && envs[e]?.managed === true && envs[e]?.region && envs[e]?.cell), 'pilot and production require managed protected region/cell metadata');
  check(checks, 'postgresql', candidate?.postgresql?.provider === readinessContract.managed_postgresql.provider && candidate.postgresql.tls_required === true && candidate.postgresql.rls_required === true && candidate.postgresql.encrypted === true && candidate.postgresql.backup_enabled === true, 'encrypted managed PostgreSQL with TLS/RLS/backups required');
  const refs = candidate?.secrets_signing || {};
  check(checks, 'references', refs.provider === readinessContract.secrets_signing.provider && refs.secret_ref === '${UPFS_MANAGED_SECRET_REF}' && refs.config_ref === '${UPFS_CONFIG_REF}' && refs.signing_key_ref === '${UPFS_RELEASE_SIGNING_KEY_REF}' && refs.rotation_required === true, 'only approved external reference placeholders may be present');
  check(checks, 'observability', candidate?.observability?.provider === readinessContract.observability.provider && ['metrics','logs','traces','alerts'].every(k => candidate.observability[k] === true), 'all managed telemetry signals required');
  check(checks, 'backup', candidate?.backup?.provider === readinessContract.backup_targets.provider && candidate.backup.encrypted === true && candidate.backup.retention_days >= readinessContract.backup_targets.retention_days && candidate.backup.restore_verification_required === true, 'encrypted backup target and restore verification required');
  check(checks, 'rollout', candidate?.rollout?.strategy === 'canary' && candidate.rollout.approval_required === true && candidate.rollout.rollback === 'corrective-forward' && candidate.rollout.health_gate_required === true, 'approval-gated canary and corrective-forward rollback required');
  const prohibited = readinessContract.prohibited || [];
  check(checks, 'prohibited-policy', JSON.stringify(candidate?.prohibited || []) === JSON.stringify(prohibited), 'prohibited policy must match external-readiness contract');
  const serialized = JSON.stringify(candidate);
  check(checks, 'secret-scan', !/(password|private[_-]?key|token|credential)\s*[:=]\s*["'][^${]/i.test(serialized), 'literal secrets are prohibited');
  const compatible = candidate?.postgresql?.provider === readinessContract.managed_postgresql?.provider && candidate?.secrets_signing?.provider === readinessContract.secrets_signing?.provider && candidate?.observability?.provider === readinessContract.observability?.provider && candidate?.backup?.provider === readinessContract.backup_targets?.provider && (readinessContract.required_references || []).every(ref => ({ secret: candidate.secrets_signing.secret_ref, config: candidate.secrets_signing.config_ref, signing: candidate.secrets_signing.signing_key_ref })[ref.includes('SECRET') ? 'secret' : ref.includes('CONFIG') ? 'config' : 'signing']);
  check(checks, 'contract-drift', compatible, 'manifest provider and reference bindings must remain compatible with TASK-0031 contract');
  return { schema_version: 'upfs.infrastructure-policy-report.v1', status: checks.every(c => c.status === 'passed') ? 'passed' : 'failed', decision: checks.every(c => c.status === 'passed') ? 'READY_FOR_EXTERNAL_APPROVAL' : 'NO-GO_EXTERNAL_PREREQUISITES', synthetic_only: true, deployment: 'not-performed', manifest_sha256: digest(candidate), checks };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const report = evaluateInfrastructurePolicy();
  fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'artifacts/task-0032-infrastructure-policy-report.json'), JSON.stringify({ ...report, generated_at: new Date().toISOString() }, null, 2) + '\n');
  console.log(`TASK-0032 infrastructure policy: ${report.decision}`);
}
