import test from "node:test";
import assert from "node:assert/strict";
import { health, redact, run } from "./task-0019-pilot-rehearsal.mjs";

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
  assert.match(value.tenant_id, /^tenant-hash:/);
  assert.equal(value.account_number, undefined);
  assert.equal(value.description, undefined);
});
test("health gate fails degraded signals", () => {
  const result = health([{ status: 500, latency_ms: 1300 }, { status: 200, latency_ms: 1100 }]);
  assert.equal(result.healthy, false);
});
