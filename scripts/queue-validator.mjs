import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { parseDocument } from "yaml";

const STATUSES = new Set(["planned", "ready", "in_progress", "blocked", "complete", "superseded"]);
const RECLASSIFICATION_REPORT = "docs/governance/TASK-RECLASSIFICATION-007.md";
const HISTORICAL_CLASSIFICATIONS = new Set(["Proven production implementation", "Proven reference implementation", "Contract/interface only", "Synthetic rehearsal only", "External prerequisite", "Incomplete", "Unsupported completion claim"]);
export const HANDOFF_FIELDS = [
  "Task and scope:", "Agent role:", "Role-file path and digest:", "Agent thread ID:", "Worktree and branch:", "Commit:", "Files changed:", "Specifications and contracts read:", "Acceptance criteria:", "Tests and commands run:", "Negative tests:", "Contracts/migrations:", "Security and tenant-isolation analysis:", "Audit/evidence behavior:", "Results:", "Rollback/corrective-forward plan:", "Documentation updated:", "Known risks and follow-ups:", "Known limitations:", "External prerequisites:", "Independent reviewer and review result:",
];
const PLACEHOLDER = /^(?:tbd(?:\s+(?:later|after\s+review))?|to\s+be\s+determined|unknown(?:\s+at\s+this\s+time)?|pending(?:\s+review)?|n\/?a|not\s+applicable|none|nil|-)$/i;

export class QueueValidationError extends Error {
  constructor(errors) {
    const shown = errors.slice(0, 25);
    super(`Task queue validation failed (${errors.length} violations):\n${shown.map((entry) => `- ${entry}`).join("\n")}${errors.length > shown.length ? `\n- ... ${errors.length - shown.length} additional violations are retained in artifacts/validation-report.json.errors.` : ""}`);
    this.name = "QueueValidationError";
    this.errors = errors;
  }
}

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const substantive = (value) => typeof value === "string" && value.trim().length > 0 && !PLACEHOLDER.test(value.trim());
const inside = (root, candidate) => candidate === root || candidate.startsWith(`${root}${path.sep}`);
const normative = (value) => typeof value === "string" && /(?:\bAGENTS\.md\b|docs\/MASTER_PLAN\.md|specs\/[A-Za-z0-9_/-]+\.md|contracts\/[A-Za-z0-9_/-]+\.(?:yaml|json))/i.test(value);
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function fields(body, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...body.matchAll(new RegExp(`^- ${escaped}[\\t ]*(.*)$`, "gmi"))].map((match) => match[1].trim());
}

function oneSubstantiveField(body, label, rel, errors) {
  const values = fields(body, label);
  if (values.length !== 1) {
    errors.push(`${rel} must contain exactly one ${label} field; found ${values.length}.`);
    return "";
  }
  if (!substantive(values[0])) {
    errors.push(`${rel} is missing substantive provenance/template field: ${label}`);
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
    errors.push(`${description} resolves through a symlink/reparse point outside the repository.`);
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
  if (path.isAbsolute(normalized) || normalized.split("/").includes("..") || !inside(root, lexical)) {
    errors.push(`${description} must not escape the repository.`);
    return null;
  }
  return { normalized, lexical };
}

function immutableArtifact(root, artifact, commit, description, errors) {
  const safe = repositoryRelative(root, artifact, description, errors);
  if (!safe || !/^[a-f0-9]{40}$/i.test(commit || "")) {
    if (safe && !/^[a-f0-9]{40}$/i.test(commit || "")) errors.push(`${description} must identify a 40-character immutable Git commit.`);
    return null;
  }
  try {
    return execFileSync("git", ["show", `${commit}:${safe.normalized}`], { cwd: root });
  } catch {
    errors.push(`${description} cannot be resolved at immutable commit ${commit}.`);
    return null;
  }
}

function readReclassificationReport(root, errors) {
  const report = containedFile(root, path.join(root, RECLASSIFICATION_REPORT), RECLASSIFICATION_REPORT, errors);
  if (!report) return null;
  const body = fs.readFileSync(report, "utf8");
  const match = body.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!match) {
    errors.push(`${RECLASSIFICATION_REPORT} must contain one JSON evidence-record code block.`);
    return null;
  }
  try { return JSON.parse(match[1]); } catch { errors.push(`${RECLASSIFICATION_REPORT} contains invalid JSON evidence records.`); return null; }
}

