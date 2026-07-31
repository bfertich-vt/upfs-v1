import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const check = (checks, name, passed, details) => { checks.push({ name, status: passed ? 'passed' : 'failed', details }); return passed; };
export const syntheticContract = JSON.parse(fs.readFileSync(path.resolve('contracts/task-0031-external-readiness.json'), 'utf8'));

export function evaluateExternalReadiness({ contract = syntheticContract, infrastructure = {} } = {}) {
  const c = contract || {}; const checks = [];
  check(checks, 'schema-version', c.schema_version === 'upfs.external-readiness.v1' && typeof c.contract_version === 'string', 'versioned contract required');
  check(checks, 'synthetic-contract', c.synthetic_only === true, 'contract must be explicitly synthetic-only');
  check(checks, 'policy-checked', c.policy?.checked === true && c.policy?.policy_version && c.policy?.approval, 'policy check and approval required');
  check(checks, 'protected-environments', Array.isArray(c.protected_environments) && c.protected_environments.length === 2 && ['pilot', 'production'].every((e) => c.protected_environments.includes(e)), 'pilot and production must be protected');
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
  const refs = c.required_references || []; const expectedRefs = ['UPFS_MANAGED_SECRET_REF', 'UPFS_CONFIG_REF', 'UPFS_RELEASE_SIGNING_KEY_REF'];
  check(checks, 'required-references', refs.length === expectedRefs.length && new Set(refs).size === refs.length && expectedRefs.every((x) => refs.includes(x)), 'references must exactly match deployment contract and never embed secrets');
  const prohibited = ['committed secrets', 'synthetic provider in pilot/production', 'unapproved promotion', 'real customer data in rehearsal'];
  check(checks, 'prohibited-policy', Array.isArray(c.prohibited) && c.prohibited.length === prohibited.length && prohibited.every((x) => c.prohibited.includes(x)), 'prohibited policy must exactly match deployment contract');
  check(checks, 'provider-policy', c.managed_postgresql?.provider !== 'synthetic' && c.secrets_signing?.provider !== 'synthetic' && c.observability?.provider !== 'synthetic' && c.backup_targets?.provider !== 'synthetic', 'synthetic providers are prohibited for protected environments');
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
