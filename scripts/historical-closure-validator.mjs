import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const MATRIX = "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md";
const DIRECTORY = "docs/governance/task-closures";
const SHA40 = /^[a-f0-9]{40}$/;
const SHA64 = /^[a-f0-9]{64}$/;

const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const digest = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");
const inside = (root, target) =>
  target === root || target.startsWith(`${root}${path.sep}`);
const positiveSafeInteger = (value) => Number.isSafeInteger(value) && value > 0;

function canonicalRfc3339(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/.test(
      value,
    )
  )
    return false;
  const parsed = new Date(value);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().replace(".000Z", "Z") === value
  );
}

function safePath(root, rel, label, errors) {
  if (
    typeof rel !== "string" ||
    !rel ||
    path.isAbsolute(rel) ||
    rel.replace(/\\/g, "/").split("/").includes("..")
  ) {
    errors.push(`${label} must be a contained repository-relative path.`);
    return null;
  }
  const target = path.resolve(root, rel);
  try {
    const realRoot = fs.realpathSync.native(root);
    const realTarget = fs.realpathSync.native(target);
    if (!inside(realRoot, realTarget) || !fs.statSync(realTarget).isFile())
      throw new Error("unsafe");
    return realTarget;
  } catch {
    errors.push(`${label} cannot be resolved as a contained regular file.`);
    return null;
  }
}

function fileBytes(root, rel, expected, label, errors) {
  const target = safePath(root, rel, label, errors);
  if (!target) return null;
  const bytes = fs.readFileSync(target);
  if (!SHA64.test(expected || "") || digest(bytes) !== expected)
    errors.push(`${label} has a stale or incorrect SHA-256.`);
  return bytes;
}

function git(root, args, label, errors, binary = false) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: binary ? null : "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    errors.push(`${label} cannot be verified from repository Git objects.`);
    return null;
  }
}

function commitExists(root, value, label, errors) {
  if (!SHA40.test(value || "")) {
    errors.push(`${label} must be a 40-character commit SHA.`);
    return false;
  }
  const type = git(
    root,
    ["cat-file", "-t", `${value}^{commit}`],
    label,
    errors,
  );
  if (type !== null && type.trim() !== "commit") {
    errors.push(`${label} must resolve to a commit.`);
    return false;
  }
  return type !== null;
}

function immutableBytes(root, rel, commit, expected, label, errors) {
  if (!commitExists(root, commit, `${label}.commit`, errors)) return null;
  const safe =
    typeof rel === "string" &&
    rel &&
    !path.isAbsolute(rel) &&
    !rel.replace(/\\/g, "/").split("/").includes("..");
  if (!safe) {
    errors.push(
      `${label}.artifact must be a contained repository-relative path.`,
    );
    return null;
  }
  const bytes = git(
    root,
    ["show", `${commit}:${rel.replace(/\\/g, "/")}`],
    label,
    errors,
    true,
  );
  if (bytes && (!SHA64.test(expected || "") || digest(bytes) !== expected))
    errors.push(`${label} has a stale or incorrect immutable SHA-256.`);
  return bytes;
}

function ancestor(root, older, newer, label, errors) {
  const resolvedNewer =
    newer === "HEAD"
      ? git(root, ["rev-parse", "HEAD"], `${label}.descendant`, errors)?.trim()
      : newer;
  if (
    !commitExists(root, older, `${label}.ancestor`, errors) ||
    !commitExists(root, resolvedNewer, `${label}.descendant`, errors)
  )
    return;
  git(
    root,
    ["merge-base", "--is-ancestor", older, resolvedNewer],
    label,
    errors,
  );
}

