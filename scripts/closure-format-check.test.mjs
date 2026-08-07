import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateClosureFormatting } from "./closure-format-check.mjs";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "upfs-closure-format-"));
  for (const rel of [
    "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md",
    "scripts/queue-validator.mjs",
    "docs/governance/task-closures/rejected/TASK-0001-r1.json",
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

test("TASK-0001 matrix binds the current R6 round without predecessor or attestation drift", async () => {
  const root = fixture();
  const matrix = path.join(root, "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md");
  const original = fs.readFileSync(matrix, "utf8");
  for (const [from, to, pattern] of [
    [
      "RECOVERY-TASK-0001-CLOSURE-002-R6.yaml",
      "RECOVERY-TASK-0001-CLOSURE-002-R5.yaml",
      /current R6/,
    ],
    [
      "exact R6 candidate recorded by the R6 handoff",
      "review r5",
      /rejected predecessor|current R6/,
    ],
    [
      "no structured attestation has yet been issued",
      "structured attestation has been issued",
      /attestation state/,
    ],
    ["| blocked |", "| ACCEPTED |", /blocked\/attestation state/],
  ]) {
    fs.writeFileSync(matrix, original.replaceAll(from, to));
    assert.ok(
      (await validateClosureFormatting(root)).errors.some((error) =>
        pattern.test(error),
      ),
      `${from} -> ${to}`,
    );
  }
});
