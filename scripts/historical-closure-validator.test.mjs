import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { validateQueueDocument } from "./queue-validator.mjs";
import { acceptedVerdict } from "./historical-closure-validator.mjs";

function expectInvalid(root, queue, pattern) {
  assert.throws(() => validateQueueDocument(queue, root), pattern);
}

function commitTree(root, tree, parents, message) {
  return execFileSync(
    "git",
    ["commit-tree", tree, ...parents.flatMap((parent) => ["-p", parent])],
    {
      cwd: root,
      encoding: "utf8",
      input: `${message}\n`,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "Closure fixture",
        GIT_AUTHOR_EMAIL: "closure@example.invalid",
        GIT_COMMITTER_NAME: "Closure fixture",
        GIT_COMMITTER_EMAIL: "closure@example.invalid",
        GIT_AUTHOR_DATE: "2026-08-07T04:00:00Z",
        GIT_COMMITTER_DATE: "2026-08-07T04:00:00Z",
      },
    },
  ).trim();
}

test("accepted verdict parser implements one closed canonical grammar", () => {
  const candidate = "a".repeat(40);
  const valid = `**Verdict: ACCEPTED** for exact candidate \`${candidate}\`.`;
  assert.equal(acceptedVerdict(valid, candidate), true);
  for (const body of [
    `${valid}, but this candidate is not accepted.`,
    `${valid}; approval is denied.`,
    `${valid}\nThis review rejects the candidate.`,
    `${valid}\n**Verdict: REJECTED** for exact candidate \`${candidate}\`.`,
    `${valid}\n${valid}`,
    `**verdict: ACCEPTED** for exact candidate \`${candidate}\`.`,
    `**Verdict: accepted** for exact candidate \`${candidate}\`.`,
    ` **Verdict: ACCEPTED** for exact candidate \`${candidate}\`.`,
    `**Verdict:  ACCEPTED** for exact candidate \`${candidate}\`.`,
    `**Verdict: ACCEPTED** for exact candidate \`${candidate}\`. `,
    `**Verdict: ACCEPTED** for exact candidate \`${"b".repeat(40)}\`.`,
    `**Verdict: ACCEPTED**\nfor exact candidate \`${candidate}\`.`,
    `**Verdict: ACCEPTED** for exact candidate \`${candidate}\`.\nPreamble marker: **Verdict: ACCEPTED**`,
    `${valid}\n**REJECTED**`,
    `${valid}\nAcceptance is denied.`,
    `${valid}\nThe exact candidate is rejected.`,
  ]) {
    assert.equal(acceptedVerdict(body, candidate), false, body);
  }
  assert.equal(acceptedVerdict(valid, "b".repeat(40)), false);
});

