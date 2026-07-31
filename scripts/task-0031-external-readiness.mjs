import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const check = (checks, name, passed, details) => { checks.push({ name, status: passed ? 'passed' : 'failed', details }); return passed; };
export const syntheticContract = JSON.parse(fs.readFileSync(path.resolve('contracts/task-0031-external-readiness.json'), 'utf8'));

export function evaluateExternalReadiness({ contract = syntheticContract, infrastructure = {} } = {}) {
  const c = contract || {}; const checks = [];
  check(checks, 'schema-version', c.schema_version === 'upfs.external-readiness.v1' && typeof c.contract_version === 'string', 'versioned contract required');
  check(checks, 'policy-checked', c.policy?.checked === true && c.policy?.policy_version && c.policy?.approval, 'policy check and approval required');
  check(checks, 'protected-environments', ['pilot', 'production'].every((e) => c.protected_environments?.includes(e)), 'pilot and production must be protected');
  const pg = c.managed_postgresql || {};
  check(checks, 'managed-postgresql', pg.provider === 'external-managed-postgresql' && pg.tls_required === true && pg.rls_required === true && pg.backup_enabled === true, 'managed PostgreSQL TLS, RLS, and backups required');
  const ss = c.secrets_signing || {};
  check(checks, 'secrets-signing', ss.provider === 'external-managed-secret-and-config' && ss.secret_ref_required && ss.config_ref_required && ss.signing_key_ref_required && ss.rotation_required, 'managed secret/config/signing references and rotation required');
  const ob = c.observability || {};
  check(checks, 'observability', ob.provider === 'external-managed-observability' && ['metrics', 'logs', 'traces', 'alerts'].every((x) => ob[x] === true), 'managed metrics, logs, traces, and alerts required');
  const bk = c.backup_targets || {};
  check(checks, 'backup-target', bk.provider === 'external-managed-object-storage' && bk.encrypted === true && Number.isInteger(bk.retention_days) && bk.retention_days > 0 && bk.restore_verification_required === true, 'encrypted managed backup target and restore verification required');
  const cr = c.cells_regions || {};
  check(checks, 'cells-regions', cr.regions_required >= 2 && cr.cells_per_region_required >= 1 && cr.routing_managed === true && cr.failover_managed === true && cr.corrective_forward === true, 'multi-region managed routing and failover required');
  const refs = c.required_references || [];
  check(checks, 'required-references', refs.length === 3 && refs.every((x) => /^UPFS_[A-Z0-9_]+$/.test(x)), 'references must be named, never embedded secrets');
  const managed = infrastructure.managed_postgresql === true && infrastructure.managed_secrets === true && infrastructure.managed_observability === true && infrastructure.managed_backup === true && infrastructure.managed_cells_regions === true;
  check(checks, 'managed-infrastructure', managed, 'all managed integrations are required; absence fails closed');
  const evidence = infrastructure.evidence || { synthetic_only: true, deployment: 'not-performed', references_bound: false };
  check(checks, 'evidence-boundary', evidence.synthetic_only === true && evidence.deployment === 'not-performed' && evidence.references_bound === false, 'evidence must be synthetic and deployment-free');
  const passed = checks.every((x) => x.status === 'passed');
  return { schema_version: 'upfs.external-readiness.report.v1', status: passed ? 'passed' : 'failed', decision: passed ? 'READY_FOR_EXTERNAL_APPROVAL' : 'NO-GO_EXTERNAL_PREREQUISITES', synthetic_only: true, production_deployment: 'not-performed', checks, evidence };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const report = evaluateExternalReadiness({ infrastructure: {} }); const target = path.resolve('artifacts/task-0031-external-readiness-report.json'); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, JSON.stringify({ ...report, generated_at: new Date().toISOString() }, null, 2) + '\n'); console.log(`TASK-0031 external readiness: ${report.decision}`);
}
