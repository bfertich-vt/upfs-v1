import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { pathToFileURL } from "node:url";
import prettier from "prettier";

const candidates = [
  "scripts/closure-format-check.mjs",
  "scripts/closure-format-check.test.mjs",
  "scripts/historical-closure-validator.mjs",
  "scripts/historical-closure-validator.test.mjs",
  "docs/governance/delivery-governance.md",
  "docs/governance/task-closures/TASK-0001.json",
  "docs/governance/task-closures/rejected/TASK-0001-r1.json",
  "docs/governance/task-closures/TASK-0001-stage-a-state.json",
  "docs/governance/task-closures/evidence/TASK-0001-validation-report.json",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R2.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R3.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R4.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R5.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R6.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R7.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R8.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R9.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R10.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R13.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R14.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R15.yaml",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R2.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R3.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R4.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R5.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R6.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R7.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R8.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R9.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R10.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R13.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R14.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R15.md",
  "docs/reviews/RECOVERY-TASK-0001-CLOSURE-002-QA.md",
  "docs/reviews/RECOVERY-TASK-0001-CLOSURE-002-R2-QA.md",
  "docs/reviews/RECOVERY-TASK-0001-CLOSURE-002-R3-QA.md",
];

function noTrailingWhitespace(rel, body, errors) {
  body.split(/\r?\n/).forEach((line, index) => {
    if (/[\t ]+$/.test(line))
      errors.push(`${rel}:${index + 1} has trailing whitespace.`);
  });
}

export function canonicalStageAState(body) {
  const value = {
    version: 1,
    task_id: "TASK-0001",
    active_recovery_task: "RECOVERY-TASK-0001-CLOSURE-002-R15",
    predecessor_task: "RECOVERY-TASK-0001-CLOSURE-002-R14",
    predecessor_disposition: "REJECTED",
    task_status: "blocked",
    attestation_status: "absent",
    review_target: "R15_HANDOFF_CANDIDATE",
    activation_phase: "STAGE_A_REVIEW_PENDING",
    next_action: "FRESH_QA_REVIEW_THEN_ATTEST_IF_ACCEPTED",
  };
  return (
    typeof body === "string" &&
    body.replace(/\r\n/g, "\n") === `${JSON.stringify(value, null, 2)}\n`
  );
}

export function canonicalTaskOneRow() {
  return "| TASK-0001 | docs/MASTER_PLAN.md; tasks/queue.yaml; tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R15.yaml; docs/governance/task-closures/TASK-0001-stage-a-state.json | Original repository baseline criteria and corrective evidence are preserved. | Historical implementation and QA evidence remain immutable. | Prior local validation evidence remains historical. | Hosted observations remain immutable snapshots. | Governance-only correction; runtime security behavior is unchanged. | Raw evidence and provenance remain append-only. | Unsupported completion claim. | blocked | Authoritative state: docs/governance/task-closures/TASK-0001-stage-a-state.json; all matrix prose is non-authoritative. | Hosted API facts retain their documented snapshot boundary. | Backend owns corrective control; separation of duties remains required. | R15 canonical sanitized Git authority, tests, task, and handoff only. | None for this corrective control. | Canonical row, complete ADS inventory, ASCII paths, full-suite, audit, fsck, and diff gates. | Correct forward only; preserve every prior candidate and QA disposition. | Follow the authoritative state record and R15 handoff. |";
}

function canonicalGitContext(root) {
  const worktree = fs.realpathSync.native(path.resolve(root));
  const dotGit = path.join(worktree, ".git");
  const stat = fs.lstatSync(dotGit);
  let gitDir;
  if (stat.isDirectory()) gitDir = fs.realpathSync.native(dotGit);
  else if (stat.isFile()) {
    const match = /^gitdir: ([^\r\n]+)\r?\n?$/.exec(
      fs.readFileSync(dotGit, "utf8"),
    );
    if (!match) throw new Error("canonical .git file is malformed");
    gitDir = fs.realpathSync.native(path.resolve(worktree, match[1]));
  } else throw new Error("canonical .git entry is not a file or directory");
  const commonFile = path.join(gitDir, "commondir");
  const commonDir = fs.existsSync(commonFile)
    ? fs.realpathSync.native(
        path.resolve(gitDir, fs.readFileSync(commonFile, "utf8").trim()),
      )
    : gitDir;
  const index = path.join(gitDir, "index");
  if (!fs.statSync(index).isFile())
    throw new Error("canonical index is absent");
  return { worktree, gitDir, commonDir, index };
}

