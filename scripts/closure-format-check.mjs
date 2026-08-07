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
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R16.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R17.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R18.yaml",
  "tasks/recovery/RECOVERY-TASK-0001-ACTIVATION-001.yaml",
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
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R16.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R17.md",
  "docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R18.md",
  "docs/handoffs/RECOVERY-TASK-0001-ACTIVATION-001.md",
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
    active_recovery_task: "RECOVERY-TASK-0001-ACTIVATION-001",
    predecessor_task: "RECOVERY-TASK-0001-CLOSURE-002-R18",
    predecessor_disposition: "ACCEPTED",
    task_status: "complete",
    attestation_status: "verified",
    reviewed_candidate: "aaafb17804586738976fd31e1a0a84dda00c2b25",
    review_commit: "0f0e6f360ec2f30d2eb94181e077801134d6c8c9",
    attestation_commit: "b5065a9df57e4c915d25ae0f4ffdd097a8841e6d",
    attestation_sha256:
      "cc23ceeae1e62199e17576e3d11418cd07d7e0076a38ac8af57ff30f9a98bf6c",
    activation_phase: "STAGE_B_REVIEW_PENDING",
    next_action: "FRESH_QA_REVIEW_THEN_MERGE_IF_ACCEPTED",
  };
  return (
    typeof body === "string" &&
    body.replace(/\r\n/g, "\n") === `${JSON.stringify(value, null, 2)}\n`
  );
}

export function canonicalTaskOneRow() {
  return "| TASK-0001 | docs/MASTER_PLAN.md; tasks/queue.yaml; tasks/recovery/RECOVERY-TASK-0001-ACTIVATION-001.yaml; docs/governance/task-closures/TASK-0001-stage-a-state.json; docs/governance/task-closures/TASK-0001.json | Original repository baseline criteria and corrective evidence are preserved. | Historical implementation and QA evidence remain immutable. | Exact accepted R18 Stage A candidate, review, and attestation are Git-bound. | Hosted observations remain immutable snapshots. | Governance activation; runtime security behavior is unchanged. | Raw evidence and provenance remain append-only. | Unsupported completion claim. | ACCEPTED | Authoritative activation state and active closure record agree exactly. | Hosted API facts retain their documented snapshot boundary. | Backend owns activation; independent Stage B review remains required. | Stage B activation state, queue, matrix, active closure, tests, task, and handoff only. | None for this activation control. | Canonical state/queue/matrix/closure, full-suite, audit, fsck, and diff gates. | Correct forward only; preserve every rejected and inactive record. | Follow the authoritative activation state and fresh Stage B review. |";
}

function pathIdentity(value, expectedType) {
  const absolute = path.resolve(value);
  const real = fs.realpathSync.native(absolute);
  const stat = fs.statSync(real, { bigint: true });
  if (expectedType === "file" && !stat.isFile())
    throw new Error(`${absolute} is not a file`);
  if (expectedType === "directory" && !stat.isDirectory())
    throw new Error(`${absolute} is not a directory`);
  return { real, dev: stat.dev, ino: stat.ino };
}

function samePath(left, right, expectedType) {
  const leftIdentity = pathIdentity(left, expectedType);
  const rightIdentity = pathIdentity(right, expectedType);
  if (leftIdentity.real === rightIdentity.real) return true;
  return (
    leftIdentity.ino !== 0n &&
    leftIdentity.dev === rightIdentity.dev &&
    leftIdentity.ino === rightIdentity.ino
  );
}

function containedBy(parent, child) {
  const relative = path.relative(parent, child);
  return (
    relative !== "" &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
}

function directRegularFile(file, label) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1)
    throw new Error(`${label} must be one direct regular file`);
  if (!samePath(fs.realpathSync.native(file), path.resolve(file), "file"))
    throw new Error(`${label} must not use filesystem indirection`);
  return stat;
}

function directDirectory(directory, label) {
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error(`${label} must be one direct directory`);
  if (
    !samePath(
      fs.realpathSync.native(directory),
      path.resolve(directory),
      "directory",
    )
  )
    throw new Error(`${label} must not use filesystem indirection`);
  return stat;
}

function oneMetadataLine(file, label) {
  directRegularFile(file, label);
  const body = fs.readFileSync(file, "utf8");
  const match = /^([^\s\0](?:[^\r\n\0]*[^\s\0])?)\n?$/.exec(body);
  if (!match)
    throw new Error(`${label} must contain exactly one metadata line`);
  return match[1];
}

