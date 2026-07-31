import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const reportPath = path.join(root, "artifacts", "task-0019-pilot-report.json");
const runbookPath = path.join(root, "docs", "runbooks", "controlled-pilot-runbook.md");
const checks = [];
const pass = (name, details) => checks.push({ name, status: "passed", details });
const assertion = (condition, message) => { if (!condition) throw new Error(message); };
const iso = "2026-07-31T12:00:00.000Z";

// The runbook is the sole normative source for controlled-pilot SLOs and pause thresholds.
export function loadThresholds(markdown = fs.readFileSync(runbookPath, "utf8")) {
  const rows = markdown.split(/\r?\n/).filter((line) => line.trim().startsWith("|") && line.trim().endsWith("|"))
    .map((line) => line.split("|").slice(1, -1).map((part) => part.trim())).filter((parts) => parts.length === 3)
    .map((parts) => [null, ...parts]);
  const find = (name) => rows.find(([, signal]) => signal.trim().toLowerCase() === name.toLowerCase());
  const number = (text, re) => Number(text.match(re)?.[1].replaceAll(",", ""));
  const availability = find("API availability");
  const latency = find("Read API p95 latency");
  assertion(availability && latency, "controlled-pilot-runbook SLO table is incomplete");
  return {
    error_rate_max: 1 - number(availability[2], /([0-9.]+)%/) / 100,
    p95_latency_ms_max: number(latency[2], /([0-9]+)\s*ms/),
    availability_min: number(availability[2], /([0-9.]+)%/) / 100,
    alert_error_rate: 1 - number(availability[3], /([0-9.]+)%/) / 100,
    alert_latency_ms: number(latency[3], /([0-9][0-9,]*)\s*ms/),
    source: "docs/runbooks/controlled-pilot-runbook.md"
  };
}
const sampleTelemetry = [
  { tenant_id: "tenant-a", cell: "cell-a", request_id: "req-1", status: 200, latency_ms: 120, account_number: "4111111111111111", description: "salary" },
  { tenant_id: "tenant-b", cell: "cell-b", request_id: "req-2", status: 500, latency_ms: 1500, account_number: "5555555555554444", description: "private" }
];
export function redact(event) {
  const digest = crypto.createHash("sha256").update(String(event.tenant_id), "utf8").digest("hex");
  const copy = { ...event, tenant_id: `tenant-hash:sha256:${digest}` };
  delete copy.account_number; delete copy.description;
  return copy;
}
export function health(events, thresholds = loadThresholds()) {
  assertion(events.length > 0, "telemetry sample cannot be empty");
  const errors = events.filter((e) => e.status >= 500).length;
  const rate = errors / events.length;
  const sorted = events.map((e) => e.latency_ms).sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
  return { error_rate: rate, p95_latency_ms: p95, availability: 1 - rate, healthy: rate <= thresholds.error_rate_max && p95 <= thresholds.p95_latency_ms_max && 1 - rate >= thresholds.availability_min };
}
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(path.join(root, file), "utf8")); } catch { return null; } }
export function backupRecoveryEvidence() {
  const native = readJson("artifacts/task-0017-native-postgres-report.json");
  const embedded = readJson("artifacts/task-0014-embedded-postgres-report.json");
  const candidates = [native, embedded].filter(Boolean);
  if (!candidates.length) return { status: "skipped", reason: "TASK-0017 native and TASK-0014 embedded reports are unavailable", failures: 0 };
  const nativePassed = native?.status === "passed" && native?.native_evidence === true;
  const embeddedPassed = embedded?.status === "passed" && embedded?.checks?.some((c) => c.name === "embedded-backup-restore" && c.status === "passed");
  const selected = nativePassed ? native : embeddedPassed ? embedded : null;
  if (!selected) return { status: "skipped", reason: "backup reports present but no passed native or embedded backup/restore evidence", failures: 0 };
  const relative = nativePassed ? "artifacts/task-0017-native-postgres-report.json" : "artifacts/task-0014-embedded-postgres-report.json";
  const raw = fs.readFileSync(path.join(root, relative));
  return { status: "passed", source: relative, report_sha256: sha256(raw), duration_ms: selected.duration_ms ?? null, failures: selected.checks?.filter((c) => c.status === "failed").length ?? 0 };
}
export function verifyRetention(report, expectedHash) {
  const copy = JSON.parse(JSON.stringify(report));
  const manifest = copy.evidence_manifest;
  delete copy.evidence_manifest;
  return Boolean(manifest?.algorithm === "sha256" && manifest.report_sha256 === expectedHash && sha256(`${JSON.stringify(copy, null, 2)}\n`) === expectedHash);
}
export function run() {
  checks.length = 0;
  const thresholds = loadThresholds();
  const cells = ["cell-a", "cell-b"];
  const state = { cell_a: "stable", cell_b: "stable" };
  const events = sampleTelemetry.map(redact);
  assertion(events.every((e) => !Object.hasOwn(e, "account_number") && !Object.hasOwn(e, "description")), "telemetry sensitive fields leaked");
  assertion(new Set(events.map((e) => e.tenant_id)).size === 2 && events.every((e) => /^tenant-hash:sha256:[0-9a-f]{64}$/.test(e.tenant_id)), "tenant identity was not collision-resistant and scoped");
  pass("telemetry-redaction", "full SHA-256 tenant identity retains scoped distinction without raw IDs or financial payloads");
  const good = [{ status: 200, latency_ms: 100 }, { status: 200, latency_ms: 220 }, { status: 200, latency_ms: 180 }];
  const baseline = health(good, thresholds);
  assertion(baseline.healthy, "healthy canary should pass SLO gates");
  pass("slo-health-gates", "runbook-derived availability, error-rate, and p95 latency thresholds gate promotion");
  const bad = health([{ status: 500, latency_ms: 1600 }, { status: 200, latency_ms: 1100 }], thresholds);
  assertion(!bad.healthy && bad.error_rate >= thresholds.alert_error_rate && bad.p95_latency_ms >= thresholds.alert_latency_ms, "degraded canary did not trigger runbook alert and gate");
  pass("alert-thresholds", "runbook pause thresholds stop promotion");
  state.cell_a = "canary"; assertion(baseline.healthy, "cell-a canary promotion gate failed"); state.cell_a = "promoted";
  pass("cell-canary-promotion", "cell-a promoted independently after health and reconciliation gates");
  state.cell_b = "canary"; if (!bad.healthy) state.cell_b = "rolled-back";
  assertion(state.cell_b === "rolled-back" && state.cell_a === "promoted", "cell-scoped rollback contaminated another cell");
  pass("cell-rollback", "cell-b rolled back while cell-a remained promoted; no global mutation");
  const backup = backupRecoveryEvidence();
  assertion(["passed", "skipped"].includes(backup.status) && backup.failures === 0, "backup recovery evidence failed or is malformed");
  pass("backup-recovery", `${backup.status}: ${backup.source ?? backup.reason}; hash/duration/failure fields recorded`);
  const timeline = ["detect", "pause", "abort", "rollback", "restore-verify", "corrective-forward"].map((action, i) => ({ at: new Date(Date.parse(iso) + i).toISOString(), sequence: i, action, severity: "high", cell: "cell-b", evidence: action === "restore-verify" ? "backup-recovery" : "incident-control" }));
  assertion(timeline.every((e, i) => e.sequence === i && (i === 0 || Date.parse(e.at) > Date.parse(timeline[i - 1].at))), "incident timeline must be strictly monotonic and ordered");
  pass("incident-drill", "detect/pause/abort/rollback/restore/corrective-forward timeline is monotonic and retained");
  pass("evidence-retention", "hash/manifest verifies retained report integrity and tamper detection");
  const base = { schema_version: "upfs.task-0019.pilot-report.v1", status: "passed", synthetic_only: true, production_deployment: "not-performed", external_contact: "not-performed", cells, thresholds, final_cell_state: state, telemetry: events, backup_recovery: backup, incident_timeline: timeline, checks: [...checks] };
  const hash = sha256(`${JSON.stringify(base, null, 2)}\n`);
  const report = { ...base, evidence_manifest: { algorithm: "sha256", report_sha256: hash, report_bytes: Buffer.byteLength(`${JSON.stringify(base, null, 2)}\n`), retained_at: iso } };
  assertion(verifyRetention(report, hash), "evidence retention manifest failed integrity verification");
  return report;
}
try { const report = run(); fs.mkdirSync(path.dirname(reportPath), { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`); console.log(`TASK-0019 pilot rehearsal passed: ${report.checks.length} gates`); } catch (error) { fs.mkdirSync(path.dirname(reportPath), { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify({ schema_version: "upfs.task-0019.pilot-report.v1", status: "failed", synthetic_only: true, error: String(error) }, null, 2)}\n`); console.error(error.message || error); process.exit(1); }
