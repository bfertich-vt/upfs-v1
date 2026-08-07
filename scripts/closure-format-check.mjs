import fs from "node:fs";
import path from "node:path";
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
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R2.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R3.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R4.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R5.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R6.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R7.md",
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
    active_recovery_task: "RECOVERY-TASK-0001-CLOSURE-002-R7",
    predecessor_task: "RECOVERY-TASK-0001-CLOSURE-002-R6",
    predecessor_disposition: "REJECTED",
    task_status: "blocked",
    attestation_status: "absent",
    review_target: "R7_HANDOFF_CANDIDATE",
    activation_phase: "STAGE_A_REVIEW_PENDING",
    next_action: "FRESH_QA_REVIEW_THEN_ATTEST_IF_ACCEPTED",
  };
  return (
    typeof body === "string" &&
    body.replace(/\r\n/g, "\n") === `${JSON.stringify(value, null, 2)}\n`
  );
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
  const stateRel = "docs/governance/task-closures/TASK-0001-stage-a-state.json";
  const marker = `Authoritative state: ${stateRel}; all matrix prose is non-authoritative.`;
  if (taskOne.split(marker).length !== 2)
    errors.push(
      `${matrixRel} TASK-0001 must contain exactly one canonical authoritative-state marker.`,
    );
  const withoutMarker = taskOne.replace(marker, "");
  if (
    /\b(?:active(?:_round)?|attestation|issued|absent|accepted|rejected|review_target|activation_phase|next_action|reviews?\s+R\d+)\b/i.test(
      withoutMarker,
    )
  )
    errors.push(
      `${matrixRel} TASK-0001 prose must not make or override authoritative state claims.`,
    );
  const statePath = path.join(root, stateRel);
  if (
    !fs.existsSync(statePath) ||
    !canonicalStageAState(fs.readFileSync(statePath, "utf8"))
  )
    errors.push(
      `${stateRel} must be the one exact canonical R7 Stage A state record.`,
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