function sanitizedGitEnvironment(context) {
  const env = {};
  for (const [key, value] of Object.entries(process.env))
    if (!/^GIT_/i.test(key)) env[key] = value;
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_CONFIG_GLOBAL = process.platform === "win32" ? "NUL" : "/dev/null";
  env.GIT_INDEX_FILE = context.index;
  env.GIT_COMMON_DIR = context.commonDir;
  env.GIT_OBJECT_DIRECTORY = path.join(context.commonDir, "objects");
  return env;
}

function checkedGit(context, args, errors, options = {}) {
  const result = spawnSync(
    options.gitCommand || "git",
    [
      ...(options.gitCommandPrefix || []),
      `--git-dir=${context.gitDir}`,
      `--work-tree=${context.worktree}`,
      ...args,
    ],
    {
      cwd: context.worktree,
      encoding: null,
      env: sanitizedGitEnvironment(context),
      windowsHide: true,
      timeout: options.gitTimeoutMs || 30000,
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  if (
    result.error ||
    result.signal ||
    result.status !== 0 ||
    (Buffer.isBuffer(result.stderr) && result.stderr.length)
  ) {
    const reason =
      result.error?.code ||
      result.signal ||
      (result.status !== 0 ? `status ${result.status}` : "unexpected stderr");
    errors.push(`Canonical Git command failed closed (${args[0]}): ${reason}.`);
    return { ok: false, stdout: Buffer.alloc(0) };
  }
  if (!Buffer.isBuffer(result.stdout)) {
    errors.push(
      `Canonical Git command returned malformed output (${args[0]}).`,
    );
    return { ok: false, stdout: Buffer.alloc(0) };
  }
  return { ok: true, stdout: result.stdout };
}

function stateLookalike(rel) {
  const folded = rel
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const nonAscii = /[^\x20-\x7e]/.test(rel);
  const governanceLike =
    folded.includes("task0001") ||
    (folded.includes("stage") && folded.includes("state")) ||
    (folded.includes("closure") && folded.includes("state"));
  return folded.includes("task0001stageastate") || (nonAscii && governanceLike);
}

function worktreePaths(root, current = root, output = [], limit = 100000) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (current === root && entry.name === ".git") continue;
    if (output.length >= limit)
      throw new Error(`worktree metadata traversal exceeds ${limit} entries`);
    const absolute = path.join(current, entry.name);
    const rel = path.relative(root, absolute).replaceAll("\\", "/");
    output.push(rel);
    if (entry.isDirectory() && !entry.isSymbolicLink())
      worktreePaths(root, absolute, output, limit);
  }
  return output;
}

function portableAsciiPath(rel) {
  if (!/^[\x20-\x7e]+$/.test(rel) || /[<>:"\\|?*]/.test(rel)) return false;
  return rel
    .split("/")
    .every(
      (segment) =>
        segment &&
        !/[. ]$/.test(segment) &&
        !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment),
    );
}

function authoritativeScope(root, context, errors, options) {
  const result = checkedGit(
    context,
    ["ls-files", "--stage", "-z"],
    errors,
    options,
  );
  const records = result.stdout.toString("utf8").split("\0").filter(Boolean);
  const paths = [];
  for (const record of records) {
    const match = /^(100644|100755) [a-f0-9]{40} 0\t(.+)$/.exec(record);
    if (!match) {
      errors.push(
        `Unsupported, conflicted, or non-regular index entry: ${record}`,
      );
      continue;
    }
    const rel = match[2];
    try {
      const stat = fs.lstatSync(path.join(root, rel));
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1)
        throw new Error();
    } catch {
      errors.push(
        `Tracked authority file lacks one regular worktree file: ${rel}`,
      );
    }
    paths.push(rel);
  }
  for (const rel of [
    "MANIFEST.sha256",
    "CODEOWNERS",
    ".env.example",
    ".gitattributes",
    ".gitignore",
    "SECURITY.md",
    "START_HERE.md",
    "AGENTS.md",
    "package.json",
    "package-lock.json",
  ])
    if (!paths.includes(rel))
      errors.push(`Mandatory root authority file missing from index: ${rel}`);
  const flags = checkedGit(context, ["ls-files", "-v", "-z"], errors, options)
    .stdout.toString("utf8")
    .split("\0")
    .filter(Boolean);
  if (
    flags.length !== paths.length ||
    flags.some((entry) => !entry.startsWith("H "))
  )
    errors.push(
      "Authoritative index has skip/assume/intent or inventory disagreement.",
    );
  return [...new Set(paths)].sort();
}

