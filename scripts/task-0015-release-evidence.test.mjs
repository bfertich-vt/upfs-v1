import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

test("TASK-0015 produces signed immutable synthetic release evidence", () => {
  const result = spawnSync(process.execPath, ["scripts/task-0015-release-evidence.mjs"], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(fs.readFileSync("artifacts/task-0015-release-report.json"));
  const manifest = JSON.parse(fs.readFileSync("artifacts/upfs-release-manifest.json"));
  assert.equal(report.status, "passed");
  assert.equal(report.synthetic_only, true);
  assert.match(manifest.signature.value, /^[a-f0-9]{64}$/);
  assert.equal(manifest.deployment.approval_required, true);
  for (const name of ["managed-configuration", "immutable-manifest", "sbom-provenance", "canary-health-gate", "post-deploy-reconciliation", "rollback-procedure"]) assert.equal(report.checks.find((c) => c.name === name)?.status, "passed", name);
});

test("production configuration fails closed without managed references", () => {
  const result = spawnSync(process.execPath, ["scripts/task-0015-release-evidence.mjs"], { encoding: "utf8", env: { ...process.env, UPFS_ENVIRONMENT: "pilot", UPFS_MANAGED_SECRET_REF: "", UPFS_CONFIG_REF: "" } });
  assert.notEqual(result.status, 0);
  const report = JSON.parse(fs.readFileSync("artifacts/task-0015-release-report.json"));
  assert.match(report.error, /managed-configuration/);
});
