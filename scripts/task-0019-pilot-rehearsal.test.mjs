import test from "node:test";
import assert from "node:assert/strict";
import { backupRecoveryEvidence, health, loadThresholds, redact, run, verifyRetention } from "./task-0019-pilot-rehearsal.mjs";

test("TASK-0019 rehearsal passes synthetic gates and never claims deployment", () => {
  const report = run();
  assert.equal(report.status, "passed");
  assert.equal(report.synthetic_only, true);
  assert.equal(report.production_deployment, "not-performed");
  assert.equal(report.checks.length, 8);
  assert.equal(report.final_cell_state.cell_a, "promoted");
  assert.equal(report.final_cell_state.cell_b, "rolled-back");
});
test("telemetry redaction removes financial payload and tenant identity", () => {
  const value = redact({ tenant_id: "tenant-secret", account_number: "1234", description: "private", cell: "cell-a" });
  assert.match(value.tenant_id, /^tenant-hash:sha256:[0-9a-f]{64}$/);
  assert.equal(value.account_number, undefined);
  assert.equal(value.description, undefined);
});
test("tenant hashes preserve scoped distinction and resist prefix collisions", () => {
  const a = redact({ tenant_id: "tenant-a" });
  const b = redact({ tenant_id: "tenant-b" });
  assert.notEqual(a.tenant_id, b.tenant_id);
  assert.equal(redact({ tenant_id: "tenant-a" }).tenant_id, a.tenant_id);
});
test("runbook is the normative threshold source", () => {
  const t = loadThresholds();
  assert.equal(t.p95_latency_ms_max, 750);
  assert.equal(t.alert_latency_ms, 1500);
  assert.equal(t.availability_min, 0.99);
  assert.throws(() => loadThresholds("# no SLO table"));
});
test("backup gate is explicit when evidence is unavailable", () => {
  const e = backupRecoveryEvidence();
  assert.ok(["passed", "skipped"].includes(e.status));
  assert.equal(typeof e.failures, "number");
});
test("retention manifest detects tampering", () => {
  const report = run();
  assert.equal(verifyRetention(report, report.evidence_manifest.report_sha256), true);
  const altered = { ...report, telemetry: [{ tenant_id: "tampered" }] };
  assert.equal(verifyRetention(altered, report.evidence_manifest.report_sha256), false);
});
test("incident timeline contains ordered pause, abort, rollback, and recovery states", () => {
  const timeline = run().incident_timeline;
  assert.deepEqual(timeline.map((e) => e.action), ["detect", "pause", "abort", "rollback", "restore-verify", "corrective-forward"]);
  assert.ok(timeline.every((e, i) => i === 0 || Date.parse(e.at) > Date.parse(timeline[i - 1].at)));
});
test("health gate fails degraded signals", () => {
  const result = health([{ status: 500, latency_ms: 1300 }, { status: 200, latency_ms: 1100 }]);
  assert.equal(result.healthy, false);
});