function strictReviewTopology(root, qa, remediation, label, errors) {
  if (qa.reviewed_candidate !== remediation.candidate_commit) {
    errors.push(
      `${label} reviewed_candidate must equal remediation.candidate_commit.`,
    );
    return;
  }
  if (qa.review_commit === qa.reviewed_candidate) {
    errors.push(`${label} review_commit must be distinct from the candidate.`);
    return;
  }
  if (
    !commitExists(root, qa.reviewed_candidate, `${label}.candidate`, errors) ||
    !commitExists(root, qa.review_commit, `${label}.review_commit`, errors)
  )
    return;
  const parents = git(
    root,
    ["show", "-s", "--format=%P", qa.review_commit],
    `${label}.parents`,
    errors,
  )
    ?.trim()
    .split(/\s+/);
  if (parents?.length !== 1 || parents[0] !== qa.reviewed_candidate)
    errors.push(
      `${label} review_commit must have the exact reviewed candidate as its sole parent.`,
    );
  const before = git(
    root,
    ["cat-file", "-e", `${qa.reviewed_candidate}:${qa.review}`],
    `${label}.preseed probe`,
    [],
    true,
  );
  if (before !== null)
    errors.push(
      `${label} review artifact must not be pre-seeded in the candidate.`,
    );
  const introduced = git(
    root,
    [
      "diff-tree",
      "--no-commit-id",
      "--name-status",
      "-r",
      qa.review_commit,
      "--",
      qa.review,
    ],
    `${label}.introduction`,
    errors,
  )?.trim();
  if (introduced !== `A\t${qa.review}`)
    errors.push(
      `${label} review artifact must be introduced at review_commit.`,
    );
}

export function structuredVerdictAttestation(bytes, expected) {
  if (!Buffer.isBuffer(bytes) || !object(expected)) return false;
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  )
    return false;
  let body;
  try {
    body = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return false;
  }
  body = body.replace(/\r\n/g, "\n");
  const value = {
    version: 1,
    task_id: expected.task_id,
    reviewed_candidate: expected.reviewed_candidate,
    verdict: "ACCEPTED",
    reviewer_role: "Independent QA/Security",
  };
  if (
    !/^TASK-\d{4}$/.test(value.task_id || "") ||
    !SHA40.test(value.reviewed_candidate || "")
  )
    return false;
  return body === `${JSON.stringify(value, null, 2)}\n`;
}

function strictAttestationTopology(root, qa, taskId, label, errors) {
  const canonical = `docs/reviews/attestations/${taskId}-closure-verdict.json`;
  if (qa.attestation !== canonical)
    errors.push(`${label}.attestation must use the canonical task path.`);
  if (
    qa.attestation_commit === qa.attestation_parent ||
    qa.attestation_commit === qa.review_commit
  )
    errors.push(
      `${label}.attestation_commit must be a distinct review commit.`,
    );
  if (
    !commitExists(
      root,
      qa.attestation_parent,
      `${label}.attestation_parent`,
      errors,
    ) ||
    !commitExists(
      root,
      qa.attestation_commit,
      `${label}.attestation_commit`,
      errors,
    )
  )
    return;
  if (qa.attestation_parent !== qa.review_commit)
    errors.push(
      `${label}.attestation_parent must equal review_commit exactly.`,
    );
  const parents = git(
    root,
    ["show", "-s", "--format=%P", qa.attestation_commit],
    `${label}.attestation parents`,
    errors,
  )
    ?.trim()
    .split(/\s+/);
  if (parents?.length !== 1 || parents[0] !== qa.attestation_parent)
    errors.push(
      `${label}.attestation_commit must have attestation_parent as its sole parent.`,
    );
  const before = git(
    root,
    ["cat-file", "-e", `${qa.attestation_parent}:${qa.attestation}`],
    `${label}.attestation preseed probe`,
    [],
    true,
  );
  if (before !== null)
    errors.push(`${label}.attestation must not be pre-seeded.`);
  const introduced = git(
    root,
    [
      "diff-tree",
      "--no-commit-id",
      "--name-status",
      "-z",
      "--find-renames",
      "--find-copies",
      "--find-copies-harder",
      "-r",
      qa.attestation_commit,
    ],
    `${label}.attestation introduction`,
    errors,
    true,
  );
  if (!exactAttestationDiff(introduced, canonical))
    errors.push(
      `${label}.attestation commit diff must contain exactly one added canonical attestation.`,
    );
  const entry = git(
    root,
    ["ls-tree", "-z", qa.attestation_commit, "--", canonical],
    `${label}.attestation tree entry`,
    errors,
    true,
  );
  const entryPattern = new RegExp(
    `^100(?:644|755) blob [a-f0-9]{40}\\t${canonical.replaceAll("/", "\\/")}\\u0000$`,
  );
  if (!entryPattern.test(entry?.toString("utf8") || ""))
    errors.push(
      `${label}.attestation must be a regular blob at the canonical path.`,
    );
}

