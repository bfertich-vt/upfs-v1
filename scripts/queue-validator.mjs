import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { parseDocument } from "yaml";

const STATUSES = new Set([
  "planned",
  "ready",
  "in_progress",
  "blocked",
  "complete",
  "superseded",
]);
const RECLASSIFICATION_REPORT = "docs/governance/TASK-RECLASSIFICATION-007.md";
const HISTORICAL_CLOSURE_MATRIX = "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md";
const HISTORICAL_CLOSURE_DIRECTORY = "docs/governance/task-closures";
const HISTORICAL_CLASSIFICATIONS = new Set([
  "Proven production implementation",
  "Proven reference implementation",
  "Contract/interface only",
  "Synthetic rehearsal only",
  "External prerequisite",
  "Incomplete",
  "Unsupported completion claim",
]);
const HISTORICAL_TASK_FIRST = 1;
const HISTORICAL_TASK_LAST = 110;
const HISTORICAL_ONLY_FIELDS = [
  "report_row",
  "classification",
  "historical_evidence",
  "production_proof",
];
const immutableArtifactCache = new Map();
export const HANDOFF_FIELDS = [
  "Task and scope:",
  "Agent role:",
  "Role-file path and digest:",
  "Agent thread ID:",
  "Worktree and branch:",
  "Commit:",
  "Files changed:",
  "Specifications and contracts read:",
  "Acceptance criteria:",
  "Tests and commands run:",
  "Negative tests:",
  "Contracts/migrations:",
  "Security and tenant-isolation analysis:",
  "Audit/evidence behavior:",
  "Results:",
  "Rollback/corrective-forward plan:",
  "Documentation updated:",
  "Known risks and follow-ups:",
  "Known limitations:",
  "External prerequisites:",
  "Independent reviewer and review result:",
];
const PLACEHOLDER =
  /^(?:tbd(?:\s+(?:later|after\s+review))?|to\s+be\s+determined|unknown(?:\s+at\s+this\s+time)?|pending(?:\s+review)?|n\/?a|not\s+applicable|none|nil|-)$/i;

export class QueueValidationError extends Error {
  constructor(errors) {
    const shown = errors.slice(0, 25);
    super(
      `Task queue validation failed (${errors.length} violations):\n${shown.map((entry) => `- ${entry}`).join("\n")}${errors.length > shown.length ? `\n- ... ${errors.length - shown.length} additional violations are retained in artifacts/validation-report.json.errors.` : ""}`,
    );
    this.name = "QueueValidationError";
    this.errors = errors;
  }
}

const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const substantive = (value) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  !PLACEHOLDER.test(value.trim());
const inside = (root, candidate) =>
  candidate === root || candidate.startsWith(`${root}${path.sep}`);
const normative = (value) =>
  typeof value === "string" &&
  /(?:\bAGENTS\.md\b|docs\/MASTER_PLAN\.md|specs\/[A-Za-z0-9_/-]+\.md|contracts\/[A-Za-z0-9_/-]+\.(?:yaml|json))/i.test(
    value,
  );
const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

function fields(body, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...body.matchAll(new RegExp(`^- ${escaped}[\\t ]*(.*)$`, "gmi"))].map(
    (match) => match[1].trim(),
  );
}

function oneSubstantiveField(body, label, rel, errors) {
  const values = fields(body, label);
  if (values.length !== 1) {
    errors.push(
      `${rel} must contain exactly one ${label} field; found ${values.length}.`,
    );
    return "";
  }
  if (!substantive(values[0])) {
    errors.push(
      `${rel} is missing substantive provenance/template field: ${label}`,
    );
    return "";
  }
  return values[0];
}

function containedFile(root, candidate, description, errors) {
  let realRoot;
  let realTarget;
  try {
    realRoot = fs.realpathSync.native(root);
    realTarget = fs.realpathSync.native(candidate);
  } catch {
    errors.push(`${description} cannot be resolved safely.`);
    return null;
  }
  if (!inside(realRoot, realTarget)) {
    errors.push(
      `${description} resolves through a symlink/reparse point outside the repository.`,
    );
    return null;
  }
  if (!fs.statSync(realTarget).isFile()) {
    errors.push(`${description} references a non-file.`);
    return null;
  }
  return realTarget;
}

function repositoryRelative(root, rel, description, errors) {
  if (typeof rel !== "string" || !rel.trim()) {
    errors.push(`${description} must be a non-empty repository-relative path.`);
    return null;
  }
  const normalized = rel.replace(/\\/g, "/");
  const lexical = path.resolve(root, normalized);
  if (
    path.isAbsolute(normalized) ||
    normalized.split("/").includes("..") ||
    !inside(root, lexical)
  ) {
    errors.push(`${description} must not escape the repository.`);
    return null;
  }
  return { normalized, lexical };
}

