import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";
import prettier from "prettier";

const candidates = [
  "scripts/closure-format-check.mjs",
  "scripts/closure-format-check.test.mjs",
  "scripts/historical-closure-validator.mjs",
  "scripts/historical-closure-validator.test.mjs",
  "docs/governance/delivery-governance.md",
  "docs/governance/task-closures/TASK-0001.json",
  "docs/governance/task-closures/rejected/TASK-0001-r1.json",
  "docs/governance/task-closures/TASK-0001-stage-a-state.json",
  "docs/governance/task-closures/evidence/TASK-0001-validation-report.json",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R2.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R3.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R4.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R5.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R6.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R7.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R8.yaml",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R2.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R3.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R4.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R5.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R6.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R7.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R8.md",
  "docs/reviews/RECOVERY-TASK-0001-CLOSURE-002-QA.md",
  "docs/reviews/RECOVERY-TASK-0001-CLOSURE-002-R2-QA.md",
  "docs/reviews/RECOVERY-TASK-0001-CLOSURE-002-R3-QA.md",
];

function noTrailingWhitespace(rel, body, errors) {
  body.split(/\r?\n/).forEach((line, index) => {
    if (/[\t ]+$/.test(line))
      errors.push(`${rel}:${index + 1} has trailing whitespace.`);
  });
}

export function canonicalStageAState(body) {
  const value = {
    version: 1,
    task_id: "TASK-0001",
    active_recovery_task: "RECOVERY-TASK-0001-CLOSURE-002-R8",
    predecessor_task: "RECOVERY-TASK-0001-CLOSURE-002-R7",
    predecessor_disposition: "REJECTED",
    task_status: "blocked",
    attestation_status: "absent",
    review_target: "R8_HANDOFF_CANDIDATE",
    activation_phase: "STAGE_A_REVIEW_PENDING",
    next_action: "FRESH_QA_REVIEW_THEN_ATTEST_IF_ACCEPTED",
  };
  return (
    typeof body === "string" &&
    body.replace(/\r\n/g, "\n") === `${JSON.stringify(value, null, 2)}\n`
  );
}

export function canonicalTaskOneRow() {
  return "| TASK-0001 | docs/MASTER_PLAN.md; tasks/queue.yaml; tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R8.yaml; docs/governance/task-closures/TASK-0001-stage-a-state.json | Original repository baseline criteria and corrective evidence are preserved. | Historical implementation and QA evidence remain immutable. | Prior local validation evidence remains historical. | Hosted observations remain immutable snapshots. | Governance-only correction; runtime security behavior is unchanged. | Raw evidence and provenance remain append-only. | Unsupported completion claim. | blocked | Authoritative state: docs/governance/task-closures/TASK-0001-stage-a-state.json; all matrix prose is non-authoritative. | Hosted API facts retain their documented snapshot boundary. | Backend owns corrective control; separation of duties remains required. | R8 closed-world matrix state control, tests, task, and handoff only. | None for this corrective control. | Canonical whole-row and state-blob validation, formatting, full-suite, audit, fsck, and diff gates. | Correct forward only; preserve every prior candidate and QA disposition. | Follow the authoritative state record and R8 handoff. |";
}

export async function validateClosureFormatting(root) {
  const listed = candidates.filter((rel) =>
    fs.existsSync(path.join(root, rel)),
  );
  const errors = [];
  for (const rel of listed) {
    const absolute = path.join(root, rel);
    const actual = fs.readFileSync(absolute, "utf8").replace(/\r\n/g, "\n");
    const expected = await prettier.format(actual, {
      filepath: absolute,
      endOfLine: "lf",
    });
    if (actual !== expected)
      errors.push(`${rel} is not formatted by pinned Prettier.`);
  }

  const matrixRel = "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md";
  const matrix = fs.readFileSync(path.join(root, matrixRel), "utf8");
  noTrailingWhitespace(matrixRel, matrix, errors);
  const matrixRows = matrix
    .split(/\r?\n/)
    .filter((line) => /^\| TASK-\d{4} \|/.test(line));
  if (matrixRows.length !== 110)
    errors.push(`${matrixRel} must retain exactly 110 single-line task rows.`);
  for (const row of matrixRows)
    if (row.slice(1, -1).split("|").length !== 18)
      errors.push(`${matrixRel} ${row.slice(2, 11)} must retain 18 fields.`);
  const taskOne =
    matrixRows.find((row) => row.startsWith("| TASK-0001 |")) || "";
  if (taskOne !== canonicalTaskOneRow())
    errors.push(
      `${matrixRel} TASK-0001 must equal the exact canonical whole row.`,
    );
  const stateRel = "docs/governance/task-closures/TASK-0001-stage-a-state.json";
  const statePath = path.join(root, stateRel);
  const stateDir = path.dirname(statePath);
  const lookalikes = fs.existsSync(stateDir)
    ? fs
        .readdirSync(stateDir)
        .filter((name) => /task-?0001.*stage.*a.*state/i.test(name))
    : [];
  if (lookalikes.length !== 1 || lookalikes[0] !== path.basename(stateRel))
    errors.push(
      `${stateRel} must be the repository's only TASK-0001 Stage A state record.`,
    );
  let regular = false;
  try {
    const stat = fs.lstatSync(statePath);
    regular =
      stat.isFile() &&
      !stat.isSymbolicLink() &&
      fs.realpathSync
        .native(statePath)
        .startsWith(`${fs.realpathSync.native(root)}${path.sep}`);
  } catch {}
  let indexEntry = "";
  try {
    indexEntry = execFileSync("git", ["ls-files", "-s", "--", stateRel], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {}
  if (
    !regular ||
    !/^100644 [a-f0-9]{40} 0\tdocs\/governance\/task-closures\/TASK-0001-stage-a-state\.json$/.test(
      indexEntry,
    )
  )
    errors.push(
      `${stateRel} must be one contained regular Git blob with mode 100644.`,
    );
  if (!regular || !canonicalStageAState(fs.readFileSync(statePath, "utf8")))
    errors.push(
      `${stateRel} must be the one exact canonical R8 Stage A state record.`,
    );

  const queueRel = "scripts/queue-validator.mjs";
  const queueValidator = fs.readFileSync(path.join(root, queueRel), "utf8");
  noTrailingWhitespace(queueRel, queueValidator, errors);
  for (const required of [
    'import { validateHistoricalClosures } from "./historical-closure-validator.mjs";',
    "validateHistoricalClosures(root, tasks, errors);",
  ]) {
    if (queueValidator.split(required).length !== 2)
      errors.push(
        `${queueRel} must contain exactly one closure integration hook: ${required}`,
      );
  }
  return { errors, listed };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { errors, listed } = await validateClosureFormatting(process.cwd());
  if (errors.length) {
    console.error(
      `Closure formatting validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Closure formatting passed: ${listed.length} pinned-Prettier files; matrix and legacy queue-validator stable exclusions validated structurally.`,
    );
  }
}