function validateHistoricalReclassification(root, tasks, errors, frozen) {
  const historical = [...tasks.values()].filter((task) => /^TASK-\d{4}$/.test(task.id));
  const requiresReport = frozen || historical.some((task) => task.report_row || task.classification || task.historical_evidence);
  if (!requiresReport) return;
  const report = readReclassificationReport(root, errors);
  if (!object(report) || report.version !== 1 || !Array.isArray(report.records)) {
    errors.push(`${RECLASSIFICATION_REPORT} must provide version: 1 and records.`);
    return;
  }
  const records = new Map();
  for (const record of report.records) {
    if (!object(record) || typeof record.id !== "string" || !/^TASK-\d{4}$/.test(record.id)) { errors.push(`${RECLASSIFICATION_REPORT} contains an invalid record ID.`); continue; }
    if (records.has(record.id)) { errors.push(`${RECLASSIFICATION_REPORT} duplicates ${record.id}.`); continue; }
    records.set(record.id, record);
    if (!HISTORICAL_CLASSIFICATIONS.has(record.classification)) errors.push(`${RECLASSIFICATION_REPORT} ${record.id} has an unknown classification.`);
    const bytes = immutableArtifact(root, record.artifact, record.artifact_commit, `${RECLASSIFICATION_REPORT} ${record.id}.artifact`, errors);
    if (bytes && (!/^[a-f0-9]{64}$/i.test(record.artifact_sha256 || "") || sha256(bytes) !== record.artifact_sha256)) errors.push(`${RECLASSIFICATION_REPORT} ${record.id} has a stale or incorrect artifact SHA-256.`);
    if (typeof record.evidence_excerpt !== "string" || !record.evidence_excerpt.trim()) errors.push(`${RECLASSIFICATION_REPORT} ${record.id} has an absent evidence excerpt.`);
    else if (/\b(?:no|none|absent|missing)\b[^\n]*(?:command|test|result|evidence)/i.test(record.evidence_excerpt)) errors.push(`${RECLASSIFICATION_REPORT} ${record.id} contains a fabricated no-evidence assertion.`);
    else if (bytes && !bytes.toString("utf8").includes(record.evidence_excerpt)) errors.push(`${RECLASSIFICATION_REPORT} ${record.id} excerpt is absent from its immutable artifact.`);
    if (typeof record.limitation !== "string" || !record.limitation.includes(record.id)) errors.push(`${RECLASSIFICATION_REPORT} ${record.id} needs a task-specific limitation.`);
  }
  if (records.size !== historical.length) errors.push(`${RECLASSIFICATION_REPORT} must contain exactly ${historical.length} task records.`);
  for (const task of historical) {
    const record = records.get(task.id);
    if (!record) { errors.push(`${task.id} is absent from ${RECLASSIFICATION_REPORT}.`); continue; }
    if (task.status !== "blocked") errors.push(`${task.id} must remain blocked during historical-evidence recovery.`);
    if (task.classification !== record.classification || task.report_row !== task.id) errors.push(`${task.id} has a queue/report classification binding mismatch.`);
    const evidence = task.historical_evidence;
    if (!object(evidence) || typeof evidence.evidence_excerpt !== "string" || !evidence.evidence_excerpt.trim() || evidence.artifact !== record.artifact || evidence.artifact_sha256 !== record.artifact_sha256 || evidence.artifact_commit !== record.artifact_commit || evidence.evidence_excerpt !== record.evidence_excerpt) errors.push(`${task.id} has a queue/report immutable-evidence mismatch.`);
    if (task.classification === "Proven production implementation") {
      const proof = task.production_proof;
      if (!object(proof) || !substantive(proof.runtime) || !substantive(proof.security) || !substantive(proof.tenant_isolation) || !substantive(proof.independent_qa)) errors.push(`${task.id} cannot claim proven production implementation without runtime, security, tenant-isolation, and independent-QA proof.`);
    }
  }
}