function validateAdsScope(root, relativePaths) {
  if (process.platform !== "win32") return [];
  if (relativePaths.length > 10000)
    throw new Error("ADS scope record limit exceeded");
  const paths = relativePaths.map((rel) => path.resolve(root, rel));
  const input = JSON.stringify(paths);
  if (Buffer.byteLength(input) > 1024 * 1024)
    throw new Error("ADS scope input limit exceeded");
  const script =
    "& { $paths = ([Console]::In.ReadToEnd() | ConvertFrom-Json); $out = @(); foreach ($p in $paths) { foreach ($s in @(Get-Item -LiteralPath $p -Stream * -ErrorAction Stop)) { $out += [pscustomobject]@{Path=$p;Stream=$s.Stream;Length=$s.Length} } }; @($out) | ConvertTo-Json -Compress }";
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    {
      encoding: "utf8",
      windowsHide: true,
      input,
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0 || result.signal || result.stderr)
    throw new Error("alternate-data-stream batch failed");
  let values;
  try {
    values = JSON.parse(result.stdout || "[]");
  } catch {
    throw new Error("alternate-data-stream output was malformed");
  }
  const list = Array.isArray(values) ? values : [values];
  if (list.length > 10000) throw new Error("ADS output record limit exceeded");
  const expected = new Set(paths.map((value) => value.toLowerCase()));
  const seen = new Set();
  for (const entry of list) {
    if (
      !entry ||
      typeof entry.Path !== "string" ||
      typeof entry.Stream !== "string" ||
      !Number.isSafeInteger(entry.Length)
    )
      throw new Error("ADS output record malformed");
    const key = entry.Path.toLowerCase();
    if (
      !expected.has(key) ||
      seen.has(key) ||
      ![":$DATA", "$DATA"].includes(entry.Stream)
    )
      throw new Error("ADS output was unexpected, duplicated, or named");
    seen.add(key);
  }
  if (seen.size !== expected.size)
    throw new Error("ADS output omitted expected paths");
  return [];
}

