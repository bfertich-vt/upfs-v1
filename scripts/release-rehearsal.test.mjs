import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

test("release rehearsal executes every synthetic readiness gate", () => {
  const result = spawnSync(process.execPath, ["scripts/release-rehearsal.mjs"], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(fs.readFileSync("artifacts/release-rehearsal-report.json", "utf8"));
  assert.equal(report.status, "passed");
  for (const name of [
    "production-composition-invocation", "durable-boundary-contract", "security-tenant-isolation",
    "security-bola-denial", "security-secret-scan", "recovery-checkpoint-roundtrip", "recovery-outbox-contract",
    "performance-bounded-load", "migration-dry-run", "migration-contract-compatibility", "release-artifact-report",
  ]) assert.equal(report.checks.find((check) => check.name === name)?.status, "passed", name);
});