test("TASK-0001 accepted closure passes and all evidence substitutions fail closed", (t) => {
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
  }, /review_commit must be distinct/);
  mutate((record) => {
    record.independent_qa.reviewed_candidate =
      "eb74aeb64aecf5289590260f929445eaf96616ea";
  }, /reviewed_candidate must equal remediation\.candidate_commit/);

  const candidateTree = execFileSync(
    "git",
    ["show", "-s", "--format=%T", "a408443dc7fc866777f83de681ec7688ac35e1ff"],
    { cwd: root, encoding: "utf8" },
  ).trim();
  const reviewTree = execFileSync(
    "git",
    ["show", "-s", "--format=%T", "ee01b09e3f86fd37461c4b98a05c41f54868a157"],
    { cwd: root, encoding: "utf8" },
  ).trim();
  const intermediary = commitTree(
    root,
    candidateTree,
    ["a408443dc7fc866777f83de681ec7688ac35e1ff"],
    "intermediary",
  );
  const nonDirectReview = commitTree(
    root,
    reviewTree,
    [intermediary],
    "qa: delayed review",
  );
  mutate((record) => {
    record.independent_qa.review_commit = nonDirectReview;
    record.hosted.head_sha = nonDirectReview;
    record.hosted.checks.forEach((check) => {
      check.head_sha = nonDirectReview;
    });
  }, /exact reviewed candidate as its sole parent/);

  const preseedCandidate = commitTree(
    root,
    reviewTree,
    ["a408443dc7fc866777f83de681ec7688ac35e1ff"],
    "preseed review",
  );
  const emptyReview = commitTree(
    root,
    reviewTree,
    [preseedCandidate],
    "qa: empty review commit",
  );
  mutate((record) => {
    record.remediation.candidate_commit = preseedCandidate;
    record.independent_qa.reviewed_candidate = preseedCandidate;
    record.independent_qa.review_commit = emptyReview;
    record.hosted.head_sha = emptyReview;
    record.hosted.checks.forEach((check) => {
      check.head_sha = emptyReview;
    });
  }, /review artifact must not be pre-seeded/);

  mutate((record) => {
    record.remediation.candidate_commit =
      "9203e1bf014e9c121e52a7dfcd3815ba8cc12446";
    record.independent_qa.reviewed_candidate =
      "9203e1bf014e9c121e52a7dfcd3815ba8cc12446";
    record.independent_qa.review_commit =
      "42186a5aa562ba2af872c625e42210b8b3926808";
    record.independent_qa.review =
      "docs/reviews/RECOVERY-TASK-0001-CLOSURE-002-QA.md";
    record.independent_qa.review_sha256 =
      "8b79a979a5b1efa38f5a3235d892956ef1bc573db099552bf2dec3886ab9c5f7";
    record.independent_qa.verdict = "ACCEPTED";
    record.hosted.head_sha = record.independent_qa.review_commit;
    record.hosted.checks.forEach((check) => {
      check.head_sha = record.hosted.head_sha;
    });
  }, /explicit ACCEPTED verdict/);
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
    record.hosted.checks[0].run_id = 0;
  }, /numeric IDs, exact head, and success/);
  mutate((record) => {
    record.hosted.checks[0].job_id = -1;
  }, /numeric IDs, exact head, and success/);
  mutate((record) => {
    record.hosted.checks[1].run_id = record.hosted.checks[0].run_id;
  }, /uniquely bind repository-validation and repository-security run\/job IDs/);
  mutate((record) => {
    record.hosted.checks[1].job_id = record.hosted.checks[0].job_id;
  }, /uniquely bind repository-validation and repository-security run\/job IDs/);
  mutate((record) => {
    record.hosted.validation_artifact.content_sha256 = "a".repeat(64);
  }, /stale or incorrect SHA-256/);
  mutate((record) => {
    record.hosted.validation_artifact.archive_digest = "sha256:forged";
  }, /inspected passed artifact/);
  mutate((record) => {
    record.hosted.validation_artifact.artifact_id = -1;
  }, /inspected passed artifact/);
  mutate((record) => {
    record.protected_merge.commit = record.remediation.candidate_commit;
  }, /protected_merge does not bind/);
  mutate((record) => {
    record.protected_merge.merged_at = "2026-99-99Trash";
  }, /protected_merge does not bind/);
  mutate((record) => {
    record.protected_merge.merged_at = "2026-08-07T03:07:44+00:00";
  }, /protected_merge does not bind/);
  const wrongPrCommit = commitTree(
    root,
    reviewTree,
    ["6dcd1860b874acb46a574f9a50762d2e97936770"],
    "RECOVERY: misleading token (#150)",
  );
  mutate((record) => {
    record.protected_merge.commit = wrongPrCommit;
  }, /subject does not bind its PR/);
  mutate((record) => {
    record.acceptance_mapping.pop();
  }, /map every queue criterion exactly once/);
  mutate((record) => {
    record.acceptance_mapping[0].evidence[0].excerpt = "fabricated excerpt";
  }, /unique, criterion-specific, and bound to the accepted QA review/);
  mutate((record) => {
    record.acceptance_mapping[0].evidence[0] = {
      artifact: "docs/handoffs/TASK-0001.md",
      artifact_sha256:
        "73551a37afe0451f9cd370d5b67a2f812d784ddbbd89e62cd05ba974081bbc80",
      commit: "8099cf2ebbc8bf14a480e03dd32715622fff3000",
      excerpt: "# Handoff report",
    };
  }, /unique, criterion-specific, and bound to the accepted QA review/);
  mutate((record) => {
    record.acceptance_mapping[0].evidence[0].excerpt =
      record.acceptance_mapping[1].evidence[0].excerpt;
  }, /unique, criterion-specific, and bound to the accepted QA review/);
  mutate((record) => {
    record.acceptance_mapping[1].evidence[0] = structuredClone(
      record.acceptance_mapping[0].evidence[0],
    );
  }, /unique, criterion-specific, and bound to the accepted QA review/);
  mutate((record) => {
    record.acceptance_mapping[0].evidence[0].artifact =
      "docs/reviews/RECOVERY-TASK-0001-REVALIDATION-001-QA.md";
    record.acceptance_mapping[0].evidence[0].artifact_sha256 =
      "d41d8cd98f00b204e9800998ecf8427e00000000000000000000000000000000";
    record.acceptance_mapping[0].evidence[0].commit =
      "eb74aeb64aecf5289590260f929445eaf96616ea";
  }, /bound to the accepted QA review|stale or incorrect immutable SHA-256/);
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

  mutate((record) => {
    record.extra = true;
  }, /must contain exactly/);
  mutate((record) => {
    record.task_id = "TASK-0002";
  }, /must bind version 1, TASK-0001, and ACCEPTED/);
  mutate((record) => {
    record.hosted.validation_artifact.content = "../outside.json";
  }, /contained repository-relative path/);

  const outside = fs.mkdtempSync(
    path.join(os.tmpdir(), "upfs-closure-outside-"),
  );
  const outsideFile = path.join(outside, "validation.json");
  const link = path.join(
    root,
    "docs/governance/task-closures/evidence/linked.json",
  );
  fs.writeFileSync(outsideFile, '{"status":"passed"}\n');
  try {
    fs.symlinkSync(outsideFile, link, "file");
    mutate((record) => {
      record.hosted.validation_artifact.content =
        "docs/governance/task-closures/evidence/linked.json";
      record.hosted.validation_artifact.content_sha256 =
        "f6ef92e0d2319c498cd00a6058fc400f70c8bf9dbbd52f89974235a17af6b59d";
    }, /cannot be resolved as a contained regular file/);
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code))
      t.diagnostic(`symlink mutation unavailable: ${error.code}`);
    else throw error;
  }
});
