import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

test("TASK-0016 produces complete, truthful pilot readiness evidence", () => {
  const result = spawnSync(process.execPath, ["scripts/task-0016-readiness-evidence.mjs"], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(fs.readFileSync("artifacts/task-0016-readiness-report.json"));
  assert.equal(report.status, "passed");
  assert.equal(report.synthetic_only, true);
  assert.equal(report.production_deployment, "not-performed");
  assert.equal(report.certification, "not-claimed");
  assert.ok(report.control_count >= 8);
  assert.equal(report.checks.length, 4);
});

test("TASK-0016 fails closed when a control loses required evidence metadata", () => {
  const file = "docs/compliance/control-library.json";
  const original = fs.readFileSync(file, "utf8");
  const library = JSON.parse(original);
  delete library.controls[0].reviewer;
  fs.writeFileSync(file, `${JSON.stringify(library, null, 2)}\n`);
  try {
    const result = spawnSync(process.execPath, ["scripts/task-0016-readiness-evidence.mjs"], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /control-completeness/);
  } finally {
    fs.writeFileSync(file, original);
  }
});

test("TASK-0016 rejects empty, malformed, unresolved, and false-pass metadata", () => {
  const libraryFile = "docs/compliance/control-library.json";
  const runbookFile = "docs/runbooks/controlled-pilot-runbook.md";
  const originalLibrary = fs.readFileSync(libraryFile, "utf8");
  const originalRunbook = fs.readFileSync(runbookFile, "utf8");
  const cases = [
    (library) => { library.controls[0].owner = "   "; },
    (library) => { library.controls[0].retention = "forever"; },
    (library) => { library.controls[0].evidence_source = "missing/evidence.json"; },
    (library) => { library.controls[0].evidence_status = "complete"; library.controls[0].last_execution = null; },
    (library) => { library.controls[0].criteria = "SOC2"; }
  ];
  try {
    for (const mutate of cases) {
      const library = JSON.parse(originalLibrary);
      mutate(library);
      fs.writeFileSync(libraryFile, `${JSON.stringify(library, null, 2)}\n`);
      const result = spawnSync(process.execPath, ["scripts/task-0016-readiness-evidence.mjs"], { encoding: "utf8" });
      assert.notEqual(result.status, 0);
    }
    fs.writeFileSync(libraryFile, originalLibrary);
    fs.writeFileSync(runbookFile, originalRunbook.replace("- Vendor/provider:", "- External/provider:"));
    const result = spawnSync(process.execPath, ["scripts/task-0016-readiness-evidence.mjs"], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pilot-documents/);
  } finally {
    fs.writeFileSync(libraryFile, originalLibrary);
    fs.writeFileSync(runbookFile, originalRunbook);
  }
});
