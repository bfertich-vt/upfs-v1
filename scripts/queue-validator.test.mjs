import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { HANDOFF_FIELDS, QueueValidationError, validateQueueDocument } from "./queue-validator.mjs";

function fixture() { const root = fs.mkdtempSync(path.join(os.tmpdir(), "upfs-queue-")); fs.mkdirSync(path.join(root, "specs"), { recursive: true }); fs.writeFileSync(path.join(root, "specs/input.md"), "input\n"); return root; }
function task(x = {}) { return `version: 1\ntasks:\n  - id: ${x.id ?? "TASK-0001"}\n    title: Test\n    status: ${x.status ?? "ready"}\n    dependencies: ${x.dependencies ?? "[]"}\n${x.inputs === false ? "" : `    inputs: ${x.inputs ?? "[specs/input.md]"}\n`}${x.source === false ? "" : `    source: ${x.source ?? "specs/input.md"}\n`}${x.acceptance === false ? "" : `    acceptance: ${x.acceptance ?? "[result]"}\n`}`; }
function invalid(root, content, needle) { assert.throws(() => validateQueueDocument(content, root), new RegExp(needle)); }
function handoff(id, overrides = {}) { const values = { "Task and scope:": `${id} scope`, "Agent role:": "Backend", "Role-file path and digest:": "agents/BACKEND.md sha256 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "Agent thread ID:": "/root/backend_queue_control_plane_v7", "Worktree and branch:": "worktree C:\\source\\test; branch recovery/test", "Commit:": "abcdef1", "Files changed:": "scripts/queue-validator.mjs", "Specifications and contracts read:": "specs/09_cicd/delivery_pipeline.md", "Acceptance criteria:": "validator rejects invalid data", "Tests and commands run:": "node --test scripts/queue-validator.test.mjs PASS", "Negative tests:": "path traversal", "Contracts/migrations:": "No contracts or migrations", "Security and tenant-isolation analysis:": "no tenant runtime", "Audit/evidence behavior:": "aggregate errors", "Results:": "PASS", "Rollback/corrective-forward plan:": "reviewed revert", "Documentation updated:": "handoff", "Known risks and follow-ups:": "reclassify historical tasks", "Known limitations:": "Historical evidence remains untrusted and requires reclassification.", "External prerequisites:": "No external prerequisites", "Independent reviewer and review result:": "Independent QA/Security /root/qa_queue PASS", ...overrides }; return `${id}\n${Object.entries(values).map(([label, value]) => `- ${label} ${value}`).join("\n")}\n`; }
test("accepts valid ready task and rejects malformed YAML/IDs/statuses", () => { const root = fixture(); validateQueueDocument(task(), root); invalid(root, "version: 1\ntasks: [", "not valid YAML"); invalid(root, task({ id: "bad" }), "TASK-0000"); invalid(root, task({ status: "done" }), "status must be"); });
test("aggregates malformed dependency scalar/object/array with unsafe input/source/AC", () => { const root = fixture(); for (const dependencies of ["TASK-0002", "{ bad: TASK-0002 }", "[TASK-0002, 42]"]) assert.throws(() => validateQueueDocument(task({ dependencies, inputs: "[../secret.md]", source: "arbitrary prose", acceptance: "[]" }), root), (error) => { assert.ok(error instanceof QueueValidationError); for (const text of ["dependencies must be", "must not escape", "source must cite", "acceptance must be"]) assert.ok(error.errors.some((entry) => entry.includes(text))); return true; }); });
test("rejects dependencies cycles and early ready state", () => { const root = fixture(); invalid(root, task({ dependencies: "[TASK-9999]" }), "depends on missing"); invalid(root, `version: 1\ntasks:\n  - id: TASK-0001\n    title: one\n    status: planned\n    dependencies: [TASK-0002]\n    inputs: [specs/input.md]\n    source: specs/input.md\n    acceptance: [one]\n  - id: TASK-0002\n    title: two\n    status: planned\n    dependencies: [TASK-0001]\n    inputs: [specs/input.md]\n    source: specs/input.md\n    acceptance: [two]\n`, "dependency cycle"); });
test("requires exact substantive handoffs, QA PASS, and rejects T0021/T0022", () => { const root = fixture(); fs.mkdirSync(path.join(root, "docs/handoffs"), { recursive: true }); fs.writeFileSync(path.join(root, "docs/handoffs/TASK-0021-admin-console.md"), handoff("TASK-0021")); invalid(root, task({ id: "TASK-0021", status: "complete" }), "TASK-0021-admin-console.md"); invalid(root, task({ id: "TASK-0022", status: "complete" }), "TASK-0022.md"); for (const label of HANDOFF_FIELDS) { fs.writeFileSync(path.join(root, "docs/handoffs/TASK-0001.md"), handoff("TASK-0001", { [label]: "" })); invalid(root, task({ status: "complete" }), "missing substantive"); } });
test("rejects every duplicate exact template/provenance label", () => { const root = fixture(); fs.mkdirSync(path.join(root, "docs/handoffs"), { recursive: true }); for (const label of HANDOFF_FIELDS) { for (const second of ["", "TBD later", "contradictory alternative"]) { fs.writeFileSync(path.join(root, "docs/handoffs/TASK-0001.md"), `${handoff("TASK-0001").trimEnd()}\n- ${label} ${second}\n`); invalid(root, task({ status: "complete" }), `exactly one ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`); } } });
test("rejects TASK-0109 Markdown pseudo-test evidence", () => { const root = fixture(); fs.mkdirSync(path.join(root, "docs/handoffs"), { recursive: true }); fs.writeFileSync(path.join(root, "docs/handoffs/TASK-0109.md"), handoff("TASK-0109", { "Tests and commands run:": "docs/handoffs/TASK-0108.md file existence" })); invalid(root, task({ id: "TASK-0109", status: "complete" }), "cannot use handoff Markdown"); });
test("rejects an in-root symlink resolving outside root", (t) => { const root = fixture(), outside = fs.mkdtempSync(path.join(os.tmpdir(), "upfs-outside-")), outsideFile = path.join(outside, "outside.md"), link = path.join(root, "specs", "escape.md"); fs.writeFileSync(outsideFile, "outside\n"); try { fs.symlinkSync(outsideFile, link, "file"); } catch (error) { if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) { t.skip(`symlink unavailable: ${error.code}`); return; } throw error; } invalid(root, task({ inputs: "[specs/escape.md]" }), "symlink/reparse point outside"); });
test("rejects an exact-name handoff symlink outside root before reading it", (t) => { const root = fixture(), outside = fs.mkdtempSync(path.join(os.tmpdir(), "upfs-outside-")), outsideFile = path.join(outside, "TASK-0001.md"), dir = path.join(root, "docs/handoffs"), link = path.join(dir, "TASK-0001.md"); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(outsideFile, "outside content must not be read\n"); try { fs.symlinkSync(outsideFile, link, "file"); } catch (error) { if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) { t.skip(`symlink unavailable: ${error.code}`); return; } throw error; } invalid(root, task({ status: "complete" }), "docs/handoffs/TASK-0001.md resolves through a symlink/reparse point outside"); });
test("rejects placeholders but accepts explanatory limitation prose", () => { const root = fixture(); fs.mkdirSync(path.join(root, "docs/handoffs"), { recursive: true }); for (const value of ["TBD later", "unknown at this time", "pending review", "N/A", "not applicable", "-"]) { fs.writeFileSync(path.join(root, "docs/handoffs/TASK-0001.md"), handoff("TASK-0001", { "Known limitations:": value })); invalid(root, task({ status: "complete" }), "missing substantive"); } fs.writeFileSync(path.join(root, "docs/handoffs/TASK-0001.md"), handoff("TASK-0001")); validateQueueDocument(task({ status: "complete" }), root); });
test("records every recovery candidate file in the authoritative handoff inventory", () => { const handoffPath = path.resolve("docs/handoffs/RECOVERY-QUEUE-VALIDATION-001.md"); const body = fs.readFileSync(handoffPath, "utf8"); const inventory = ["tasks/queue.yaml", "scripts/queue-validator.mjs", "scripts/queue-validator.test.mjs", "scripts/validate-repository.mjs", "tasks/recovery/RECOVERY-QUEUE-VALIDATION-001.yaml", "docs/handoffs/RECOVERY-QUEUE-VALIDATION-001.md"]; for (const relPath of inventory) assert.match(body, new RegExp(`Files changed:.*${relPath.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}`)); });

