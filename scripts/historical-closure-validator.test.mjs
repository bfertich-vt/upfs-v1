import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { validateQueueDocument } from "./queue-validator.mjs";
import {
  exactAttestationDiff,
  structuredVerdictAttestation,
} from "./historical-closure-validator.mjs";

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

function blob(root, body) {
  return execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd: root,
    encoding: "utf8",
    input: body,
  }).trim();
}

function commitIndex(root, parent, entries, message, extraParents = []) {
  const index = path.join(
    os.tmpdir(),
    `upfs-closure-index-${process.pid}-${crypto.randomUUID()}`,
  );
  const environment = { ...process.env, GIT_INDEX_FILE: index };
  try {
    execFileSync("git", ["read-tree", parent], { cwd: root, env: environment });
    for (const entry of entries) {
      if (entry.remove)
        execFileSync("git", ["update-index", "--force-remove", entry.path], {
          cwd: root,
          env: environment,
        });
      else
        execFileSync(
          "git",
          [
            "update-index",
            "--add",
            "--cacheinfo",
            `${entry.mode},${entry.oid},${entry.path}`,
          ],
          { cwd: root, env: environment },
        );
    }
    const tree = execFileSync("git", ["write-tree"], {
      cwd: root,
      env: environment,
      encoding: "utf8",
    }).trim();
    return commitTree(root, tree, [parent, ...extraParents], message);
  } finally {
    fs.rmSync(index, { force: true });
  }
}

test("structured verdict attestation implements one closed canonical grammar", () => {
  const candidate = "a".repeat(40);
  const expected = { task_id: "TASK-0001", reviewed_candidate: candidate };
  const valid = `${JSON.stringify({ version: 1, task_id: "TASK-0001", reviewed_candidate: candidate, verdict: "ACCEPTED", reviewer_role: "Independent QA/Security" }, null, 2)}\n`;
  assert.equal(
    structuredVerdictAttestation(Buffer.from(valid), expected),
    true,
  );
  assert.equal(
    structuredVerdictAttestation(
      Buffer.from(valid.replaceAll("\n", "\r\n")),
      expected,
    ),
    true,
  );
  for (const body of [
    `\`\`\`json\n${valid}\`\`\`\n`,
    `> ${valid}`,
    `${valid}${valid}`,
    `${valid}prose`,
    valid.replace('"ACCEPTED"', '"REJECTED"'),
    valid.replace('"Independent QA/Security"', '"Supervisor"'),
    valid.replace('"TASK-0001"', '"TASK-0002"'),
    valid.replace(candidate, "b".repeat(40)),
    valid.replace('"version": 1', '"version": "1"'),
    valid.replace('  "verdict": "ACCEPTED",\n', ""),
    valid.replace(
      '  "verdict": "ACCEPTED",',
      '  "extra": true,\n  "verdict": "ACCEPTED",',
    ),
    `\ufeff${valid}`,
    `${valid}\u2028`,
    "not json\n",
  ]) {
    assert.equal(
      structuredVerdictAttestation(Buffer.from(body), expected),
      false,
      body,
    );
  }
  assert.equal(
    structuredVerdictAttestation(Buffer.from(valid), {
      ...expected,
      reviewed_candidate: "b".repeat(40),
    }),
    false,
  );
});