function immutableArtifact(root, artifact, commit, description, errors) {
  const safe = repositoryRelative(root, artifact, description, errors);
  if (!safe || !/^[a-f0-9]{40}$/i.test(commit || "")) {
    if (safe && !/^[a-f0-9]{40}$/i.test(commit || ""))
      errors.push(
        `${description} must identify a 40-character immutable Git commit.`,
      );
    return null;
  }
  try {
    const key = `${root}\0${commit}\0${safe.normalized}`;
    if (!immutableArtifactCache.has(key))
      immutableArtifactCache.set(
        key,
        execFileSync("git", ["show", `${commit}:${safe.normalized}`], {
          cwd: root,
          stdio: ["ignore", "pipe", "pipe"],
        }),
      );
    return immutableArtifactCache.get(key);
  } catch {
    errors.push(
      `${description} cannot be resolved at immutable commit ${commit}.`,
    );
    return null;
  }
}

function gitText(root, args, description, errors) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    errors.push(
      `${description} cannot be verified from repository Git objects.`,
    );
    return "";
  }
}

function exactKeys(value, keys, description, errors) {
  if (!object(value)) {
    errors.push(`${description} must be an object.`);
    return false;
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    errors.push(`${description} must contain exactly: ${expected.join(", ")}.`);
    return false;
  }
  return true;
}

function currentArtifact(root, artifact, expectedDigest, description, errors) {
  const safe = repositoryRelative(root, artifact, description, errors);
  if (!safe) return null;
  const file = containedFile(root, safe.lexical, description, errors);
  if (!file) return null;
  const bytes = fs.readFileSync(file);
  if (
    !/^[a-f0-9]{64}$/i.test(expectedDigest || "") ||
    sha256(bytes) !== expectedDigest
  ) {
    errors.push(`${description} has a stale or incorrect SHA-256.`);
    return null;
  }
  return bytes;
}

function readHistoricalMatrix(root, errors) {
  const file = containedFile(
    root,
    path.join(root, HISTORICAL_CLOSURE_MATRIX),
    HISTORICAL_CLOSURE_MATRIX,
    errors,
  );
  if (!file) return new Map();
  const rows = new Map();
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!/^\| TASK-\d{4} \|/.test(line)) continue;
    const fields = line
      .slice(1, -1)
      .split("|")
      .map((value) => value.trim());
    if (fields.length !== 18) {
      errors.push(
        `${HISTORICAL_CLOSURE_MATRIX} ${fields[0] || "row"} must contain exactly 18 fields.`,
      );
      continue;
    }
    if (rows.has(fields[0]))
      errors.push(`${HISTORICAL_CLOSURE_MATRIX} duplicates ${fields[0]}.`);
    rows.set(fields[0], fields);
  }
  return rows;
}