function validateInput(root, input, taskId, errors) {
  if (typeof input !== "string" || !input.trim()) {
    errors.push(`${taskId}.inputs must contain non-empty repository-relative paths.`);
    return;
  }
  const normalized = input.replace(/\\/g, "/");
  const lexical = path.resolve(root, normalized);
  if (path.isAbsolute(normalized) || normalized.split("/").includes("..") || !inside(root, lexical)) {
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
    const near = fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.startsWith(id)) : [];
    errors.push(`${id} lacks the correctly named handoff ${rel}${near.length ? ` (found: ${near.join(", ")})` : ""}.`);
    return;
  }
  const safeHandoff = containedFile(root, absolute, rel, errors);
  if (!safeHandoff) return;
  const body = fs.readFileSync(safeHandoff, "utf8");
  const values = new Map(HANDOFF_FIELDS.map((label) => [label, oneSubstantiveField(body, label, rel, errors)]));
  if (!new RegExp(`\\b${id}\\b`).test(body)) errors.push(`${rel} does not identify ${id}.`);
  if (!/^(Backend|Frontend|Schema\/Search\/AI|Independent QA\/Security)$/i.test(values.get("Agent role:"))) errors.push(`${rel} must name a documented specialist role.`);
  if (!/agents\/[A-Z_]+\.md.*\b[a-f0-9]{64}\b/i.test(values.get("Role-file path and digest:"))) errors.push(`${rel} must provide an agents role-file path and SHA-256 digest.`);
  if (!/^\/?root\/[a-z0-9_/-]+$/i.test(values.get("Agent thread ID:"))) errors.push(`${rel} must provide a concrete agent thread ID.`);
  if (!/worktree/i.test(values.get("Worktree and branch:")) || !/branch\s+[^\s]+/i.test(values.get("Worktree and branch:"))) errors.push(`${rel} must provide concrete worktree and branch provenance.`);
  if (!/\b[a-f0-9]{7,64}\b/i.test(values.get("Commit:"))) errors.push(`${rel} must provide a concrete candidate commit.`);
  const review = values.get("Independent reviewer and review result:") || "";
  if (!/Independent QA\/Security/i.test(review) || !/\bPASS\b/i.test(review) || /\b(pending|reject|fail|unknown)\b/i.test(review)) errors.push(`${rel} requires an independent QA/Security reviewer and a PASS result for completed work.`);
  if (id === "TASK-0109") {
    const tests = values.get("Tests and commands run:") || "";
    if (/docs\/handoffs\/|handoff[^\n]*\.md|\bfile existence\b/i.test(tests) || !/\b(node|npm|powershell|pytest|vitest|jest|command|pass(?:ed)?|fail(?:ed)?)\b/i.test(tests)) errors.push(`${rel} cannot use handoff Markdown or file existence as TASK-0109 test evidence; record actual tests, commands, and results.`);
  }
}

