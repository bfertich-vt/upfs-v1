import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const check = (checks, name, passed, details) => { checks.push({ name, status: passed ? 'passed' : 'failed', details }); return passed; };
const uniq = (xs) => new Set(xs).size === xs.length;

export const syntheticContract = {
  schema_version: 'upfs.dr.v1', version: '2026-07-31.1', synthetic_only: true,
  policy: { checked: true, policy_version: 'dr-policy.v1', change_approval: 'synthetic-approval' },
  regions: [
    { id: 'us-east-1', role: 'primary', cells: ['cell-a'], owner: 'platform-ops' },
    { id: 'us-west-2', role: 'secondary', cells: ['cell-b'], owner: 'platform-ops' }
  ],
  cells: [
    { id: 'cell-a', region: 'us-east-1', state: 'active', capacity: 'synthetic' },
    { id: 'cell-b', region: 'us-west-2', state: 'standby', capacity: 'synthetic' }
  ],
  tenant_routing: [{ tenant_id: 'tenant-synthetic', region: 'us-east-1', cell: 'cell-a', version: 1 }],
  evacuation: { owner: 'incident-commander', approval: 'dual-control', procedure: 'pause-drain-reroute-verify', max_minutes: 30 },
  backups: [{ id: 'backup-synthetic-1', region: 'us-east-1', target: 'managed-object-storage', encrypted: true, retention_days: 35 }],
  restore_points: [{ id: 'restore-synthetic-1', backup_id: 'backup-synthetic-1', region: 'us-west-2', verified: true }],
  failover: { owner: 'incident-commander', target_region: 'us-west-2', corrective_forward: true, approval: 'dual-control' },
  objectives: { rpo_minutes: 15, rto_minutes: 30 }
};

export function evaluateDR({ contract = syntheticContract, infrastructure = {} } = {}) {
  const checks = [], c = contract || {};
  const regions = Array.isArray(c.regions) ? c.regions : [], cells = Array.isArray(c.cells) ? c.cells : [];
  check(checks, 'schema-version', c.schema_version === 'upfs.dr.v1' && typeof c.version === 'string', 'versioned DR contract required');
  check(checks, 'policy-checked', c.policy?.checked === true && c.policy?.policy_version && c.policy?.change_approval, 'policy validation and approval required');
  check(checks, 'regions', regions.length >= 2 && uniq(regions.map((r) => r.id)) && regions.every((r) => r.owner && ['primary', 'secondary'].includes(r.role)), 'distinct owned primary and secondary regions required');
  check(checks, 'cells', cells.length >= 2 && uniq(cells.map((x) => x.id)) && cells.every((x) => regions.some((r) => r.id === x.region) && x.state && x.capacity), 'cells must map to known regions with state and capacity');
  check(checks, 'tenant-routing', Array.isArray(c.tenant_routing) && c.tenant_routing.length > 0 && c.tenant_routing.every((r) => r.tenant_id && regions.some((x) => x.id === r.region) && cells.some((x) => x.id === r.cell && x.region === r.region) && Number.isInteger(r.version)), 'tenant routes must be versioned and region/cell scoped');
  check(checks, 'evacuation', c.evacuation?.owner && c.evacuation?.approval === 'dual-control' && c.evacuation?.procedure && Number.isFinite(c.evacuation.max_minutes), 'evacuation must be owned, approved, and bounded');
  check(checks, 'backup-restore', Array.isArray(c.backups) && c.backups.length > 0 && c.backups.every((b) => b.target && b.encrypted === true && b.retention_days > 0) && Array.isArray(c.restore_points) && c.restore_points.every((p) => p.backup_id && p.region && p.verified === true), 'encrypted backup targets and verified restore points required');
  check(checks, 'failover-owner', c.failover?.owner && c.failover?.target_region && c.failover?.approval === 'dual-control' && c.failover.corrective_forward === true, 'failover ownership, dual control, and corrective-forward required');
  check(checks, 'rpo-rto', Number.isFinite(c.objectives?.rpo_minutes) && c.objectives.rpo_minutes > 0 && Number.isFinite(c.objectives?.rto_minutes) && c.objectives.rto_minutes > 0, 'explicit positive RPO/RTO required');
  const managedReady = infrastructure.managed_backup === true && infrastructure.managed_routing === true && infrastructure.managed_failover === true;
  check(checks, 'managed-infrastructure', managedReady, 'managed backup, routing, and failover are required; missing infrastructure fails closed');
  const evidence = infrastructure.evidence || { backup_lag_minutes: 5, failover_minutes: 18, corrective_forward: true, synthetic_only: true, deployment: 'not-performed' };
  const evidenceOk = evidence.synthetic_only === true && evidence.deployment === 'not-performed' && evidence.backup_lag_minutes <= c.objectives?.rpo_minutes && evidence.failover_minutes <= c.objectives?.rto_minutes && evidence.corrective_forward === true;
  check(checks, 'rpo-rto-evidence', evidenceOk, 'synthetic recovery evidence must meet RPO/RTO and corrective-forward objectives');
  const passed = checks.every((x) => x.status === 'passed');
  return { schema_version: 'upfs.dr.report.v1', status: passed ? 'passed' : 'failed', decision: passed ? 'READY_FOR_APPROVAL' : 'NO-GO', synthetic_only: true, production_deployment: 'not-performed', checks, evidence };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const root = process.cwd(); const report = evaluateDR({ infrastructure: {} });
  const target = path.join(root, 'artifacts/task-0028-dr-report.json'); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, JSON.stringify({ ...report, generated_at: new Date().toISOString() }, null, 2) + '\n');
  console.log(`TASK-0028 DR evaluation: ${report.decision}`);
}