function canonicalGitContext(root) {
  const worktree = fs.realpathSync.native(path.resolve(root));
  directDirectory(worktree, "canonical worktree");
  const dotGit = path.join(worktree, ".git");
  const stat = fs.lstatSync(dotGit);
  let gitDir;
  let linked = false;
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    directDirectory(dotGit, "canonical .git directory");
    gitDir = fs.realpathSync.native(dotGit);
  } else if (stat.isFile()) {
    linked = true;
    directRegularFile(dotGit, "canonical .git file");
    const match = /^gitdir: (.+)$/.exec(
      oneMetadataLine(dotGit, "canonical .git file"),
    );
    if (!match) throw new Error("canonical .git file is malformed");
    const declared = path.resolve(worktree, match[1]);
    directDirectory(declared, "per-worktree Git directory");
    gitDir = fs.realpathSync.native(declared);
  } else throw new Error("canonical .git entry is not a file or directory");
  const commonFile = path.join(gitDir, "commondir");
  let commonDir = gitDir;
  if (linked) {
    const commonValue = oneMetadataLine(commonFile, "commondir");
    const declaredCommon = path.resolve(gitDir, commonValue);
    directDirectory(declaredCommon, "Git common directory");
    commonDir = fs.realpathSync.native(declaredCommon);
    const registrationRoot = path.join(commonDir, "worktrees");
    if (
      !containedBy(registrationRoot, gitDir) ||
      !samePath(path.dirname(gitDir), registrationRoot, "directory")
    )
      throw new Error("per-worktree Git directory is not directly registered");
    const registeredDotGit = path.resolve(
      gitDir,
      oneMetadataLine(path.join(gitDir, "gitdir"), "worktree registration"),
    );
    if (!samePath(registeredDotGit, dotGit, "file"))
      throw new Error(
        "worktree registration disagrees with canonical .git file",
      );
  } else if (fs.existsSync(commonFile)) {
    throw new Error(
      "main worktree must not contain linked-worktree commondir metadata",
    );
  }
  const index = path.join(gitDir, "index");
  const gitDirStat = directDirectory(gitDir, "per-worktree Git directory");
  const indexStat = directRegularFile(index, "canonical index");
  if (
    !samePath(path.dirname(fs.realpathSync.native(index)), gitDir, "directory")
  )
    throw new Error(
      "canonical index is not contained in per-worktree Git directory",
    );
  if (process.platform !== "win32") {
    if (indexStat.uid !== gitDirStat.uid)
      throw new Error("canonical index ownership disagrees with Git directory");
    if ((indexStat.mode & 0o022) !== 0)
      throw new Error("canonical index permissions permit group/other writes");
  }
  const objects = path.join(commonDir, "objects");
  directDirectory(objects, "canonical object directory");
  return { worktree, gitDir, commonDir, index, objects };
}

function oneGitPath(context, args, errors, options, label) {
  const result = checkedGit(context, args, errors, options);
  if (!result.ok) return "";
  const body = result.stdout.toString("utf8");
  const match = /^([^\s\0](?:[^\r\n\0]*[^\s\0])?)\n?$/.exec(body);
  if (!match) {
    errors.push(`Canonical Git ${label} output was malformed.`);
    return "";
  }
  return path.resolve(context.worktree, match[1]);
}

function verifyCanonicalGitIdentity(context, errors, options) {
  const checks = [
    [
      ["rev-parse", "--path-format=absolute", "--show-toplevel"],
      context.worktree,
      "worktree",
    ],
    [
      ["rev-parse", "--path-format=absolute", "--absolute-git-dir"],
      context.gitDir,
      "Git directory",
    ],
    [
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      context.commonDir,
      "common directory",
    ],
    [
      ["rev-parse", "--path-format=absolute", "--git-path", "index"],
      context.index,
      "index",
      "file",
    ],
    [
      ["rev-parse", "--path-format=absolute", "--git-path", "objects"],
      context.objects,
      "object directory",
      "directory",
    ],
  ];
  for (const [args, expected, label, explicitType] of checks) {
    const actual = oneGitPath(context, args, errors, options, label);
    const expectedType =
      explicitType ||
      (label === "worktree" || label.includes("directory")
        ? "directory"
        : "file");
    let agrees = false;
    try {
      agrees = Boolean(actual) && samePath(actual, expected, expectedType);
    } catch {}
    if (!agrees)
      errors.push(
        `Canonical Git ${label} disagrees with direct metadata resolution.`,
      );
  }
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
  const command = options.gitCommand || "git";
  const spawnArgs = [
    ...(options.gitCommandPrefix || []),
    `--git-dir=${context.gitDir}`,
    `--work-tree=${context.worktree}`,
    ...args,
  ];
  const injected = options.checkedGitResult?.({
    command,
    args: [...args],
    spawnArgs: [...spawnArgs],
  });
  const result =
    injected === undefined
      ? spawnSync(command, spawnArgs, {
          cwd: context.worktree,
          encoding: null,
          env: sanitizedGitEnvironment(context),
          windowsHide: true,
          timeout: options.gitTimeoutMs || 30000,
          maxBuffer: 32 * 1024 * 1024,
        })
      : {
          status: 0,
          signal: null,
          error: undefined,
          stdout: Buffer.alloc(0),
          stderr: Buffer.alloc(0),
          ...injected,
        };
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
  verifyCanonicalGitIdentity(context, errors, options);
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
      `${stateRel} must be the one exact canonical Stage B activation state record.`,
    );
  try {
    const activation = JSON.parse(
      fs.readFileSync(
        path.join(root, "docs/governance/task-closures/TASK-0001.json"),
        "utf8",
      ),
    );
    const state = JSON.parse(indexed.toString("utf8"));
    if (
      activation.disposition !== "ACCEPTED" ||
      activation.stage_a?.candidate_commit !== state.reviewed_candidate ||
      activation.stage_a?.review_commit !== state.review_commit ||
      activation.stage_a?.attestation_commit !== state.attestation_commit ||
      activation.stage_a?.attestation_sha256 !== state.attestation_sha256
    )
      errors.push(
        "Active TASK-0001 closure disagrees with canonical activation state.",
      );
    const queue = fs.readFileSync(path.join(root, "tasks/queue.yaml"), "utf8");
    if (!/  - id: TASK-0001[\s\S]*?\n    status: complete\n/.test(queue))
      errors.push(
        "TASK-0001 queue status disagrees with canonical activation state.",
      );
    if (!/  - id: TASK-0002[\s\S]*?\n    status: blocked\n/.test(queue))
      errors.push("TASK-0002 must remain blocked during Stage B review.");
  } catch (error) {
    errors.push(
      `TASK-0001 activation cross-check failed closed: ${error.message}`,
    );
  }
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
