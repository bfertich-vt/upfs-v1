import assert from "node:assert/strict";
import crypto from "node:crypto";
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
  const rows = Array.from({ length: 10 }, (_, index) => {
    const suffix = String(index + 1).padStart(2, "0");
    const paths = {
      source: `specs/source-${suffix}.md`,
      implementation: `implementation-${suffix}.mjs`,
      contract: `contract-${suffix}.yaml`,
      test: `test-${suffix}.mjs`,
      runtime: `runtime-${suffix}.md`,
      security: `security-${suffix}.md`,
      documentation: `docs-${suffix}.md`,
      provenance: `provenance-${suffix}.md`,
    };
    for (const relative of Object.values(paths))
      write(fixture, relative, `specific evidence for ${relative}\n`);
    return [
      `${paths.source}#Requirement-${suffix}`,
      `MP-${suffix} distinct normative requirement for bounded capability ${suffix}`,
      paths.implementation,
      paths.contract,
      paths.test,
      paths.runtime,
      paths.security,
      paths.documentation,
      paths.provenance,
      "Proven reference implementation",
      `Distinct missing work for capability ${suffix} remains documented`,
      `External dependency status for capability ${suffix} is not required`,
      `RECOVERY-${suffix} is the next authorized task`,
    ];
  });
  write(
    fixture,
    "docs/MASTER_PLAN_TRACEABILITY.md",
    `| ${columns.join(" | ")} |\n| ${columns.map(() => "---").join(" | ")} |\n${rows.map((row) => `| ${row.join(" | ")} |`).join("\n")}\n`,
  );
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
      .replace("MP-02", "MP-01")
      .replace("implementation-01.mjs", "missing.mjs"),
  );
  const result = validateTraceability(fixture);
  assert.equal(result.status, "failed");
  assert.ok(
    result.errors.some((error) =>
      error.includes("repeats requirement identifier MP-01"),
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
