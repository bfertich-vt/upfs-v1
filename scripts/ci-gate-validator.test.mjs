import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  validateCiGates,
  validateExternalHistoricalEvidence,
  validateHandoffSpecificationDigests,
  validateRepositoryHandoffSpecificationDigests,
  validateRuntimeCapabilities,
  validateTraceability,
} from "./ci-gate-validator.mjs";

const root = path.resolve(".");
const historicalProvenanceFixture = path.join(
  root,
  "scripts",
  "fixtures",
  "historical-provenance-v2.bundle",
);
const historicalProvenanceManifest = path.join(
  root,
  "scripts",
  "fixtures",
  "historical-provenance-v2.json",
);
const historicalProvenanceManifestData = JSON.parse(
  fs.readFileSync(historicalProvenanceManifest, "utf8"),
);
const historicalProvenanceCommits = historicalProvenanceManifestData.refs.map(
  ({ commit }) => commit,
);
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

function git(directory, args) {
  const result = spawnSync("git", ["-C", directory, ...args], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function cloneHistoricalProvenanceFixture(fixture) {
  assert.ok(
    fs.existsSync(historicalProvenanceFixture),
    "versioned historical provenance fixture is required",
  );
  const verify = spawnSync(
    "git",
    ["-C", root, "bundle", "verify", historicalProvenanceFixture],
    { encoding: "utf8" },
  );
  assert.equal(verify.status, 0, verify.stderr);
  git(fixture, ["init", "--initial-branch=fixture/historical-provenance"]);
  git(fixture, [
    "fetch",
    historicalProvenanceFixture,
    "refs/bundle-build/traceability-v2/*:refs/fixtures/traceability-v2/*",
  ]);
  for (const commit of historicalProvenanceCommits)
    assert.equal(
      git(fixture, ["cat-file", "-t", commit]),
      "commit",
      `historical provenance fixture must retain ${commit}`,
    );
}

function handoffCandidateCommits(worktree) {
  const handoffDirectory = path.join(worktree, "docs", "handoffs");
  return fs
    .readdirSync(handoffDirectory)
    .filter((name) => name.endsWith(".md"))
    .flatMap((name) => {
      const body = fs.readFileSync(path.join(handoffDirectory, name), "utf8");
      return [
        ...body.matchAll(/^- Commit:\s*(?:candidate\s+)?`([a-f0-9]{40})`/gim),
        ...body.matchAll(
          /^- Candidate implementation commit:\s*`([a-f0-9]{40})`/gim,
        ),
      ].map((match) => match[1]);
    });
}

function isAncestor(worktree, commit, head = "HEAD") {
  return (
    spawnSync("git", ["-C", worktree, "merge-base", "--is-ancestor", commit, head], {
      encoding: "utf8",
    }).status === 0
  );
}

test("complete immutable provenance bundle hydrates every historic handoff without a semantic bypass", () => {
  const fixture = temp("upfs-complete-provenance-bundle-");
  const authoritative = temp("upfs-complete-provenance-authoritative-");
  const candidate = temp("upfs-complete-provenance-candidate-");
  try {
    const sourceClone = spawnSync("git", ["clone", "--no-local", root, candidate], {
      encoding: "utf8",
    });
    assert.equal(sourceClone.status, 0, sourceClone.stderr);
    git(candidate, ["checkout", "--quiet", "-B", "candidate", "origin/HEAD"]);
    git(candidate, ["config", "user.email", "fixture@example.test"]);
    git(candidate, ["config", "user.name", "Fixture"]);
    const candidateDiff = spawnSync("git", ["-C", root, "diff", "--binary", "HEAD"], {
      encoding: null,
      maxBuffer: 16 * 1024 * 1024,
    });
    assert.equal(candidateDiff.status, 0, candidateDiff.stderr?.toString());
    const apply = spawnSync("git", ["-C", candidate, "apply", "--index"], {
      encoding: "utf8",
      input: candidateDiff.stdout,
    });
    assert.equal(apply.status, 0, apply.stderr);
    git(candidate, ["commit", "--quiet", "-m", "fixture final candidate"]);
    git(authoritative, ["init", "--bare"]);
    git(authoritative, [
      "fetch",
      "--no-tags",
      candidate,
      `${git(candidate, ["rev-parse", "HEAD"])}:refs/heads/integration`,
    ]);
    const clone = spawnSync("git", ["clone", "--no-local", authoritative, fixture], {
      encoding: "utf8",
    });
    assert.equal(clone.status, 0, clone.stderr);
    git(fixture, [
      "checkout",
      "--quiet",
      "-B",
      "fixture/hosted-checkout",
      "origin/integration",
    ]);

    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(fixture, "scripts/fixtures/historical-provenance-v2.json"),
        "utf8",
      ),
    );
    assert.equal(manifest.schema_version, 1);
    assert.equal(
      manifest.bundle,
      "scripts/fixtures/historical-provenance-v2.bundle",
    );
    assert.equal(
      digest(path.join(fixture, manifest.bundle)),
      manifest.sha256,
      "the checked-in bundle digest must be exact",
    );
    assert.equal(
      new Set(manifest.refs.map(({ commit }) => commit)).size,
      manifest.refs.length,
    );
    const candidates = new Set(handoffCandidateCommits(fixture));
    const historicalCandidates = new Set(
      [...candidates].filter((candidate) => !isAncestor(fixture, candidate)),
    );
    const manifestCandidates = new Set(
      manifest.refs
        .filter(({ kind }) => kind === "handoff-candidate")
        .map(({ commit }) => commit),
    );
    assert.deepEqual(
      [...manifestCandidates].sort(),
      [...historicalCandidates].sort(),
      "manifest must contain exactly final-handoff candidates unavailable from authoritative ancestry",
    );
    for (const candidate of candidates)
      assert.ok(
        !isAncestor(fixture, candidate) || !manifestCandidates.has(candidate),
        `reachable final-handoff candidate ${candidate} must not be transported as historical evidence`,
      );
    assert.deepEqual(
      manifest.refs
        .filter(({ kind }) => kind === "erratum-source")
        .map(({ commit }) => commit)
        .sort(),
      [
        "4ae7e95f0af88e21dde526be44443846a8d8d9a6",
        "e7c81bf1a38726e0ac8ebf84c969219c21758aea",
      ],
    );

    const before = validateRepositoryHandoffSpecificationDigests(fixture);
    assert.equal(
      before.status,
      "failed",
      "a fresh checkout must fail closed before hydration",
    );
    const verify = spawnSync(
      "git",
      ["-C", fixture, "bundle", "verify", manifest.bundle],
      { encoding: "utf8" },
    );
    assert.equal(verify.status, 0, verify.stderr);
    git(fixture, [
      "fetch",
      "--no-tags",
      manifest.bundle,
      "refs/bundle-build/traceability-v2/*:refs/fixtures/traceability-v2/*",
    ]);
    assert.deepEqual(validateRepositoryHandoffSpecificationDigests(fixture), {
      status: "passed",
      errors: [],
    });

    const task0123 = path.join(fixture, "docs/handoffs/TASK-0123.md");
    const original = fs.readFileSync(task0123, "utf8");
    fs.writeFileSync(
      task0123,
      original.replace(
        "`9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`",
        `\`${"0".repeat(64)}\``,
      ),
    );
    assert.equal(
      validateRepositoryHandoffSpecificationDigests(fixture).status,
      "failed",
      "corrupt current TASK-0123 provenance must remain rejected after hydration",
    );
    fs.writeFileSync(
      task0123,
      original +
        "\n## Git-bound provenance erratum v1 — RECOVERY-HISTORICAL-TRACEABILITY-ERRATA-PARSER-003\n",
    );
    assert.equal(
      validateRepositoryHandoffSpecificationDigests(fixture).status,
      "failed",
      "copied current erratum marker must remain rejected after hydration",
    );
  } finally {
    fs.rmSync(fixture, { force: true, recursive: true });
    fs.rmSync(authoritative, { force: true, recursive: true });
    fs.rmSync(candidate, { force: true, recursive: true });
  }
});

