import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  validateCiGates,
  validateRuntimeCapabilities,
  validateTraceability,
} from "./ci-gate-validator.mjs";

const root = path.resolve(".");
const columns = [
  "Source file and section",
  "Requirement",
  "Current implementation files",
  "Contracts",
  "Tests",
  "Runtime evidence",
  "Security and tenant-isolation evidence",
  "Documentation",
  "Agent/QA provenance",
  "Classification",
  "Missing work",
  "External dependency",
  "Next authorized task",
];

function temp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function digest(file) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

function write(relativeRoot, relative, contents) {
  const file = path.join(relativeRoot, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
  return file;
}

function writeTraceabilityFixture(fixture) {
  const invoke = (directory, args) => {
    const result = spawnSync("git", ["-C", directory, ...args], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const authorWorktree = path.join(
    path.dirname(fixture),
    `upfs-${path.basename(fixture)}-author`,
  );
  fs.mkdirSync(authorWorktree, { recursive: true });
  invoke(authorWorktree, ["init", "--initial-branch=recovery/fixture"]);
  invoke(authorWorktree, ["config", "user.email", "fixture@example.test"]);
  invoke(authorWorktree, ["config", "user.name", "Fixture"]);
  write(authorWorktree, "agents/BACKEND.md", "# Backend fixture\n");
  write(authorWorktree, "agents/QA_SECURITY.md", "# QA fixture\n");
  write(authorWorktree, "evidence.txt", "fixture evidence\n");
  invoke(authorWorktree, ["add", "."]);
  invoke(authorWorktree, ["commit", "-m", "fixture evidence"]);
  const evidenceCommit = invoke(authorWorktree, ["rev-parse", "HEAD"]);
  write(
    authorWorktree,
    "tasks/recovery/fixture.yaml",
    `id: RECOVERY-FIXTURE\ninputs:\n  - agents/BACKEND.md\n  - agents/QA_SECURITY.md\n  - evidence.txt\nevidence_inputs:\n  - path: evidence.txt\n    commit: ${evidenceCommit}\n`,
  );
  invoke(authorWorktree, ["add", "."]);
  invoke(authorWorktree, ["commit", "-m", "fixture candidate"]);
  const candidate = invoke(authorWorktree, ["rev-parse", "HEAD"]);
  const reviewerWorktree = path.join(
    path.dirname(fixture),
    `upfs-${path.basename(fixture)}-reviewer`,
  );
  invoke(authorWorktree, [
    "worktree",
    "add",
    reviewerWorktree,
    "-b",
    "qa/fixture",
    candidate,
  ]);
  const authorDigest = digest(path.join(authorWorktree, "agents/BACKEND.md"));
  const reviewerDigest = digest(
    path.join(authorWorktree, "agents/QA_SECURITY.md"),
  );
  write(
    fixture,
    "docs/reviews/valid-qa.md",
    `- Agent role: Independent QA/Security\n- Role-file path and digest: \`agents/QA_SECURITY.md\`; SHA-256 \`${reviewerDigest}\`.\n- Agent thread ID: \`/root/fixture-qa\`.\n- Review worktree and branch: \`${reviewerWorktree}\`; \`qa/fixture\`.\n- Candidate implementation commit: \`${candidate}\`\n- Result: PASS\n`,
  );
  write(
    fixture,
    "docs/handoffs/valid-backend.md",
    `- Agent role: Backend\n- Role-file path and digest: \`agents/BACKEND.md\`; SHA-256 \`${authorDigest}\`.\n- Agent thread ID: \`/root/fixture-backend\`.\n- Worktree and branch: \`${authorWorktree}\`; \`recovery/fixture\`.\n- Commit: candidate \`${candidate}\`.\n- Structured task input: \`tasks/recovery/fixture.yaml\`.\n- Independent reviewer and review result: \`docs/reviews/valid-qa.md\`; PASS.\n`,
  );
  const sources = [
    "docs/MASTER_PLAN.md#Outcome",
    "docs/MASTER_PLAN.md#Delivery-stages",
    "docs/MASTER_PLAN.md#V1-acceptance-themes",
    "specs/01_product/vision_and_scope.md#Initial-commercial-slice",
    "specs/01_product/vision_and_scope.md#Platform-planes",
    "specs/01_product/vision_and_scope.md#Explicit-non-goals-for-v1",
    "specs/03_architecture/system_architecture.md#Data-path",
    "specs/03_architecture/system_architecture.md#Core-services",
    "specs/03_architecture/system_architecture.md#Multi-tenancy-and-scale",
    "specs/03_architecture/system_architecture.md#Reliability",
  ];
  for (const source of sources)
    write(fixture, source.split("#", 1)[0], `# ${source}\n`);
  const rows = Array.from({ length: 110 }, (_, index) => {
    const suffix = String(index + 1).padStart(4, "0");
    const paths = {
      implementation: `implementation-${suffix}.mjs`,
      contract: `contract-${suffix}.yaml`,
      test: `test-${suffix}.mjs`,
      runtime: `runtime-${suffix}.md`,
      security: `security-${suffix}.md`,
      documentation: `docs-${suffix}.md`,
    };
    for (const relative of Object.values(paths))
      write(fixture, relative, `specific evidence for ${relative}\n`);
    return [
      sources[index % sources.length],
      `TASK-${suffix} distinct normative requirement for bounded capability ${suffix}`,
      paths.implementation,
      paths.contract,
      paths.test,
      paths.runtime,
      paths.security,
      paths.documentation,
      "docs/handoffs/valid-backend.md",
      "Incomplete",
      `Distinct missing work for capability ${suffix} remains documented`,
      `External dependency status for capability ${suffix} is not required`,
      `RECOVERY-${suffix} is the next authorized task`,
    ];
  });
  rows.push([
    "specs/03_architecture/system_architecture.md#Data-path",
    "FDX-01 FDX-first connector strategy requires legacy security license compatibility and test review",
    "Not implemented: FDX adapter is absent",
    "Not implemented: FDX contract is absent",
    "Not implemented: provider test is absent",
    "Not implemented: sandbox runtime is absent",
    "Not implemented: legacy security review is absent",
    "docs/handoffs/valid-backend.md",
    "docs/handoffs/valid-backend.md",
    "External prerequisite",
    "FDX-first implementation and legacy security license compatibility test review remain absent",
    "External prerequisite: approved provider sandbox and legal review",
    "RECOVERY-FDX-01 is next",
  ]);
  write(
    fixture,
    "docs/MASTER_PLAN_TRACEABILITY.md",
    `| ${columns.join(" | ")} |\n| ${columns.map(() => "---").join(" | ")} |\n${rows.map((row) => `| ${row.join(" | ")} |`).join("\n")}\n`,
  );
  return { authorWorktree, candidate, reviewerWorktree };
}

function writeCapabilityFixture(fixture) {
  const policy = write(
    fixture,
    "registries/skills/policies/example.yaml",
    "schema_version: 1\nrules:\n  - id: deny-untrusted\n    effect: deny\n",
  );
  const evaluation = write(
    fixture,
    "registries/skills/evaluations/example.yaml",
    "schema_version: 1\nskill_id: example-skill\nskill_version: 1.0.0\nstatus: passed\nexecuted_at: 2026-08-01T00:00:00Z\ncases: 2\nassertions: 4\n",
  );
  write(
    fixture,
    "registries/skills/index.yaml",
    `schema_version: 1\nskills:\n  - id: example-skill\n    version: 1.0.0\n    digest: ${"a".repeat(64)}\n    owner: platform-control\n    policy:\n      path: registries/skills/policies/example.yaml\n      digest: ${digest(policy)}\n    evaluation:\n      path: registries/skills/evaluations/example.yaml\n      digest: ${digest(evaluation)}\n`,
  );
  write(
    fixture,
    "apps/customer-console/scripts/a11y.mjs",
    "console.log('4 accessibility assertions passed');\n",
  );
  write(
    fixture,
    "apps/customer-console/package.json",
    JSON.stringify({
      scripts: { "test:accessibility": "node scripts/a11y.mjs" },
    }),
  );
}

test("current CI gate wiring passes structural validation", () => {
  assert.deepEqual(validateCiGates(root), { status: "passed", errors: [] });
});

test("mutable actions and removed gates fail closed", () => {
  const fixture = temp("upfs-ci-gate-");
  fs.cpSync(path.join(root, ".github"), path.join(fixture, ".github"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(fixture, "package.json"),
    fs.readFileSync(path.join(root, "package.json")),
  );
  const workflow = path.join(fixture, ".github", "workflows", "validate.yml");
  fs.writeFileSync(
    workflow,
    fs
      .readFileSync(workflow, "utf8")
      .replace("npm run queue:check", "npm run queue:omitted")
      .replace("11bd71901bbe5b1630ceea73d27597364c9af683", "v4"),
  );
  const result = validateCiGates(fixture);
  assert.equal(result.status, "failed");
  assert.ok(
    result.errors.some((error) => error.includes("npm run queue:check")),
  );
  assert.ok(result.errors.some((error) => error.includes("immutable commit")));
});

test("traceability rejects headings-only, placeholders, repeated IDs, and nonexistent artifacts", () => {
  const fixture = temp("upfs-traceability-");
  assert.equal(validateTraceability(fixture).status, "failed");
  write(
    fixture,
    "docs/MASTER_PLAN_TRACEABILITY.md",
    `| ${columns.join(" | ")} |\n| ${columns.map(() => "---").join(" | ")} |\n`,
  );
  assert.equal(validateTraceability(fixture).status, "failed");
  writeTraceabilityFixture(fixture);
  assert.deepEqual(validateTraceability(fixture), {
    status: "passed",
    errors: [],
  });
  const matrix = path.join(fixture, "docs/MASTER_PLAN_TRACEABILITY.md");
  fs.writeFileSync(
    matrix,
    fs
      .readFileSync(matrix, "utf8")
      .replace("TASK-0002", "TASK-0001")
      .replace("implementation-0001.mjs", "missing.mjs"),
  );
  const result = validateTraceability(fixture);
  assert.equal(result.status, "failed");
  assert.ok(
    result.errors.some((error) =>
      error.includes("repeats requirement identifier TASK-0001"),
    ),
  );
  assert.ok(
    result.errors.some((error) =>
      error.includes("missing or resolves outside"),
    ),
  );
});

test("traceability rejects generic repeated bindings even when IDs are unique", () => {
  const fixture = temp("upfs-traceability-repeat-");
  writeTraceabilityFixture(fixture);
  const matrix = path.join(fixture, "docs/MASTER_PLAN_TRACEABILITY.md");
  const genericRow = [
    "specs/source-01.md#Requirement-01",
    "MP-01 generic repeated requirement 1",
    "implementation-01.mjs",
    "contract-01.yaml",
    "test-01.mjs",
    "runtime-01.md",
    "security-01.md",
    "docs-01.md",
    "provenance-01.md",
    "Proven reference implementation",
    "Generic missing work 1 remains documented",
    "External dependency status 1 is not required",
    "RECOVERY-01 is the next authorized task",
  ];
  const uniqueButGeneric = Array.from({ length: 10 }, (_, index) => {
    const id = String(index + 1).padStart(2, "0");
    const row = [...genericRow];
    row[1] = `MP-${id} generic repeated requirement ${index + 1}`;
    row[10] = `Generic missing work ${index + 1} remains documented`;
    row[11] = `External dependency status ${index + 1} is not required`;
    row[12] = `RECOVERY-${id} is the next authorized task`;
    return row.join(" | ");
  });
  fs.writeFileSync(
    matrix,
    `| ${columns.join(" | ")} |\n| ${columns.map(() => "---").join(" | ")} |\n${uniqueButGeneric.map((row) => `| ${row} |`).join("\n")}\n`,
  );
  const result = validateTraceability(fixture);
  assert.equal(result.status, "failed");
  assert.ok(
    result.errors.some((error) =>
      error.includes("normalized requirement-to-evidence binding"),
    ),
  );
});

test("traceability rejects spoofed reviewer provenance and required coverage omissions", () => {
  const fixture = temp("upfs-traceability-reviewer-");
  writeTraceabilityFixture(fixture);
  const mutateReview = (replace, expected) => {
    const review = path.join(fixture, "docs/reviews/valid-qa.md");
    const original = fs.readFileSync(review, "utf8");
    fs.writeFileSync(review, replace(original));
    const result = validateTraceability(fixture);
    assert.equal(result.status, "failed");
    assert.ok(
      result.errors.some((error) => error.includes(expected)),
      result.errors.join(" | "),
    );
    fs.writeFileSync(review, original);
  };
  mutateReview(
    (text) =>
      text.replace(
        /Review worktree and branch: `[^`]+`/,
        "Review worktree and branch: `C:\\not-real`",
      ),
    "reviewer worktree does not exist",
  );
  mutateReview(
    (text) => text.replace("qa/fixture", "qa/missing"),
    "reviewer worktree does not bind declared branch",
  );
  mutateReview(
    (text) => text.replace("agents/QA_SECURITY.md", "agents/BACKEND.md"),
    "reviewer role-file must be agents/QA_SECURITY.md",
  );
  mutateReview(
    (text) =>
      text.replace(/SHA-256 `[a-f0-9]{64}`/, `SHA-256 \`${"0".repeat(64)}\``),
    "reviewer role-file digest does not match Git blob bytes",
  );
  const handoff = path.join(fixture, "docs/handoffs/valid-backend.md");
  const originalHandoff = fs.readFileSync(handoff, "utf8");
  fs.writeFileSync(
    handoff,
    originalHandoff.replace(
      /Role-file path and digest: `agents\/BACKEND\.md`; SHA-256 `[a-f0-9]{64}`/,
      `Role-file path and digest: \`agents/BACKEND.md\`; SHA-256 \`${"0".repeat(64)}\``,
    ),
  );
  let result = validateTraceability(fixture);
  assert.equal(result.status, "failed");
  assert.ok(
    result.errors.some((error) =>
      error.includes("author role-file digest does not match Git blob bytes"),
    ),
  );
  fs.writeFileSync(handoff, originalHandoff);
  fs.writeFileSync(
    handoff,
    originalHandoff.replace(
      "docs/reviews/valid-qa.md",
      "docs/reviews/fake-qa.md",
    ),
  );
  write(
    fixture,
    "docs/reviews/fake-qa.md",
    "- Agent role: Independent QA/Security\n- Result: PASS\n",
  );
  result = validateTraceability(fixture);
  assert.equal(result.status, "failed");
  assert.ok(
    result.errors.some((error) => error.includes("must bind QA/Security role")),
  );
  fs.writeFileSync(handoff, originalHandoff);
  const matrix = path.join(fixture, "docs/MASTER_PLAN_TRACEABILITY.md");
  const originalMatrix = fs.readFileSync(matrix, "utf8");
  fs.writeFileSync(matrix, originalMatrix.replace("FDX-01", "OMITTED-01"));
  result = validateTraceability(fixture);
  assert.equal(result.status, "failed");
  assert.ok(
    result.errors.some((error) =>
      error.includes("lacks mandatory gap requirement FDX-01"),
    ),
  );
  fs.writeFileSync(matrix, originalMatrix);
});

test("traceability rejects false committed task-evidence paths and commits", () => {
  const mutateCandidateTask = (replace, expected) => {
    const fixture = temp("upfs-traceability-task-evidence-");
    const state = writeTraceabilityFixture(fixture);
    const task = path.join(state.authorWorktree, "tasks/recovery/fixture.yaml");
    fs.writeFileSync(task, replace(fs.readFileSync(task, "utf8")));
    const invoke = (directory, args) => {
      const result = spawnSync("git", ["-C", directory, ...args], {
        encoding: "utf8",
      });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    };
    invoke(state.authorWorktree, ["add", "tasks/recovery/fixture.yaml"]);
    invoke(state.authorWorktree, ["commit", "-m", "mutate fixture evidence"]);
    const candidate = invoke(state.authorWorktree, ["rev-parse", "HEAD"]);
    invoke(state.reviewerWorktree, ["reset", "--hard", candidate]);
    for (const relative of [
      "docs/handoffs/valid-backend.md",
      "docs/reviews/valid-qa.md",
    ]) {
      const file = path.join(fixture, relative);
      fs.writeFileSync(
        file,
        fs.readFileSync(file, "utf8").replaceAll(state.candidate, candidate),
      );
    }
    const result = validateTraceability(fixture);
    assert.equal(result.status, "failed");
    assert.ok(
      result.errors.some((error) => error.includes(expected)),
      result.errors.join(" | "),
    );
  };
  mutateCandidateTask(
    (task) => task.replace("path: evidence.txt", "path: evidence-missing.txt"),
    "task input evidence is not Git-resolvable",
  );
  mutateCandidateTask(
    (task) => task.replace(/commit: [a-f0-9]{40}/, `commit: ${"a".repeat(40)}`),
    "task input evidence is not Git-resolvable",
  );
});

test("runtime capability gates reject empty, unbound, and unsafe placeholder artifacts", () => {
  const fixture = temp("upfs-capabilities-");
  write(
    fixture,
    "registries/skills/index.yaml",
    "schema_version: 1\nskills: []\n",
  );
  write(
    fixture,
    "apps/customer-console/package.json",
    JSON.stringify({ scripts: { "test:accessibility": "echo passed" } }),
  );
  let result = validateRuntimeCapabilities(fixture, ["skill", "accessibility"]);
  assert.equal(result.status, "failed");
  assert.ok(
    result.errors.some((error) =>
      error.includes("at least one evaluated skill"),
    ),
  );
  assert.ok(result.errors.some((error) => error.includes("allowlisted form")));
  writeCapabilityFixture(fixture);
  result = validateRuntimeCapabilities(fixture, ["skill", "accessibility"]);
  assert.deepEqual(result, { status: "passed", errors: [] });
  const registry = path.join(fixture, "registries/skills/index.yaml");
  fs.writeFileSync(
    registry,
    fs
      .readFileSync(registry, "utf8")
      .replace("schema_version: 1", "schema_version: 0"),
  );
  fs.appendFileSync(
    path.join(fixture, "registries/skills/policies/example.yaml"),
    "# tampered after digest\n",
  );
  write(
    fixture,
    "apps/customer-console/scripts/a11y.mjs",
    "console.log('accessibility passed');\n",
  );
  result = validateRuntimeCapabilities(fixture, ["skill", "accessibility"]);
  assert.equal(result.status, "failed");
  assert.ok(result.errors.some((error) => error.includes("schema_version")));
  assert.ok(result.errors.some((error) => error.includes("digest")));
  assert.ok(
    result.errors.some((error) =>
      error.includes("nontrivial positive assertion"),
    ),
  );
});
