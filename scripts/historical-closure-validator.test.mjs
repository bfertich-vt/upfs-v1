import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { validateQueueDocument } from "./queue-validator.mjs";

function expectInvalid(root, queue, pattern) {
  assert.throws(() => validateQueueDocument(queue, root), pattern);
}

test("TASK-0001 accepted closure passes and all evidence substitutions fail closed", () => {
  const source = process.cwd();
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "upfs-task-0001-closure-"),
  );
  execFileSync("git", ["clone", "--shared", "--no-checkout", source, root], {
    stdio: "ignore",
  });
  execFileSync(
    "git",
    ["checkout", "--detach", "daeb6d9f4c04800e453ee92a91d8f69ef3138c3a"],
    { cwd: root, stdio: "ignore" },
  );
  const copied = [
    "tasks/queue.yaml",
    "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md",
    "docs/governance/task-closures/TASK-0001.json",
    "docs/governance/task-closures/evidence/TASK-0001-validation-report.json",
  ];
  for (const rel of copied) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.copyFileSync(path.join(source, rel), path.join(root, rel));
  }

  const queuePath = path.join(root, "tasks/queue.yaml");
  const closurePath = path.join(
    root,
    "docs/governance/task-closures/TASK-0001.json",
  );
  const matrixPath = path.join(root, "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md");
  const originalQueue = fs.readFileSync(queuePath, "utf8");
  const originalMatrix = fs.readFileSync(matrixPath, "utf8");
  const originalClosure = JSON.parse(fs.readFileSync(closurePath, "utf8"));
  const writeClosure = (value) =>
    fs.writeFileSync(closurePath, `${JSON.stringify(value, null, 2)}\n`);
  const mutate = (callback, pattern, queue = originalQueue) => {
    const record = structuredClone(originalClosure);
    callback(record);
    writeClosure(record);
    expectInvalid(root, queue, pattern);
    writeClosure(originalClosure);
  };

  assert.deepEqual(validateQueueDocument(originalQueue, root), {
    state: "active",
    tasks: 123,
  });

  fs.rmSync(closurePath);
  expectInvalid(root, originalQueue, /TASK-0001\.json cannot be resolved/);
  writeClosure(originalClosure);
  mutate((record) => {
    record.historical.artifact_sha256 = "a".repeat(64);
  }, /does not preserve the immutable queue evidence/);
  mutate((record) => {
    record.remediation.implementation_commit = "a".repeat(40);
  }, /cannot be verified from repository Git objects/);
  mutate((record) => {
    record.remediation.implementation_commit =
      record.independent_qa.review_commit;
  }, /remediation ancestry cannot be verified/);
  mutate((record) => {
    record.independent_qa.review_commit = record.remediation.candidate_commit;
  }, /cannot be verified from repository Git objects/);
  mutate((record) => {
    record.independent_qa.verdict = "REJECTED";
  }, /explicit ACCEPTED verdict/);
  mutate((record) => {
    record.hosted.pull_request = 999;
  }, /protected_merge does not bind/);
  mutate((record) => {
    record.hosted.head_sha = record.remediation.candidate_commit;
  }, /invalid repository, PR, boundary, or exact-head/);
  mutate((record) => {
    record.hosted.checks[0].head_sha = "a".repeat(40);
  }, /numeric IDs, exact head, and success/);
  mutate((record) => {
    record.hosted.checks[1].name = "repository-validation";
  }, /uniquely bind repository-validation and repository-security/);
  mutate((record) => {
    record.hosted.checks[1].conclusion = "failure";
  }, /numeric IDs, exact head, and success/);
  mutate((record) => {
    record.hosted.validation_artifact.content_sha256 = "a".repeat(64);
  }, /stale or incorrect SHA-256/);
  mutate((record) => {
    record.hosted.validation_artifact.archive_digest = "sha256:forged";
  }, /inspected passed artifact/);
  mutate((record) => {
    record.protected_merge.commit = record.remediation.candidate_commit;
  }, /protected_merge does not bind/);
  mutate((record) => {
    record.acceptance_mapping.pop();
  }, /map every queue criterion exactly once/);
  mutate((record) => {
    record.acceptance_mapping[0].evidence[0].excerpt = "fabricated excerpt";
  }, /missing or stale excerpt/);
  mutate((record) => {
    record.dependencies = ["TASK-0002"];
  }, /dependencies must exactly match the queue/);

  const incompleteDependencyQueue = originalQueue.replace(
    /(id: TASK-0001[\s\S]*?dependencies:) \[\]/,
    "$1 [TASK-0002]",
  );
  mutate(
    (record) => {
      record.dependencies = ["TASK-0002"];
    },
    /cannot accept before dependency TASK-0002 is complete/,
    incompleteDependencyQueue,
  );

  fs.writeFileSync(
    matrixPath,
    originalMatrix.replace(/\|\s*ACCEPTED\s*\|/, "| blocked |"),
  );
  expectInvalid(root, originalQueue, /TASK-0001 disposition must be ACCEPTED/);
  fs.writeFileSync(matrixPath, originalMatrix);
  const blockedQueue = originalQueue.replace(
    /(id: TASK-0001[\s\S]*?status:) complete/,
    "$1 blocked",
  );
  expectInvalid(
    root,
    blockedQueue,
    /TASK-0001 has a closure record but is not complete/,
  );
  const otherComplete = originalQueue.replace(
    /(id: TASK-0002[\s\S]*?status:) blocked/,
    "$1 complete",
  );
  expectInvalid(root, otherComplete, /TASK-0002\.json cannot be resolved/);
});