function filesRecursively(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesRecursively(target) : [target];
  });
}

function writeHandoffSpecificationFixture(fixture) {
  const worktree = path.join(
    path.dirname(fixture),
    `upfs-${path.basename(fixture)}-handoff-spec-author`,
  );
  fs.mkdirSync(worktree, { recursive: true });
  git(worktree, ["init", "--initial-branch=recovery/handoff-spec-fixture"]);
  git(worktree, ["config", "user.email", "fixture@example.test"]);
  git(worktree, ["config", "user.name", "Fixture"]);
  const inputs = [
    ["AGENTS.md", "fixture agents\n"],
    ["specs/09_cicd/delivery_pipeline.md", "fixture delivery pipeline\n"],
    ["specs/12_testing/test_strategy.md", "fixture testing strategy\n"],
    ["docs/historical/rejected-evidence.md", "preserved historical evidence\n"],
  ];
  for (const [relative, contents] of inputs)
    write(worktree, relative, contents);
  git(worktree, ["add", "."]);
  git(worktree, ["commit", "-m", "handoff specification fixture"]);
  const candidate = git(worktree, ["rev-parse", "HEAD"]);
  const pairs = inputs.map(([relative]) => {
    const bytes = spawnSync(
      "git",
      ["-C", worktree, "show", `${candidate}:${relative}`],
      {
        encoding: null,
      },
    ).stdout;
    return [relative, crypto.createHash("sha256").update(bytes).digest("hex")];
  });
  const handoffs = [
    ["recovery.md", pairs.slice(0, 3)],
    ["historical.md", pairs.slice(3)],
  ];
  for (const [name, records] of handoffs) {
    const listed = records
      .map(([relative, digest]) => `\`${relative}\` (\`${digest}\`)`)
      .join("; ");
    write(
      fixture,
      `docs/handoffs/${name}`,
      `- Commit: candidate \`${candidate}\`.\n- Specifications and contracts read: ${listed}.\n- Results: fixture only.\n`,
    );
  }
  return { worktree, candidate };
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
  const definition = write(
    fixture,
    "registries/skills/definitions/example.yaml",
    "schema_version: 1\nid: example-skill\nversion: 1.0.0\nclassification: contract/reference\nowner: platform-control\nrelease_state: reference\ninputs:\n  type: object\noutputs:\n  type: object\npermissions: []\ntools: []\nrollback_target: disable\n",
  );
  const policy = write(
    fixture,
    "registries/skills/policies/example.yaml",
    "schema_version: 1\nrules:\n  - id: deny-tool-access\n    effect: deny\n    subject: tool_call\n    reason: Reference-only contracts have no allowlisted tools.\n  - id: deny-tenant-data\n    effect: deny\n    subject: tenant_or_customer_data\n    reason: Repository governance evidence cannot include customer data.\n  - id: deny-authoritative-decisions\n    effect: deny\n    subject: authorization_financial_truth_workflow_state\n    reason: Skills cannot authorize, establish financial truth, or own workflow state.\n",
  );
  const evaluation = write(
    fixture,
    "registries/skills/evaluations/example.yaml",
    "schema_version: 1\nskill_id: example-skill\nskill_version: 1.0.0\nstatus: passed\nexecuted_at: 2026-08-01T00:00:00Z\ncases: 2\nassertions: 4\n",
  );
  write(
    fixture,
    "registries/skills/index.yaml",
    `schema_version: 1\nskills:\n  - id: example-skill\n    version: 1.0.0\n    digest: ${digest(definition)}\n    owner: platform-control\n    classification: contract/reference\n    release_state: reference\n    definition:\n      path: registries/skills/definitions/example.yaml\n      digest: ${digest(definition)}\n    policy:\n      path: registries/skills/policies/example.yaml\n      digest: ${digest(policy)}\n    evaluation:\n      path: registries/skills/evaluations/example.yaml\n      digest: ${digest(evaluation)}\n`,
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

test("validation workflow retains complete Git history for immutable provenance evidence", () => {
  const workflow = fs.readFileSync(
    path.join(root, ".github", "workflows", "validate.yml"),
    "utf8",
  );
  assert.match(
    workflow,
    /uses: actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683[\s\S]*?\n\s+with:\s*(?:\n\s*(?:#.*)?)*\n\s+fetch-depth:\s*0/m,
  );
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

test("handoff specification records are discovered generically and bound to candidate Git blobs", () => {
  const fixture = temp("upfs-handoff-specifications-");
  const state = writeHandoffSpecificationFixture(fixture);
  const handoffs = filesRecursively(
    path.join(fixture, "docs", "handoffs"),
  ).filter((file) =>
    fs.readFileSync(file, "utf8").includes("Specifications and contracts read"),
  );
  assert.equal(handoffs.length, 2);
  for (const handoff of handoffs) {
    const result = validateHandoffSpecificationDigests(
      state.worktree,
      fs.readFileSync(handoff, "utf8"),
    );
    assert.deepEqual(result, { status: "passed", errors: [] });
  }
  const recovery = handoffs.find(
    (file) => path.basename(file) === "recovery.md",
  );
  const original = fs.readFileSync(recovery, "utf8");
  fs.writeFileSync(
    recovery,
    original.replace(/`[a-f0-9]{64}`/, `\`${"0".repeat(64)}\``),
  );
  let result = validateHandoffSpecificationDigests(
    state.worktree,
    fs.readFileSync(recovery, "utf8"),
  );
  assert.equal(result.status, "failed");
  assert.ok(
    result.errors.some((error) =>
      error.includes("digest does not match Git blob bytes"),
    ),
    result.errors.join(" | "),
  );
  fs.writeFileSync(recovery, original.replace("AGENTS.md", "missing.md"));
  result = validateHandoffSpecificationDigests(
    state.worktree,
    fs.readFileSync(recovery, "utf8"),
  );
  assert.equal(result.status, "failed");
  assert.ok(
    result.errors.some((error) => error.includes("not Git-resolvable")),
    result.errors.join(" | "),
  );
});

test("traceability command discovers malformed and wrong-digest repository handoffs", () => {
  const fixture = temp("upfs-repository-handoff-scan-");
  git(fixture, ["init", "--initial-branch=recovery/handoff-scan-fixture"]);
  git(fixture, ["config", "user.email", "fixture@example.test"]);
  git(fixture, ["config", "user.name", "Fixture"]);
  write(fixture, "AGENTS.md", "fixture agent instructions\n");
  write(fixture, "specs/09_cicd/delivery_pipeline.md", "fixture delivery\n");
  git(fixture, ["add", "."]);
  git(fixture, ["commit", "-m", "fixture handoff source evidence"]);
  const candidate = git(fixture, ["rev-parse", "HEAD"]);
  const digest = crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(fixture, "AGENTS.md")))
    .digest("hex");
  write(
    fixture,
    "docs/handoffs/valid.md",
    `- Commit: candidate \`${candidate}\`.\n- Specifications and contracts read: \`AGENTS.md\` (\`${digest}\`).\n`,
  );
  write(
    fixture,
    "docs/handoffs/wrong-agents.md",
    `- Commit: candidate \`${candidate}\`.\n- Specifications and contracts read: \`AGENTS.md\` (\`${"0".repeat(64)}\`).\n`,
  );
  write(
    fixture,
    "docs/handoffs/malformed.md",
    `- Commit: candidate \`${candidate}\`.\n- Specifications and contracts read: AGENTS.md digest unavailable.\n`,
  );
  const scan = validateRepositoryHandoffSpecificationDigests(fixture);
  assert.equal(scan.status, "failed");
  assert.ok(
    scan.errors.some(
      (error) =>
        error.includes("wrong-agents.md") &&
        error.includes("digest does not match Git blob bytes"),
    ),
    scan.errors.join(" | "),
  );
  assert.ok(
    scan.errors.some(
      (error) =>
        error.includes("malformed.md") &&
        error.includes("requires path/digest pairs"),
    ),
    scan.errors.join(" | "),
  );
  const command = spawnSync(
    process.execPath,
    [path.join(root, "scripts/ci-gate-validator.mjs"), "--traceability"],
    { cwd: fixture, encoding: "utf8" },
  );
  assert.notEqual(command.status, 0, command.stderr);
  assert.match(
    command.stderr,
    /wrong-agents\.md:.*digest does not match Git blob bytes/i,
  );
  assert.match(command.stderr, /malformed\.md:.*requires path\/digest pairs/i);
});

test("repository scan permits only a strict, append-only Git-bound provenance erratum", () => {
  const fixture = temp("upfs-git-bound-erratum-");
  git(fixture, ["init", "--initial-branch=recovery/erratum-fixture"]);
  git(fixture, ["config", "user.email", "fixture@example.test"]);
  git(fixture, ["config", "user.name", "Fixture"]);
  write(fixture, "AGENTS.md", "fixture agent instructions\n");
  write(fixture, "specs/09_cicd/delivery_pipeline.md", "fixture delivery\n");
  git(fixture, ["add", "."]);
  git(fixture, ["commit", "-m", "candidate source evidence"]);
  const candidate = git(fixture, ["rev-parse", "HEAD"]);
  const originalRecord = [
    "- Commit: candidate `" + candidate + "`.",
    "- Specifications and contracts read: `AGENTS.md` (`" +
      "0".repeat(64) +
      "`); `specs/09_cicd/delivery_pipeline.md` (`" +
      "0".repeat(64) +
      "`).",
    "- Results: preserved historical result.",
    "",
  ].join("\n");
  write(fixture, "docs/handoffs/legacy.md", originalRecord);
  git(fixture, ["add", "."]);
  git(fixture, ["commit", "-m", "preserve malformed historical handoff"]);
  const sourceCommit = git(fixture, ["rev-parse", "HEAD"]);
  const row = (relative) => {
    const bytes = spawnSync(
      "git",
      ["-C", fixture, "show", `${candidate}:${relative}`],
      { encoding: null },
    ).stdout;
    const blob = git(fixture, ["rev-parse", `${candidate}:${relative}`]);
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    return `| \`${relative}\` | \`${candidate}\` | \`${blob}\` | \`${hash}\` |`;
  };
  const erratum = (source = sourceCommit) =>
    [
      "## Git-bound provenance erratum v1 — RECOVERY-FIXTURE-001",
      "",
      "- Original handoff path: `docs/handoffs/legacy.md`.",
      "- Original handoff source commit: `" + source + "`.",
      "- Original candidate commit: `" + candidate + "`.",
      "- Original provenance record: `Specifications and contracts read`.",
      "- Reason: `Correct immutable digest records only`.",
      "- Correction provenance: `RECOVERY-FIXTURE-001 fixture evidence`.",
      "",
      "| Path | Source candidate | Git blob | Derived SHA-256 |",
      "| --- | --- | --- | --- |",
      row("AGENTS.md"),
      row("specs/09_cicd/delivery_pipeline.md"),
      "",
      "- Preservation statement: This erratum changes no historical task status, acceptance claim, test result, review state, risk, limitation, production-capability classification, or Independent QA/Security review result.",
      "",
    ].join("\n");
  const erratumFile = path.join(fixture, "docs", "handoffs", "legacy.md");
  const valid = originalRecord + erratum();
  fs.writeFileSync(erratumFile, valid);
  assert.deepEqual(validateRepositoryHandoffSpecificationDigests(fixture), {
    status: "passed",
    errors: [],
  });
  const reject = (mutated, expected) => {
    fs.writeFileSync(erratumFile, mutated);
    const result = validateRepositoryHandoffSpecificationDigests(fixture);
    assert.equal(result.status, "failed", expected);
    assert.ok(
      result.errors.some((error) => error.includes(expected)),
      result.errors.join(" | "),
    );
  };
  reject(
    valid.replace(
      "Original handoff source commit",
      "Missing handoff source commit",
    ),
    "requires Original handoff source commit",
  );
  reject(valid + erratum(), "exactly one Git-bound provenance erratum");
  reject(
    valid.replace("- Reason: `Correct immutable digest records only`.\n", ""),
    "requires exactly one bounded Reason field",
  );
  reject(
    valid.replace(
      "- Correction provenance: `RECOVERY-FIXTURE-001 fixture evidence`.\n",
      "",
    ),
    "requires exactly one bounded Correction provenance field",
  );
  reject(
    valid.replace(
      "- Correction provenance: `RECOVERY-FIXTURE-001 fixture evidence`.\n",
      "- Correction provenance: `   `.",
    ),
    "Correction provenance must be non-empty, non-whitespace",
  );
  reject(
    valid.replace(
      "- Reason: `Correct immutable digest records only`.",
      "- Reason: `   `.",
    ),
    "Reason must be non-empty, non-whitespace",
  );
  reject(
    valid.replace(
      "- Reason: `Correct immutable digest records only`.",
      "- Reason: `" + "r".repeat(281) + "`.",
    ),
    "Reason must be non-empty, non-whitespace",
  );
  reject(
    valid.replace(
      "- Correction provenance: `RECOVERY-FIXTURE-001 fixture evidence`.",
      "- Correction provenance: `" + "p".repeat(281) + "`.",
    ),
    "Correction provenance must be non-empty, non-whitespace",
  );
  reject(
    valid.replace(
      "- Reason: `Correct immutable digest records only`.",
      "- Reason: `Correct immutable digest records only`.\n- Reason: `Duplicate reason`.",
    ),
    "requires exactly one bounded Reason field",
  );
  reject(
    valid.replace(
      "- Correction provenance: `RECOVERY-FIXTURE-001 fixture evidence`.",
      "- Correction provenance: `RECOVERY-FIXTURE-001 fixture evidence`.\n- Correction provenance: `Duplicate provenance`.",
    ),
    "requires exactly one bounded Correction provenance field",
  );
  reject(
    valid.replace(
      "- Original provenance record: `Specifications and contracts read`.",
      "- Original provenance record: `Specifications and contracts read`.\n- Unauthorized field: `bypass`.",
    ),
    "exact v1 allowlisted schema",
  );
  reject(
    valid.replace(
      `- Original candidate commit: \`${candidate}\`.`,
      "- Original candidate commit: `" + "a".repeat(40) + "`.",
    ),
    "original candidate does not match",
  );
  reject(
    valid.replace(
      `- Original handoff source commit: \`${sourceCommit}\`.`,
      "- Original handoff source commit: `" + "f".repeat(40) + "`.",
    ),
    "original handoff is not Git-resolvable",
  );
  reject(
    valid.replace(
      /`[a-f0-9]{64}`(?= \|\r?\n\r?\n- Preservation)/i,
      "`" + "f".repeat(64) + "`",
    ),
    "digest does not match Git blob bytes",
  );
  reject(
    valid.replace("preserved historical result", "rewritten historical result"),
    "append-only prefix",
  );
  reject(valid + "- Release status: accepted\n", "exact v1 allowlisted schema");

  const correctDigest = (relative) => {
    const bytes = spawnSync(
      "git",
      ["-C", fixture, "show", `${candidate}:${relative}`],
      { encoding: null },
    ).stdout;
    return crypto.createHash("sha256").update(bytes).digest("hex");
  };
  const validOriginal = originalRecord
    .replace("0".repeat(64), correctDigest("AGENTS.md"))
    .replace(
      "0".repeat(64),
      correctDigest("specs/09_cicd/delivery_pipeline.md"),
    );
  fs.writeFileSync(erratumFile, validOriginal);
  git(fixture, ["add", "."]);
  git(fixture, ["commit", "-m", "preserve valid historical handoff fixture"]);
  const validSourceCommit = git(fixture, ["rev-parse", "HEAD"]);
  reject(
    validOriginal + erratum(validSourceCommit),
    "cannot correct an already-valid provenance record",
  );
  fs.rmSync(fixture, { force: true, recursive: true });
});

test("provenance record classification rejects partial entries before erratum correction", () => {
  const cases = [
    {
      name: "zero pairs",
      record: "AGENTS.md digest unavailable.",
      paths: [],
      direct: "requires path/digest pairs",
      scan: "does not declare any correctable paths",
      accepted: false,
    },
    {
      name: "one complete pair",
      record: "`AGENTS.md` (`" + "0".repeat(64) + "`).",
      paths: ["AGENTS.md"],
      direct: "digest does not match Git blob bytes",
      accepted: true,
    },
    {
      name: "multiple complete pairs",
      record:
        "`AGENTS.md` (`" +
        "0".repeat(64) +
        "`); `agents/BACKEND.md` (`" +
        "0".repeat(64) +
        "`).",
      paths: ["AGENTS.md", "agents/BACKEND.md"],
      direct: "digest does not match Git blob bytes",
      accepted: true,
    },
    {
      name: "one pair plus unpaired entry",
      record:
        "`AGENTS.md` (`" +
        "0".repeat(64) +
        "`); `agents/BACKEND.md`; unpaired provenance.",
      paths: ["AGENTS.md"],
      direct: "digest does not match Git blob bytes",
      scan: "partially paired or ambiguous entries",
      accepted: false,
    },
    {
      name: "multiple pairs plus unpaired entry",
      record:
        "`AGENTS.md` (`" +
        "0".repeat(64) +
        "`); `agents/BACKEND.md` (`" +
        "0".repeat(64) +
        "`); `specs/09_cicd/delivery_pipeline.md`.",
      paths: ["AGENTS.md", "agents/BACKEND.md"],
      direct: "digest does not match Git blob bytes",
      scan: "partially paired or ambiguous entries",
      accepted: false,
    },
  ];
  for (const fixtureCase of cases) {
    const fixture = temp("upfs-provenance-record-classification-");
    git(fixture, ["init", "--initial-branch=recovery/record-classification"]);
    git(fixture, ["config", "user.email", "fixture@example.test"]);
    git(fixture, ["config", "user.name", "Fixture"]);
    write(fixture, "AGENTS.md", "fixture agent instructions\n");
    write(fixture, "agents/BACKEND.md", "fixture backend instructions\n");
    git(fixture, ["add", "."]);
    git(fixture, ["commit", "-m", "candidate source evidence"]);
    const candidate = git(fixture, ["rev-parse", "HEAD"]);
    const original = [
      `- Commit: candidate \`${candidate}\`.`,
      `- Specifications and contracts read: ${fixtureCase.record}`,
      "- Results: preserved historical result.",
      "",
    ].join("\n");
    const relative = "docs/handoffs/legacy.md";
    const handoff = path.join(fixture, ...relative.split("/"));
    write(fixture, relative, original);
    git(fixture, ["add", relative]);
    git(fixture, ["commit", `-m`, `preserve ${fixtureCase.name}`]);
    const source = git(fixture, ["rev-parse", "HEAD"]);
    const row = (entry) => {
      const bytes = spawnSync(
        "git",
        ["-C", fixture, "show", `${candidate}:${entry}`],
        { encoding: null },
      ).stdout;
      return `| \`${entry}\` | \`${candidate}\` | \`${git(fixture, ["rev-parse", `${candidate}:${entry}`])}\` | \`${crypto.createHash("sha256").update(bytes).digest("hex")}\` |`;
    };
    const erratum = [
      "## Git-bound provenance erratum v1 — RECOVERY-FIXTURE-CLASSIFICATION-001",
      "",
      `- Original handoff path: \`${relative}\`.`,
      `- Original handoff source commit: \`${source}\`.`,
      `- Original candidate commit: \`${candidate}\`.`,
      "- Original provenance record: `Specifications and contracts read`.",
      "- Reason: `Correct immutable digest records only`.",
      "- Correction provenance: `Classification boundary fixture evidence`.",
      "",
      "| Path | Source candidate | Git blob | Derived SHA-256 |",
      "| --- | --- | --- | --- |",
      ...fixtureCase.paths.map(row),
      "",
      "- Preservation statement: This erratum changes no historical task status, acceptance claim, test result, review state, risk, limitation, production-capability classification, or Independent QA/Security review result.",
      "",
    ].join("\n");
    const direct = validateHandoffSpecificationDigests(fixture, original);
    assert.equal(direct.status, "failed", fixtureCase.name);
    assert.ok(
      direct.errors.some((error) => error.includes(fixtureCase.direct)),
      `${fixtureCase.name}: ${direct.errors.join(" | ")}`,
    );
    fs.writeFileSync(handoff, original + erratum);
    const scan = validateRepositoryHandoffSpecificationDigests(fixture);
    if (fixtureCase.accepted) {
      assert.deepEqual(
        scan,
        { status: "passed", errors: [] },
        fixtureCase.name,
      );
    } else {
      assert.equal(scan.status, "failed", fixtureCase.name);
      assert.ok(
        scan.errors.some((error) => error.includes(fixtureCase.scan)),
        `${fixtureCase.name}: ${scan.errors.join(" | ")}`,
      );
    }
    fs.rmSync(fixture, { force: true, recursive: true });
  }
});

test("repository scan permits only the exact legacy unpaired queue provenance correction", () => {
  const fixture = temp("upfs-legacy-unpaired-erratum-");
  cloneHistoricalProvenanceFixture(fixture);
  git(fixture, [
    "checkout",
    "--detach",
    "e7c81bf1a38726e0ac8ebf84c969219c21758aea",
  ]);
  const source = "e7c81bf1a38726e0ac8ebf84c969219c21758aea";
  const candidate = "2ec8213fe000a0b78c68c588eb10768a39116be3";
  const relative = "docs/handoffs/RECOVERY-QUEUE-VALIDATION-001.md";
  const handoff = path.join(fixture, ...relative.split("/"));
  const row = (entry) => {
    const bytes = spawnSync(
      "git",
      ["-C", fixture, "show", `${candidate}:${entry}`],
      {
        encoding: null,
      },
    ).stdout;
    const blob = git(fixture, ["rev-parse", `${candidate}:${entry}`]);
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    return `| \`${entry}\` | \`${candidate}\` | \`${blob}\` | \`${hash}\` |`;
  };
  const paths = [
    "AGENTS.md",
    "agents/BACKEND.md",
    "agents/WORKTREES.md",
    "agents/HANDOFF_TEMPLATE.md",
    "specs/00_constitution/engineering_constitution.md",
    "specs/09_cicd/delivery_pipeline.md",
    "specs/12_testing/test_strategy.md",
    "tasks/queue.yaml",
  ];
  const erratum = () =>
    [
      "## Git-bound provenance erratum v1 \u2014 RECOVERY-HISTORICAL-TRACEABILITY-ERRATA-PARSER-003",
      "",
      `- Original handoff path: \`${relative}\`.`,
      `- Original handoff source commit: \`${source}\`.`,
      `- Original candidate commit: \`${candidate}\`.`,
      "- Original provenance record: `Specifications and contracts read`.",
      "- Reason: `Legacy record lists sources without path digest pairs`.",
      "- Correction provenance: `Git object derivation for immutable queue handoff source`.",
      "",
      "| Path | Source candidate | Git blob | Derived SHA-256 |",
      "| --- | --- | --- | --- |",
      ...paths.map(row),
      "",
      "- Preservation statement: This erratum changes no historical task status, acceptance claim, test result, review state, risk, limitation, production-capability classification, or Independent QA/Security review result.",
      "",
    ].join("\n");
  const original = spawnSync(
    "git",
    ["-C", fixture, "show", `${source}:${relative}`],
    { encoding: "utf8" },
  ).stdout;
  const valid = original + erratum();
  fs.writeFileSync(handoff, valid);
  assert.deepEqual(validateRepositoryHandoffSpecificationDigests(fixture), {
    status: "passed",
    errors: [],
  });
  const reject = (mutated, expected) => {
    fs.writeFileSync(handoff, mutated);
    const result = validateRepositoryHandoffSpecificationDigests(fixture);
    assert.equal(result.status, "failed", expected);
    assert.ok(
      result.errors.some((error) => error.includes(expected)),
      result.errors.join(" | "),
    );
  };
  reject(
    valid.replace(row(paths[0]), row(paths[0]).replace(paths[0], "README.md")),
    "not an existing original-record path",
  );
  reject(
    valid.replace(row(paths[0]), row(paths[0]) + "\n" + row(paths[0])),
    "duplicate correction path",
  );
  reject(
    valid.replace(row(paths.at(-1)) + "\n", ""),
    "omits original-record path",
  );
  reject(
    valid.replace(
      "- Reason: `Legacy record lists sources without path digest pairs`.\n",
      "",
    ),
    "exact v1 allowlisted schema",
  );
  reject(
    valid.replace(
      "- Correction provenance: `Git object derivation for immutable queue handoff source`.\n",
      "",
    ),
    "exact v1 allowlisted schema",
  );
  reject(
    valid.replace(
      "Legacy record lists sources without path digest pairs",
      "   ",
    ),
    "Reason must be non-empty, non-whitespace",
  );
  reject(
    valid.replace(
      "Git object derivation for immutable queue handoff source",
      "   ",
    ),
    "Correction provenance must be non-empty, non-whitespace",
  );
  reject(
    valid.replace(
      "Legacy record lists sources without path digest pairs",
      "r".repeat(281),
    ),
    "Reason must be non-empty, non-whitespace",
  );
  reject(
    valid.replace(
      "Git object derivation for immutable queue handoff source",
      "p".repeat(281),
    ),
    "Correction provenance must be non-empty, non-whitespace",
  );
  reject(
    valid.replace(
      "- Reason: `Legacy record lists sources without path digest pairs`.",
      "- Reason: `Legacy record lists sources without path digest pairs`.\n- Reason: `Duplicate reason`.",
    ),
    "exact v1 allowlisted schema",
  );
  reject(
    valid.replace(
      `- Original candidate commit: \`${candidate}\`.`,
      "- Original candidate commit: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`.",
    ),
    "original candidate does not match",
  );
  reject(
    valid.replace(
      `- Original handoff source commit: \`${source}\`.`,
      "- Original handoff source commit: `ffffffffffffffffffffffffffffffffffffffff`.",
    ),
    "original handoff is not Git-resolvable",
  );
  reject(
    valid.replace(
      /\| `[a-f0-9]{40}` \| `[a-f0-9]{64}` \|(?=\r?\n\r?\n- Preservation)/i,
      "| `0000000000000000000000000000000000000000` | `" +
        "0".repeat(64) +
        "` |",
    ),
    "source blob is not Git-resolvable or does not match",
  );
  reject(
    valid.replace(
      "- Results: Focused and full repository tests passed.",
      "- Results: rewritten historical result.",
    ),
    "append-only prefix",
  );
  reject(valid + "- Release status: accepted\n", "exact v1 allowlisted schema");
  reject(
    valid.replace(
      "and the v7 candidate",
      "(`" + "0".repeat(64) + "`); and the v7 candidate",
    ),
    "append-only prefix",
  );
  reject(
    valid.replace("`AGENTS.md`;", "`AGENTS.md` (`" + "0".repeat(64) + "`);"),
    "append-only prefix",
  );
  fs.rmSync(fixture, { force: true, recursive: true });
});

test("historical errata validate on authoritative topology only after immutable fixture hydration", () => {
  const fixture = temp("upfs-authoritative-provenance-topology-");
  const reachableQueueSource = "e7c81bf1a38726e0ac8ebf84c969219c21758aea";
  const retainedCiSource = "4ae7e95f0af88e21dde526be44443846a8d8d9a6";
  const queueOnlyBundle = path.join(fixture, "queue-history.bundle");
  const queueOnlySource = path.join(fixture, "queue-history.git");
  try {
    fs.mkdirSync(queueOnlySource, { recursive: true });
    git(queueOnlySource, ["init", "--bare"]);
    git(queueOnlySource, [
      "fetch",
      "--no-tags",
      root,
      `${reachableQueueSource}:refs/heads/integration`,
      "2ec8213fe000a0b78c68c588eb10768a39116be3:refs/heads/candidate",
    ]);
    const bundle = spawnSync(
      "git",
      ["-C", queueOnlySource, "bundle", "create", queueOnlyBundle, "--all"],
      { encoding: "utf8" },
    );
    assert.equal(bundle.status, 0, bundle.stderr);
    git(fixture, ["init", "--initial-branch=fixture/topology"]);
    git(fixture, [
      "fetch",
      "--no-tags",
      queueOnlyBundle,
      `${reachableQueueSource}:refs/heads/integration`,
    ]);
    git(fixture, ["checkout", "--quiet", "integration"]);
    for (const relative of [
      "docs/handoffs/RECOVERY-QUEUE-VALIDATION-001.md",
      "docs/handoffs/RECOVERY-CI-GATES-001.md",
    ])
      write(
        fixture,
        relative,
        fs.readFileSync(path.join(root, ...relative.split("/"))),
      );

    assert.equal(
      git(fixture, [
        "merge-base",
        "--is-ancestor",
        reachableQueueSource,
        "HEAD",
      ]),
      "",
      "the exact queue erratum source must remain reachable from authoritative history",
    );
    const absentCiSource = spawnSync(
      "git",
      ["-C", fixture, "cat-file", "-e", `${retainedCiSource}^{commit}`],
      { encoding: "utf8" },
    );
    assert.notEqual(
      absentCiSource.status,
      0,
      "the retained CI source must not be accidentally inherited from the authoritative fetch",
    );

    const beforeHydration =
      validateRepositoryHandoffSpecificationDigests(fixture);
    assert.equal(beforeHydration.status, "failed");
    assert.ok(
      beforeHydration.errors.some((error) =>
        error.includes(
          "original handoff is not Git-resolvable at its declared source commit",
        ),
      ),
      beforeHydration.errors.join(" | "),
    );

    git(fixture, [
      "fetch",
      "--no-tags",
      historicalProvenanceFixture,
      "refs/bundle-build/traceability-v2/*:refs/fixtures/traceability-v2/*",
    ]);
    assert.equal(git(fixture, ["cat-file", "-t", retainedCiSource]), "commit");
    assert.deepEqual(validateRepositoryHandoffSpecificationDigests(fixture), {
      status: "passed",
      errors: [],
    });
  } finally {
    fs.rmSync(fixture, { force: true, recursive: true });
  }
});

test("repository scan permits only the immutable historical partially paired CI correction", () => {
  const fixture = temp("upfs-historical-partial-erratum-");
  const source = "4ae7e95f0af88e21dde526be44443846a8d8d9a6";
  const candidate = "90208c69504893c7a01cbcd51a8eb35caf21f5e3";
  const relative = "docs/handoffs/RECOVERY-CI-GATES-001.md";
  const paths = [
    "AGENTS.md",
    "agents/BACKEND.md",
    "agents/WORKTREES.md",
    "agents/HANDOFF_TEMPLATE.md",
    "specs/00_constitution/engineering_constitution.md",
    "specs/09_cicd/delivery_pipeline.md",
    "specs/10_security/security_baseline.md",
    "specs/12_testing/test_strategy.md",
  ];
  cloneHistoricalProvenanceFixture(fixture);
  git(fixture, ["checkout", "--detach", source]);
  const handoff = path.join(fixture, ...relative.split("/"));
  const row = (entry) => {
    const bytes = spawnSync(
      "git",
      ["-C", fixture, "show", `${candidate}:${entry}`],
      {
        encoding: null,
      },
    ).stdout;
    return `| \`${entry}\` | \`${candidate}\` | \`${git(fixture, ["rev-parse", `${candidate}:${entry}`])}\` | \`${crypto.createHash("sha256").update(bytes).digest("hex")}\` |`;
  };
  const original = spawnSync(
    "git",
    ["-C", fixture, "show", `${source}:${relative}`],
    {
      encoding: "utf8",
    },
  ).stdout;
  const legacySource = "e7c81bf1a38726e0ac8ebf84c969219c21758aea";
  const legacyCandidate = "2ec8213fe000a0b78c68c588eb10768a39116be3";
  const legacyRelative = "docs/handoffs/RECOVERY-QUEUE-VALIDATION-001.md";
  const legacyPaths = paths
    .filter((entry) => entry !== "specs/10_security/security_baseline.md")
    .concat("tasks/queue.yaml");
  const legacyOriginal = spawnSync(
    "git",
    ["-C", fixture, "show", `${legacySource}:${legacyRelative}`],
    {
      encoding: "utf8",
    },
  ).stdout;
  const legacyRow = (entry) => {
    const bytes = spawnSync(
      "git",
      ["-C", fixture, "show", `${legacyCandidate}:${entry}`],
      {
        encoding: null,
      },
    ).stdout;
    return `| \`${entry}\` | \`${legacyCandidate}\` | \`${git(fixture, ["rev-parse", `${legacyCandidate}:${entry}`])}\` | \`${crypto.createHash("sha256").update(bytes).digest("hex")}\` |`;
  };
  const legacyErratum = [
    "## Git-bound provenance erratum v1 — RECOVERY-HISTORICAL-TRACEABILITY-ERRATA-PARSER-003",
    "",
    `- Original handoff path: \`${legacyRelative}\`.`,
    `- Original handoff source commit: \`${legacySource}\`.`,
    `- Original candidate commit: \`${legacyCandidate}\`.`,
    "- Original provenance record: `Specifications and contracts read`.",
    "- Reason: `Legacy record lists sources without path digest pairs`.",
    "- Correction provenance: `Git object derivation for immutable queue handoff source`.",
    "",
    "| Path | Source candidate | Git blob | Derived SHA-256 |",
    "| --- | --- | --- | --- |",
    ...legacyPaths.map(legacyRow),
    "",
    "- Preservation statement: This erratum changes no historical task status, acceptance claim, test result, review state, risk, limitation, production-capability classification, or Independent QA/Security review result.",
    "",
  ].join("\n");
  const erratum = () =>
    [
      "## Git-bound provenance erratum v1 — RECOVERY-HISTORICAL-TRACEABILITY-ERRATA-PARSER-005",
      "",
      `- Original handoff path: \`${relative}\`.`,
      `- Original handoff source commit: \`${source}\`.`,
      `- Original candidate commit: \`${candidate}\`.`,
      "- Original provenance record: `Specifications and contracts read`.",
      "- Reason: `Immutable historical partial-record digest repair`.",
      "- Correction provenance: `Raw Git object derivation for the fixed CI source`.",
      "",
      "| Path | Source candidate | Git blob | Derived SHA-256 |",
      "| --- | --- | --- | --- |",
      ...paths.map(row),
      "",
      "- Preservation statement: This erratum changes no historical task status, acceptance claim, test result, review state, risk, limitation, production-capability classification, or Independent QA/Security review result.",
      "",
    ].join("\n");
  const valid = original + erratum();
  try {
    fs.writeFileSync(
      path.join(fixture, ...legacyRelative.split("/")),
      legacyOriginal + legacyErratum,
    );
    fs.writeFileSync(handoff, valid);
    assert.deepEqual(validateRepositoryHandoffSpecificationDigests(fixture), {
      status: "passed",
      errors: [],
    });
    const reject = (mutated, expected) => {
      fs.writeFileSync(handoff, mutated);
      const result = validateRepositoryHandoffSpecificationDigests(fixture);
      assert.equal(result.status, "failed", expected);
      assert.ok(
        result.errors.some((error) => error.includes(expected)),
        result.errors.join(" | "),
      );
    };
    const mutateErratum = (mutate) => original + mutate(erratum());
    reject(
      mutateErratum((text) => text.replace("PARSER-005", "PARSER-006")),
      "partially paired or ambiguous",
    );
    reject(
      mutateErratum((text) =>
        text.replace(
          relative,
          "docs/handoffs/RECOVERY-QUEUE-VALIDATION-001.md",
        ),
      ),
      "original handoff path must be",
    );
    reject(
      mutateErratum((text) => text.replace(source, "f".repeat(40))),
      "original handoff is not Git-resolvable",
    );
    reject(
      mutateErratum((text) => text.replace(candidate, "a".repeat(40))),
      "original candidate does not match",
    );
    reject(
      mutateErratum((text) =>
        text.replace(
          row(paths[0]),
          row(paths[0]).replace(paths[0], "README.md"),
        ),
      ),
      "not an existing original-record path",
    );
    reject(
      mutateErratum((text) =>
        text.replace(row(paths[0]), row(paths[0]) + "\n" + row(paths[0])),
      ),
      "duplicate correction path",
    );
    reject(
      mutateErratum((text) => text.replace(row(paths.at(-1)) + "\n", "")),
      "omits original-record path",
    );
    reject(
      mutateErratum((text) =>
        text.replace(
          row(paths[0]),
          row(paths[0]).replace(candidate, "b".repeat(40)),
        ),
      ),
      "must bind original candidate",
    );
    reject(
      mutateErratum((text) =>
        text.replace(
          row(paths[0]),
          row(paths[0]).replace(
            /`[a-f0-9]{40}` \| `([a-f0-9]{64})` \|$/,
            "`" + "0".repeat(40) + "` | `$1` |",
          ),
        ),
      ),
      "source blob is not Git-resolvable or does not match",
    );
    reject(
      mutateErratum((text) =>
        text.replace(
          row(paths[0]),
          row(paths[0]).replace(
            /`[a-f0-9]{64}` \|$/,
            "`" + "0".repeat(64) + "` |",
          ),
        ),
      ),
      "digest does not match Git blob bytes",
    );
    reject(
      mutateErratum((text) =>
        text.replace(
          "Immutable historical partial-record digest repair",
          "r".repeat(281),
        ),
      ),
      "Reason must be non-empty",
    );
    reject(
      mutateErratum((text) =>
        text.replace(
          "Raw Git object derivation for the fixed CI source",
          "   ",
        ),
      ),
      "Correction provenance must be non-empty",
    );
    reject(
      valid + "- Release status: accepted\n",
      "exact v1 allowlisted schema",
    );
    reject(
      valid.replace("the structured task input", "the altered task input"),
      "append-only prefix",
    );
  } finally {
    fs.rmSync(fixture, { force: true, recursive: true });
  }
});

test("repository handoff discovery rejects unsafe directory roots before enumeration", () => {
  const fixture = temp("upfs-handoff-directory-root-");
  const outside = temp("upfs-handoff-directory-outside-");
  let result = validateRepositoryHandoffSpecificationDigests(fixture);
  assert.equal(result.status, "failed");
  assert.ok(
    result.errors.some((error) =>
      error.includes("docs/handoffs is missing or cannot be safely enumerated"),
    ),
    result.errors.join(" | "),
  );
  fs.mkdirSync(path.join(fixture, "docs"), { recursive: true });
  write(outside, "external.md", "no declared provenance\n");
  fs.symlinkSync(
    outside,
    path.join(fixture, "docs", "handoffs"),
    process.platform === "win32" ? "junction" : "dir",
  );
  result = validateRepositoryHandoffSpecificationDigests(fixture);
  assert.equal(result.status, "failed");
  assert.ok(
    result.errors.some((error) =>
      error.includes("docs/handoffs must be a real contained directory"),
    ),
    result.errors.join(" | "),
  );
  assert.ok(
    result.errors.every((error) => !error.includes(outside)),
    result.errors.join(" | "),
  );

  fs.rmSync(path.join(fixture, "docs", "handoffs"), {
    force: true,
    recursive: true,
  });
  fs.mkdirSync(path.join(fixture, "docs", "handoffs"), { recursive: true });
  const internalTarget = path.join(fixture, "docs", "internal-handoffs");
  fs.mkdirSync(internalTarget, { recursive: true });
  fs.rmSync(path.join(fixture, "docs", "handoffs"), {
    force: true,
    recursive: true,
  });
  fs.symlinkSync(
    internalTarget,
    path.join(fixture, "docs", "handoffs"),
    process.platform === "win32" ? "junction" : "dir",
  );
  result = validateRepositoryHandoffSpecificationDigests(fixture);
  assert.equal(result.status, "failed");
  assert.ok(
    result.errors.some((error) =>
      error.includes("docs/handoffs must be a real contained directory"),
    ),
    result.errors.join(" | "),
  );

  fs.rmSync(path.join(fixture, "docs", "handoffs"), {
    force: true,
    recursive: true,
  });
  fs.mkdirSync(path.join(fixture, "docs", "handoffs"), { recursive: true });
  result = validateRepositoryHandoffSpecificationDigests(fixture);
  assert.deepEqual(result, { status: "passed", errors: [] });
  fs.rmSync(fixture, { force: true, recursive: true });
  fs.rmSync(outside, { force: true, recursive: true });
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
  const nonexistentAbsoluteWorktree = path.join(
    path.parse(fixture).root,
    "not-real",
  );
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
        `Review worktree and branch: \`${nonexistentAbsoluteWorktree}\``,
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

test("external historical evidence is Git-bound and rejects cross-platform unsafe paths", () => {
  const worktree = temp("upfs-external-historical-evidence-");
  git(worktree, ["init", "--initial-branch=recovery/external-evidence"]);
  git(worktree, ["config", "user.email", "fixture@example.test"]);
  git(worktree, ["config", "user.name", "Fixture"]);
  write(worktree, "docs/reviews/history.md", "immutable QA finding\n");
  git(worktree, ["add", "."]);
  git(worktree, ["commit", "-m", "external evidence fixture"]);
  const commit = git(worktree, ["rev-parse", "HEAD"]);
  const bytes = spawnSync(
    "git",
    ["-C", worktree, "show", `${commit}:docs/reviews/history.md`],
    { encoding: null },
  ).stdout;
  const valid = [
    {
      purpose: "independent QA finding",
      commit,
      path: "docs/reviews/history.md",
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      availability:
        "external historical evidence; not a file present in this candidate tree",
    },
  ];
  assert.deepEqual(validateExternalHistoricalEvidence(worktree, valid), {
    status: "passed",
    errors: [],
  });
  const mutate = (change, expected) => {
    const result = validateExternalHistoricalEvidence(
      worktree,
      change(structuredClone(valid)),
    );
    assert.equal(result.status, "failed");
    assert.ok(
      result.errors.some((error) => error.includes(expected)),
      result.errors.join(" | "),
    );
  };
  mutate((records) => {
    records[0].path = "docs/reviews/missing.md";
    return records;
  }, "source is not Git-resolvable");
  mutate((records) => {
    records[0].sha256 = "A".repeat(64);
    return records;
  }, "sha256 must be lowercase");
  mutate((records) => {
    records[0].sha256 = "0".repeat(64);
    return records;
  }, "does not match raw Git blob bytes");
  for (const unsafePath of [
    "/absolute.md",
    "C:\\absolute.md",
    "\\\\server\\share\\absolute.md",
    "\\rooted.md",
    "a\\..\\b.md",
    "a/../b.md",
    "a\\../b.md",
    "a/..\\b.md",
    ".",
    "a/./b.md",
    "a\\.\\b.md",
    "",
    "a//b.md",
    "a\\\\b.md",
    "a\\/b.md",
    "docs/reviews/history.md:alternate",
  ]) {
    mutate((records) => {
      records[0].path = unsafePath;
      return records;
    }, "path must be repository-relative and safe");
  }
  mutate((records) => {
    records[0].path = "docs/reviews/history.md;not-a-command";
    return records;
  }, "source is not Git-resolvable");
  mutate((records) => {
    records[0].extra = "claim";
    return records;
  }, "must contain exactly");
  mutate((records) => {
    delete records[0].purpose;
    return records;
  }, "must contain exactly");
  mutate((records) => {
    records[0].availability = "present locally";
    return records;
  }, "availability must use the documented exact label");
  mutate((records) => {
    records[0].commit = "A".repeat(40);
    return records;
  }, "commit must be a lowercase");
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

test("skill capability gate rejects digest-consistent closed-world policy bypasses", () => {
  function capabilityFixture() {
    const fixture = temp("upfs-skill-policy-");
    writeCapabilityFixture(fixture);
    return {
      fixture,
      definition: path.join(
        fixture,
        "registries/skills/definitions/example.yaml",
      ),
      policy: path.join(fixture, "registries/skills/policies/example.yaml"),
      registry: path.join(fixture, "registries/skills/index.yaml"),
    };
  }

  function refreshArtifactDigest(registry, artifact) {
    const text = fs.readFileSync(registry, "utf8");
    const oldDigest = /digest: ([a-f0-9]{64})/.exec(text)?.[1];
    assert.ok(oldDigest);
    fs.writeFileSync(registry, text.replaceAll(oldDigest, digest(artifact)));
  }

  function refreshPolicyDigest(registry, policy) {
    const text = fs.readFileSync(registry, "utf8");
    const oldDigest =
      /policies\/example\.yaml\n      digest: ([a-f0-9]{64})/.exec(text)?.[1];
    assert.ok(oldDigest);
    fs.writeFileSync(registry, text.replace(oldDigest, digest(policy)));
  }

  function rejectsPolicyMutation(name, mutate) {
    const { fixture, policy, registry } = capabilityFixture();
    mutate(policy);
    refreshPolicyDigest(registry, policy);
    const result = validateRuntimeCapabilities(fixture, ["skill"]);
    assert.equal(result.status, "failed", name);
    assert.ok(
      result.errors.some((error) => error.includes("exact three deny-only")),
      name,
    );
  }

  {
    const { fixture, definition, registry } = capabilityFixture();
    fs.appendFileSync(definition, "tool_aliases: [unrestricted-network]\n");
    refreshArtifactDigest(registry, definition);
    const result = validateRuntimeCapabilities(fixture, ["skill"]);
    assert.equal(result.status, "failed");
    assert.ok(
      result.errors.some((error) => error.includes("zero permissions/tools")),
    );
  }

  {
    const { fixture, definition, registry } = capabilityFixture();
    fs.writeFileSync(
      definition,
      fs
        .readFileSync(definition, "utf8")
        .replace("tools: []", "tools: [unrestricted-network]"),
    );
    refreshArtifactDigest(registry, definition);
    const result = validateRuntimeCapabilities(fixture, ["skill"]);
    assert.equal(result.status, "failed");
    assert.ok(
      result.errors.some((error) => error.includes("zero permissions/tools")),
    );
  }

  rejectsPolicyMutation("default allow", (policy) =>
    fs.appendFileSync(policy, "default_effect: allow\n"),
  );
  rejectsPolicyMutation("top-level alias", (policy) =>
    fs.appendFileSync(policy, "tool_aliases: [unrestricted-network]\n"),
  );
  rejectsPolicyMutation("nested exception", (policy) =>
    fs.appendFileSync(policy, "    exceptions: [unrestricted-network]\n"),
  );
  rejectsPolicyMutation("allow rule", (policy) =>
    fs.appendFileSync(
      policy,
      "  - id: allow-network\n    effect: allow\n    subject: tool_alias:unrestricted-network\n    reason: bypass\n",
    ),
  );
  rejectsPolicyMutation("unknown nested rule key", (policy) =>
    fs.appendFileSync(policy, "    override: permit\n"),
  );
  rejectsPolicyMutation("permissive required rule", (policy) => {
    fs.writeFileSync(
      policy,
      fs
        .readFileSync(policy, "utf8")
        .replace(
          "effect: deny\n    subject: tool_call",
          "effect: allow\n    subject: tool_call",
        ),
    );
  });
  rejectsPolicyMutation("missing required rule", (policy) => {
    fs.writeFileSync(
      policy,
      fs
        .readFileSync(policy, "utf8")
        .replace(/  - id: deny-authoritative-decisions[\s\S]*?(?=\n  -|$)/, ""),
    );
  });

  {
    const { fixture, registry } = capabilityFixture();
    fs.writeFileSync(
      registry,
      fs
        .readFileSync(registry, "utf8")
        .replace(
          "classification: contract/reference",
          "classification: production",
        )
        .replace("release_state: reference", "release_state: released"),
    );
    const result = validateRuntimeCapabilities(fixture, ["skill"]);
    assert.equal(result.status, "failed");
    assert.ok(
      result.errors.some((error) =>
        error.includes("classified contract/reference"),
      ),
    );
  }
});
