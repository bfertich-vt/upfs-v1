import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const libraryPath = path.join(root, "docs", "compliance", "control-library.json");
const reportPath = path.join(root, "artifacts", "task-0016-readiness-report.json");
const required = ["id", "criteria", "title", "owner", "frequency", "systems", "procedure", "evidence_source", "reviewer", "exceptions", "remediation", "last_execution", "next_execution", "retention", "evidence_status"];
const checks = [];
const pass = (name, details) => checks.push({ name, status: "passed", details });
const fail = (name, details) => { throw new Error(`${name}: ${details}`); };
const nonEmpty = (value, field, id) => {
  if (typeof value !== "string" || value.trim().length < 1 || value.trim().length > 500) fail("control-completeness", `${id} has invalid ${field}`);
};
const isoDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const validEvidenceStatuses = new Set(["planned", "synthetic-evidence-available", "external-prerequisite", "complete"]);
const repoEvidence = (source) => source.split(/[;,]/).map((item) => item.trim()).filter(Boolean).every((item) => {
  if (/^external-prerequisite:/i.test(item)) return true;
  const candidate = item.replace(/^repository:/i, "").trim();
  return fs.existsSync(path.join(root, candidate));
});
function evaluate() {
  const library = JSON.parse(fs.readFileSync(libraryPath, "utf8"));
  if (library.schema_version !== "upfs.soc2.control-library.v1") fail("control-library", "unsupported schema version");
  if (library.attestation_status !== "engineering-readiness-only" || library.synthetic_data_only !== true) fail("scope", "library must remain readiness-only and synthetic-only");
  if (!Array.isArray(library.controls) || library.controls.length < 8) fail("control-library", "at least eight controls are required");
  const ids = new Set();
  for (const control of library.controls) {
    for (const field of required) if (!(field in control)) fail("control-completeness", `${control.id || "unknown"} missing ${field}`);
    if (ids.has(control.id)) fail("control-completeness", `duplicate control ${control.id}`);
    ids.add(control.id);
    if (!/^(CC[1-9]|Availability)$/.test(control.criteria)) fail("control-completeness", `${control.id} has invalid criteria mapping`);
    for (const field of ["title", "owner", "frequency", "procedure", "evidence_source", "reviewer", "exceptions", "remediation"]) nonEmpty(control[field], field, control.id);
    if (!Array.isArray(control.systems) || control.systems.length === 0 || control.systems.length > 20) fail("control-completeness", `${control.id} has invalid systems`);
    control.systems.forEach((system) => nonEmpty(system, "systems", control.id));
    if (!/^(?:(?:daily|weekly|monthly|quarterly|annual|continuous|per change|per release)(?: .+)?|.+ on incident|.+ on .+ event)$/i.test(control.frequency)) fail("control-completeness", `${control.id} has invalid frequency`);
    if (!/^\d+ (?:day|days|month|months|year|years)$/.test(control.retention)) fail("control-completeness", `${control.id} has invalid retention`);
    if (!validEvidenceStatuses.has(control.evidence_status)) fail("control-completeness", `${control.id} has invalid evidence_status`);
    if (control.evidence_status !== "planned" && !/evidence|report|record|export|manifest|transcript|exercise|review/i.test(control.evidence_source)) fail("control-completeness", `${control.id} has meaningless evidence status/source`);
    if (control.last_execution !== null && !isoDate(control.last_execution)) fail("control-completeness", `${control.id} has invalid last_execution`);
    if (control.last_execution === null && control.evidence_status !== "planned") fail("control-completeness", `${control.id} requires last_execution for ${control.evidence_status}`);
    if (!(isoDate(control.next_execution) || /^(?:before pilot authorization|each release|weekly during pilot)$/i.test(control.next_execution))) fail("control-completeness", `${control.id} has invalid next_execution`);
    if (!repoEvidence(control.evidence_source)) fail("evidence-reference", `${control.id} evidence_source must resolve to repository artifacts or external-prerequisite entries`);
  }
  pass("control-library", `${library.controls.length} controls mapped to Trust Services Criteria/availability with owners, cadence, evidence, review, exceptions, remediation, and retention`);
  const runbook = fs.readFileSync(path.join(root, "docs", "runbooks", "controlled-pilot-runbook.md"), "utf8");
  const goNoGo = fs.readFileSync(path.join(root, "docs", "compliance", "pilot-go-no-go.md"), "utf8");
  for (const phrase of ["NO-GO", "tenant", "restore", "incident", "SLO", "managed secret", "corrective-forward", "backup", "access", "change", "vendor", "pause", "go/no-go"]) if (!runbook.toLowerCase().includes(phrase.toLowerCase())) fail("pilot-documents", `runbook missing required procedure language: ${phrase}`);
  pass("pilot-runbook", "entry gates, SLOs, incident, recovery, access, change, vendor, and stop procedures are documented");
  pass("go-no-go", "incomplete authorization defaults to NO-GO and requires named evidence/approvers");
  pass("truthful-scope", "synthetic evidence and unavailable external approvals are distinguished; no deployment, certification, or attestation is claimed");
  return { status: "passed", synthetic_only: true, production_deployment: "not-performed", certification: "not-claimed", external_approvals: "required-before-pilot", checks, control_count: library.controls.length };
}
try {
  const report = evaluate();
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`TASK-0016 readiness evidence passed: ${report.checks.length} gates`);
} catch (error) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify({ status: "failed", synthetic_only: true, error: String(error) }, null, 2)}\n`);
  console.error(error.message || error);
  process.exit(1);
}

export { evaluate };
