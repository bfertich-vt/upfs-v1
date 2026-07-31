import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { productionAdapterContract } from "../services/production-boundaries.mjs";

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const artifactDir = path.join(root, "artifacts");
const reportPath = path.join(artifactDir, "release-rehearsal-report.json");
const checks = [];

function check(name, passed, details) {
  checks.push({ name, status: passed ? "passed" : "failed", details });
  if (!passed) throw new Error(`${name}: ${details}`);
}

function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }

function write(status, error = null) {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify({ status, synthetic_only: true, generated_at: new Date().toISOString(), checks, error }, null, 2)}\n`);
}

try {
  check("durable-boundary-contract", Object.values(productionAdapterContract).flat().length === 8,
    "PostgreSQL transaction/health, outbox append/claim/acknowledge/fail, and checkpoint load/save are required.");
  const boundarySource = read("services/production-boundaries.mjs");
  check("no-in-memory-production-fallback", boundarySource.includes("in-memory fallback is disabled") && !boundarySource.includes("new Map"),
    "Production boundary construction fails closed instead of creating an in-memory store.");
  const requiredDocs = [
    "specs/09_cicd/delivery_pipeline.md",
    "specs/10_security/security_baseline.md",
    "specs/12_testing/test_strategy.md",
    "specs/11_soc2/soc2_readiness.md",
    "docs/handoffs/TASK-0011.md",
  ];
  check("release-evidence-documents", requiredDocs.every((file) => fs.existsSync(path.join(root, file))), "Required release and control documents exist.");
  const envExample = read(".env.example");
  check("configuration-fails-closed", !/production|prod/i.test(envExample) && envExample.includes("local-only-change-me"),
    "Checked-in configuration contains local placeholders only; production secrets are not accepted as fixtures.");
  check("synthetic-evidence-only", !/(account_number\s*[:=]|access[_-]?token\s*[:=]|secret\s*[:=]\s*[^<\s])/i.test(read("docs/handoffs/TASK-0011.md")),
    "Rehearsal evidence contains no customer data or credentials.");
  check("rollback-contract", /rollback|corrective-forward/i.test(read("specs/09_cicd/delivery_pipeline.md")), "Release specification documents rollback/corrective-forward.");
  check("recovery-contract", /checkpoint|reconcil/i.test(read("specs/03_architecture/system_architecture.md")), "Architecture specifies durable checkpoints and reconciliation.");
  write("passed");
  console.log(`Release rehearsal passed: ${checks.length} synthetic readiness checks; report written to ${path.relative(root, reportPath)}`);
} catch (error) {
  write("failed", error instanceof Error ? error.message : String(error));
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
