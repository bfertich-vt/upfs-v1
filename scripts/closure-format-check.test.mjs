import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  canonicalStageAState,
  validateClosureFormatting,
} from "./closure-format-check.mjs";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "upfs-closure-format-"));
  for (const rel of [
    "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md",
    "scripts/queue-validator.mjs",
    "docs/governance/task-closures/rejected/TASK-0001-r1.json",
    "docs/governance/task-closures/TASK-0001-stage-a-state.json",
  ]) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.copyFileSync(path.resolve(rel), path.join(root, rel));
  }
  return root;
}

test("closure formatting covers Prettier files and stable exclusions", async () => {
  const root = fixture();
  assert.deepEqual((await validateClosureFormatting(root)).errors, []);

  const json = path.join(
    root,
    "docs/governance/task-closures/rejected/TASK-0001-r1.json",
  );
  fs.writeFileSync(
    json,
    fs.readFileSync(json, "utf8").replace(/\n  "/, '\n     "'),
  );
  assert.ok(
    (await validateClosureFormatting(root)).errors.some((error) =>
      error.includes("not formatted by pinned Prettier"),
    ),
  );

  fs.copyFileSync(
    path.resolve("docs/governance/task-closures/rejected/TASK-0001-r1.json"),
    json,
  );
  const matrix = path.join(root, "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md");
  fs.writeFileSync(
    matrix,
    fs.readFileSync(matrix, "utf8").replace(/\n/, "  \n"),
  );
  assert.ok(
    (await validateClosureFormatting(root)).errors.some((error) =>
      error.includes("trailing whitespace"),
    ),
  );

  const queue = path.join(root, "scripts/queue-validator.mjs");
  fs.writeFileSync(
    queue,
    fs
      .readFileSync(queue, "utf8")
      .replace("validateHistoricalClosures(root, tasks, errors);", ""),
  );
  assert.ok(
    (await validateClosureFormatting(root)).errors.some((error) =>
      error.includes("closure integration hook"),
    ),
  );
});

test("R5 authorization includes every modified validator test surface", () => {
  const task = fs.readFileSync(
    "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R5.yaml",
    "utf8",
  );
  assert.match(task, /  - scripts\/closure-format-check\.test\.mjs/);
  assert.match(task, /  - scripts\/historical-closure-validator\.test\.mjs/);
});

test("TASK-0001 uses one canonical R7 state record and non-authorizing prose", async () => {
  const root = fixture();
  const matrix = path.join(root, "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md");
  const original = fs.readFileSync(matrix, "utf8");
  const marker =
    "Authoritative state: docs/governance/task-closures/TASK-0001-stage-a-state.json; all matrix prose is non-authoritative.";
  for (const mutation of [
    original.replace(marker, ""),
    original.replace(marker, `${marker} ${marker}`),
    original.replace(
      "Follow the authoritative state record",
      "Attestation issued; review R6",
    ),
    original.replace("| blocked |", "| ACCEPTED |"),
  ]) {
    fs.writeFileSync(matrix, mutation);
    assert.notDeepEqual((await validateClosureFormatting(root)).errors, []);
  }
  fs.writeFileSync(matrix, original);

  const state = path.join(
    root,
    "docs/governance/task-closures/TASK-0001-stage-a-state.json",
  );
  const valid = fs.readFileSync(state, "utf8");
  assert.equal(canonicalStageAState(valid), true);
  for (const mutation of [
    valid + valid,
    valid.replace('  "task_status": "blocked",\n', ""),
    valid.replace(
      '  "task_status": "blocked",',
      '  "extra": true,\n  "task_status": "blocked",',
    ),
    valid.replace('-R7"', '-R6"'),
    valid.replace('"REJECTED"', '"ACCEPTED"'),
    valid.replace('"absent"', '"issued"'),
    valid.replace('"R7_HANDOFF_CANDIDATE"', '"R6_HANDOFF_CANDIDATE"'),
    valid.replace('"STAGE_A_REVIEW_PENDING"', '"ACTIVATION_PENDING"'),
    valid.replace(
      '"FRESH_QA_REVIEW_THEN_ATTEST_IF_ACCEPTED"',
      '"REVIEW_R6_OR_ACTIVATE"',
    ),
    valid.replace('  "task_id"', ' "task_id"'),
  ])
    assert.equal(canonicalStageAState(mutation), false, mutation);
});