export function validateQueueDocument(content, root) {
  const doc = parseDocument(content);
  if (doc.errors.length) throw new QueueValidationError(doc.errors.map((error) => `tasks/queue.yaml is not valid YAML: ${error.message}`));
  const queue = doc.toJS({ maxAliasCount: 100 });
  if (!object(queue) || queue.version !== 1 || !Array.isArray(queue.tasks) || !queue.tasks.length) throw new QueueValidationError(["tasks/queue.yaml must contain version: 1 and a non-empty tasks list."]);
  const errors = [];
  const recoveryFrozen = queue.recovery_freeze === true;
  if (Object.hasOwn(queue, "recovery_freeze") && queue.recovery_freeze !== true) errors.push("recovery_freeze must be literal true when present; recovery may not silently disable validation.");
  const tasks = new Map();
  for (const task of queue.tasks) {
    if (!object(task) || typeof task.id !== "string" || !/^TASK-\d{4}$/.test(task.id)) { errors.push("every task must have an id matching TASK-0000."); continue; }
    if (tasks.has(task.id)) { errors.push(`duplicate task id: ${task.id}`); continue; }
    tasks.set(task.id, task);
    if (typeof task.title !== "string" || !task.title.trim()) errors.push(`${task.id}.title must be a non-empty string.`);
    if (!STATUSES.has(task.status)) errors.push(`${task.id}.status must be one of ${[...STATUSES].join(", ")}.`);
    if (!Array.isArray(task.dependencies) || !task.dependencies.every((item) => typeof item === "string" && /^TASK-\d{4}$/.test(item))) errors.push(`${task.id}.dependencies must be a list of task IDs.`);
    if (!Array.isArray(task.inputs) || !task.inputs.length) errors.push(`${task.id}.inputs must be a non-empty list of structured input paths.`); else for (const input of task.inputs) validateInput(root, input, task.id, errors);
    if (!normative(task.source)) errors.push(`${task.id}.source must cite an applicable AGENTS, master-plan, normative specification, or contract reference.`);
    if (!Array.isArray(task.acceptance) || !task.acceptance.length || !task.acceptance.every((item) => typeof item === "string" && item.trim())) errors.push(`${task.id}.acceptance must be a non-empty list of testable criteria.`);
  }
  for (const [id, task] of tasks) {
    const deps = Array.isArray(task.dependencies) ? task.dependencies.filter((item) => typeof item === "string" && /^TASK-\d{4}$/.test(item)) : [];
    for (const dep of deps) { if (!tasks.has(dep)) errors.push(`${id} depends on missing task ${dep}.`); if (dep === id) errors.push(`${id} cannot depend on itself.`); }
    const valid = deps.filter((dep) => tasks.has(dep));
    if (task.status === "ready" && valid.some((dep) => tasks.get(dep).status !== "complete")) errors.push(`${id} is ready before all dependencies are complete.`);
    if (task.status === "in_progress" && valid.some((dep) => !["complete", "superseded"].includes(tasks.get(dep).status))) errors.push(`${id} is in progress before all dependencies are terminal.`);
  }
  const visiting = new Set(); const visited = new Set();
  function visit(id, chain = []) { if (visiting.has(id)) { errors.push(`dependency cycle: ${[...chain, id].join(" -> ")}`); return; } if (visited.has(id)) return; visiting.add(id); const deps = Array.isArray(tasks.get(id).dependencies) ? tasks.get(id).dependencies : []; for (const dep of deps) if (typeof dep === "string" && tasks.has(dep)) visit(dep, [...chain, id]); visiting.delete(id); visited.add(id); }
  for (const id of tasks.keys()) visit(id);
  validateHistoricalReclassification(root, tasks, errors, recoveryFrozen);
  for (const [id, task] of tasks) if (task.status === "complete") validateHandoff(root, id, errors);
  const hasReady = [...tasks.values()].some((task) => task.status === "ready");
  const terminal = [...tasks.values()].every((task) => ["complete", "superseded"].includes(task.status));
  const fullyFrozen = recoveryFrozen && [...tasks.values()].every((task) => task.status === "blocked");
  if (!hasReady && !terminal && !fullyFrozen) errors.push("Task queue must have a ready task or have only terminal tasks unless it is explicitly frozen for recovery.");
  if (errors.length) throw new QueueValidationError(errors);
  return { state: terminal ? "terminal" : "active", tasks: tasks.size };
}
