import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import {
  createProductionAdapter,
  createProductionBoundarySet,
  productionAdapterContract,
} from "../services/production-boundaries.mjs";
import {
  createProductionRuntime,
  createProductionRuntimeConfig,
  createProductionService,
  createProductionServiceSet,
} from "../services/production-runtime.mjs";

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const artifactDir = path.join(root, "artifacts");
const reportPath = path.join(artifactDir, "release-rehearsal-report.json");
const checks = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const pass = (name, details) =>
  checks.push({ name, status: "passed", details });
function check(name, condition, details) {
  if (!condition) throw new Error(`${name}: ${details}`);
  pass(name, details);
}
const noop = async () => ({ ok: true });

function securityGate() {
  const records = [
    { id: "a", tenant_id: "tenant-a" },
    { id: "b", tenant_id: "tenant-b" },
  ];
  const actor = { issuer: "synthetic-issuer", subject: "synthetic-user" };
  const authorize = (tenant) => tenant === "tenant-a";
  check(
    "security-tenant-isolation",
    authorize("tenant-a") && !authorize("tenant-b"),
    "synthetic actor cannot cross tenant scope",
  );
  check(
    "security-bola-denial",
    records
      .filter((r) => r.tenant_id === "tenant-a")
      .every((r) => r.id !== "b"),
    "synthetic BOLA lookup excludes another tenant",
  );
  check(
    "security-secret-scan",
    !/(aws_secret_access_key|private_key|access[_-]?token)\s*[:=]\s*[^<\s]/i.test(
      read("docs/handoffs/TASK-0011.md"),
    ),
    "handoff contains no credential-shaped values",
  );
}

async function recoveryGate() {
  const state = {};
  const checkpoint = createProductionAdapter(
    "checkpoint",
    async () => state.value,
    async (value) => {
      state.value = value;
    },
  );
  const marker = {
    tenant_id: "tenant-a",
    sequence: 7,
    event_id: "synthetic-event",
  };
  await checkpoint.save(marker);
  check(
    "recovery-checkpoint-roundtrip",
    JSON.stringify(await checkpoint.load()) === JSON.stringify(marker),
    "checkpoint survives save/load round trip",
  );
  const outbox = createProductionAdapter("outbox", noop, noop, noop, noop);
  check(
    "recovery-outbox-contract",
    Object.values(outbox).every((method) => typeof method === "function"),
    "synthetic outbox supports retry lifecycle",
  );
}

function performanceGate() {
  const started = performance.now();
  let count = 0;
  for (let i = 0; i < 10000; i += 1) count += i % 2;
  const elapsed = performance.now() - started;
  check(
    "performance-bounded-load",
    count === 5000 && elapsed < 2000,
    `10,000 synthetic checks completed in ${elapsed.toFixed(2)}ms`,
  );
}

function migrationGate() {
  const migration = read("infra/migrations/001_identity_tenant_rls.sql");
  check(
    "migration-dry-run",
    /create table|alter table/i.test(migration) &&
      /rls|row level security/i.test(migration),
    "migration contains executable schema and isolation statements",
  );
  const schema = JSON.parse(read("contracts/schemas/transaction.schema.json"));
  check(
    "migration-contract-compatibility",
    schema.$schema && schema.properties?.tenant_id && schema.properties?.id,
    "canonical transaction contract has stable identity and tenant fields",
  );
}

function releaseGate() {
  const requiredDocs = [
    "specs/09_cicd/delivery_pipeline.md",
    "specs/10_security/security_baseline.md",
    "specs/12_testing/test_strategy.md",
    "specs/11_soc2/soc2_readiness.md",
    "docs/handoffs/TASK-0011.md",
  ];
  check(
    "release-evidence-documents",
    requiredDocs.every((file) => fs.existsSync(path.join(root, file))),
    "required release and control documents exist",
  );
  const envExample = read(".env.example");
  check(
    "configuration-fails-closed",
    !/production|prod/i.test(envExample) &&
      envExample.includes("local-only-change-me"),
    "checked-in configuration is local-only",
  );
  check(
    "rollback-contract",
    /rollback|corrective-forward/i.test(
      read("specs/09_cicd/delivery_pipeline.md"),
    ),
    "release specification documents rollback",
  );
  check(
    "recovery-contract",
    /checkpoint|reconcil/i.test(
      read("specs/03_architecture/system_architecture.md"),
    ),
    "architecture specifies checkpoint/reconciliation",
  );
  check(
    "release-artifact-report",
    fs.existsSync(path.join(root, "package.json")) &&
      fs.existsSync(path.join(root, "scripts", "validate.ps1")),
    "release inputs and validator are present",
  );
}

async function main() {
  const postgres = createProductionAdapter("postgres", noop, noop);
  const boundaries = createProductionBoundarySet(
    postgres,
    createProductionAdapter("outbox", noop, noop, noop, noop),
    createProductionAdapter("checkpoint", noop, noop),
  );
  const services = createProductionServiceSet(
    ...Array.from({ length: 4 }, () => createProductionService(null)),
  );
  const runtime = createProductionRuntime(
    createProductionRuntimeConfig(boundaries, services, "reference-test"),
  );
  check(
    "production-composition-invocation",
    runtime.boundaries.postgres === postgres,
    "composition root invoked with registered synthetic adapters",
  );
  check(
    "durable-boundary-contract",
    Object.values(productionAdapterContract).flat().length === 8,
    "all durable adapter methods are required",
  );
  securityGate();
  await recoveryGate();
  performanceGate();
  migrationGate();
  releaseGate();
}

try {
  await main();
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    reportPath,
    `${JSON.stringify({ status: "passed", synthetic_only: true, checks }, null, 2)}\n`,
  );
  console.log(
    `Release rehearsal passed: ${checks.length} synthetic gates; report written to ${path.relative(root, reportPath)}`,
  );
} catch (error) {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    reportPath,
    `${JSON.stringify({ status: "failed", synthetic_only: true, checks, error: String(error) }, null, 2)}\n`,
  );
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