test("attestation whole-commit diff permits only one canonical addition", () => {
  const canonical = "docs/reviews/attestations/TASK-0001-closure-verdict.json";
  assert.equal(
    exactAttestationDiff(Buffer.from(`A\0${canonical}\0`), canonical),
    true,
  );
  for (const status of [
    `A\0${canonical}\0A\0unauthorized.txt\0`,
    `M\0${canonical}\0`,
    `D\0${canonical}\0`,
    `R100\0old.json\0${canonical}\0`,
    `C100\0old.json\0${canonical}\0`,
    `T\0${canonical}\0`,
    `A\0${canonical}\0M\0.gitmodules\0`,
    `A\0${canonical}\0A\0symlink\0`,
    "",
  ])
    assert.equal(
      exactAttestationDiff(Buffer.from(status), canonical),
      false,
      status,
    );
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
  const bridgeTree = execFileSync(
    "git",
    ["show", "-s", "--format=%T", "daeb6d9f4c04800e453ee92a91d8f69ef3138c3a"],
    { cwd: root, encoding: "utf8" },
  ).trim();
  const attestationParent = commitTree(
    root,
    bridgeTree,
    [
      "daeb6d9f4c04800e453ee92a91d8f69ef3138c3a",
      "ee01b09e3f86fd37461c4b98a05c41f54868a157",
    ],
    "fixture: join protected merge and QA history",
  );
  execFileSync("git", ["checkout", "--detach", attestationParent], {
    cwd: root,
    stdio: "ignore",
  });
  const stageReviewRel = "docs/reviews/TASK-0001-stage-a-fixture-QA.md";
  const stageReviewBody =
    "# Independent Stage A review\n\nFixture review evidence.\n";
  fs.mkdirSync(path.dirname(path.join(root, stageReviewRel)), {
    recursive: true,
  });
  fs.writeFileSync(path.join(root, stageReviewRel), stageReviewBody);
  execFileSync("git", ["add", stageReviewRel], { cwd: root });
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Independent QA",
      "-c",
      "user.email=qa@example.invalid",
      "commit",
      "-m",
      "qa: review Stage A fixture",
    ],
    { cwd: root, stdio: "ignore" },
  );
  const stageReviewCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const evidence =
    "docs/governance/task-closures/evidence/TASK-0001-validation-report.json";
  fs.mkdirSync(path.dirname(path.join(root, evidence)), { recursive: true });
  fs.copyFileSync(path.join(source, evidence), path.join(root, evidence));
  const closureRel = "docs/governance/task-closures/TASK-0001.json";
  fs.mkdirSync(path.dirname(path.join(root, closureRel)), { recursive: true });
  fs.copyFileSync(
    path.join(
      source,
      "docs/governance/task-closures/rejected/TASK-0001-r1.json",
    ),
    path.join(root, closureRel),
  );
  fs.copyFileSync(
    path.join(source, "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md"),
    path.join(root, "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md"),
  );

  const attestationRel =
    "docs/reviews/attestations/TASK-0001-closure-verdict.json";
  const attestationPath = path.join(root, attestationRel);
  fs.mkdirSync(path.dirname(attestationPath), { recursive: true });
  const attestationBody = `${JSON.stringify({ version: 1, task_id: "TASK-0001", reviewed_candidate: attestationParent, verdict: "ACCEPTED", reviewer_role: "Independent QA/Security" }, null, 2)}\n`;
  fs.writeFileSync(attestationPath, attestationBody);
  execFileSync("git", ["add", attestationRel], { cwd: root });
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Independent QA",
      "-c",
      "user.email=qa@example.invalid",
      "commit",
      "-m",
      "qa: attest TASK-0001 closure verdict",
    ],
    { cwd: root, stdio: "ignore" },
  );
  const attestationCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const attestationBlob = blob(root, attestationBody);
  const reviewBlob = blob(root, stageReviewBody);
  const unrelatedBlob = blob(root, "unauthorized payload\n");
  const maliciousReview = (extras, message) =>
    commitIndex(
      root,
      attestationParent,
      [{ mode: "100644", oid: reviewBlob, path: stageReviewRel }, ...extras],
      message,
    );
  const extraFileAttestation = commitIndex(
    root,
    stageReviewCommit,
    [
      { mode: "100644", oid: attestationBlob, path: attestationRel },
      { mode: "100644", oid: unrelatedBlob, path: "unauthorized-change.txt" },
    ],
    "qa: smuggle extra file",
  );
  const preseedReview = maliciousReview(
    [{ mode: "100644", oid: unrelatedBlob, path: attestationRel }],
    "qa: preseed attestation fixture",
  );
  const modifiedAttestation = commitIndex(
    root,
    preseedReview,
    [{ mode: "100644", oid: attestationBlob, path: attestationRel }],
    "qa: modify preseeded attestation",
  );
  const deletedAttestation = commitIndex(
    root,
    preseedReview,
    [{ remove: true, path: attestationRel }],
    "qa: delete preseeded attestation",
  );
  const sourceRel = "docs/reviews/attestations/source.json";
  const renameReview = maliciousReview(
    [{ mode: "100644", oid: attestationBlob, path: sourceRel }],
    "qa: add rename source fixture",
  );
  const renamedAttestation = commitIndex(
    root,
    renameReview,
    [
      { remove: true, path: sourceRel },
      { mode: "100644", oid: attestationBlob, path: attestationRel },
    ],
    "qa: rename into attestation path",
  );
  const copiedAttestation = commitIndex(
    root,
    renameReview,
    [{ mode: "100644", oid: attestationBlob, path: attestationRel }],
    "qa: copy into attestation path",
  );
  const symlinkAttestation = commitIndex(
    root,
    stageReviewCommit,
    [{ mode: "120000", oid: unrelatedBlob, path: attestationRel }],
    "qa: symlink attestation",
  );
  const gitlinkAttestation = commitIndex(
    root,
    stageReviewCommit,
    [{ mode: "160000", oid: attestationParent, path: attestationRel }],
    "qa: gitlink attestation",
  );
  const interposed = commitIndex(
    root,
    stageReviewCommit,
    [{ mode: "100644", oid: unrelatedBlob, path: "interposed.txt" }],
    "author: interposed ordinary commit",
  );
  const interposedAttestation = commitIndex(
    root,
    interposed,
    [{ mode: "100644", oid: attestationBlob, path: attestationRel }],
    "qa: attest after interposition",
  );
  const side = commitIndex(
    root,
    stageReviewCommit,
    [{ mode: "100644", oid: unrelatedBlob, path: "side.txt" }],
    "author: side commit",
  );
  const interposedMerge = commitIndex(
    root,
    stageReviewCommit,
    [],
    "author: interposed merge",
    [side],
  );
  const mergeInterposedAttestation = commitIndex(
    root,
    interposedMerge,
    [{ mode: "100644", oid: attestationBlob, path: attestationRel }],
    "qa: attest after merge interposition",
  );

  const queuePath = path.join(root, "tasks/queue.yaml");
  const closurePath = path.join(
    root,
    "docs/governance/task-closures/TASK-0001.json",
  );
  const matrixPath = path.join(root, "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md");
  const originalQueue = fs
    .readFileSync(queuePath, "utf8")
    .replace(/(  - id: TASK-0001[\s\S]*?\n    status:) blocked/, "$1 complete");
  fs.writeFileSync(queuePath, originalQueue);
  const originalMatrix = fs
    .readFileSync(matrixPath, "utf8")
    .split(/\r?\n/)
    .map((line) =>
      line.startsWith("| TASK-0001 |")
        ? line.replace("| blocked |", "| ACCEPTED |")
        : line,
    )
    .join("\n");
  fs.writeFileSync(matrixPath, originalMatrix);
  const originalClosure = JSON.parse(fs.readFileSync(closurePath, "utf8"));
  delete originalClosure.independent_qa.verdict;
  originalClosure.stage_a = {
    candidate_commit: attestationParent,
    review: stageReviewRel,
    review_sha256: crypto
      .createHash("sha256")
      .update(stageReviewBody)
      .digest("hex"),
    review_commit: stageReviewCommit,
    attestation: attestationRel,
    attestation_sha256: crypto
      .createHash("sha256")
      .update(attestationBody)
      .digest("hex"),
    attestation_commit: attestationCommit,
    attestation_parent: stageReviewCommit,
  };
  const writeClosure = (value) =>
    fs.writeFileSync(closurePath, `${JSON.stringify(value, null, 2)}\n`);
  writeClosure(originalClosure);
  const mutate = (callback, pattern, queue = originalQueue) => {
    const record = structuredClone(originalClosure);
    callback(record);
    writeClosure(record);
    expectInvalid(root, queue, pattern);
    writeClosure(originalClosure);
  };
  const mutateStageTopology = (
    reviewCommit,
    attestationParentCommit,
    attestationCommitValue,
    pattern,
  ) =>
    mutate((record) => {
      record.stage_a.review_commit = reviewCommit;
      record.stage_a.attestation_parent = attestationParentCommit;
      record.stage_a.attestation_commit = attestationCommitValue;
    }, pattern);

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
    record.hosted.head_sha = record.independent_qa.review_commit;
    record.hosted.checks.forEach((check) => {
      check.head_sha = record.hosted.head_sha;
    });
  }, /remediation ancestry/);
  mutate((record) => {
    record.stage_a.candidate_commit = record.remediation.candidate_commit;
  }, /review_commit must have the exact reviewed candidate as its sole parent/);
  mutate((record) => {
    record.stage_a.attestation_parent = record.stage_a.candidate_commit;
  }, /attestation_parent must equal review_commit exactly/);
  mutate((record) => {
    record.stage_a.attestation_sha256 = "a".repeat(64);
  }, /stale or incorrect SHA-256/);
  mutate((record) => {
    record.stage_a.candidate_commit = record.remediation.candidate_commit;
  }, /exact reviewed candidate as its sole parent|exact canonical ACCEPTED structure/);
  mutate((record) => {
    record.independent_qa.reviewed_candidate = record.stage_a.candidate_commit;
  }, /reviewed_candidate must equal remediation\.candidate_commit/);
  mutateStageTopology(
    stageReviewCommit,
    stageReviewCommit,
    extraFileAttestation,
    /exactly one added canonical attestation/,
  );
  mutateStageTopology(
    preseedReview,
    preseedReview,
    modifiedAttestation,
    /must not be pre-seeded|exactly one added canonical attestation/,
  );
  mutateStageTopology(
    preseedReview,
    preseedReview,
    deletedAttestation,
    /must not be pre-seeded|exactly one added canonical attestation|stale or incorrect SHA-256/,
  );
  mutateStageTopology(
    renameReview,
    renameReview,
    renamedAttestation,
    /exactly one added canonical attestation/,
  );
  mutateStageTopology(
    renameReview,
    renameReview,
    copiedAttestation,
    /exactly one added canonical attestation/,
  );
  mutateStageTopology(
    stageReviewCommit,
    stageReviewCommit,
    symlinkAttestation,
    /regular blob|exact canonical ACCEPTED structure/,
  );
  mutateStageTopology(
    stageReviewCommit,
    stageReviewCommit,
    gitlinkAttestation,
    /regular blob|exact canonical ACCEPTED structure/,
  );
  mutateStageTopology(
    stageReviewCommit,
    interposed,
    interposedAttestation,
    /attestation_parent must equal review_commit exactly/,
  );
  mutateStageTopology(
    stageReviewCommit,
    interposedMerge,
    mergeInterposedAttestation,
    /attestation_parent must equal review_commit exactly/,
  );
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
  const invalidIncompleteDisposition = originalMatrix
    .split(/\r?\n/)
    .map((line) =>
      line.startsWith("| TASK-0002 |")
        ? line.replace("| REMEDIATION_REQUIRED |", "| blocked |")
        : line,
    )
    .join("\n");
  fs.writeFileSync(matrixPath, invalidIncompleteDisposition);
  expectInvalid(
    root,
    originalQueue,
    /TASK-0002 must use an audited incomplete disposition/,
  );
  fs.writeFileSync(
    matrixPath,
    invalidIncompleteDisposition.replace(
      /^\| TASK-0002 \|.*$/m,
      originalMatrix
        .split(/\r?\n/)
        .find((line) => line.startsWith("| TASK-0002 |"))
        .replace("| REMEDIATION_REQUIRED |", "| ACCEPTED |"),
    ),
  );
  expectInvalid(
    root,
    originalQueue,
    /TASK-0002 must use an audited incomplete disposition/,
  );
  fs.writeFileSync(matrixPath, originalMatrix);
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
