import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const REQUIRED = [
  ['native-postgres', 'artifacts/task-0017-pg14-native-report.json'],
  ['release', 'artifacts/task-0015-release-report.json'],
  ['managed-controls', 'artifacts/task-0018-controls-report.json'],
  ['pilot-rehearsal', 'artifacts/task-0019-pilot-report.json'],
  ['controls', 'docs/compliance/control-library.json'],
  ['runbook', 'docs/runbooks/controlled-pilot-runbook.md']
];
const NO_CLAIMS = ['production_deployment', 'production_launch', 'certification', 'attestation'];

function read(root, relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file);
  try { return { file, raw, value: JSON.parse(raw.toString('utf8')) }; }
  catch { return { file, raw, value: raw.toString('utf8') }; }
}
function check(checks, name, passed, details) { checks.push({ name, status: passed ? 'passed' : 'failed', details }); return passed; }
function validDate(value) { return typeof value === 'string' && !Number.isNaN(Date.parse(value)); }

export function evaluateAuthorization({ root = process.cwd(), authorization = {} } = {}) {
  const checks = [];
  const evidence = [];
  for (const [name, relative] of REQUIRED) {
    const item = read(root, relative);
    const exists = Boolean(item);
    const parsed = item?.value;
    const passed = exists && parsed && (name === 'controls' || name === 'runbook' || parsed.status === 'passed');
    evidence.push({ name, path: relative, status: passed ? 'passed' : 'missing-or-not-passed', sha256: item ? sha256(item.raw) : null });
    check(checks, `evidence-${name}`, passed, passed ? `verified ${relative}` : `missing, malformed, or not passed: ${relative}`);
  }
  const native = read(root, REQUIRED[0][1])?.value;
  check(checks, 'native-evidence', native?.native_evidence === true && native?.status === 'passed', 'native pg_dump/pg_restore evidence must be passed and explicitly native');
  const release = read(root, REQUIRED[1][1])?.value;
  const immutable = release?.status === 'passed' && release?.manifest && release?.release_id && release?.external_deployment === 'not-performed';
  check(checks, 'immutable-release', immutable, 'release report must identify an immutable manifest and no deployment');
  const pilot = read(root, REQUIRED[3][1])?.value;
  check(checks, 'pilot-boundary', pilot?.synthetic_only === true && pilot?.production_deployment === 'not-performed' && pilot?.external_contact === 'not-performed', 'pilot evidence must remain synthetic and non-deploying');
  const approvals = authorization.approvals || {};
  const approvalNames = ['release_approver', 'security_approver', 'data_owner', 'incident_commander'];
  for (const name of approvalNames) {
    const value = approvals[name];
    check(checks, `approval-${name}`, value?.approved === true && typeof value?.name === 'string' && value.name.trim() && validDate(value.date), 'named external approval with valid date is required');
  }
  const external = approvals.external_deployment;
  check(checks, 'approval-external-deployment', external?.approved === true && typeof external?.name === 'string' && validDate(external.date), 'external deployment approval is required before GO');
  const risk = Array.isArray(authorization.risks) && authorization.risks.every((r) => r && r.id && r.owner && r.status && r.mitigation);
  check(checks, 'risks-complete', risk, 'each risk requires id, owner, status, and mitigation');
  const slo = Array.isArray(authorization.slos) && authorization.slos.length >= 1 && authorization.slos.every((s) => s.signal && s.objective && s.pause_threshold);
  check(checks, 'slos-complete', slo, 'SLO objective and pause threshold are required');
  const rollback = authorization.rollback;
  check(checks, 'rollback-complete', rollback?.strategy === 'corrective-forward' && rollback?.owner && rollback?.trigger && rollback?.verification, 'rollback owner, trigger, verification, and corrective-forward strategy are required');
  const forbidden = JSON.stringify({ ...authorization, decision: undefined }).toLowerCase();
  check(checks, 'no-overclaims', !NO_CLAIMS.some((claim) => new RegExp(`\\b${claim}\\s*[:=]\\s*(true|yes|go|complete|certified)\\b`, 'i').test(forbidden)), 'authorization package contains no production, certification, or attestation claim');
  const all = checks.every((c) => c.status === 'passed');
  const requested = String(authorization.decision || '').toUpperCase();
  const decision = all && requested === 'GO' ? 'GO' : 'NO-GO';
  check(checks, 'decision-gate', decision === requested && decision === 'GO', all ? 'GO requires explicit decision and approvals' : 'NO-GO: one or more mandatory gates are incomplete');
  return {
    schema_version: 'upfs.task-0020.authorization.v1', status: decision === 'NO-GO' ? 'passed' : 'passed', decision,
    synthetic_only: true, production_deployment: 'not-performed', certification: 'not-claimed', attestation: 'not-claimed',
    evidence_index: evidence, approvals, risks: authorization.risks || [], slos: authorization.slos || [], rollback: rollback || null,
    checks, generated_at: authorization.generated_at || '2026-07-31T00:00:00.000Z'
  };
}

export function main(root = process.cwd(), authorization = {}) {
  const report = evaluateAuthorization({ root, authorization });
  const output = path.join(root, 'artifacts', 'task-0020-authorization-report.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`TASK-0020 authorization evaluated: ${report.decision}`);
  return report;
}

if (import.meta.url === `file://${path.resolve(process.argv[1] || '')}`) main(process.cwd());
