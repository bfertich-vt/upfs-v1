import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
function validDate(value) {
  if (typeof value !== 'string' || !RFC3339.test(value)) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed) && new Date(parsed).toISOString().startsWith(value.replace(/\.\d{1,9}Z$/, 'Z').replace(/Z$/, ''));
}
function canonicalManifest(manifest) {
  const copy = { ...manifest };
  delete copy.manifest_sha256; delete copy.signature;
  return JSON.stringify(copy);
}
function expectedEntries(manifest) {
  return Object.entries(manifest?.artifact?.entries || {}).map(([path, value]) => ({ path, sha256: value?.sha256 }));
}

export function evaluateAuthorization({ root = process.cwd(), authorization = {} } = {}) {
  const checks = [];
  const evidence = [];
  for (const [name, relative] of REQUIRED) {
    const item = read(root, relative);
    const exists = Boolean(item);
    const parsed = item?.value;
    const passed = exists && parsed && (name === 'controls' || name === 'runbook' || parsed.status === 'passed');
    evidence.push({ name, path: relative, status: passed ? 'passed' : 'missing-or-not-passed', sha256: item ? sha256(item.raw) : null, generated_at: parsed?.generated_at || null });
    check(checks, `evidence-${name}`, passed, passed ? `verified ${relative}` : `missing, malformed, or not passed: ${relative}`);
  }
  const native = read(root, REQUIRED[0][1])?.value;
  check(checks, 'native-evidence', native?.native_evidence === true && native?.status === 'passed', 'native pg_dump/pg_restore evidence must be passed and explicitly native');
  const release = read(root, REQUIRED[1][1])?.value;
  const immutable = release?.status === 'passed' && release?.manifest && release?.release_id && release?.external_deployment === 'not-performed';
  check(checks, 'immutable-release', immutable, 'release report must identify an immutable manifest and no deployment');
  const manifestItem = release?.manifest ? read(root, release.manifest) : null;
  const manifestHash = manifestItem?.value?.manifest_sha256;
  check(checks, 'manifest-integrity', Boolean(manifestItem?.value && manifestHash && manifestHash === sha256(canonicalManifest(manifestItem.value))), 'release manifest hash must match its immutable canonical body');
  const manifestFilesOk = expectedEntries(manifestItem?.value).length > 0 && expectedEntries(manifestItem.value).every(({ path: file, sha256: expected }) => { const item = read(root, file); return item && expected === sha256(item.raw); });
  check(checks, 'manifest-entries', manifestFilesOk, 'every immutable manifest entry must match the retained file digest');
  const expected = authorization.evidence_manifest;
  if (expected) {
    const entries = Array.isArray(expected) ? expected : Object.entries(expected).map(([file, digest]) => ({ path: file, sha256: digest }));
    check(checks, 'evidence-manifest', entries.length > 0 && entries.every(({ path: file, sha256: digest }) => { const item = read(root, file); return item && digest === sha256(item.raw); }), 'expected evidence manifest digests must match current evidence');
  }
  const now = Date.parse(authorization.as_of || authorization.generated_at || new Date().toISOString());
  const maxAge = Number(authorization.evidence_max_age_ms ?? 7 * 24 * 60 * 60 * 1000);
  const freshness = evidence.filter((item) => ['native-postgres', 'release', 'managed-controls', 'pilot-rehearsal'].includes(item.name)).every((item) => item.generated_at && validDate(item.generated_at) && now - Date.parse(item.generated_at) >= 0 && now - Date.parse(item.generated_at) <= maxAge);
  check(checks, 'evidence-freshness', freshness, `evidence must have valid timestamps no older than ${maxAge}ms`);
  const pilot = read(root, REQUIRED[3][1])?.value;
  check(checks, 'pilot-boundary', pilot?.synthetic_only === true && pilot?.production_deployment === 'not-performed' && pilot?.external_contact === 'not-performed', 'pilot evidence must remain synthetic and non-deploying');
  const approvals = authorization.approvals || {};
  const approvalNames = ['release_approver', 'security_approver', 'data_owner', 'incident_commander'];
  for (const name of approvalNames) {
    const value = approvals[name];
    check(checks, `approval-${name}`, value?.approved === true && typeof value?.name === 'string' && value.name.trim() && typeof value.identity === 'string' && value.identity.trim() && typeof value.scope === 'string' && value.scope.trim() && typeof value.reason === 'string' && value.reason.trim() && (typeof value.signature === 'string' || typeof value.reference === 'string') && validDate(value.date) && validDate(value.expires_at) && Date.parse(value.expires_at) > now, 'approval requires identity, scope, reason, signature/reference, valid date, and future expiry');
  }
  const external = approvals.external_deployment;
  check(checks, 'approval-external-deployment', external?.approved === true && typeof external?.name === 'string' && external.name.trim() && typeof external.identity === 'string' && external.identity.trim() && typeof external.scope === 'string' && /deploy/i.test(external.scope) && typeof external.reason === 'string' && external.reason.trim() && (typeof external.signature === 'string' || typeof external.reference === 'string') && validDate(external.date) && validDate(external.expires_at) && Date.parse(external.expires_at) > now && external.dual_control === true, 'external deployment approval requires scope, signature/reference, future expiry, and dual control');
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

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main(process.cwd());
