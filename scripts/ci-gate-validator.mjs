import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { parseDocument } from "yaml";

const REQUIRED_VALIDATE_COMMANDS = [
  "npm ci --ignore-scripts",
  "npm run ci:gates",
  "npm test",
  "npm run format:check",
  "npm run lint",
  "npm run static:check",
  "npm run contracts:check",
  "npm run generated:check",
  "npm run migration:check",
  "npm run tenant-isolation:check",
  "npm run documentation:check",
  "npm run policy:check",
  "npm run prompt:check",
  "npm run skill:check",
  "npm run accessibility:check",
  "npm run queue:check",
  "npm run provenance:check",
  "npm run traceability:check",
];
const REQUIRED_NPM_SCRIPTS = [
  "test",
  "format:check",
  "lint",
  "static:check",
  "contracts:check",
  "generated:check",
  "migration:check",
  "tenant-isolation:check",
  "documentation:check",
  "policy:check",
  "prompt:check",
  "skill:check",
  "accessibility:check",
  "security:dependencies",
  "queue:check",
  "provenance:check",
  "traceability:check",
  "ci:gates",
];
const COMMON_ACTIONS = {
  "actions/checkout": "11bd71901bbe5b1630ceea73d27597364c9af683",
  "actions/setup-node": "49933ea5288caeca8642d1e84afbd3f7d6820020",
};
const VALIDATE_ACTIONS = {
  ...COMMON_ACTIONS,
  "actions/upload-artifact": "ea165f8d65b6e75b540449e92b4886f43607fa02",
};
const SECURITY_ACTIONS = {
  ...COMMON_ACTIONS,
  "aquasecurity/trivy-action": "ed142fd0673e97e23eac54620cfb913e5ce36c25",
};
const TRACEABILITY_COLUMNS = [
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
const CLASSIFICATIONS = new Set([
  "Proven production implementation",
  "Proven reference implementation",
  "Contract/interface only",
  "Synthetic rehearsal only",
  "External prerequisite",
  "Incomplete",
  "Unsupported completion claim",
]);
const REQUIRED_SOURCE_SECTIONS = new Map([
  [
    "docs/MASTER_PLAN.md",
    ["Outcome", "Delivery-stages", "V1-acceptance-themes"],
  ],
  [
    "specs/01_product/vision_and_scope.md",
    [
      "Initial-commercial-slice",
      "Platform-planes",
      "Explicit-non-goals-for-v1",
    ],
  ],
  [
    "specs/03_architecture/system_architecture.md",
    ["Data-path", "Core-services", "Multi-tenancy-and-scale", "Reliability"],
  ],
]);
const REQUIRED_RECLASSIFICATIONS = Array.from(
  { length: 110 },
  (_, index) => `TASK-${String(index + 1).padStart(4, "0")}`,
);
const AUTHOR_ROLE_FILES = new Map([
  ["Backend", "agents/BACKEND.md"],
  ["Frontend", "agents/FRONTEND.md"],
  ["Schema/Search/AI", "agents/SCHEMA_SEARCH_AI.md"],
]);
const QA_ROLE_FILE = "agents/QA_SECURITY.md";
const ABSENT_EVIDENCE =
  /^(?:not implemented|not applicable|external prerequisite):\s+.{8,}$/i;
const PLACEHOLDER =
  /^(?:n\/?a|none|unknown|tbd|todo|placeholder|example|x|-|not implemented)$/i;

function read(root, relative, errors) {
  try {
    return fs.readFileSync(path.join(root, relative), "utf8");
  } catch (error) {
    errors?.push(`${relative} cannot be read: ${error.message}`);
    return "";
  }
}

function parseYaml(root, relative, errors) {
  const raw = read(root, relative, errors);
  if (!raw) return {};
  const document = parseDocument(raw);
  if (document.errors.length) {
    errors.push(
      `${relative} is not valid YAML: ${document.errors.map((error) => error.message).join("; ")}`,
    );
    return {};
  }
  return document.toJS({ maxAliasCount: 100 }) ?? {};
}

function commands(workflow) {
  return (workflow.jobs ? Object.values(workflow.jobs) : [])
    .flatMap((job) => (Array.isArray(job?.steps) ? job.steps : []))
    .map((step) => step?.run)
    .filter((run) => typeof run === "string")
    .flatMap((run) =>
      run
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    );
}

function enabledForPr(workflow) {
  return (
    workflow?.on &&
    Object.prototype.hasOwnProperty.call(workflow.on, "pull_request")
  );
}

function pinnedActions(raw, relative, requiredActions, errors) {
  const matches = [
    ...raw.matchAll(
      /^\s*(?:-\s*)?uses:\s*([^@\s]+)@([^\s#]+)(?:\s+#\s*(.+))?\s*$/gim,
    ),
  ];
  const found = new Map(
    matches.map((match) => [match[1], { ref: match[2], comment: match[3] }]),
  );
  for (const [action, expected] of Object.entries(requiredActions)) {
    const actual = found.get(action);
    if (!actual) errors.push(`${relative} must use ${action}.`);
    else if (actual.ref !== expected || !/^[a-f0-9]{40}$/i.test(actual.ref)) {
      errors.push(
        `${relative} must pin ${action} to immutable commit ${expected}; found ${actual.ref}.`,
      );
    } else if (!actual.comment?.trim()) {
      errors.push(
        `${relative} must annotate ${action}'s immutable pin with its reviewed version.`,
      );
    }
  }
  for (const { ref } of found.values()) {
    if (!/^[a-f0-9]{40}$/i.test(ref))
      errors.push(`${relative} contains a mutable action reference: ${ref}.`);
  }
}

export function validateCiGates(root = process.cwd()) {
  const errors = [];
  const validateRelative = ".github/workflows/validate.yml";
  const securityRelative = ".github/workflows/security.yml";
  const validateRaw = read(root, validateRelative, errors);
  const securityRaw = read(root, securityRelative, errors);
  const validate = parseYaml(root, validateRelative, errors);
  const security = parseYaml(root, securityRelative, errors);
  let packageJson = {};
  try {
    packageJson = JSON.parse(read(root, "package.json", errors));
  } catch (error) {
    errors.push(`package.json is not valid JSON: ${error.message}`);
  }

  if (!enabledForPr(validate))
    errors.push(`${validateRelative} must run on pull requests.`);
  if (!enabledForPr(security))
    errors.push(`${securityRelative} must run on pull requests.`);
  for (const command of REQUIRED_VALIDATE_COMMANDS) {
    if (!commands(validate).includes(command))
      errors.push(`${validateRelative} must execute ${command}.`);
  }
  for (const command of [
    "npm ci --ignore-scripts",
    "npm run security:dependencies",
  ]) {
    if (!commands(security).includes(command))
      errors.push(`${securityRelative} must execute ${command}.`);
  }
  for (const script of REQUIRED_NPM_SCRIPTS) {
    if (
      typeof packageJson.scripts?.[script] !== "string" ||
      !packageJson.scripts[script].trim()
    ) {
      errors.push(`package.json must define executable ${script} script.`);
    }
  }
  if (!/apps\/\*\*\/\*\.test\.mjs/.test(packageJson.scripts?.test ?? "")) {
    errors.push("npm test must discover application tests under apps/.");
  }
  pinnedActions(validateRaw, validateRelative, VALIDATE_ACTIONS, errors);
  pinnedActions(securityRaw, securityRelative, SECURITY_ACTIONS, errors);
  if (
    !/scanners:\s*vuln,secret/.test(securityRaw) ||
    !/exit-code:\s*["']?1/.test(securityRaw)
  ) {
    errors.push(
      `${securityRelative} must run fail-closed vulnerability and secret scanning.`,
    );
  }
  return { status: errors.length ? "failed" : "passed", errors };
}

function meaningful(value) {
  return (
    typeof value === "string" &&
    value.trim().length >= 3 &&
    !PLACEHOLDER.test(value.trim())
  );
}

function resolveContained(root, relative, label, errors) {
  if (
    typeof relative !== "string" ||
    !relative.trim() ||
    path.isAbsolute(relative)
  ) {
    errors.push(`${label} must be a nonempty repository-relative path.`);
    return undefined;
  }
  const rootReal = fs.realpathSync.native(root);
  const candidate = path.resolve(rootReal, relative);
  const relativeToRoot = path.relative(rootReal, candidate);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    errors.push(`${label} escapes the repository root: ${relative}.`);
    return undefined;
  }
  if (!fs.existsSync(candidate)) {
    errors.push(
      `${label} is missing or resolves outside the repository: ${relative}.`,
    );
    return undefined;
  }
  const real = fs.realpathSync.native(candidate);
  if (
    !real ||
    (real !== rootReal && !real.startsWith(`${rootReal}${path.sep}`))
  ) {
    errors.push(
      `${label} is missing or resolves outside the repository: ${relative}.`,
    );
    return undefined;
  }
  return real;
}

function splitPathReferences(value) {
  return value
    .split(/(?:<br\s*\/?>|;|,)/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^`|`$/g, "").split(/[#:]/, 1)[0].trim())
    .filter(Boolean);
}

function requireEvidenceField(
  root,
  value,
  column,
  rowNumber,
  classification,
  errors,
) {
  if (!meaningful(value)) {
    errors.push(
      `traceability row ${rowNumber} has a placeholder or empty ${column}.`,
    );
    return;
  }
  if (ABSENT_EVIDENCE.test(value)) {
    if (
      [
        "Proven production implementation",
        "Proven reference implementation",
      ].includes(classification)
    ) {
      errors.push(
        `traceability row ${rowNumber} cannot use absent evidence for ${column} with ${classification}.`,
      );
    }
    return;
  }
  const references = splitPathReferences(value);
  if (!references.length) {
    errors.push(
      `traceability row ${rowNumber} ${column} must name a concrete contained artifact or a precise absent-evidence declaration.`,
    );
    return;
  }
  for (const relative of references)
    resolveContained(
      root,
      relative,
      `traceability row ${rowNumber} ${column}`,
      errors,
    );
}

function git(directory, args, encoding = "utf8") {
  const result = spawnSync("git", ["-C", directory, ...args], {
    encoding,
    timeout: 10_000,
    windowsHide: true,
  });
  return result.status === 0 ? result.stdout : undefined;
}

function gitBlobBytes(directory, commit, relative) {
  if (!validGitRelativePath(relative) || !/^[a-f0-9]{40}$/i.test(commit ?? ""))
    return undefined;
  const result = spawnSync(
    "git",
    ["-C", directory, "show", `${commit}:${relative}`],
    {
      encoding: null,
      timeout: 10_000,
      windowsHide: true,
    },
  );
  return result.status === 0 ? result.stdout : undefined;
}

function handoffCandidate(body) {
  return /^- Commit:\s*(?:candidate\s+)?`([a-f0-9]{40})`/im.exec(body)?.[1];
}

export function validateHandoffSpecificationDigests(worktree, body) {
  const errors = [];
  const candidate = handoffCandidate(body);
  if (!candidate) {
    errors.push(
      "handoff Specifications and contracts read record requires a declared candidate commit.",
    );
    return { status: "failed", errors };
  }
  const records = [
    ...body.matchAll(
      /^- Specifications and contracts read:\s*([\s\S]*?)(?=^-\s+|(?![\s\S]))/gim,
    ),
  ];
  if (!records.length) return { status: "passed", errors };
  for (const [recordIndex, record] of records.entries()) {
    const declared = [
      ...record[1].matchAll(/`([^`]+)`\s*\(`([a-f0-9]{64})`\)/gi),
    ];
    if (!declared.length) {
      errors.push(
        `handoff Specifications and contracts read record ${recordIndex + 1} requires path/digest pairs.`,
      );
      continue;
    }
    for (const [, relative, digest] of declared) {
      const bytes = gitBlobBytes(worktree, candidate, relative);
      if (!bytes) {
        errors.push(
          `handoff Specifications and contracts read ${relative} is not Git-resolvable at candidate ${candidate}.`,
        );
        continue;
      }
      const actual = crypto.createHash("sha256").update(bytes).digest("hex");
      if (actual !== digest.toLowerCase())
        errors.push(
          `handoff Specifications and contracts read ${relative} digest does not match Git blob bytes at candidate ${candidate}.`,
        );
    }
  }
  return { status: errors.length ? "failed" : "passed", errors };
}

const GIT_BOUND_ERRATA_TITLE =
  /^## Git-bound provenance erratum v1 — ([A-Z][A-Z0-9-]+)\s*$/gim;
const ERRATA_SCOPE_STATEMENT =
  "This erratum changes no historical task status, acceptance claim, test result, review state, risk, limitation, production-capability classification, or Independent QA/Security review result.";
const ERRATA_TEXT_MIN_LENGTH = 3;
const ERRATA_TEXT_MAX_LENGTH = 280;
const ERRATA_BOUNDED_TEXT =
  "(?=[^`\\r\\n]{3,280}`)(?=[^`\\r\\n]*[^\\s`\\r\\n][^`\\r\\n]*`)[^`\\r\\n]{3,280}";
const ERRATA_ALLOWED_SECTION = new RegExp(
  "^## Git-bound provenance erratum v1 [^\\r\\n]+\\r?\\n" +
    "\\r?\\n" +
    "- Original handoff path: `[^`\\r\\n]+`\\.\\r?\\n" +
    "- Original handoff source commit: `[a-f0-9]{40}`\\.\\r?\\n" +
    "- Original candidate commit: `[a-f0-9]{40}`\\.\\r?\\n" +
    "- Original provenance record: `Specifications and contracts read`\\.\\r?\\n" +
    "- Reason: `" +
    ERRATA_BOUNDED_TEXT +
    "`\\.\\r?\\n" +
    "- Correction provenance: `" +
    ERRATA_BOUNDED_TEXT +
    "`\\.\\r?\\n" +
    "\\r?\\n" +
    "\\| Path \\| Source candidate \\| Git blob \\| Derived SHA-256 \\|\\r?\\n" +
    "\\| --- \\| --- \\| --- \\| --- \\|\\r?\\n" +
    "(?:\\| `[^`|\\r\\n]+` \\| `[a-f0-9]{40}` \\| `[a-f0-9]{40}` \\| `[a-f0-9]{64}` \\|\\r?\\n)+" +
    "\\r?\\n" +
    "- Preservation statement: " +
    ERRATA_SCOPE_STATEMENT.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&") +
    "\\r?\\n*$",
  "i",
);

function errataSections(body) {
  const titles = [...body.matchAll(GIT_BOUND_ERRATA_TITLE)];
  return titles.map((title, index) => ({
    task: title[1],
    text: body.slice(title.index, titles[index + 1]?.index),
  }));
}

function requiredErrataField(section, label, errors) {
  const match = new RegExp(
    "^- " + label + ":\\s*`([^`]+)`\\.?\\s*$",
    "im",
  ).exec(section);
  if (!match) {
    errors.push(`Git-bound provenance erratum requires ${label}.`);
    return undefined;
  }
  return match[1];
}

function requiredBoundedErrataField(section, label, errors) {
  const matches = [
    ...section.matchAll(
      new RegExp("^- " + label + ":\\s*`([^`\\r\\n]*)`\\.\\s*$", "gim"),
    ),
  ];
  if (matches.length !== 1) {
    errors.push(
      `Git-bound provenance erratum requires exactly one bounded ${label} field.`,
    );
    return undefined;
  }
  const value = matches[0][1];
  if (
    value.length < ERRATA_TEXT_MIN_LENGTH ||
    value.length > ERRATA_TEXT_MAX_LENGTH ||
    !/\S/.test(value)
  ) {
    errors.push(
      `Git-bound provenance erratum ${label} must be non-empty, non-whitespace, and ${ERRATA_TEXT_MIN_LENGTH}-${ERRATA_TEXT_MAX_LENGTH} characters.`,
    );
    return undefined;
  }
  return value;
}

function originalSpecificationRecord(original) {
  return /^- Specifications and contracts read:\s*([^\r\n]*)\.?\s*$/im.exec(
    original,
  )?.[0];
}

function originalSpecificationRecords(record) {
  return new Map(
    [...record.matchAll(/`([^`]+)`\s*\(`([a-f0-9]{64})`\)/gi)].map(
      ([, relative, digest]) => [relative, digest.toLowerCase()],
    ),
  );
}

function parseErrataRows(section, errors) {
  const lines = section
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("|"));
  const header = lines.find((line) =>
    /^\|\s*Path\s*\|\s*Source candidate\s*\|\s*Git blob\s*\|\s*Derived SHA-256\s*\|\s*$/i.test(
      line.trim(),
    ),
  );
  if (!header) {
    errors.push(
      "Git-bound provenance erratum requires the exact correction table header.",
    );
    return [];
  }
  const headerIndex = lines.indexOf(header);
  const rows = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (/^\|\s*(?:---\s*\|\s*)+$/i.test(line.trim())) continue;
    const fields = line
      .split("|")
      .slice(1, -1)
      .map((field) => field.trim().replace(/^`|`$/g, ""));
    if (fields.length !== 4 || fields.some((field) => !field)) {
      errors.push(
        "Git-bound provenance erratum has a malformed correction table row.",
      );
      continue;
    }
    rows.push(fields);
  }
  if (!rows.length)
    errors.push(
      "Git-bound provenance erratum requires at least one correction row.",
    );
  return rows;
}

function validateGitBoundErratum(worktree, relative, body, section) {
  const errors = [];
  if (!ERRATA_ALLOWED_SECTION.test(section.text))
    errors.push(
      "Git-bound provenance erratum must contain only the exact v1 allowlisted schema; freeform or claim-changing content is not permitted.",
    );
  const originalPath = requiredErrataField(
    section.text,
    "Original handoff path",
    errors,
  );
  const sourceCommit = requiredErrataField(
    section.text,
    "Original handoff source commit",
    errors,
  );
  const originalCandidate = requiredErrataField(
    section.text,
    "Original candidate commit",
    errors,
  );
  const originalRecord = requiredErrataField(
    section.text,
    "Original provenance record",
    errors,
  );
  requiredBoundedErrataField(section.text, "Reason", errors);
  requiredBoundedErrataField(section.text, "Correction provenance", errors);
  if (originalPath !== relative)
    errors.push(
      `Git-bound provenance erratum original handoff path must be ${relative}.`,
    );
  if (!/^[a-f0-9]{40}$/i.test(sourceCommit ?? ""))
    errors.push(
      "Git-bound provenance erratum original handoff source commit must be immutable.",
    );
  if (!/^[a-f0-9]{40}$/i.test(originalCandidate ?? ""))
    errors.push(
      "Git-bound provenance erratum original candidate commit must be immutable.",
    );
  if (originalRecord !== "Specifications and contracts read")
    errors.push(
      "Git-bound provenance erratum may correct only the existing Specifications and contracts read record.",
    );
  const original =
    sourceCommit && originalPath === relative
      ? gitBlob(worktree, sourceCommit, originalPath)
      : undefined;
  if (!original) {
    errors.push(
      "Git-bound provenance erratum original handoff is not Git-resolvable at its declared source commit.",
    );
    return { status: "failed", errors };
  }
  if (!body.startsWith(original))
    errors.push(
      "Git-bound provenance erratum must preserve the original handoff bytes as an append-only prefix.",
    );
  const candidate = handoffCandidate(original);
  if (!candidate || candidate !== originalCandidate)
    errors.push(
      "Git-bound provenance erratum original candidate does not match the existing original record.",
    );
  const record = originalSpecificationRecord(original);
  if (!record) {
    errors.push(
      "Git-bound provenance erratum cannot locate the existing original Specifications and contracts read record.",
    );
    return { status: "failed", errors };
  }
  const originalRecords = originalSpecificationRecords(record);
  if (!originalRecords.size)
    errors.push(
      "Git-bound provenance erratum original record does not declare any correctable paths.",
    );
  const originalValidation = validateHandoffSpecificationDigests(
    worktree,
    original,
  );
  if (originalValidation.status === "passed")
    errors.push(
      "Git-bound provenance erratum cannot correct an already-valid provenance record.",
    );
  const rows = parseErrataRows(section.text, errors);
  const seen = new Set();
  for (const [relativePath, rowCandidate, blob, digest] of rows) {
    if (
      !validGitRelativePath(relativePath) ||
      !originalRecords.has(relativePath)
    )
      errors.push(
        `Git-bound provenance erratum correction path is not an existing original-record path: ${relativePath}.`,
      );
    if (rowCandidate !== originalCandidate)
      errors.push(
        `Git-bound provenance erratum correction ${relativePath} must bind original candidate ${originalCandidate}.`,
      );
    if (!/^[a-f0-9]{40}$/i.test(blob ?? ""))
      errors.push(
        `Git-bound provenance erratum correction ${relativePath} must declare an immutable Git blob.`,
      );
    if (!/^[a-f0-9]{64}$/i.test(digest ?? ""))
      errors.push(
        `Git-bound provenance erratum correction ${relativePath} must declare a SHA-256 digest.`,
      );
    if (seen.has(relativePath))
      errors.push(
        `Git-bound provenance erratum has a duplicate correction path: ${relativePath}.`,
      );
    seen.add(relativePath);
    const bytes = gitBlobBytes(worktree, originalCandidate, relativePath);
    const actualBlob = git(worktree, [
      "rev-parse",
      `${originalCandidate}:${relativePath}`,
    ])?.trim();
    const actualDigest = bytes
      ? crypto.createHash("sha256").update(bytes).digest("hex")
      : undefined;
    if (!bytes || !actualBlob || actualBlob !== blob)
      errors.push(
        `Git-bound provenance erratum correction ${relativePath} source blob is not Git-resolvable or does not match.`,
      );
    if (!actualDigest || actualDigest !== digest.toLowerCase())
      errors.push(
        `Git-bound provenance erratum correction ${relativePath} digest does not match Git blob bytes.`,
      );
    if (originalRecords.get(relativePath) === digest.toLowerCase())
      errors.push(
        `Git-bound provenance erratum correction ${relativePath} does not change the malformed original value.`,
      );
  }
  for (const required of originalRecords.keys())
    if (!seen.has(required))
      errors.push(
        `Git-bound provenance erratum omits original-record path ${required}.`,
      );
  return { status: errors.length ? "failed" : "passed", errors };
}

function validatedErrataForHandoff(worktree, relative, body) {
  const sections = errataSections(body);
  if (sections.length !== 1)
    return {
      status: "failed",
      errors: [
        "handoff must contain exactly one Git-bound provenance erratum.",
      ],
    };
  return validateGitBoundErratum(worktree, relative, body, sections[0]);
}

function discoveredHandoffFiles(root, errors) {
  const relativeDirectory = "docs/handoffs";
  const rootReal = (() => {
    try {
      return fs.realpathSync.native(root);
    } catch {
      errors.push("repository root cannot be resolved for handoff provenance.");
      return undefined;
    }
  })();
  if (!rootReal) return [];
  const directory = path.resolve(rootReal, relativeDirectory);
  const relativeToRoot = path.relative(rootReal, directory);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    errors.push(
      `${relativeDirectory} is not a contained repository directory.`,
    );
    return [];
  }
  let directoryStats;
  try {
    directoryStats = fs.lstatSync(directory);
  } catch {
    errors.push(
      `${relativeDirectory} is missing or cannot be safely enumerated.`,
    );
    return [];
  }
  if (!directoryStats.isDirectory() || directoryStats.isSymbolicLink()) {
    errors.push(
      `${relativeDirectory} must be a real contained directory, not a symbolic-link or reparse target.`,
    );
    return [];
  }
  const containedDirectory = resolveContained(
    rootReal,
    relativeDirectory,
    `${relativeDirectory} directory`,
    errors,
  );
  if (!containedDirectory || containedDirectory !== directory) {
    errors.push(
      `${relativeDirectory} cannot be safely enumerated as contained provenance.`,
    );
    return [];
  }
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    errors.push(`${relativeDirectory} cannot be safely enumerated.`);
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(relativeDirectory, entry.name);
    if (entry.isSymbolicLink()) {
      errors.push(
        `${relative} is a symbolic link and cannot supply handoff provenance.`,
      );
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) files.push(relative);
  }
  return files;
}

export function validateRepositoryHandoffSpecificationDigests(
  root = process.cwd(),
) {
  const errors = [];
  const handoffs = discoveredHandoffFiles(root, errors);
  for (const relative of handoffs) {
    const body = read(root, relative, errors);
    if (!/^\s*-\s+Specifications and contracts read:/im.test(body)) continue;
    const result = validateHandoffSpecificationDigests(root, body);
    const errata = errataSections(body);
    const effective = errata.length
      ? validatedErrataForHandoff(root, relative, body)
      : result;
    for (const error of effective.errors) errors.push(`${relative}: ${error}`);
  }
  return { status: errors.length ? "failed" : "passed", errors };
}

function sourceBinding(value) {
  const match = /^([^#:]+)[#:](.+)$/.exec(value ?? "");
  return match && { file: match[1].trim(), section: match[2].trim() };
}

function validateRequiredCoverage(rows, relative, errors) {
  const sources = new Set();
  const requirements = new Map();
  for (const row of rows) {
    const source = sourceBinding(row[0]);
    if (source) sources.add(`${source.file}#${source.section}`);
    const id = /^([A-Z][A-Z0-9_-]*-\d{2,})\b/.exec(row[1] ?? "")?.[1];
    if (id) requirements.set(id, row);
  }
  for (const [file, sections] of REQUIRED_SOURCE_SECTIONS)
    for (const section of sections)
      if (!sources.has(`${file}#${section}`))
        errors.push(
          `${relative} lacks required normative source-section binding ${file}#${section}.`,
        );
  const fdx = requirements.get("FDX-01");
  if (!fdx) errors.push(`${relative} lacks mandatory gap requirement FDX-01.`);
  else {
    const text = fdx.join(" ").toLowerCase();
    for (const word of [
      "fdx-first",
      "legacy",
      "security",
      "license",
      "compatibility",
      "test",
    ])
      if (!text.includes(word))
        errors.push(
          `${relative} FDX-01 must explicitly bind ${word} review evidence or missing work.`,
        );
  }
  for (const id of REQUIRED_RECLASSIFICATIONS)
    if (!requirements.has(id))
      errors.push(
        `${relative} lacks mandatory reclassification binding ${id}.`,
      );
}

function parseAuthorHandoff(body) {
  const role = /^- Agent role:\s*(.+?)\s*$/im.exec(body)?.[1]?.trim();
  const roleBinding =
    /^- Role-file path and digest:\s*`([^`]+)`;\s*SHA-256\s*`([a-f0-9]{64})`\.?\s*$/im.exec(
      body,
    );
  const thread = /^- Agent thread ID:\s*`([^`\s.]+)`\.?\s*$/im.exec(body)?.[1];
  const worktree =
    /^- Worktree and branch:\s*`([^`]+)`;\s*`([^`]+)`\.?\s*$/im.exec(body);
  const candidate = /^- Commit:\s*(?:candidate\s+)?`([a-f0-9]{40})`/im.exec(
    body,
  )?.[1];
  const taskInput = /^- Structured task input:\s*`([^`]+)`\.?\s*$/im.exec(
    body,
  )?.[1];
  const review =
    /^- Independent reviewer and review result:\s*`([^`]+)`;\s*PASS\.?\s*$/im.exec(
      body,
    )?.[1];
  return { role, roleBinding, thread, worktree, candidate, taskInput, review };
}

function parseReview(body) {
  return {
    role: /^- Agent role:\s*(.+?)\s*$/im.exec(body)?.[1]?.trim(),
    roleBinding:
      /^- Role-file path and digest:\s*`([^`]+)`;\s*SHA-256\s*`([a-f0-9]{64})`\.?\s*$/im.exec(
        body,
      ),
    thread: /^- Agent thread ID:\s*`([^`\s.]+)`\.?\s*$/im.exec(body)?.[1],
    worktree:
      /^- Review worktree and branch:\s*`([^`]+)`;\s*`([^`]+)`\.?\s*$/im.exec(
        body,
      ),
    candidate: /^- Candidate implementation commit:\s*`([a-f0-9]{40})`/im.exec(
      body,
    )?.[1],
    passed:
      /^\*\*PASS\b/im.test(body) || /^- Result:\s*PASS\.?\s*$/im.test(body),
  };
}

function validateWorktree(root, binding, candidate, label, rowNumber, errors) {
  if (!binding || !candidate) {
    errors.push(
      `traceability row ${rowNumber} ${label} provenance requires worktree, branch, and candidate commit.`,
    );
    return false;
  }
  const [_, rawWorktree, branch] = binding;
  if (!path.isAbsolute(rawWorktree)) {
    errors.push(
      `traceability row ${rowNumber} ${label} worktree must be an absolute path.`,
    );
    return false;
  }
  let worktree;
  try {
    worktree = fs.realpathSync.native(rawWorktree);
  } catch {
    errors.push(
      `traceability row ${rowNumber} ${label} worktree does not exist: ${rawWorktree}.`,
    );
    return false;
  }
  const rootReal = fs.realpathSync.native(root);
  const relative = path.relative(path.dirname(rootReal), worktree);
  if (
    !relative ||
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    !path.basename(worktree).startsWith("upfs-")
  ) {
    errors.push(
      `traceability row ${rowNumber} ${label} worktree is outside the documented isolated upfs-* worktree strategy.`,
    );
    return false;
  }
  const listed = git(worktree, ["worktree", "list", "--porcelain"]);
  const normalizedWorktree = worktree.replaceAll("\\", "/").toLowerCase();
  if (
    !listed ||
    !listed
      .split(/\r?\n/)
      .some(
        (line) =>
          line.slice(9).replaceAll("\\", "/").toLowerCase() ===
          normalizedWorktree,
      )
  ) {
    errors.push(
      `traceability row ${rowNumber} ${label} worktree is not a listed Git worktree.`,
    );
    return false;
  }
  if (git(worktree, ["branch", "--show-current"])?.trim() !== branch) {
    errors.push(
      `traceability row ${rowNumber} ${label} worktree does not bind declared branch ${branch}.`,
    );
    return false;
  }
  if (!git(worktree, ["show-ref", "--verify", `refs/heads/${branch}`])) {
    errors.push(
      `traceability row ${rowNumber} ${label} branch does not exist: ${branch}.`,
    );
    return false;
  }
  if (git(worktree, ["cat-file", "-t", candidate])?.trim() !== "commit") {
    errors.push(
      `traceability row ${rowNumber} ${label} candidate commit does not exist: ${candidate}.`,
    );
    return false;
  }
  if (git(worktree, ["merge-base", candidate, branch])?.trim() !== candidate) {
    errors.push(
      `traceability row ${rowNumber} ${label} candidate commit is not reachable from declared branch ${branch}.`,
    );
    return false;
  }
  return { worktree, branch };
}

function validateBlobDigest(
  worktree,
  candidate,
  roleFile,
  expectedFile,
  expectedDigest,
  label,
  rowNumber,
  errors,
) {
  if (
    roleFile !== expectedFile ||
    !/^[a-f0-9]{64}$/i.test(expectedDigest ?? "")
  ) {
    errors.push(
      `traceability row ${rowNumber} ${label} role-file must be ${expectedFile} with a SHA-256 digest.`,
    );
    return;
  }
  const bytes = git(worktree, ["show", `${candidate}:${roleFile}`], undefined);
  if (
    !bytes ||
    crypto.createHash("sha256").update(bytes).digest("hex") !==
      expectedDigest.toLowerCase()
  )
    errors.push(
      `traceability row ${rowNumber} ${label} role-file digest does not match Git blob bytes at the candidate commit.`,
    );
}

function validGitRelativePath(value) {
  if (typeof value !== "string" || !value || value !== value.trim())
    return false;
  if (
    value.includes(":") ||
    value.includes("\0") ||
    path.posix.isAbsolute(value) ||
    path.win32.isAbsolute(value)
  )
    return false;
  return value
    .split(/[\\/]/)
    .every((segment) => segment && segment !== "." && segment !== "..");
}

const EXTERNAL_HISTORICAL_AVAILABILITY =
  "external historical evidence; not a file present in this candidate tree";
const EXTERNAL_HISTORICAL_FIELDS = new Set([
  "purpose",
  "commit",
  "path",
  "sha256",
  "availability",
]);

export function validateExternalHistoricalEvidence(
  worktree,
  externalHistoricalEvidence,
) {
  const errors = [];
  if (externalHistoricalEvidence === undefined)
    return { status: "passed", errors };
  if (!Array.isArray(externalHistoricalEvidence)) {
    errors.push("external historical evidence must be an array.");
    return { status: "failed", errors };
  }
  for (const [index, record] of externalHistoricalEvidence.entries()) {
    const label = `external historical evidence record ${index + 1}`;
    if (
      !record ||
      typeof record !== "object" ||
      Array.isArray(record) ||
      Object.keys(record).length !== EXTERNAL_HISTORICAL_FIELDS.size ||
      Object.keys(record).some(
        (field) => !EXTERNAL_HISTORICAL_FIELDS.has(field),
      )
    ) {
      errors.push(
        `${label} must contain exactly purpose, commit, path, sha256, and availability.`,
      );
      continue;
    }
    const { purpose, commit, path: relative, sha256, availability } = record;
    if (typeof purpose !== "string" || !purpose.trim())
      errors.push(`${label} purpose must be non-empty.`);
    if (!/^[a-f0-9]{40}$/.test(commit ?? ""))
      errors.push(
        `${label} commit must be a lowercase immutable 40-character Git identifier.`,
      );
    if (!validGitRelativePath(relative))
      errors.push(`${label} path must be repository-relative and safe.`);
    if (!/^[a-f0-9]{64}$/.test(sha256 ?? ""))
      errors.push(
        `${label} sha256 must be lowercase 64-character hexadecimal.`,
      );
    if (availability !== EXTERNAL_HISTORICAL_AVAILABILITY)
      errors.push(`${label} availability must use the documented exact label.`);
    if (
      !/^[a-f0-9]{40}$/.test(commit ?? "") ||
      !validGitRelativePath(relative) ||
      !/^[a-f0-9]{64}$/.test(sha256 ?? "")
    )
      continue;
    const bytes = gitBlobBytes(worktree, commit, relative);
    if (!bytes) {
      errors.push(
        `${label} source is not Git-resolvable: ${commit}:${relative}.`,
      );
      continue;
    }
    const actual = crypto.createHash("sha256").update(bytes).digest("hex");
    if (actual !== sha256)
      errors.push(`${label} sha256 does not match raw Git blob bytes.`);
  }
  return { status: errors.length ? "failed" : "passed", errors };
}

function gitBlob(worktree, commit, relative) {
  if (!validGitRelativePath(relative) || !/^[a-f0-9]{40}$/i.test(commit ?? ""))
    return undefined;
  return git(worktree, ["show", `${commit}:${relative}`]);
}

function validateTaskInputEvidence(
  worktree,
  candidate,
  taskInput,
  rowNumber,
  errors,
) {
  if (!validGitRelativePath(taskInput)) {
    errors.push(
      `traceability row ${rowNumber} provenance requires a repository-relative Structured task input.`,
    );
    return;
  }
  const taskRaw = gitBlob(worktree, candidate, taskInput);
  if (!taskRaw) {
    errors.push(
      `traceability row ${rowNumber} Structured task input is not Git-resolvable at the candidate commit: ${taskInput}.`,
    );
    return;
  }
  const document = parseDocument(taskRaw);
  const task = document.toJS({ maxAliasCount: 100 }) ?? {};
  if (document.errors.length || !Array.isArray(task.inputs)) {
    errors.push(
      `traceability row ${rowNumber} Structured task input must be valid YAML with an inputs array.`,
    );
    return;
  }
  const external = validateExternalHistoricalEvidence(
    worktree,
    task.external_historical_evidence,
  );
  for (const error of external.errors)
    errors.push(`traceability row ${rowNumber} ${error}`);
  const evidence = task.evidence_inputs ?? [];
  if (!Array.isArray(evidence)) {
    errors.push(
      `traceability row ${rowNumber} Structured task input evidence_inputs must be an array.`,
    );
    return;
  }
  const claimed = new Set();
  for (const item of evidence) {
    const evidencePath = item?.path;
    const evidenceCommit = item?.commit;
    if (
      !validGitRelativePath(evidencePath) ||
      !/^[a-f0-9]{40}$/i.test(evidenceCommit ?? "")
    ) {
      errors.push(
        `traceability row ${rowNumber} task input evidence must declare a repository-relative path and immutable 40-character commit.`,
      );
      continue;
    }
    if (!gitBlob(worktree, evidenceCommit, evidencePath))
      errors.push(
        `traceability row ${rowNumber} task input evidence is not Git-resolvable: ${evidenceCommit}:${evidencePath}.`,
      );
    claimed.add(evidencePath);
  }
  for (const input of task.inputs) {
    if (!validGitRelativePath(input)) {
      errors.push(
        `traceability row ${rowNumber} Structured task input contains an invalid input path.`,
      );
      continue;
    }
    if (!gitBlob(worktree, candidate, input) && !claimed.has(input))
      errors.push(
        `traceability row ${rowNumber} task input is neither candidate-resolvable nor explicitly bound as immutable evidence: ${input}.`,
      );
  }
}

function validateProvenance(
  root,
  value,
  rowNumber,
  classification,
  errors,
  cache,
) {
  const cacheKey = `${classification}\u0000${value ?? ""}`;
  if (cache?.has(cacheKey)) return;
  cache?.add(cacheKey);
  if (ABSENT_EVIDENCE.test(value ?? "")) return;
  const references = splitPathReferences(value ?? "");
  if (references.length !== 1) {
    errors.push(
      `traceability row ${rowNumber} Agent/QA provenance must name exactly one concrete handoff artifact.`,
    );
    return;
  }
  const handoffFile = resolveContained(
    root,
    references[0],
    `traceability row ${rowNumber} Agent/QA provenance`,
    errors,
  );
  if (!handoffFile) return;
  const author = parseAuthorHandoff(fs.readFileSync(handoffFile, "utf8"));
  const expectedAuthorFile = AUTHOR_ROLE_FILES.get(author.role);
  if (!expectedAuthorFile)
    errors.push(
      `traceability row ${rowNumber} provenance must name a documented specialist author role; Supervisor and QA are not implementation provenance.`,
    );
  if (!author.thread)
    errors.push(
      `traceability row ${rowNumber} provenance requires an agent thread ID.`,
    );
  const authorBinding = validateWorktree(
    root,
    author.worktree,
    author.candidate,
    "author",
    rowNumber,
    errors,
  );
  if (authorBinding && expectedAuthorFile)
    validateBlobDigest(
      authorBinding.worktree,
      author.candidate,
      author.roleBinding?.[1],
      expectedAuthorFile,
      author.roleBinding?.[2],
      "author",
      rowNumber,
      errors,
    );
  if (authorBinding)
    validateTaskInputEvidence(
      authorBinding.worktree,
      author.candidate,
      author.taskInput,
      rowNumber,
      errors,
    );
  if (!author.review) {
    errors.push(
      `traceability row ${rowNumber} provenance requires a concrete independent QA/Security review artifact and PASS result.`,
    );
    return;
  }
  const reviewFile = resolveContained(
    root,
    author.review,
    `traceability row ${rowNumber} independent review`,
    errors,
  );
  if (!reviewFile) return;
  const reviewer = parseReview(fs.readFileSync(reviewFile, "utf8"));
  if (
    reviewer.role !== "Independent QA/Security" ||
    !reviewer.thread ||
    !reviewer.passed ||
    reviewer.candidate !== author.candidate
  ) {
    errors.push(
      `traceability row ${rowNumber} independent review artifact must bind QA/Security role, thread, candidate commit, and PASS.`,
    );
    return;
  }
  const reviewerBinding = validateWorktree(
    root,
    reviewer.worktree,
    reviewer.candidate,
    "reviewer",
    rowNumber,
    errors,
  );
  if (reviewerBinding)
    validateBlobDigest(
      reviewerBinding.worktree,
      reviewer.candidate,
      reviewer.roleBinding?.[1],
      QA_ROLE_FILE,
      reviewer.roleBinding?.[2],
      "reviewer",
      rowNumber,
      errors,
    );
  if (
    reviewer.thread === author.thread ||
    (reviewerBinding?.worktree &&
      reviewerBinding.worktree === authorBinding?.worktree)
  )
    errors.push(
      `traceability row ${rowNumber} independent reviewer must be distinct from the implementation author.`,
    );
  if (
    [
      "Proven production implementation",
      "Proven reference implementation",
    ].includes(classification) &&
    ABSENT_EVIDENCE.test(value ?? "")
  )
    errors.push(
      `traceability row ${rowNumber} cannot classify proven work without provenance.`,
    );
}

export function validateTraceability(root = process.cwd()) {
  const relative = "docs/MASTER_PLAN_TRACEABILITY.md";
  const errors = validateRepositoryHandoffSpecificationDigests(root).errors;
  const body = read(root, relative, errors);
  if (!body)
    return {
      status: "failed",
      errors: errors.length
        ? errors
        : [`${relative} is required before CI traceability can pass.`],
    };
  const lines = body
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("|"));
  const header = lines.find((line) =>
    TRACEABILITY_COLUMNS.every((column) => line.includes(column)),
  );
  if (!header)
    errors.push(
      `${relative} must contain the complete traceability table header.`,
    );
  const rows = lines
    .filter((line) => !line.includes("---") && line !== header)
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
  if (rows.length < 10)
    errors.push(
      `${relative} must contain at least ten substantive requirement rows; found ${rows.length}.`,
    );
  const identifiers = new Set();
  const normalizedBindings = new Set();
  const provenanceCache = new Set();
  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    if (row.length !== TRACEABILITY_COLUMNS.length) {
      errors.push(
        `${relative} row ${rowNumber} has ${row.length} fields; expected ${TRACEABILITY_COLUMNS.length}.`,
      );
      return;
    }
    const [
      source,
      requirement,
      implementation,
      contracts,
      tests,
      runtime,
      security,
      documentation,
      provenance,
      classification,
      missing,
      external,
      next,
    ] = row;
    const normalizedBinding = [
      requirement
        ?.replace(/^([A-Z][A-Z0-9_-]*-\d{2,})\b/, "")
        .replace(/\d+/g, "#"),
      implementation,
      contracts,
      tests,
      runtime,
      security,
      documentation,
      provenance,
      classification,
      missing?.replace(/\d+/g, "#"),
      external?.replace(/\d+/g, "#"),
      next?.replace(/\d+/g, "#"),
    ]
      .map((value) => (value ?? "").trim().toLowerCase())
      .join("\u001f");
    if (normalizedBindings.has(normalizedBinding)) {
      errors.push(
        `${relative} row ${rowNumber} duplicates a normalized requirement-to-evidence binding; unique IDs alone are not traceability.`,
      );
    } else normalizedBindings.add(normalizedBinding);
    if (
      !meaningful(source) ||
      !/^([\w./-]+\.(?:md|ya?ml|json|mjs|ts|sql))(?:#|:)[^\s].+$/i.test(source)
    ) {
      errors.push(
        `${relative} row ${rowNumber} source must identify a real versioned source file and nonempty section.`,
      );
    } else {
      resolveContained(
        root,
        source.split(/[#:]/, 1)[0],
        `traceability row ${rowNumber} source`,
        errors,
      );
    }
    const match = /^([A-Z][A-Z0-9_-]*-\d{2,})\b/.exec(requirement ?? "");
    if (!match)
      errors.push(
        `${relative} row ${rowNumber} requirement must begin with a stable requirement identifier.`,
      );
    else if (identifiers.has(match[1]))
      errors.push(`${relative} repeats requirement identifier ${match[1]}.`);
    else identifiers.add(match[1]);
    if (!CLASSIFICATIONS.has(classification))
      errors.push(
        `${relative} row ${rowNumber} uses an unrecognized classification: ${classification}.`,
      );
    for (const [value, column] of [
      [implementation, "Current implementation files"],
      [contracts, "Contracts"],
      [tests, "Tests"],
      [runtime, "Runtime evidence"],
      [security, "Security and tenant-isolation evidence"],
      [documentation, "Documentation"],
      [provenance, "Agent/QA provenance"],
    ]) {
      requireEvidenceField(
        root,
        value,
        column,
        rowNumber,
        classification,
        errors,
      );
    }
    validateProvenance(
      root,
      provenance,
      rowNumber,
      classification,
      errors,
      provenanceCache,
    );
    for (const [value, column] of [
      [missing, "Missing work"],
      [external, "External dependency"],
      [next, "Next authorized task"],
    ]) {
      if (!meaningful(value))
        errors.push(
          `${relative} row ${rowNumber} has a placeholder or empty ${column}.`,
        );
    }
  });
  validateRequiredCoverage(rows, relative, errors);
  return { status: errors.length ? "failed" : "passed", errors };
}

function sha256(file) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

function requiredString(record, field, label, errors) {
  if (!meaningful(record?.[field]))
    errors.push(`${label} requires substantive ${field}.`);
  return record?.[field];
}

function validateSkillRegistry(root, errors) {
  const relative = "registries/skills/index.yaml";
  const registry = parseYaml(root, relative, errors);
  if (registry.schema_version !== 1)
    errors.push("governed skill registry must declare schema_version: 1.");
  const skills = registry.skills;
  if (!Array.isArray(skills) || skills.length === 0) {
    errors.push(
      "governed skill registry must declare at least one evaluated skill; an empty directory or index is not evidence.",
    );
    return;
  }
  const identities = new Set();
  for (const [index, skill] of skills.entries()) {
    const label = `skill registry entry ${index + 1}`;
    if (!skill || typeof skill !== "object" || Array.isArray(skill)) {
      errors.push(`${label} must be an object.`);
      continue;
    }
    const id = requiredString(skill, "id", label, errors);
    const version = requiredString(skill, "version", label, errors);
    const digest = requiredString(skill, "digest", label, errors);
    requiredString(skill, "owner", label, errors);
    if (!/^[a-z][a-z0-9-]{2,63}$/.test(id ?? ""))
      errors.push(`${label} id must be a stable lowercase identifier.`);
    if (!/^\d+\.\d+\.\d+$/.test(version ?? ""))
      errors.push(`${label} version must be semantic version x.y.z.`);
    if (!/^[a-f0-9]{64}$/i.test(digest ?? ""))
      errors.push(`${label} digest must be a SHA-256 hex digest.`);
    const identity = `${id}@${version}`;
    if (identities.has(identity))
      errors.push(`${label} duplicates skill identity ${identity}.`);
    else identities.add(identity);

    const policy = skill.policy;
    if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
      errors.push(
        `${label} policy must be an object with a contained artifact and digest.`,
      );
    } else {
      const policyPath = requiredString(
        policy,
        "path",
        `${label} policy`,
        errors,
      );
      const policyDigest = requiredString(
        policy,
        "digest",
        `${label} policy`,
        errors,
      );
      const policyFile = resolveContained(
        root,
        policyPath,
        `${label} policy artifact`,
        errors,
      );
      if (!/^[a-f0-9]{64}$/i.test(policyDigest ?? ""))
        errors.push(`${label} policy digest must be a SHA-256 hex digest.`);
      if (
        policyFile &&
        /^[a-f0-9]{64}$/i.test(policyDigest ?? "") &&
        sha256(policyFile) !== policyDigest
      )
        errors.push(`${label} policy digest does not match artifact.`);
      if (policyFile) {
        const policyDocument = parseDocument(
          fs.readFileSync(policyFile, "utf8"),
        );
        const policyData = policyDocument.toJS() ?? {};
        if (
          policyDocument.errors.length ||
          policyData.schema_version !== 1 ||
          !Array.isArray(policyData.rules) ||
          !policyData.rules.length
        ) {
          errors.push(
            `${label} policy artifact must be valid schema-versioned YAML with nonempty rules.`,
          );
        }
      }
    }

    const evaluation = skill.evaluation;
    if (
      !evaluation ||
      typeof evaluation !== "object" ||
      Array.isArray(evaluation)
    ) {
      errors.push(
        `${label} evaluation must be an object with contained evaluated evidence.`,
      );
    } else {
      const evaluationPath = requiredString(
        evaluation,
        "path",
        `${label} evaluation`,
        errors,
      );
      const evaluationDigest = requiredString(
        evaluation,
        "digest",
        `${label} evaluation`,
        errors,
      );
      const evaluationFile = resolveContained(
        root,
        evaluationPath,
        `${label} evaluation artifact`,
        errors,
      );
      if (!/^[a-f0-9]{64}$/i.test(evaluationDigest ?? ""))
        errors.push(`${label} evaluation digest must be a SHA-256 hex digest.`);
      if (
        evaluationFile &&
        /^[a-f0-9]{64}$/i.test(evaluationDigest ?? "") &&
        sha256(evaluationFile) !== evaluationDigest
      )
        errors.push(`${label} evaluation digest does not match artifact.`);
      if (evaluationFile) {
        const evidence = parseDocument(fs.readFileSync(evaluationFile, "utf8"));
        const data = evidence.toJS() ?? {};
        if (
          evidence.errors.length ||
          data.schema_version !== 1 ||
          data.skill_id !== id ||
          data.skill_version !== version ||
          data.status !== "passed" ||
          !Number.isInteger(data.assertions) ||
          data.assertions < 1 ||
          !Number.isInteger(data.cases) ||
          data.cases < 1 ||
          !/^\d{4}-\d{2}-\d{2}T/.test(data.executed_at ?? "")
        ) {
          errors.push(
            `${label} evaluation artifact must be schema-versioned, bound to the skill identity, passed, timestamped, and report positive cases/assertions.`,
          );
        }
      }
    }
  }
}

function parseAccessibilityCommand(command) {
  if (
    typeof command !== "string" ||
    !/^node\s+([A-Za-z0-9_./-]+\.mjs)$/.test(command.trim())
  )
    return undefined;
  return /^node\s+([A-Za-z0-9_./-]+\.mjs)$/.exec(command.trim())?.[1];
}

function validateAccessibilityTarget(root, errors) {
  const target = "apps/customer-console";
  const packageRelative = `${target}/package.json`;
  const packageText = read(root, packageRelative, errors);
  if (!packageText) {
    errors.push(
      "runnable customer-console accessibility target is absent; a synthetic TASK-0086 rehearsal is not a real accessibility gate.",
    );
    return;
  }
  let applicationPackage;
  try {
    applicationPackage = JSON.parse(packageText);
  } catch (error) {
    errors.push(`${packageRelative} is not valid JSON: ${error.message}`);
    return;
  }
  const script = applicationPackage.scripts?.["test:accessibility"];
  const relativeScript = parseAccessibilityCommand(script);
  if (!relativeScript) {
    errors.push(
      "customer-console test:accessibility must be the allowlisted form `node relative-script.mjs`; shell commands, package managers, and external executables are prohibited.",
    );
    return;
  }
  const appRoot = resolveContained(
    root,
    target,
    "customer-console root",
    errors,
  );
  if (!appRoot) return;
  const scriptFile = resolveContained(
    appRoot,
    relativeScript,
    "customer-console accessibility script",
    errors,
  );
  if (!scriptFile) return;
  const result = spawnSync(process.execPath, [scriptFile], {
    cwd: appRoot,
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    errors.push(
      `customer-console accessibility command failed: ${result.error?.message ?? `exit ${result.status}`}.`,
    );
    return;
  }
  const output = `${result.stdout}\n${result.stderr}`.trim();
  const assertionMatch =
    /\b(\d+)\s+(?:accessibility\s+)?(?:assertions?|tests?)\s+passed\b/i.exec(
      output,
    );
  if (!assertionMatch || Number(assertionMatch[1]) < 1 || output.length < 12) {
    errors.push(
      "customer-console accessibility command must emit nontrivial positive assertion/test output.",
    );
  }
}

export function validateRuntimeCapabilities(
  root = process.cwd(),
  requested = [],
) {
  const errors = [];
  const names = requested.length ? requested : ["skill", "accessibility"];
  for (const name of names) {
    if (name === "skill") validateSkillRegistry(root, errors);
    else if (name === "accessibility")
      validateAccessibilityTarget(root, errors);
    else errors.push(`unknown runtime capability gate: ${name}.`);
  }
  return { status: errors.length ? "failed" : "passed", errors };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const capabilityIndex = process.argv.indexOf("--capabilities");
  const result =
    capabilityIndex >= 0
      ? validateRuntimeCapabilities(
          process.cwd(),
          process.argv.slice(capabilityIndex + 1),
        )
      : process.argv.includes("--traceability")
        ? validateTraceability()
        : validateCiGates();
  for (const error of result.errors) console.error(error);
  if (result.status !== "passed") process.exitCode = 1;
}
