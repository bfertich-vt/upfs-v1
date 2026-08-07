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

test("TASK-0001 R12 batches ADS checks across closure-authorizing scope", async () => {
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
    "r12",
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
    valid.replace('-R12"', '-R11"'),
    valid.replace('"REJECTED"', '"ACCEPTED"'),
    valid.replace('"absent"', '"issued"'),
    valid.replace('"R12_HANDOFF_CANDIDATE"', '"R11_HANDOFF_CANDIDATE"'),
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
  const nested = path.join(root, "docs/alternate/TASK-0001-stage-a-state.json");
  fs.mkdirSync(path.dirname(nested), { recursive: true });
  fs.copyFileSync(state, nested);
  assert.notDeepEqual(
    (await validateClosureFormatting(root)).errors,
    [],
    "nested duplicate",
  );
  fs.rmSync(nested);
  for (const rel of [
    "node_modules/TASK-0001-stage-a-state.json",
    "dist/TASK-0001-stage-a-state.json",
    "build/TASK-0001-stage-a-state.json",
    "coverage/TASK-0001-stage-a-state.json",
    ".next/TASK-0001-stage-a-state.json",
    "docs/alternate/TASK-0001-stage-а-state.json",
    "docs/alternate/TASK-0001-stαge-a-state.json",
    "docs/alternate/ＴＡＳＫ-０００１-stage-a-state.json",
    "docs/évidence/TASK-0001-state.json",
    "docs/alternate/TАSK-0001-stаge-a-stаte.json",
    "docs/alternate/TA\u0301SK-0001-stage-a-state.json",
    "docs/alternate/TASK-0001-stage-a-state\u200b.json",
  ]) {
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "x");
    assert.notDeepEqual(
      (await validateClosureFormatting(root)).errors,
      [],
      rel,
    );
    fs.rmSync(target);
  }
  const hardlink = path.join(root, "hardlink-alias.json");
  fs.linkSync(state, hardlink);
  assert.notDeepEqual(
    (await validateClosureFormatting(root)).errors,
    [],
    "hardlink nlink",
  );
  fs.rmSync(hardlink);
  if (process.platform === "win32") {
    for (const stream of [
      "Zone.Identifier",
      "TASK-0001-stage-a-state.json",
      "conflict stream & name",
    ]) {
      fs.writeFileSync(`${state}:${stream}`, '{"task_status":"complete"}\n');
      assert.notDeepEqual(
        (await validateClosureFormatting(root)).errors,
        [],
        stream,
      );
      fs.rmSync(`${state}:${stream}`);
    }
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
  const badBlob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd: root,
    input: "{}\n",
    encoding: "utf8",
  }).trim();
  execFileSync(
    "git",
    [
      "update-index",
      "--cacheinfo",
      `100644,${badBlob},docs/governance/task-closures/TASK-0001-stage-a-state.json`,
    ],
    { cwd: root },
  );
  assert.notDeepEqual(
    (await validateClosureFormatting(root)).errors,
    [],
    "split index/worktree",
  );
  execFileSync("git", ["reset", "--hard", "HEAD"], {
    cwd: root,
    stdio: "ignore",
  });
  fs.writeFileSync(state, "{}\n");
  assert.notDeepEqual(
    (await validateClosureFormatting(root)).errors,
    [],
    "dirty worktree",
  );
  execFileSync("git", ["reset", "--hard", "HEAD"], {
    cwd: root,
    stdio: "ignore",
  });
  execFileSync("git", ["rm", "--cached", state], {
    cwd: root,
    stdio: "ignore",
  });
  execFileSync("git", ["add", "-N", state], { cwd: root });
  assert.notDeepEqual(
    (await validateClosureFormatting(root)).errors,
    [],
    "intent-to-add",
  );
});