export function exactAttestationDiff(status, canonical) {
  return (
    Buffer.isBuffer(status) &&
    status.equals(Buffer.from(`A\0${canonical}\0`, "utf8"))
  );
}

function criterionEvidenceCell(body, criterion) {
  const prefix = `| ${criterion} |`;
  const row = body.split(/\r?\n/).find((line) => line.startsWith(prefix));
  if (!row) return "";
  const fields = row
    .slice(1, -1)
    .split("|")
    .map((value) => value.trim());
  return fields.length === 3 && fields[0] === criterion ? fields[1] : "";
}

function exact(value, keys, label, errors) {
  if (!object(value)) {
    errors.push(`${label} must be an object.`);
    return false;
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    errors.push(`${label} must contain exactly: ${expected.join(", ")}.`);
    return false;
  }
  return true;
}

function matrixRows(root, errors) {
  const file = safePath(root, MATRIX, MATRIX, errors);
  const rows = new Map();
  if (!file) return rows;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!/^\| TASK-\d{4} \|/.test(line)) continue;
    const fields = line
      .slice(1, -1)
      .split("|")
      .map((value) => value.trim());
    if (fields.length !== 18)
      errors.push(
        `${MATRIX} ${fields[0] || "row"} must have exactly 18 fields.`,
      );
    else if (rows.has(fields[0]))
      errors.push(`${MATRIX} duplicates ${fields[0]}.`);
    else rows.set(fields[0], fields);
  }
  return rows;
}

