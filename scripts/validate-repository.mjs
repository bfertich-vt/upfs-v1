import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseDocument } from "yaml";
import { QueueValidationError, validateQueueDocument } from "./queue-validator.mjs";

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const artifactDir = path.join(root, "artifacts");
const reportPath = path.join(artifactDir, "validation-report.json");

const requiredFiles = [
  "README.md",
  "START_HERE.md",
  "AGENTS.md",
  "tasks/queue.yaml",
  "contracts/openapi/public-api.yaml",
  "contracts/openapi/admin-api.yaml",
  "contracts/asyncapi/platform-events.yaml",
  "contracts/schemas/transaction.schema.json",
  ".github/workflows/validate.yml",
  ".github/workflows/security.yml",
  "CODEOWNERS",
  "docs/REPOSITORY_GOVERNANCE.md",
];

const markdownFiles = [];
const jsonContractFiles = [];
const yamlContractFiles = [];
const linkFailures = [];
const checks = [];

function walk(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }

    const nextPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(nextPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const relPath = path.relative(root, nextPath).replace(/\\/g, "/");
    if (relPath.endsWith(".md")) {
      markdownFiles.push(relPath);
    }
    if (relPath.startsWith("contracts/") && relPath.endsWith(".json")) {
      jsonContractFiles.push(relPath);
    }
    if (relPath.startsWith("contracts/") && relPath.endsWith(".yaml")) {
      yamlContractFiles.push(relPath);
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readUtf8(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function recordCheck(name, details) {
  checks.push({ name, details });
}

function ensureRequiredFiles() {
  const missing = requiredFiles.filter((relPath) => !fs.existsSync(path.join(root, relPath)));
  assert(missing.length === 0, `Missing required files: ${missing.join(", ")}`);
  recordCheck("required-files", { count: requiredFiles.length });
}

function validateMarkdownLinks() {
  const markdownLinkPattern = /\[[^\]]+\]\((?!https?:\/\/|mailto:|#)([^)]+)\)/g;

  for (const relPath of markdownFiles) {
    const absolutePath = path.join(root, relPath);
    const body = fs.readFileSync(absolutePath, "utf8");
    let match;

    while ((match = markdownLinkPattern.exec(body)) !== null) {
      const rawTarget = match[1].split("#")[0].trim();
      if (!rawTarget) {
        continue;
      }

      const targetPath = path.resolve(path.dirname(absolutePath), rawTarget);
      if (!fs.existsSync(targetPath)) {
        linkFailures.push(`${relPath}: ${rawTarget}`);
      }
    }
  }

  assert(linkFailures.length === 0, `Broken local links:\n${linkFailures.join("\n")}`);
  recordCheck("docs-links", { markdown_files: markdownFiles.length });
}

function validateJsonContracts() {
  for (const relPath of jsonContractFiles) {
    JSON.parse(readUtf8(relPath));
  }

  const transactionSchema = JSON.parse(readUtf8("contracts/schemas/transaction.schema.json"));
  assert(transactionSchema.type === "object", "Transaction schema must define an object payload.");
  assert(Array.isArray(transactionSchema.required) && transactionSchema.required.includes("tenant_id"), "Transaction schema must require tenant_id.");
  recordCheck("json-contracts", { files: jsonContractFiles.length });
}

function findExternalRefs(node, refs = []) {
  if (Array.isArray(node)) {
    for (const entry of node) {
      findExternalRefs(entry, refs);
    }
    return refs;
  }

  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (key === "$ref" && typeof value === "string" && !value.startsWith("#")) {
        refs.push(value.split("#")[0]);
      } else {
        findExternalRefs(value, refs);
      }
    }
  }

  return refs;
}

function parseYamlContract(relPath) {
  const doc = parseDocument(readUtf8(relPath));
  if (doc.errors.length > 0) {
    throw new Error(`${relPath} YAML parse errors: ${doc.errors.map((error) => error.message).join("; ")}`);
  }
  return doc.toJS({ maxAliasCount: 100 });
}

function validateYamlContracts() {
  const publicApi = parseYamlContract("contracts/openapi/public-api.yaml");
  const adminApi = parseYamlContract("contracts/openapi/admin-api.yaml");
  const platformEvents = parseYamlContract("contracts/asyncapi/platform-events.yaml");

  for (const [name, document] of [
    ["public-api", publicApi],
    ["admin-api", adminApi],
  ]) {
    assert(typeof document.openapi === "string" && document.openapi.startsWith("3."), `${name} must declare an OpenAPI 3.x version.`);
    assert(document.info?.title && document.info?.version, `${name} must include info.title and info.version.`);
    assert(document.paths && typeof document.paths === "object" && Object.keys(document.paths).length > 0, `${name} must declare at least one path.`);
  }

  assert(typeof platformEvents.asyncapi === "string" && platformEvents.asyncapi.startsWith("3."), "platform-events must declare an AsyncAPI 3.x version.");
  assert(platformEvents.info?.title && platformEvents.info?.version, "platform-events must include info.title and info.version.");
  assert(platformEvents.channels && Object.keys(platformEvents.channels).length > 0, "platform-events must define at least one channel.");
  assert(platformEvents.operations && Object.keys(platformEvents.operations).length > 0, "platform-events must define at least one operation.");

  for (const relPath of yamlContractFiles) {
    const document = parseYamlContract(relPath);
    const refs = findExternalRefs(document);

    for (const refTarget of refs) {
      const resolved = path.resolve(path.dirname(path.join(root, relPath)), refTarget);
      assert(fs.existsSync(resolved), `${relPath} references a missing file: ${refTarget}`);
    }
  }

  recordCheck("yaml-contracts", { files: yamlContractFiles.length });
}

function validateQueueBaseline() {
  recordCheck("task-queue", validateQueueDocument(readUtf8("tasks/queue.yaml"), root));
}

function validateWorkflowPins() {
  const validateWorkflow = readUtf8(".github/workflows/validate.yml");
  const securityWorkflow = readUtf8(".github/workflows/security.yml");
  const packageJson = JSON.parse(readUtf8("package.json"));

  assert(validateWorkflow.includes("node-version: '24.16.0'"), "validate workflow must pin the Node.js version.");
  assert(validateWorkflow.includes("npm ci --ignore-scripts"), "validate workflow must install pinned validator dependencies.");
  assert(packageJson.dependencies?.yaml === "2.8.1", "package.json must pin yaml 2.8.1.");
  assert(securityWorkflow.includes("aquasecurity/trivy-action@v0.36.0"), "security workflow must pin Trivy.");
  assert(securityWorkflow.includes("version: v0.69.3"), "security workflow must pin the Trivy tool version.");
  recordCheck("workflow-pins", {
    validate_node: "24.16.0",
    yaml_parser: packageJson.dependencies.yaml,
    trivy_action: "0.36.0",
    trivy_version: "0.69.3",
  });
}

function writeReport(status, errorMessage = null, errors = []) {
  fs.mkdirSync(artifactDir, { recursive: true });
  const report = {
    status,
    generated_at: new Date().toISOString(),
    metrics: {
      markdown_files: markdownFiles.length,
      json_contracts: jsonContractFiles.length,
      yaml_contracts: yamlContractFiles.length,
      required_files: requiredFiles.length,
    },
    checks,
  };

  if (errorMessage) {
    report.error = errorMessage;
  }
  if (errors.length) {
    report.errors = errors;
  }

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

try {
  walk(root);
  ensureRequiredFiles();
  validateMarkdownLinks();
  validateJsonContracts();
  validateYamlContracts();
  validateQueueBaseline();
  validateWorkflowPins();
  writeReport("passed");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  writeReport("failed", message, error instanceof QueueValidationError ? error.errors : []);
  console.error(message);
  process.exit(1);
}