function validateHistoricalClosure(root, task, tasks, matrixRow, errors) {
  const rel = `${HISTORICAL_CLOSURE_DIRECTORY}/${task.id}.json`;
  const absolute = path.join(root, rel);
  if (!fs.existsSync(absolute)) {
    errors.push(
      `${task.id} cannot be complete without machine-validated closure record ${rel}.`,
    );
    return;
  }
  const file = containedFile(root, absolute, rel, errors);
  if (!file) return;
  let closure;
  try {
    closure = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    errors.push(`${rel} must contain valid JSON.`);
    return;
  }
  if (
    !exactKeys(
      closure,
      [
        "version",
        "task_id",
        "disposition",
        "historical",
        "remediation",
        "independent_qa",
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
    closure.version !== 1 ||
    closure.task_id !== task.id ||
    closure.disposition !== "ACCEPTED"
  )
    errors.push(
      `${rel} must bind version 1, ${task.id}, and disposition ACCEPTED.`,
    );

  const historicalKeys = [
    "classification",
    "artifact",
    "artifact_sha256",
    "artifact_commit",
    "evidence_excerpt",
  ];
  if (
    exactKeys(closure.historical, historicalKeys, `${rel}.historical`, errors)
  ) {
    const expected = {
      classification: task.classification,
      ...task.historical_evidence,
    };
    for (const key of historicalKeys)
      if (closure.historical[key] !== expected[key])
        errors.push(
          `${rel}.historical.${key} does not preserve the immutable queue classification/evidence binding.`,
        );
  }

  if (
    exactKeys(
      closure.remediation,
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
    const taskBytes = currentArtifact(
      root,
      closure.remediation.task,
      closure.remediation.task_sha256,
      `${rel}.remediation.task`,
      errors,
    );
    const handoffBytes = currentArtifact(
      root,
      closure.remediation.handoff,
      closure.remediation.handoff_sha256,
      `${rel}.remediation.handoff`,
      errors,
    );
    for (const [label, commit] of [
      ["implementation_commit", closure.remediation.implementation_commit],
      ["candidate_commit", closure.remediation.candidate_commit],
    ]) {
      if (
        !/^[a-f0-9]{40}$/i.test(commit || "") ||
        !gitText(
          root,
          ["cat-file", "-t", `${commit}^{commit}`],
          `${rel}.remediation.${label}`,
          errors,
        )
      )
        errors.push(
          `${rel}.remediation.${label} must name an existing immutable commit.`,
        );
    }
    if (
      taskBytes &&
      !immutableArtifact(
        root,
        closure.remediation.task,
        closure.remediation.candidate_commit,
        `${rel}.remediation.task at candidate`,
        errors,
      )?.equals(taskBytes)
    )
      errors.push(
        `${rel}.remediation.task differs from its candidate-commit blob.`,
      );
    if (
      handoffBytes &&
      !immutableArtifact(
        root,
        closure.remediation.handoff,
        closure.remediation.candidate_commit,
        `${rel}.remediation.handoff at candidate`,
        errors,
      )?.equals(handoffBytes)
    )
      errors.push(
        `${rel}.remediation.handoff differs from its candidate-commit blob.`,
      );
    if (
      gitText(
        root,
        [
          "merge-base",
          "--is-ancestor",
          closure.remediation.implementation_commit,
          closure.remediation.candidate_commit,
        ],
        `${rel} implementation ancestry`,
        errors,
      ) !== ""
    ) {
      // git merge-base --is-ancestor succeeds without output.
    }
  }

  if (
    exactKeys(
      closure.independent_qa,
      [
        "review",
        "review_sha256",
        "review_commit",
        "reviewed_candidate",
        "verdict",
      ],
      `${rel}.independent_qa`,
      errors,
    )
  ) {
    const qa = closure.independent_qa;
    const reviewBytes = currentArtifact(
      root,
      qa.review,
      qa.review_sha256,
      `${rel}.independent_qa.review`,
      errors,
    );
    const immutableReview = immutableArtifact(
      root,
      qa.review,
      qa.review_commit,
      `${rel}.independent_qa.review`,
      errors,
    );
    if (reviewBytes && immutableReview && !reviewBytes.equals(immutableReview))
      errors.push(
        `${rel}.independent_qa.review differs from the blob at review_commit.`,
      );
    if (
      qa.verdict !== "ACCEPTED" ||
      !immutableReview?.toString("utf8").includes("**Verdict: ACCEPTED**") ||
      !immutableReview?.toString("utf8").includes(qa.reviewed_candidate)
    )
      errors.push(
        `${rel}.independent_qa must bind an explicit ACCEPTED verdict to the reviewed candidate.`,
      );
    if (
      gitText(
        root,
        [
          "merge-base",
          "--is-ancestor",
          qa.reviewed_candidate,
          qa.review_commit,
        ],
        `${rel} QA ancestry`,
        errors,
      ) !== ""
    ) {
      // Successful ancestry checks intentionally have no stdout.
    }
  }

  if (
    exactKeys(
      closure.hosted,
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
    const hosted = closure.hosted;
    if (
      hosted.evidence_boundary !==
        "immutable inspected snapshot; GitHub API facts are not revalidated offline" ||
      hosted.repository !== "bfertich-vt/upfs-v1" ||
      !Number.isInteger(hosted.pull_request) ||
      hosted.pull_request < 1 ||
      hosted.head_sha !== closure.independent_qa?.review_commit
    )
      errors.push(
        `${rel}.hosted has an invalid repository, PR, evidence boundary, or exact head binding.`,
      );
    if (!Array.isArray(hosted.checks) || hosted.checks.length !== 2)
      errors.push(
        `${rel}.hosted.checks must contain exactly the two required hosted checks.`,
      );
    else {
      const names = new Set();
      const runs = new Set();
      for (const check of hosted.checks) {
        if (
          !exactKeys(
            check,
            ["name", "run_id", "job_id", "head_sha", "conclusion"],
            `${rel}.hosted.check`,
            errors,
          )
        )
          continue;
        names.add(check.name);
        runs.add(check.run_id);
        if (
          !Number.isInteger(check.run_id) ||
          !Number.isInteger(check.job_id) ||
          check.head_sha !== hosted.head_sha ||
          check.conclusion !== "success"
        )
          errors.push(
            `${rel}.hosted.check must bind numeric run/job IDs, exact head SHA, and success.`,
          );
      }
      if (
        names.size !== 2 ||
        !names.has("repository-validation") ||
        !names.has("repository-security") ||
        runs.size !== 2
      )
        errors.push(
          `${rel}.hosted.checks must uniquely bind repository-validation and repository-security runs.`,
        );
    }
    const artifact = hosted.validation_artifact;
    if (
      exactKeys(
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
      const bytes = currentArtifact(
        root,
        artifact.content,
        artifact.content_sha256,
        `${rel}.hosted.validation_artifact.content`,
        errors,
      );
      let parsed;
      try {
        parsed = bytes ? JSON.parse(bytes.toString("utf8")) : null;
      } catch {
        errors.push(
          `${rel}.hosted validation artifact content must be valid JSON.`,
        );
      }
      if (
        !Number.isInteger(artifact.artifact_id) ||
        artifact.name !== "validation-evidence" ||
        !/^sha256:[a-f0-9]{64}$/.test(artifact.archive_digest || "") ||
        artifact.content_status !== "passed" ||
        parsed?.status !== "passed"
      )
        errors.push(
          `${rel}.hosted validation artifact must bind its inspected archive and passed content.`,
        );
    }
  }

  if (
    exactKeys(
      closure.protected_merge,
      ["commit", "base_parent", "head_tree", "merged_at", "pull_request"],
      `${rel}.protected_merge`,
      errors,
    )
  ) {
    const merge = closure.protected_merge;
    const commitTree = gitText(
      root,
      ["show", "-s", "--format=%T", merge.commit],
      `${rel}.protected_merge.commit`,
      errors,
    );
    const headTree = gitText(
      root,
      ["show", "-s", "--format=%T", closure.hosted?.head_sha],
      `${rel}.hosted.head_sha`,
      errors,
    );
    const parents = gitText(
      root,
      ["show", "-s", "--format=%P", merge.commit],
      `${rel}.protected_merge parents`,
      errors,
    ).split(/\s+/);
    if (
      !/^[a-f0-9]{40}$/.test(merge.commit || "") ||
      parents.length !== 1 ||
      parents[0] !== merge.base_parent ||
      merge.base_parent !== closure.hosted?.base_sha ||
      commitTree !== headTree ||
      merge.head_tree !== headTree ||
      merge.pull_request !== closure.hosted?.pull_request ||
      !/^\d{4}-\d{2}-\d{2}T/.test(merge.merged_at || "")
    )
      errors.push(
        `${rel}.protected_merge does not bind the protected base, exact hosted-head tree, PR, and merge timestamp.`,
      );
    const subject = gitText(
      root,
      ["show", "-s", "--format=%s", merge.commit],
      `${rel}.protected_merge subject`,
      errors,
    );
    if (!subject.includes(`#${merge.pull_request}`))
      errors.push(
        `${rel}.protected_merge commit subject does not bind PR #${merge.pull_request}.`,
      );
    gitText(
      root,
      ["merge-base", "--is-ancestor", merge.commit, "HEAD"],
      `${rel}.protected_merge reachability`,
      errors,
    );
  }

  if (
    !Array.isArray(closure.acceptance_mapping) ||
    closure.acceptance_mapping.length !== task.acceptance.length
  )
    errors.push(
      `${rel}.acceptance_mapping must map every queue acceptance criterion exactly once.`,
    );
  else {
    const mapped = new Set();
    for (const mapping of closure.acceptance_mapping) {
      if (
        !exactKeys(
          mapping,
          ["criterion", "evidence"],
          `${rel}.acceptance_mapping entry`,
          errors,
        )
      )
        continue;
      mapped.add(mapping.criterion);
      if (
        !task.acceptance.includes(mapping.criterion) ||
        !Array.isArray(mapping.evidence) ||
        !mapping.evidence.length
      )
        errors.push(
          `${rel}.acceptance_mapping contains an unknown criterion or absent evidence.`,
        );
      for (const evidence of mapping.evidence || []) {
        if (
          !exactKeys(
            evidence,
            ["artifact", "artifact_sha256", "commit", "excerpt"],
            `${rel}.acceptance evidence`,
            errors,
          )
        )
          continue;
        const bytes = immutableArtifact(
          root,
          evidence.artifact,
          evidence.commit,
          `${rel}.acceptance evidence`,
          errors,
        );
        if (
          !/^[a-f0-9]{64}$/i.test(evidence.artifact_sha256 || "") ||
          (bytes && sha256(bytes) !== evidence.artifact_sha256) ||
          !substantive(evidence.excerpt) ||
          (bytes && !bytes.toString("utf8").includes(evidence.excerpt))
        )
          errors.push(
            `${rel}.acceptance evidence has a stale digest or excerpt binding.`,
          );
      }
    }
    if (mapped.size !== task.acceptance.length)
      errors.push(`${rel}.acceptance_mapping duplicates or omits a criterion.`);
  }

  if (
    !Array.isArray(closure.dependencies) ||
    closure.dependencies.length !== task.dependencies.length ||
    closure.dependencies.some(
      (dependency, index) => dependency !== task.dependencies[index],
    )
  )
    errors.push(
      `${rel}.dependencies must exactly match the queue dependency list.`,
    );
  else
    for (const dependency of closure.dependencies)
      if (tasks.get(dependency)?.status !== "complete")
        errors.push(
          `${rel} cannot accept ${task.id} before dependency ${dependency} is complete.`,
        );
  if (
    !Array.isArray(closure.limitations) ||
    !closure.limitations.length ||
    !closure.limitations.every(substantive)
  )
    errors.push(
      `${rel}.limitations must disclose substantive remaining boundaries.`,
    );
  if (!matrixRow || matrixRow[9] !== "ACCEPTED")
    errors.push(
      `${HISTORICAL_CLOSURE_MATRIX} ${task.id} disposition must be ACCEPTED when the queue status is complete.`,
    );
}

function readReclassificationReport(root, errors) {
  const report = containedFile(
    root,
    path.join(root, RECLASSIFICATION_REPORT),
    RECLASSIFICATION_REPORT,
    errors,
  );
  if (!report) return null;
  const body = fs.readFileSync(report, "utf8");
  const match = body.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!match) {
    errors.push(
      `${RECLASSIFICATION_REPORT} must contain one JSON evidence-record code block.`,
    );
    return null;
  }
  try {
    return JSON.parse(match[1]);
  } catch {
    errors.push(
      `${RECLASSIFICATION_REPORT} contains invalid JSON evidence records.`,
    );
    return null;
  }
}

function taskNumber(id) {
  return Number.parseInt(id.slice("TASK-".length), 10);
}

function isHistoricalTaskId(id) {
  return (
    /^TASK-\d{4}$/.test(id) &&
    taskNumber(id) >= HISTORICAL_TASK_FIRST &&
    taskNumber(id) <= HISTORICAL_TASK_LAST
  );
}

function expectedHistoricalIds() {
  return Array.from(
    { length: HISTORICAL_TASK_LAST - HISTORICAL_TASK_FIRST + 1 },
    (_, index) =>
      `TASK-${String(index + HISTORICAL_TASK_FIRST).padStart(4, "0")}`,
  );
}

function validateHistoricalReclassification(root, tasks, errors, frozen) {
  const historical = [...tasks.values()].filter((task) =>
    isHistoricalTaskId(task.id),
  );
  for (const task of tasks.values()) {
    if (taskNumber(task.id) > HISTORICAL_TASK_LAST) {
      for (const field of HISTORICAL_ONLY_FIELDS)
        if (Object.hasOwn(task, field))
          errors.push(
            `${task.id} must not carry historical-only field ${field}.`,
          );
    }
  }
  const requiresReport =
    frozen ||
    historical.some(
      (task) =>
        task.report_row || task.classification || task.historical_evidence,
    );
  if (!requiresReport) return;
  const matrix = readHistoricalMatrix(root, errors);
  const report = readReclassificationReport(root, errors);
  if (
    !object(report) ||
    report.version !== 1 ||
    !Array.isArray(report.records)
  ) {
    errors.push(
      `${RECLASSIFICATION_REPORT} must provide version: 1 and records.`,
    );
    return;
  }
  const records = new Map();
  for (const record of report.records) {
    if (
      !object(record) ||
      typeof record.id !== "string" ||
      !/^TASK-\d{4}$/.test(record.id)
    ) {
      errors.push(`${RECLASSIFICATION_REPORT} contains an invalid record ID.`);
      continue;
    }
    if (!isHistoricalTaskId(record.id)) {
      errors.push(
        `${RECLASSIFICATION_REPORT} ${record.id} is outside the immutable TASK-0001 through TASK-0110 range.`,
      );
      continue;
    }
    if (records.has(record.id)) {
      errors.push(`${RECLASSIFICATION_REPORT} duplicates ${record.id}.`);
      continue;
    }
    records.set(record.id, record);
    if (!HISTORICAL_CLASSIFICATIONS.has(record.classification))
      errors.push(
        `${RECLASSIFICATION_REPORT} ${record.id} has an unknown classification.`,
      );
    const bytes = immutableArtifact(
      root,
      record.artifact,
      record.artifact_commit,
      `${RECLASSIFICATION_REPORT} ${record.id}.artifact`,
      errors,
    );
    if (
      bytes &&
      (!/^[a-f0-9]{64}$/i.test(record.artifact_sha256 || "") ||
        sha256(bytes) !== record.artifact_sha256)
    )
      errors.push(
        `${RECLASSIFICATION_REPORT} ${record.id} has a stale or incorrect artifact SHA-256.`,
      );
    if (
      typeof record.evidence_excerpt !== "string" ||
      !record.evidence_excerpt.trim()
    )
      errors.push(
        `${RECLASSIFICATION_REPORT} ${record.id} has an absent evidence excerpt.`,
      );
    else if (
      /\b(?:no|none|absent|missing)\b[^\n]*(?:command|test|result|evidence)/i.test(
        record.evidence_excerpt,
      )
    )
      errors.push(
        `${RECLASSIFICATION_REPORT} ${record.id} contains a fabricated no-evidence assertion.`,
      );
    else if (bytes && !bytes.toString("utf8").includes(record.evidence_excerpt))
      errors.push(
        `${RECLASSIFICATION_REPORT} ${record.id} excerpt is absent from its immutable artifact.`,
      );
    if (
      typeof record.limitation !== "string" ||
      !record.limitation.includes(record.id)
    )
      errors.push(
        `${RECLASSIFICATION_REPORT} ${record.id} needs a task-specific limitation.`,
      );
  }
  const expectedIds = expectedHistoricalIds();
  if (records.size !== expectedIds.length)
    errors.push(
      `${RECLASSIFICATION_REPORT} must contain exactly ${expectedIds.length} task records.`,
    );
  for (const id of expectedIds)
    if (!records.has(id))
      errors.push(
        `${RECLASSIFICATION_REPORT} is missing immutable historical record ${id}.`,
      );
  if (historical.length !== expectedIds.length)
    errors.push(
      `tasks/queue.yaml must contain exactly ${expectedIds.length} immutable historical tasks TASK-0001 through TASK-0110.`,
    );
  for (const task of historical) {
    const record = records.get(task.id);
    if (!record) {
      errors.push(`${task.id} is absent from ${RECLASSIFICATION_REPORT}.`);
      continue;
    }
    if (!["blocked", "complete"].includes(task.status))
      errors.push(
        `${task.id} must remain blocked or carry a validated ACCEPTED closure during historical-evidence recovery.`,
      );
    if (
      task.classification !== record.classification ||
      task.report_row !== task.id
    )
      errors.push(
        `${task.id} has a queue/report classification binding mismatch.`,
      );
    const evidence = task.historical_evidence;
    if (
      !object(evidence) ||
      typeof evidence.evidence_excerpt !== "string" ||
      !evidence.evidence_excerpt.trim() ||
      evidence.artifact !== record.artifact ||
      evidence.artifact_sha256 !== record.artifact_sha256 ||
      evidence.artifact_commit !== record.artifact_commit ||
      evidence.evidence_excerpt !== record.evidence_excerpt
    )
      errors.push(`${task.id} has a queue/report immutable-evidence mismatch.`);
    if (task.classification === "Proven production implementation") {
      const proof = task.production_proof;
      if (
        !object(proof) ||
        !substantive(proof.runtime) ||
        !substantive(proof.security) ||
        !substantive(proof.tenant_isolation) ||
        !substantive(proof.independent_qa)
      )
        errors.push(
          `${task.id} cannot claim proven production implementation without runtime, security, tenant-isolation, and independent-QA proof.`,
        );
    }
    const closurePath = path.join(
      root,
      HISTORICAL_CLOSURE_DIRECTORY,
      `${task.id}.json`,
    );
    if (task.status === "complete")
      validateHistoricalClosure(root, task, tasks, matrix.get(task.id), errors);
    else {
      if (fs.existsSync(closurePath))
        errors.push(
          `${task.id} has a closure record but its queue status is not complete.`,
        );
      const row = matrix.get(task.id);
      if (!row || row[9] !== "blocked")
        errors.push(
          `${HISTORICAL_CLOSURE_MATRIX} ${task.id} disposition must remain blocked without accepted closure evidence.`,
        );
    }
  }
  if (matrix.size !== expectedIds.length)
    errors.push(
      `${HISTORICAL_CLOSURE_MATRIX} must contain exactly ${expectedIds.length} historical task rows.`,
    );
  for (const id of expectedIds)
    if (!matrix.has(id))
      errors.push(`${HISTORICAL_CLOSURE_MATRIX} is missing ${id}.`);
}

function validateInput(root, input, taskId, errors) {
  if (typeof input !== "string" || !input.trim()) {
    errors.push(
      `${taskId}.inputs must contain non-empty repository-relative paths.`,
    );
    return;
  }
  const normalized = input.replace(/\\/g, "/");
  const lexical = path.resolve(root, normalized);
  if (
    path.isAbsolute(normalized) ||
    normalized.split("/").includes("..") ||
    !inside(root, lexical)
  ) {
    errors.push(`${taskId}.inputs must not escape the repository: ${input}`);
    return;
  }
  if (!fs.existsSync(lexical)) {
    errors.push(`${taskId}.inputs references a missing file: ${input}`);
    return;
  }
  containedFile(root, lexical, `${taskId}.inputs ${input}`, errors);
}

function validateHandoff(root, id, errors) {
  const rel = `docs/handoffs/${id}.md`;
  const absolute = path.join(root, rel);
  if (!fs.existsSync(absolute)) {
    const dir = path.join(root, "docs/handoffs");
    const near = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((name) => name.startsWith(id))
      : [];
    errors.push(
      `${id} lacks the correctly named handoff ${rel}${near.length ? ` (found: ${near.join(", ")})` : ""}.`,
    );
    return;
  }
  const safeHandoff = containedFile(root, absolute, rel, errors);
  if (!safeHandoff) return;
  const body = fs.readFileSync(safeHandoff, "utf8");
  const values = new Map(
    HANDOFF_FIELDS.map((label) => [
      label,
      oneSubstantiveField(body, label, rel, errors),
    ]),
  );
  if (!new RegExp(`\\b${id}\\b`).test(body))
    errors.push(`${rel} does not identify ${id}.`);
  if (
    !/^(Backend|Frontend|Schema\/Search\/AI|Independent QA\/Security)$/i.test(
      values.get("Agent role:"),
    )
  )
    errors.push(`${rel} must name a documented specialist role.`);
  if (
    !/agents\/[A-Z_]+\.md.*\b[a-f0-9]{64}\b/i.test(
      values.get("Role-file path and digest:"),
    )
  )
    errors.push(
      `${rel} must provide an agents role-file path and SHA-256 digest.`,
    );
  if (!/^\/?root\/[a-z0-9_/-]+$/i.test(values.get("Agent thread ID:")))
    errors.push(`${rel} must provide a concrete agent thread ID.`);
  if (
    !/worktree/i.test(values.get("Worktree and branch:")) ||
    !/branch\s+[^\s]+/i.test(values.get("Worktree and branch:"))
  )
    errors.push(`${rel} must provide concrete worktree and branch provenance.`);
  if (!/\b[a-f0-9]{7,64}\b/i.test(values.get("Commit:")))
    errors.push(`${rel} must provide a concrete candidate commit.`);
  const review = values.get("Independent reviewer and review result:") || "";
  if (
    !/Independent QA\/Security/i.test(review) ||
    !/\bPASS\b/i.test(review) ||
    /\b(pending|reject|fail|unknown)\b/i.test(review)
  )
    errors.push(
      `${rel} requires an independent QA/Security reviewer and a PASS result for completed work.`,
    );
  if (id === "TASK-0109") {
    const tests = values.get("Tests and commands run:") || "";
    if (
      /docs\/handoffs\/|handoff[^\n]*\.md|\bfile existence\b/i.test(tests) ||
      !/\b(node|npm|powershell|pytest|vitest|jest|command|pass(?:ed)?|fail(?:ed)?)\b/i.test(
        tests,
      )
    )
      errors.push(
        `${rel} cannot use handoff Markdown or file existence as TASK-0109 test evidence; record actual tests, commands, and results.`,
      );
  }
}

export function validateQueueDocument(content, root) {
  const doc = parseDocument(content);
  if (doc.errors.length)
    throw new QueueValidationError(
      doc.errors.map(
        (error) => `tasks/queue.yaml is not valid YAML: ${error.message}`,
      ),
    );
  const queue = doc.toJS({ maxAliasCount: 100 });
  if (
    !object(queue) ||
    queue.version !== 1 ||
    !Array.isArray(queue.tasks) ||
    !queue.tasks.length
  )
    throw new QueueValidationError([
      "tasks/queue.yaml must contain version: 1 and a non-empty tasks list.",
    ]);
  const errors = [];
  const recoveryFrozen = queue.recovery_freeze === true;
  if (Object.hasOwn(queue, "recovery_freeze") && queue.recovery_freeze !== true)
    errors.push(
      "recovery_freeze must be literal true when present; recovery may not silently disable validation.",
    );
  const tasks = new Map();
  for (const task of queue.tasks) {
    if (
      !object(task) ||
      typeof task.id !== "string" ||
      !/^TASK-\d{4}$/.test(task.id)
    ) {
      errors.push("every task must have an id matching TASK-0000.");
      continue;
    }
    if (tasks.has(task.id)) {
      errors.push(`duplicate task id: ${task.id}`);
      continue;
    }
    tasks.set(task.id, task);
    if (typeof task.title !== "string" || !task.title.trim())
      errors.push(`${task.id}.title must be a non-empty string.`);
    if (!STATUSES.has(task.status))
      errors.push(
        `${task.id}.status must be one of ${[...STATUSES].join(", ")}.`,
      );
    if (
      !Array.isArray(task.dependencies) ||
      !task.dependencies.every(
        (item) => typeof item === "string" && /^TASK-\d{4}$/.test(item),
      )
    )
      errors.push(`${task.id}.dependencies must be a list of task IDs.`);
    if (!Array.isArray(task.inputs) || !task.inputs.length)
      errors.push(
        `${task.id}.inputs must be a non-empty list of structured input paths.`,
      );
    else
      for (const input of task.inputs)
        validateInput(root, input, task.id, errors);
    if (!normative(task.source))
      errors.push(
        `${task.id}.source must cite an applicable AGENTS, master-plan, normative specification, or contract reference.`,
      );
    if (
      !Array.isArray(task.acceptance) ||
      !task.acceptance.length ||
      !task.acceptance.every((item) => typeof item === "string" && item.trim())
    )
      errors.push(
        `${task.id}.acceptance must be a non-empty list of testable criteria.`,
      );
  }
  for (const [id, task] of tasks) {
    const deps = Array.isArray(task.dependencies)
      ? task.dependencies.filter(
          (item) => typeof item === "string" && /^TASK-\d{4}$/.test(item),
        )
      : [];
    for (const dep of deps) {
      if (!tasks.has(dep)) errors.push(`${id} depends on missing task ${dep}.`);
      if (dep === id) errors.push(`${id} cannot depend on itself.`);
    }
    const valid = deps.filter((dep) => tasks.has(dep));
    if (
      task.status === "ready" &&
      valid.some((dep) => tasks.get(dep).status !== "complete")
    )
      errors.push(`${id} is ready before all dependencies are complete.`);
    if (
      task.status === "in_progress" &&
      valid.some(
        (dep) => !["complete", "superseded"].includes(tasks.get(dep).status),
      )
    )
      errors.push(`${id} is in progress before all dependencies are terminal.`);
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id, chain = []) {
    if (visiting.has(id)) {
      errors.push(`dependency cycle: ${[...chain, id].join(" -> ")}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const deps = Array.isArray(tasks.get(id).dependencies)
      ? tasks.get(id).dependencies
      : [];
    for (const dep of deps)
      if (typeof dep === "string" && tasks.has(dep)) visit(dep, [...chain, id]);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of tasks.keys()) visit(id);
  validateHistoricalReclassification(root, tasks, errors, recoveryFrozen);
  for (const [id, task] of tasks)
    if (
      task.status === "complete" &&
      (!isHistoricalTaskId(id) || !task.historical_evidence)
    )
      validateHandoff(root, id, errors);
  const hasReady = [...tasks.values()].some((task) => task.status === "ready");
  const terminal = [...tasks.values()].every((task) =>
    ["complete", "superseded"].includes(task.status),
  );
  const frozenSilentWork = [...tasks.values()].filter((task) =>
    ["planned", "in_progress"].includes(task.status),
  );
  if (recoveryFrozen && frozenSilentWork.length)
    errors.push(
      `A recovery-frozen queue must not contain planned or in_progress work: ${frozenSilentWork.map((task) => task.id).join(", ")}.`,
    );
  const freezeQuiescent =
    recoveryFrozen &&
    [...tasks.values()].every((task) =>
      ["complete", "superseded", "blocked"].includes(task.status),
    );
  if (!hasReady && !terminal && !freezeQuiescent)
    errors.push(
      "Task queue must have a ready task or have only terminal tasks unless it is explicitly frozen for recovery with every nonterminal task blocked.",
    );
  if (errors.length) throw new QueueValidationError(errors);
  return { state: terminal ? "terminal" : "active", tasks: tasks.size };
}