export async function validateClosureFormatting(root, options = {}) {
  const listed = candidates.filter((rel) =>
    fs.existsSync(path.join(root, rel)),
  );
  const errors = [];
  let context;
  try {
    context = canonicalGitContext(root);
  } catch (error) {
    errors.push(`Canonical Git context failed closed: ${error.message}.`);
    return { errors, listed };
  }
  const porcelainResult = checkedGit(
    context,
    ["status", "--porcelain=v2", "-z", "--untracked-files=all"],
    errors,
    options,
  );
  const porcelain = porcelainResult.stdout;
  if (
    porcelainResult.ok &&
    porcelain.length &&
    !/^(?:[12u?!] |# )/.test(porcelain.toString("utf8"))
  )
    errors.push("Canonical Git status returned malformed porcelain-v2 output.");
  if (porcelain.length)
    errors.push(
      "Authoritative closure validation requires a clean committed HEAD.",
    );
  if (
    checkedGit(
      context,
      ["diff", "--cached", "--name-only", "-z"],
      errors,
      options,
    ).stdout.length ||
    checkedGit(context, ["diff", "--name-only", "-z"], errors, options).stdout
      .length
  )
    errors.push(
      "HEAD, index, and worktree authoritative bytes must be identical.",
    );
  for (const rel of listed) {
    const absolute = path.join(root, rel);
    const actual = fs.readFileSync(absolute, "utf8").replace(/\r\n/g, "\n");
    const expected = await prettier.format(actual, {
      filepath: absolute,
      endOfLine: "lf",
    });
    if (actual !== expected)
      errors.push(`${rel} is not formatted by pinned Prettier.`);
  }

  const matrixRel = "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md";
  const matrix = fs.readFileSync(path.join(root, matrixRel), "utf8");
  noTrailingWhitespace(matrixRel, matrix, errors);
  const matrixRows = matrix
    .split(/\r?\n/)
    .filter((line) => /^\| TASK-\d{4} \|/.test(line));
  if (matrixRows.length !== 110)
    errors.push(`${matrixRel} must retain exactly 110 single-line task rows.`);
  for (const row of matrixRows)
    if (row.slice(1, -1).split("|").length !== 18)
      errors.push(`${matrixRel} ${row.slice(2, 11)} must retain 18 fields.`);
  const taskOne =
    matrixRows.find((row) => row.startsWith("| TASK-0001 |")) || "";
  if (taskOne !== canonicalTaskOneRow())
    errors.push(
      `${matrixRel} TASK-0001 must equal the exact canonical whole row.`,
    );
  const stateRel = "docs/governance/task-closures/TASK-0001-stage-a-state.json";
  const statePath = path.join(root, stateRel);
  const gitPaths = checkedGit(
    context,
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    errors,
    options,
  )
    .stdout.toString("utf8")
    .split("\0")
    .filter(Boolean);
  let treePaths = [];
  try {
    treePaths = worktreePaths(root);
  } catch (error) {
    errors.push(`TASK-0001 state discovery failed closed: ${error.message}`);
  }
  const lookalikes = new Set(
    [...gitPaths, ...treePaths].filter(stateLookalike),
  );
  for (const rel of new Set([...gitPaths, ...treePaths]))
    if (!portableAsciiPath(rel))
      errors.push(
        `Repository path violates canonical printable-ASCII grammar: ${rel}`,
      );
  if (lookalikes.size !== 1 || !lookalikes.has(stateRel))
    errors.push(
      `${stateRel} must be the repository's only TASK-0001 Stage A state record.`,
    );
  let regular = false;
  try {
    const stat = fs.lstatSync(statePath);
    regular =
      stat.isFile() &&
      !stat.isSymbolicLink() &&
      stat.nlink === 1 &&
      fs.realpathSync
        .native(statePath)
        .startsWith(`${fs.realpathSync.native(root)}${path.sep}`);
  } catch {}
  const entries = checkedGit(
    context,
    ["ls-files", "--stage", "-z", "--", stateRel],
    errors,
    options,
  )
    .stdout.toString("utf8")
    .split("\0")
    .filter(Boolean);
  const indexEntry = entries[0] || "";
  if (
    !regular ||
    entries.length !== 1 ||
    !/^100644 [a-f0-9]{40} 0\tdocs\/governance\/task-closures\/TASK-0001-stage-a-state\.json$/.test(
      indexEntry,
    )
  )
    errors.push(
      `${stateRel} must be one contained regular Git blob with mode 100644.`,
    );
  const flags = checkedGit(
    context,
    ["ls-files", "-v", "-z", "--", stateRel],
    errors,
    options,
  ).stdout.toString("utf8");
  if (flags !== `H ${stateRel}\0`)
    errors.push(
      `${stateRel} must not use intent-to-add, skip-worktree, or assume-unchanged index state.`,
    );
  const indexed = checkedGit(
    context,
    ["show", `:${stateRel}`],
    errors,
    options,
  ).stdout;
  const worktree = regular ? fs.readFileSync(statePath) : Buffer.alloc(0);
  const unstaged = checkedGit(
    context,
    ["diff", "--name-only", "-z", "--", stateRel],
    errors,
    options,
  ).stdout;
  if (unstaged.length || !indexed.equals(worktree))
    errors.push(
      `${stateRel} index blob and regular worktree bytes must be exactly equal and unstaged-clean.`,
    );
  if (!canonicalStageAState(indexed.toString("utf8")))
    errors.push(
      `${stateRel} must be the one exact canonical R15 Stage A state record.`,
    );
  try {
    validateAdsScope(
      context.worktree,
      authoritativeScope(context.worktree, context, errors, options),
    );
  } catch (error) {
    errors.push(
      `Closure-authorizing storage scope failed closed: ${error.message}`,
    );
  }

  const queueRel = "scripts/queue-validator.mjs";
  const queueValidator = fs.readFileSync(path.join(root, queueRel), "utf8");
  noTrailingWhitespace(queueRel, queueValidator, errors);
  for (const required of [
    'import { validateHistoricalClosures } from "./historical-closure-validator.mjs";',
    "validateHistoricalClosures(root, tasks, errors);",
  ]) {
    if (queueValidator.split(required).length !== 2)
      errors.push(
        `${queueRel} must contain exactly one closure integration hook: ${required}`,
      );
  }
  return { errors, listed };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { errors, listed } = await validateClosureFormatting(process.cwd());
  if (errors.length) {
    console.error(
      `Closure formatting validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Closure formatting passed: ${listed.length} pinned-Prettier files; matrix and legacy queue-validator stable exclusions validated structurally.`,
    );
  }
}