function validateAccepted(root, task, tasks, row, errors) {
  const rel = `${DIRECTORY}/${task.id}.json`;
  const file = safePath(root, rel, rel, errors);
  if (!file) return;
  let record;
  try {
    record = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    errors.push(`${rel} must contain valid JSON.`);
    return;
  }
  if (
    !exact(
      record,
      [
        "version",
        "task_id",
        "disposition",
        "historical",
        "remediation",
        "independent_qa",
        "stage_a",
        "hosted",
        "protected_merge",
        "acceptance_mapping",
        "dependencies",
        "limitations",
      ],
      rel,
      errors,
    )
  )
    return;
  if (
    record.version !== 1 ||
    record.task_id !== task.id ||
    record.disposition !== "ACCEPTED"
  )
    errors.push(`${rel} must bind version 1, ${task.id}, and ACCEPTED.`);

  const historicalKeys = [
    "classification",
    "artifact",
    "artifact_sha256",
    "artifact_commit",
    "evidence_excerpt",
  ];
  if (exact(record.historical, historicalKeys, `${rel}.historical`, errors)) {
    const expected = {
      classification: task.classification,
      ...task.historical_evidence,
    };
    for (const key of historicalKeys)
      if (record.historical[key] !== expected[key])
        errors.push(
          `${rel}.historical.${key} does not preserve the immutable queue evidence.`,
        );
  }

  const remediation = record.remediation;
  if (
    exact(
      remediation,
      [
        "task",
        "task_sha256",
        "handoff",
        "handoff_sha256",
        "implementation_commit",
        "candidate_commit",
      ],
      `${rel}.remediation`,
      errors,
    )
  ) {
    const taskBytes = fileBytes(
      root,
      remediation.task,
      remediation.task_sha256,
      `${rel}.remediation.task`,
      errors,
    );
    const handoffBytes = fileBytes(
      root,
      remediation.handoff,
      remediation.handoff_sha256,
      `${rel}.remediation.handoff`,
      errors,
    );
    const immutableTask = immutableBytes(
      root,
      remediation.task,
      remediation.candidate_commit,
      remediation.task_sha256,
      `${rel}.remediation.task`,
      errors,
    );
    const immutableHandoff = immutableBytes(
      root,
      remediation.handoff,
      remediation.candidate_commit,
      remediation.handoff_sha256,
      `${rel}.remediation.handoff`,
      errors,
    );
    if (taskBytes && immutableTask && !taskBytes.equals(immutableTask))
      errors.push(`${rel}.remediation.task differs from its candidate blob.`);
    if (
      handoffBytes &&
      immutableHandoff &&
      !handoffBytes.equals(immutableHandoff)
    )
      errors.push(
        `${rel}.remediation.handoff differs from its candidate blob.`,
      );
    ancestor(
      root,
      remediation.implementation_commit,
      remediation.candidate_commit,
      `${rel}.remediation ancestry`,
      errors,
    );
  }

  const qa = record.independent_qa;
  let acceptedReviewBody = "";
  if (
    exact(
      qa,
      ["review", "review_sha256", "review_commit", "reviewed_candidate"],
      `${rel}.independent_qa`,
      errors,
    )
  ) {
    const current = fileBytes(
      root,
      qa.review,
      qa.review_sha256,
      `${rel}.independent_qa.review`,
      errors,
    );
    const immutable = immutableBytes(
      root,
      qa.review,
      qa.review_commit,
      qa.review_sha256,
      `${rel}.independent_qa.review`,
      errors,
    );
    if (current && immutable && !current.equals(immutable))
      errors.push(
        `${rel}.independent_qa.review differs from its review-commit blob.`,
      );
    acceptedReviewBody = immutable?.toString("utf8") || "";
    strictReviewTopology(
      root,
      qa,
      remediation,
      `${rel}.independent_qa`,
      errors,
    );
  }

  const stageA = record.stage_a;
  if (
    exact(
      stageA,
      [
        "candidate_commit",
        "review",
        "review_sha256",
        "review_commit",
        "attestation",
        "attestation_sha256",
        "attestation_commit",
        "attestation_parent",
      ],
      `${rel}.stage_a`,
      errors,
    )
  ) {
    const stageReview = fileBytes(
      root,
      stageA.review,
      stageA.review_sha256,
      `${rel}.stage_a.review`,
      errors,
    );
    const immutableStageReview = immutableBytes(
      root,
      stageA.review,
      stageA.review_commit,
      stageA.review_sha256,
      `${rel}.stage_a.review`,
      errors,
    );
    if (
      stageReview &&
      immutableStageReview &&
      !stageReview.equals(immutableStageReview)
    )
      errors.push(`${rel}.stage_a.review differs from its review-commit blob.`);
    strictReviewTopology(
      root,
      { ...stageA, reviewed_candidate: stageA.candidate_commit },
      { candidate_commit: stageA.candidate_commit },
      `${rel}.stage_a`,
      errors,
    );
    const attestation = fileBytes(
      root,
      stageA.attestation,
      stageA.attestation_sha256,
      `${rel}.stage_a.attestation`,
      errors,
    );
    const immutableAttestation = immutableBytes(
      root,
      stageA.attestation,
      stageA.attestation_commit,
      stageA.attestation_sha256,
      `${rel}.stage_a.attestation`,
      errors,
    );
    if (
      attestation &&
      immutableAttestation &&
      !attestation.equals(immutableAttestation)
    )
      errors.push(
        `${rel}.stage_a.attestation differs from its attestation-commit blob.`,
      );
    if (
      !immutableAttestation ||
      !structuredVerdictAttestation(immutableAttestation, {
        task_id: task.id,
        reviewed_candidate: stageA.candidate_commit,
      })
    )
      errors.push(
        `${rel}.stage_a attestation is not the exact canonical ACCEPTED structure.`,
      );
    strictAttestationTopology(root, stageA, task.id, `${rel}.stage_a`, errors);
  }

  const hosted = record.hosted;
  if (
    exact(
      hosted,
      [
        "evidence_boundary",
        "repository",
        "pull_request",
        "base_sha",
        "head_sha",
        "checks",
        "validation_artifact",
      ],
      `${rel}.hosted`,
      errors,
    )
  ) {
    if (
      hosted.evidence_boundary !==
        "immutable inspected snapshot; GitHub API facts are not revalidated offline" ||
      hosted.repository !== "bfertich-vt/upfs-v1" ||
      !positiveSafeInteger(hosted.pull_request) ||
      hosted.head_sha !== qa?.review_commit
    )
      errors.push(
        `${rel}.hosted has an invalid repository, PR, boundary, or exact-head binding.`,
      );
    if (!Array.isArray(hosted.checks) || hosted.checks.length !== 2)
      errors.push(
        `${rel}.hosted.checks must contain exactly two required checks.`,
      );
    else {
      const names = new Set();
      const runs = new Set();
      const jobs = new Set();
      for (const check of hosted.checks) {
        if (
          !exact(
            check,
            ["name", "run_id", "job_id", "head_sha", "conclusion"],
            `${rel}.hosted.check`,
            errors,
          )
        )
          continue;
        names.add(check.name);
        runs.add(check.run_id);
        jobs.add(check.job_id);
        if (
          !positiveSafeInteger(check.run_id) ||
          !positiveSafeInteger(check.job_id) ||
          check.head_sha !== hosted.head_sha ||
          check.conclusion !== "success"
        )
          errors.push(
            `${rel}.hosted.check must bind numeric IDs, exact head, and success.`,
          );
      }
      if (
        names.size !== 2 ||
        !names.has("repository-validation") ||
        !names.has("repository-security") ||
        runs.size !== 2 ||
        jobs.size !== 2
      )
        errors.push(
          `${rel}.hosted.checks must uniquely bind repository-validation and repository-security run/job IDs.`,
        );
    }
    const artifact = hosted.validation_artifact;
    if (
      exact(
        artifact,
        [
          "artifact_id",
          "name",
          "archive_digest",
          "content",
          "content_sha256",
          "content_status",
        ],
        `${rel}.hosted.validation_artifact`,
        errors,
      )
    ) {
      const bytes = fileBytes(
        root,
        artifact.content,
        artifact.content_sha256,
        `${rel}.hosted.validation_artifact.content`,
        errors,
      );
      let content = null;
      try {
        content = bytes ? JSON.parse(bytes.toString("utf8")) : null;
      } catch {
        errors.push(`${rel}.hosted.validation_artifact.content must be JSON.`);
      }
      if (
        !positiveSafeInteger(artifact.artifact_id) ||
        artifact.name !== "validation-evidence" ||
        !/^sha256:[a-f0-9]{64}$/.test(artifact.archive_digest || "") ||
        artifact.content_status !== "passed" ||
        content?.status !== "passed"
      )
        errors.push(
          `${rel}.hosted.validation_artifact must bind an inspected passed artifact.`,
        );
    }
  }

  const merge = record.protected_merge;
  if (
    exact(
      merge,
      ["commit", "base_parent", "head_tree", "merged_at", "pull_request"],
      `${rel}.protected_merge`,
      errors,
    )
  ) {
    const mergeTree = git(
      root,
      ["show", "-s", "--format=%T", merge.commit],
      `${rel}.protected_merge.commit`,
      errors,
    )?.trim();
    const headTree = git(
      root,
      ["show", "-s", "--format=%T", hosted?.head_sha],
      `${rel}.hosted.head`,
      errors,
    )?.trim();
    const parents =
      git(
        root,
        ["show", "-s", "--format=%P", merge.commit],
        `${rel}.protected_merge.parents`,
        errors,
      )
        ?.trim()
        .split(/\s+/) || [];
    if (
      !SHA40.test(merge.commit || "") ||
      parents.length !== 1 ||
      parents[0] !== merge.base_parent ||
      merge.base_parent !== hosted?.base_sha ||
      mergeTree !== headTree ||
      merge.head_tree !== headTree ||
      merge.pull_request !== hosted?.pull_request ||
      !canonicalRfc3339(merge.merged_at)
    )
      errors.push(
        `${rel}.protected_merge does not bind the base, exact hosted-head tree, PR, and timestamp.`,
      );
    const subject =
      git(
        root,
        ["show", "-s", "--format=%s", merge.commit],
        `${rel}.protected_merge.subject`,
        errors,
      )?.trim() || "";
    const prToken = new RegExp(
      `(?:^|[^0-9])#${merge.pull_request}(?:$|[^0-9])`,
    );
    if (!prToken.test(subject))
      errors.push(`${rel}.protected_merge subject does not bind its PR.`);
    ancestor(
      root,
      merge.commit,
      "HEAD",
      `${rel}.protected_merge reachability`,
      errors,
    );
  }

  if (
    !Array.isArray(record.acceptance_mapping) ||
    record.acceptance_mapping.length !== task.acceptance.length
  )
    errors.push(
      `${rel}.acceptance_mapping must map every queue criterion exactly once.`,
    );
  else {
    const mapped = new Set();
    const usedEvidence = new Set();
    for (const mapping of record.acceptance_mapping) {
      if (
        !exact(
          mapping,
          ["criterion", "evidence"],
          `${rel}.acceptance_mapping`,
          errors,
        )
      )
        continue;
      mapped.add(mapping.criterion);
      if (
        !task.acceptance.includes(mapping.criterion) ||
        !Array.isArray(mapping.evidence) ||
        mapping.evidence.length !== 1
      )
        errors.push(
          `${rel}.acceptance_mapping must bind one criterion to exactly one evidence record.`,
        );
      for (const evidence of mapping.evidence || []) {
        if (
          !exact(
            evidence,
            ["artifact", "artifact_sha256", "commit", "excerpt"],
            `${rel}.acceptance evidence`,
            errors,
          )
        )
          continue;
        const bytes = immutableBytes(
          root,
          evidence.artifact,
          evidence.commit,
          evidence.artifact_sha256,
          `${rel}.acceptance evidence`,
          errors,
        );
        const evidenceKey = `${evidence.commit}\0${evidence.artifact}\0${evidence.excerpt}`;
        const criterionCell = criterionEvidenceCell(
          acceptedReviewBody,
          mapping.criterion,
        );
        if (
          evidence.artifact !== qa?.review ||
          evidence.commit !== qa?.review_commit ||
          evidence.artifact_sha256 !== qa?.review_sha256 ||
          typeof evidence.excerpt !== "string" ||
          evidence.excerpt.trim().length < 32 ||
          !criterionCell.includes(evidence.excerpt) ||
          (bytes && !bytes.toString("utf8").includes(evidence.excerpt)) ||
          usedEvidence.has(evidenceKey)
        )
          errors.push(
            `${rel}.acceptance evidence must be unique, criterion-specific, and bound to the accepted QA review.`,
          );
        usedEvidence.add(evidenceKey);
      }
    }
    if (mapped.size !== task.acceptance.length)
      errors.push(`${rel}.acceptance_mapping duplicates or omits a criterion.`);
  }

  if (
    !Array.isArray(record.dependencies) ||
    record.dependencies.length !== task.dependencies.length ||
    record.dependencies.some(
      (value, index) => value !== task.dependencies[index],
    )
  )
    errors.push(`${rel}.dependencies must exactly match the queue.`);
  else
    for (const dependency of record.dependencies)
      if (tasks.get(dependency)?.status !== "complete")
        errors.push(
          `${rel} cannot accept before dependency ${dependency} is complete.`,
        );
  if (
    !Array.isArray(record.limitations) ||
    !record.limitations.length ||
    !record.limitations.every(
      (value) => typeof value === "string" && value.trim(),
    )
  )
    errors.push(`${rel}.limitations must disclose remaining boundaries.`);
  if (!row || row[9] !== "ACCEPTED")
    errors.push(`${MATRIX} ${task.id} disposition must be ACCEPTED.`);
}

