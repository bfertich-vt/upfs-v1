import fs from "node:fs";
import path from "node:path";
import { parseDocument } from "yaml";

const STATUSES = new Set(["planned", "ready", "in_progress", "blocked", "complete", "superseded"]);
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
  for (const [id, task] of tasks) if (task.status === "complete") validateHandoff(root, id, errors);
  const hasReady = [...tasks.values()].some((task) => task.status === "ready");
  const terminal = [...tasks.values()].every((task) => ["complete", "superseded"].includes(task.status));
  if (!hasReady && !terminal) errors.push("Task queue must have a ready task or have only terminal tasks.");
  if (errors.length) throw new QueueValidationError(errors);
  return { state: terminal ? "terminal" : "active", tasks: tasks.size };
}