test("recovery freeze binds exactly TASK-0001 through TASK-0110 and permits a clean production append", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "upfs-reclassification-"));
  fs.mkdirSync(path.join(root, "specs"), { recursive: true });
  fs.writeFileSync(path.join(root, "specs/input.md"), "input\n");
  fs.mkdirSync(path.join(root, "docs/handoffs"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs/governance"), { recursive: true });
  const artifact = "docs/handoffs/historical-evidence.md";
  const bytes = Buffer.from("- Tests and commands run: `node --test service.test.mjs` PASS\n");
  fs.writeFileSync(path.join(root, artifact), bytes);
  for (const args of [["init"], ["config", "user.email", "qa@example.invalid"], ["config", "user.name", "QA"], ["add", "."], ["commit", "-m", "fixture"]]) execFileSync("git", args, { cwd: root, stdio: "ignore" });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const evidenceExcerpt = "- Tests and commands run: `node --test service.test.mjs` PASS";
  const record = (number) => ({ id: `TASK-${String(number).padStart(4, "0")}`, classification: "Unsupported completion claim", artifact, artifact_sha256: crypto.createHash("sha256").update(bytes).digest("hex"), artifact_commit: commit, evidence_excerpt: evidenceExcerpt, limitation: `TASK-${String(number).padStart(4, "0")} requires independent revalidation.` });
  const records = Array.from({ length: 110 }, (_, index) => record(index + 1));
  const report = (value = records) => `# report\n\n\`\`\`json\n${JSON.stringify({ version: 1, records: value })}\n\`\`\`\n`;
  const historicalTask = (value, changes = {}) => `  - id: ${value.id}
    title: historical
    status: ${changes.status ?? "blocked"}
    dependencies: []
${changes.inputs === false ? "" : `    inputs: ${changes.inputs ?? "[specs/input.md]"}\n`}${changes.source === false ? "" : `    source: ${changes.source ?? "specs/input.md"}\n`}${changes.acceptance === false ? "" : `    acceptance: ${changes.acceptance ?? "[result]"}\n`}    classification: ${changes.classification ?? value.classification}
    report_row: ${changes.report_row ?? value.id}
    historical_evidence:
      artifact: ${changes.artifact ?? artifact}
      artifact_sha256: ${changes.artifact_sha256 ?? value.artifact_sha256}
      artifact_commit: ${changes.artifact_commit ?? commit}
      evidence_excerpt: ${JSON.stringify(changes.evidence_excerpt ?? value.evidence_excerpt)}
`;
  const productionTask = (changes = {}) => `  - id: TASK-0111
    title: production append
    status: ${changes.status ?? "blocked"}
    dependencies: ${changes.dependencies ?? "[]"}
    inputs: [specs/input.md]
    source: specs/input.md
    acceptance: [production result]
${changes.historicalField ?? ""}`;
  const queue = (changes = {}) => `version: 1
recovery_freeze: ${changes.freeze ?? "true"}
tasks:
${records.filter((value) => value.id !== changes.omit).map((value) => historicalTask(value, value.id === changes.mutateId ? changes : {})).join("")}${changes.append ? productionTask(changes) : ""}`;
  const reportPath = path.join(root, "docs/governance/TASK-RECLASSIFICATION-007.md");
  const writeReport = (value) => fs.writeFileSync(reportPath, report(value));
  writeReport();
  validateQueueDocument(queue(), root);
  validateQueueDocument(queue({ append: true }), root);
  invalid(root, queue({ mutateId: "TASK-0001", classification: "Synthetic rehearsal only", report_row: "WRONG" }), "classification binding mismatch");
  invalid(root, queue({ mutateId: "TASK-0001", artifact: "docs/handoffs/fabricated.md", artifact_sha256: "a".repeat(64), artifact_commit: "a".repeat(40), evidence_excerpt: "fabricated" }), "immutable-evidence mismatch");
  invalid(root, queue({ mutateId: "TASK-0001", inputs: "[../secret.md]" }), "must not escape");
  invalid(root, queue({ mutateId: "TASK-0001", inputs: false }), "inputs must be");
  invalid(root, queue({ mutateId: "TASK-0001", source: false }), "source must cite");
  invalid(root, queue({ mutateId: "TASK-0001", acceptance: false }), "acceptance must be");
  invalid(root, queue({ freeze: "false" }), "recovery_freeze must be literal true");
  writeReport(records.map((value) => value.id === "TASK-0001" ? { ...value, evidence_excerpt: "- Tests and commands run: fabricated" } : value));
  invalid(root, queue(), "excerpt is absent");
  writeReport(records.map((value) => value.id === "TASK-0001" ? { ...value, evidence_excerpt: "No command or test result is recorded." } : value));
  invalid(root, queue(), "fabricated no-evidence assertion");
  const { evidence_excerpt, ...withoutExcerpt } = records[0];
  writeReport([withoutExcerpt, ...records.slice(1)]);
  invalid(root, queue(), "absent evidence excerpt");
  writeReport([{ ...records[0], evidence_excerpt: null }, ...records.slice(1)]);
  invalid(root, queue(), "absent evidence excerpt");
  writeReport([{ ...records[0], evidence_excerpt: "" }, ...records.slice(1)]);
  invalid(root, queue(), "absent evidence excerpt");
  writeReport();
  invalid(root, queue({ mutateId: "TASK-0001", evidence_excerpt: "" }), "immutable-evidence mismatch");
  invalid(root, queue().replace(/(evidence_excerpt:) .*$/m, "$1 null"), "immutable-evidence mismatch");
  writeReport([{ ...records[0], artifact_sha256: "a".repeat(64) }, ...records.slice(1)]);
  invalid(root, queue(), "stale or incorrect artifact SHA-256");
  writeReport([...records, records[0]]);
  invalid(root, queue(), "duplicates TASK-0001");
  writeReport(records.slice(1));
  invalid(root, queue(), "must contain exactly 110 task records");
  writeReport([...records, record(111)]);
  invalid(root, queue(), "outside the immutable TASK-0001 through TASK-0110 range");
  writeReport();
  invalid(root, queue({ append: true, historicalField: "    report_row: TASK-0111\n" }), "must not carry historical-only field report_row");
  invalid(root, queue({ append: true, dependencies: "[TASK-0001]", status: "ready" }), "ready before all dependencies are complete");
  const production = { ...records[0], classification: "Proven production implementation" };
  writeReport([production, ...records.slice(1)]);
  invalid(root, queue({ mutateId: "TASK-0001", classification: "Proven production implementation" }), "cannot claim proven production implementation");
});