export function validateHistoricalClosures(root, tasks, errors) {
  const historical = [...tasks.values()].filter(
    (task) =>
      /^TASK-\d{4}$/.test(task.id) &&
      Number(task.id.slice(5)) >= 1 &&
      Number(task.id.slice(5)) <= 110,
  );
  const governed = historical.filter((task) =>
    object(task.historical_evidence),
  );
  const hasClosure =
    governed.some((task) => task.status === "complete") ||
    fs.existsSync(path.join(root, DIRECTORY));
  if (!hasClosure) return;
  const rows = matrixRows(root, errors);
  if (rows.size !== 110)
    errors.push(`${MATRIX} must contain exactly 110 historical rows.`);
  for (const task of governed) {
    const closure = path.join(root, DIRECTORY, `${task.id}.json`);
    if (task.status === "complete")
      validateAccepted(root, task, tasks, rows.get(task.id), errors);
    else {
      if (fs.existsSync(closure))
        errors.push(`${task.id} has a closure record but is not complete.`);
      const incompleteDispositions = new Set([
        "REMEDIATION_REQUIRED",
        "EXTERNAL_PREREQUISITE",
        "NOT_IMPLEMENTED",
      ]);
      if (!incompleteDispositions.has(rows.get(task.id)?.[9]))
        errors.push(
          `${MATRIX} ${task.id} must use an audited incomplete disposition without accepted closure evidence.`,
        );
    }
  }
}
