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

test("recovery freeze blocks promotion but preserves every structural and immutable-evidence validation", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "upfs-reclassification-"));
  fs.mkdirSync(path.join(root, "specs"), { recursive: true });
  fs.writeFileSync(path.join(root, "specs/input.md"), "input\n");
  fs.mkdirSync(path.join(root, "docs/handoffs"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs/governance"), { recursive: true });
  const artifact = "docs/handoffs/TASK-0001.md";
  const bytes = Buffer.from("- Tests and commands run: `node --test service.test.mjs` PASS\n");
  fs.writeFileSync(path.join(root, artifact), bytes);
  for (const args of [["init"], ["config", "user.email", "qa@example.invalid"], ["config", "user.name", "QA"], ["add", "."], ["commit", "-m", "fixture"]]) execFileSync("git", args, { cwd: root, stdio: "ignore" });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const record = { id: "TASK-0001", classification: "Unsupported completion claim", artifact, artifact_sha256: crypto.createHash("sha256").update(bytes).digest("hex"), artifact_commit: commit, evidence_excerpt: "- Tests and commands run: `node --test service.test.mjs` PASS", limitation: "TASK-0001 requires independent revalidation." };
  const report = (value) => `# report\n\n\`\`\`json\n${JSON.stringify({ version: 1, records: [value] })}\n\`\`\`\n`;
  const queue = (changes = {}) => `version: 1
recovery_freeze: ${changes.freeze ?? "true"}
tasks:
  - id: TASK-0001
    title: historical
    status: ${changes.status ?? "blocked"}
    dependencies: []
${changes.inputs === false ? "" : `    inputs: ${changes.inputs ?? "[specs/input.md]"}\n`}${changes.source === false ? "" : `    source: ${changes.source ?? "specs/input.md"}\n`}${changes.acceptance === false ? "" : `    acceptance: ${changes.acceptance ?? "[result]"}\n`}    classification: ${changes.classification ?? "Unsupported completion claim"}
    report_row: ${changes.report_row ?? "TASK-0001"}
    historical_evidence:
      artifact: ${changes.artifact ?? artifact}
      artifact_sha256: ${changes.artifact_sha256 ?? record.artifact_sha256}
      artifact_commit: ${changes.artifact_commit ?? commit}
      evidence_excerpt: ${JSON.stringify(changes.evidence_excerpt ?? record.evidence_excerpt)}
`;
  const reportPath = path.join(root, "docs/governance/TASK-RECLASSIFICATION-007.md");
  const writeReport = (value) => fs.writeFileSync(reportPath, report(value));
  writeReport(record);
  validateQueueDocument(queue(), root);
  invalid(root, queue({ classification: "Synthetic rehearsal only", report_row: "WRONG" }), "classification binding mismatch");
  invalid(root, queue({ artifact: "docs/handoffs/fabricated.md", artifact_sha256: "a".repeat(64), artifact_commit: "a".repeat(40), evidence_excerpt: "fabricated" }), "immutable-evidence mismatch");
  invalid(root, queue({ inputs: "[../secret.md]" }), "must not escape");
  invalid(root, queue({ inputs: false }), "inputs must be");
  invalid(root, queue({ source: false }), "source must cite");
  invalid(root, queue({ acceptance: false }), "acceptance must be");
  invalid(root, queue({ freeze: "false" }), "recovery_freeze must be literal true");
  writeReport({ ...record, evidence_excerpt: "- Tests and commands run: fabricated" });
  invalid(root, queue(), "excerpt is absent");
  writeReport({ ...record, evidence_excerpt: "No command or test result is recorded." });
  invalid(root, queue(), "fabricated no-evidence assertion");
  const { evidence_excerpt, ...withoutExcerpt } = record;
  writeReport(withoutExcerpt);
  invalid(root, queue(), "absent evidence excerpt");
  writeReport({ ...record, evidence_excerpt: null });
  invalid(root, queue(), "absent evidence excerpt");
  writeReport({ ...record, evidence_excerpt: "" });
  invalid(root, queue(), "absent evidence excerpt");
  writeReport(record);
  invalid(root, queue().replace(/^\s+evidence_excerpt:.*\n/m, ""), "immutable-evidence mismatch");
  invalid(root, queue().replace(/(evidence_excerpt:) .*$/m, "$1 null"), "immutable-evidence mismatch");
  writeReport({ ...record, artifact_sha256: "a".repeat(64) });
  invalid(root, queue(), "stale or incorrect artifact SHA-256");
  fs.writeFileSync(reportPath, `# report\n\n\`\`\`json\n${JSON.stringify({ version: 1, records: [record, record] })}\n\`\`\`\n`);
  invalid(root, queue(), "duplicates TASK-0001");
  fs.writeFileSync(reportPath, `# report\n\n\`\`\`json\n${JSON.stringify({ version: 1, records: [] })}\n\`\`\`\n`);
  invalid(root, queue(), "absent from");
  const production = { ...record, classification: "Proven production implementation" };
  writeReport(production);
  invalid(root, queue({ classification: "Proven production implementation" }), "cannot claim proven production implementation");
});
