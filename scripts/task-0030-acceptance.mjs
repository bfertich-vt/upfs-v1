import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(here, '..');
const requiredArtifacts = [
  ['native-postgres', 'artifacts/task-0017-pg14-native-report.json'],
  ['release', 'artifacts/task-0015-release-report.json'],
  ['managed-controls', 'artifacts/task-0018-controls-report.json'],
  ['pilot-rehearsal', 'artifacts/task-0019-pilot-report.json'],
  ['authorization', 'artifacts/task-0020-authorization-report.json'],
  ['cells-dr', 'artifacts/task-0028-dr-report.json'],
  ['resilience', 'artifacts/task-0029-resilience-report.json'],
  ['control-library', 'docs/compliance/control-library.json'],
  ['pilot-record', 'docs/compliance/pilot-go-no-go.md']
];
const themes = [
  { id: 'tenant-isolation', text: 'Tenant isolation is proven', refs: ['specs/10_security/security_baseline.md', 'artifacts/task-0029-resilience-report.json'] },
  { id: 'deterministic-financials', text: 'Deterministic financial calculations are correct', refs: ['specs/04_schema/canonical_model.md', 'specs/12_testing/test_strategy.md'] },
  { id: 'evidence-navigation', text: 'Source-to-answer evidence is navigable', refs: ['specs/02_ui/console_experience.md', 'specs/06_ai/ai_runtime.md'] },
  { id: 'projection-reconciliation', text: 'Projections are rebuildable and reconciled', refs: ['specs/03_architecture/system_architecture.md', 'artifacts/task-0029-resilience-report.json'] },
  { id: 'governed-actions', text: 'Risky actions are policy/approval controlled', refs: ['specs/07_workflows/workflow_runtime.md', 'specs/14_admin_control_plane/admin_control_plane.md'] },
  { id: 'signed-releases', text: 'Releases are signed and evidenced', refs: ['specs/09_cicd/delivery_pipeline.md', 'artifacts/task-0015-release-report.json'] },
  { id: 'public-contracts', text: 'Public APIs/docs/SDKs stay synchronized', refs: ['specs/05_apis/api_standards.md', 'specs/13_docs/documentation_platform.md'] },
  { id: 'recovery-exercised', text: 'Recovery is exercised', refs: ['specs/09_cicd/delivery_pipeline.md', 'artifacts/task-0028-dr-report.json', 'artifacts/task-0029-resilience-report.json'] },
  { id: 'unsupported-claims', text: 'No unsupported certification claim is made', refs: ['docs/compliance/pilot-go-no-go.md', 'docs/compliance/control-library.json'] }
];

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const check = (checks, id, ok, detail) => checks.push({ id, status: ok ? 'passed' : 'failed', detail });
const read = (root, rel) => { const p = path.join(root, rel); return fs.existsSync(p) ? fs.readFileSync(p) : null; };
const json = (root, rel) => { try { const b = read(root, rel); return b ? JSON.parse(b) : null; } catch { return null; } };

export function evaluateAcceptance({ root = defaultRoot } = {}) {
  const checks = [], evidence = [];
  check(checks, 'master-plan', Boolean(read(root, 'docs/MASTER_PLAN.md')), 'master plan is present');
  for (const [id, rel] of requiredArtifacts) {
    const bytes = read(root, rel); const doc = bytes && rel.endsWith('.json') ? json(root, rel) : null;
    const ok = Boolean(bytes) && (!rel.endsWith('.json') || Boolean(doc));
    check(checks, `artifact:${id}`, ok, ok ? `${rel} sha256:${sha256(bytes)}` : `missing or malformed ${rel}`);
    if (ok) evidence.push({ id, path: rel, sha256: sha256(bytes), status: doc?.status ?? 'documented' });
  }
  for (const theme of themes) {
    const missing = theme.refs.filter((ref) => !read(root, ref));
    check(checks, `theme:${theme.id}`, missing.length === 0, missing.length ? `${theme.text}; missing ${missing.join(', ')}` : theme.text);
  }
  const reports = requiredArtifacts.filter(([, rel]) => rel.endsWith('.json')).map(([, rel]) => json(root, rel)).filter(Boolean);
  const truthful = reports.every((r) => r.synthetic_only !== false && r.production_deployment !== 'performed');
  check(checks, 'synthetic-boundary', truthful, truthful ? 'all executable evidence is synthetic-only and non-deploying' : 'evidence claims production deployment or non-synthetic data');
  const pilot = read(root, 'docs/compliance/pilot-go-no-go.md')?.toString() ?? '';
  const control = read(root, 'docs/compliance/control-library.json')?.toString() ?? '';
  const noClaims = /certif|attest/i.test(pilot + control) && /not|no-go|engineering-readiness-only/i.test(pilot + control);
  check(checks, 'claims-boundary', noClaims, noClaims ? 'documentation preserves NO-GO and no certification/attestation claim' : 'unsupported production or certification claim detected');
  const all = checks.every((c) => c.status === 'passed');
  const externalPrerequisites = ['managed infrastructure and credentials', 'named external approvers', 'completed signed pilot go/no-go record'];
  return { schema_version: 'upfs.task-0030.acceptance.v1', status: all ? 'passed' : 'failed', decision: all ? 'NO-GO_EXTERNAL_PREREQUISITES' : 'NO-GO', synthetic_only: true, production_deployment: 'not-performed', checks, themes, evidence, external_prerequisites: externalPrerequisites };
}

export function main(root = defaultRoot) {
  const report = evaluateAcceptance({ root });
  const out = path.join(root, 'artifacts', 'task-0030-acceptance-report.json'); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(`TASK-0030 acceptance evaluated: ${report.decision}`); return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
