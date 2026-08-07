import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  canonicalStageAState,
  canonicalTaskOneRow,
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
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-m",
      "fixture",
    ],
    { cwd: root, stdio: "ignore" },
  );
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

test("TASK-0001 whole row and R8 state blob are closed-world canonical", async () => {
  const root = fixture();
  const matrix = path.join(root, "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md");
  const original = fs.readFileSync(matrix, "utf8");
  assert.ok(original.split(/\r?\n/).includes(canonicalTaskOneRow()));
  for (const mutation of [
    " appended",
    " removed",
    "Complete",
    "unblocked",
    "Verdict published",
    "Proceed immediately",
    "inspect prior round",
    "ATTESTATION",
    "  ",
    ".",
    "r8",
  ]) {
    fs.writeFileSync(
      matrix,
      original.replace(
        canonicalTaskOneRow(),
        `${canonicalTaskOneRow()}${mutation}`,
      ),
    );
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
    valid.replace('-R8"', '-R7"'),
    valid.replace('"REJECTED"', '"ACCEPTED"'),
    valid.replace('"absent"', '"issued"'),
    valid.replace('"R8_HANDOFF_CANDIDATE"', '"R7_HANDOFF_CANDIDATE"'),
    valid.replace('"STAGE_A_REVIEW_PENDING"', '"ACTIVATION_PENDING"'),
    valid.replace(
      '"FRESH_QA_REVIEW_THEN_ATTEST_IF_ACCEPTED"',
      '"REVIEW_R6_OR_ACTIVATE"',
    ),
    valid.replace('  "task_id"', ' "task_id"'),
  ])
    assert.equal(canonicalStageAState(mutation), false, mutation);
  for (const name of [
    "TASK-0001-stage-a-state-copy.json",
    "task-0001-STAGE-A-STATE-copy.json",
    "TASK0001-stage-a-state.json",
  ]) {
    const target = path.join(path.dirname(state), name);
    fs.copyFileSync(state, target);
    assert.notDeepEqual(
      (await validateClosureFormatting(root)).errors,
      [],
      name,
    );
    fs.rmSync(target);
  }
  const blob = execFileSync("git", ["hash-object", state], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  for (const [mode, object] of [
    ["120000", blob],
    ["160000", head],
    ["100755", blob],
  ]) {
    execFileSync(
      "git",
      [
        "update-index",
        "--add",
        "--cacheinfo",
        `${mode},${object},docs/governance/task-closures/TASK-0001-stage-a-state.json`,
      ],
      { cwd: root },
    );
    assert.notDeepEqual(
      (await validateClosureFormatting(root)).errors,
      [],
      mode,
    );
    execFileSync("git", ["reset", "--hard", "HEAD"], {
      cwd: root,
      stdio: "ignore",
    });
  }
});
