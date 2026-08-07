import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  canonicalStageAState,
  canonicalTaskOneRow,
  validateClosureFormatting,
} from "./closure-format-check.mjs";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "upfs-closure-format-"));
  for (const rel of [
    "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md",
    "scripts/queue-validator.mjs",
    "docs/governance/task-closures/rejected/TASK-0001-r1.json",
    "docs/governance/task-closures/TASK-0001-stage-a-state.json",
    "docs/governance/task-closures/TASK-0001.json",
    "tasks/queue.yaml",
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
  ]) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.copyFileSync(path.resolve(rel), path.join(root, rel));
  }
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-m",
      "fixture",
    ],
    { cwd: root, stdio: "ignore" },
  );
  return root;
}

function linkedFixture() {
  const source = fixture();
  const linked = fs.mkdtempSync(path.join(os.tmpdir(), "upfs-closure-linked-"));
  fs.rmSync(linked, { recursive: true, force: true });
  execFileSync("git", ["worktree", "add", "--detach", linked, "HEAD"], {
    cwd: source,
    stdio: "ignore",
  });
  return { source, linked };
}

function removeLinkedFixture(source, linked) {
  try {
    execFileSync("git", ["worktree", "remove", "--force", linked], {
      cwd: source,
      stdio: "ignore",
    });
  } finally {
    fs.rmSync(source, { recursive: true, force: true });
    fs.rmSync(linked, { recursive: true, force: true });
  }
}

function writeMetadata(file, body) {
  if (process.platform === "win32") fs.chmodSync(file, 0o600);
  fs.writeFileSync(file, body);
}

async function withGitEnvironment(values, action) {
  const prior = new Map();
  for (const [key, value] of Object.entries(values)) {
    prior.set(key, process.env[key]);
    process.env[key] = value;
  }
  try {
    return await action();
  } finally {
    for (const [key, value] of prior)
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
}

test("closure formatting covers Prettier files and stable exclusions", async () => {
  const root = fixture();
  assert.deepEqual((await validateClosureFormatting(root)).errors, []);

  const json = path.join(
    root,
    "docs/governance/task-closures/rejected/TASK-0001-r1.json",
  );
  fs.writeFileSync(
    json,
    fs.readFileSync(json, "utf8").replace(/\n  "/, '\n     "'),
  );
  assert.ok(
    (await validateClosureFormatting(root)).errors.some((error) =>
      error.includes("not formatted by pinned Prettier"),
    ),
  );

  fs.copyFileSync(
    path.resolve("docs/governance/task-closures/rejected/TASK-0001-r1.json"),
    json,
  );
  const matrix = path.join(root, "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md");
  fs.writeFileSync(
    matrix,
    fs.readFileSync(matrix, "utf8").replace(/\n/, "  \n"),
  );
  assert.ok(
    (await validateClosureFormatting(root)).errors.some((error) =>
      error.includes("trailing whitespace"),
    ),
  );

  const queue = path.join(root, "scripts/queue-validator.mjs");
  fs.writeFileSync(
    queue,
    fs
      .readFileSync(queue, "utf8")
      .replace("validateHistoricalClosures(root, tasks, errors);", ""),
  );
  assert.ok(
    (await validateClosureFormatting(root)).errors.some((error) =>
      error.includes("closure integration hook"),
    ),
  );
});

test("R5 authorization includes every modified validator test surface", () => {
  const task = fs.readFileSync(
    "tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R5.yaml",
    "utf8",
  );
  assert.match(task, /  - scripts\/closure-format-check\.test\.mjs/);
  assert.match(task, /  - scripts\/historical-closure-validator\.test\.mjs/);
});

test("TASK-0001 Stage B activation authority is exact and fail closed", async () => {
  const root = fixture();
  const matrix = path.join(root, "docs/HISTORICAL_TASK_CLOSURE_MATRIX.md");
  const original = fs.readFileSync(matrix, "utf8");
  assert.ok(original.split(/\r?\n/).includes(canonicalTaskOneRow()));
  for (const mutation of [
    " appended",
    " removed",
    "Complete",
    "unblocked",
    "Verdict published",
    "Proceed immediately",
    "inspect prior round",
    "ATTESTATION",
    "  ",
    ".",
    "r14",
  ]) {
    fs.writeFileSync(
      matrix,
      original.replace(
        canonicalTaskOneRow(),
        `${canonicalTaskOneRow()}${mutation}`,
      ),
    );
    assert.notDeepEqual((await validateClosureFormatting(root)).errors, []);
  }
  fs.writeFileSync(matrix, original);

  const state = path.join(
    root,
    "docs/governance/task-closures/TASK-0001-stage-a-state.json",
  );
  const valid = fs.readFileSync(state, "utf8");
  assert.equal(canonicalStageAState(valid), true);
  for (const mutation of [
    valid + valid,
    valid.replace('  "task_status": "complete",\n', ""),
    valid.replace(
      '  "task_status": "complete",',
      '  "extra": true,\n  "task_status": "complete",',
    ),
    valid.replace('-R18"', '-R13"'),
    valid.replace('"ACCEPTED"', '"REJECTED"'),
    valid.replace('"verified"', '"absent"'),
    valid.replace("aaafb17804586738976fd31e1a0a84dda00c2b25", "a".repeat(40)),
    valid.replace('"STAGE_B_REVIEW_PENDING"', '"ACTIVATION_PENDING"'),
    valid.replace(
      '"FRESH_QA_REVIEW_THEN_MERGE_IF_ACCEPTED"',
      '"REVIEW_R6_OR_ACTIVATE"',
    ),
    valid.replace('  "task_id"', ' "task_id"'),
  ])
    assert.equal(canonicalStageAState(mutation), false, mutation);
  for (const name of [
    "TASK-0001-stage-a-state-copy.json",
    "task-0001-STAGE-A-STATE-copy.json",
    "TASK0001-stage-a-state.json",
  ]) {
    const target = path.join(path.dirname(state), name);
    fs.copyFileSync(state, target);
    assert.notDeepEqual(
      (await validateClosureFormatting(root)).errors,
      [],
      name,
    );
    fs.rmSync(target);
  }
  const nested = path.join(root, "docs/alternate/TASK-0001-stage-a-state.json");
  fs.mkdirSync(path.dirname(nested), { recursive: true });
  fs.copyFileSync(state, nested);
  assert.notDeepEqual(
    (await validateClosureFormatting(root)).errors,
    [],
    "nested duplicate",
  );
  fs.rmSync(nested);
  for (const rel of [
    "node_modules/TASK-0001-stage-a-state.json",
    "dist/TASK-0001-stage-a-state.json",
    "build/TASK-0001-stage-a-state.json",
    "coverage/TASK-0001-stage-a-state.json",
    ".next/TASK-0001-stage-a-state.json",
    "docs/alternate/TASK-0001-stage-а-state.json",
    "docs/alternate/TASK-0001-stαge-a-state.json",
    "docs/alternate/ＴＡＳＫ-０００１-stage-a-state.json",
    "docs/évidence/TASK-0001-state.json",
    "docs/alternate/TАSK-0001-stаge-a-stаte.json",
    "docs/alternate/TA\u0301SK-0001-stage-a-state.json",
    "docs/alternate/TASK-0001-stage-a-state\u200b.json",
  ]) {
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "x");
    assert.notDeepEqual(
      (await validateClosureFormatting(root)).errors,
      [],
      rel,
    );
    fs.rmSync(target);
  }
  const hardlink = path.join(root, "hardlink-alias.json");
  fs.linkSync(state, hardlink);
  assert.notDeepEqual(
    (await validateClosureFormatting(root)).errors,
    [],
    "hardlink nlink",
  );
  fs.rmSync(hardlink);
  if (process.platform === "win32") {
    for (const stream of [
      "Zone.Identifier",
      "TASK-0001-stage-a-state.json",
      "conflict stream & name",
    ]) {
      fs.writeFileSync(`${state}:${stream}`, '{"task_status":"complete"}\n');
      assert.notDeepEqual(
        (await validateClosureFormatting(root)).errors,
        [],
        stream,
      );
      fs.rmSync(`${state}:${stream}`);
    }
  }
  const blob = execFileSync("git", ["hash-object", state], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  for (const [mode, object] of [
    ["120000", blob],
    ["160000", head],
    ["100755", blob],
  ]) {
    execFileSync(
      "git",
      [
        "update-index",
        "--add",
        "--cacheinfo",
        `${mode},${object},docs/governance/task-closures/TASK-0001-stage-a-state.json`,
      ],
      { cwd: root },
    );
    assert.notDeepEqual(
      (await validateClosureFormatting(root)).errors,
      [],
      mode,
    );
    execFileSync("git", ["reset", "--hard", "HEAD"], {
      cwd: root,
      stdio: "ignore",
    });
  }
  const badBlob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd: root,
    input: "{}\n",
    encoding: "utf8",
  }).trim();
  execFileSync(
    "git",
    [
      "update-index",
      "--cacheinfo",
      `100644,${badBlob},docs/governance/task-closures/TASK-0001-stage-a-state.json`,
    ],
    { cwd: root },
  );
  assert.notDeepEqual(
    (await validateClosureFormatting(root)).errors,
    [],
    "split index/worktree",
  );
  execFileSync("git", ["reset", "--hard", "HEAD"], {
    cwd: root,
    stdio: "ignore",
  });
  fs.writeFileSync(state, "{}\n");
  assert.notDeepEqual(
    (await validateClosureFormatting(root)).errors,
    [],
    "dirty worktree",
  );
  execFileSync("git", ["reset", "--hard", "HEAD"], {
    cwd: root,
    stdio: "ignore",
  });
  execFileSync("git", ["rm", "--cached", state], {
    cwd: root,
    stdio: "ignore",
  });
  execFileSync("git", ["add", "-N", state], { cwd: root });
  assert.notDeepEqual(
    (await validateClosureFormatting(root)).errors,
    [],
    "intent-to-add",
  );
});

test("R15 ignores inherited Git redirects and uses the canonical index", async () => {
  const root = fixture();
  const alternate = path.join(root, "alternate.index");
  execFileSync("git", ["read-tree", "HEAD"], {
    cwd: root,
    env: { ...process.env, GIT_INDEX_FILE: alternate },
  });
  fs.appendFileSync(path.join(root, "AGENTS.md"), "dirty canonical worktree\n");
  const redirected = {
    GIT_DIR: path.join(root, "missing.git"),
    GIT_WORK_TREE: path.join(root, "missing-worktree"),
    GIT_INDEX_FILE: alternate,
    GIT_COMMON_DIR: path.join(root, "missing-common"),
    GIT_OBJECT_DIRECTORY: path.join(root, "missing-objects"),
    GIT_ALTERNATE_OBJECT_DIRECTORIES: path.join(root, "missing-alternates"),
    GIT_CEILING_DIRECTORIES: root,
    GIT_DISCOVERY_ACROSS_FILESYSTEM: "1",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "core.bare",
    GIT_CONFIG_VALUE_0: "true",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_NAMESPACE: "masked",
    GIT_REPLACE_REF_BASE: "refs/replace-masked/",
  };
  const result = await withGitEnvironment(redirected, () =>
    validateClosureFormatting(root),
  );
  assert.ok(
    result.errors.some((error) => error.includes("clean committed HEAD")),
    result.errors.join("\n"),
  );
});

test("R17 accepts legitimate linked worktrees and rejects an index hardlink alias", async () => {
  const { source, linked } = linkedFixture();
  try {
    assert.deepEqual((await validateClosureFormatting(linked)).errors, []);
    const gitFile = fs.readFileSync(path.join(linked, ".git"), "utf8");
    const gitDir = path.resolve(linked, /^gitdir: ([^\r\n]+)/.exec(gitFile)[1]);
    const index = path.join(gitDir, "index");
    const external = path.join(source, "external-clean.index");
    fs.copyFileSync(index, external);
    fs.rmSync(index);
    fs.linkSync(external, index);
    const result = await validateClosureFormatting(linked);
    assert.ok(
      result.errors.some((error) => error.includes("direct regular file")),
      result.errors.join("\n"),
    );
    fs.rmSync(index);
    fs.copyFileSync(external, index);
  } finally {
    removeLinkedFixture(source, linked);
  }
});

test("R17 rejects forged linked-worktree .git and commondir metadata", async () => {
  const { source, linked } = linkedFixture();
  const dotGit = path.join(linked, ".git");
  const savedDotGit = path.join(linked, ".git.saved");
  const originalDotGit = fs.readFileSync(dotGit);
  const gitDir = path.resolve(
    linked,
    /^gitdir: ([^\r\n]+)/.exec(originalDotGit.toString("utf8"))[1],
  );
  const commonFile = path.join(gitDir, "commondir");
  const originalCommon = fs.readFileSync(commonFile);
  const registration = path.join(gitDir, "gitdir");
  const originalRegistration = fs.readFileSync(registration);
  try {
    fs.renameSync(dotGit, savedDotGit);
    fs.writeFileSync(dotGit, `gitdir: ${path.join(source, ".git")}\n`);
    assert.notDeepEqual((await validateClosureFormatting(linked)).errors, []);
    fs.rmSync(dotGit);
    fs.renameSync(savedDotGit, dotGit);
    for (const malformed of [
      `${path.join(source, "missing-common")}\n`,
      `\n${originalCommon}`,
      `${originalCommon}\n`,
      ` ${originalCommon.toString("utf8").trim()}\n`,
      `${originalCommon.toString("utf8").trim()} \n`,
      `${originalCommon.toString("utf8").trim()}\r\n`,
      `${originalCommon.toString("utf8").trim()}\0\n`,
      `${originalCommon.toString("utf8").trim()}\nextra\n`,
    ]) {
      writeMetadata(commonFile, malformed);
      assert.notDeepEqual((await validateClosureFormatting(linked)).errors, []);
    }
    writeMetadata(commonFile, originalCommon);
    const impostor = path.join(linked, ".git-impostor");
    fs.copyFileSync(dotGit, impostor);
    writeMetadata(registration, `${impostor}\n`);
    assert.notDeepEqual((await validateClosureFormatting(linked)).errors, []);
    writeMetadata(registration, originalRegistration);
    fs.rmSync(impostor);
    if (process.platform === "win32") {
      writeMetadata(registration, `${dotGit.toUpperCase()}\n`);
      assert.deepEqual((await validateClosureFormatting(linked)).errors, []);
      writeMetadata(registration, originalRegistration);
    } else {
      const caseDistinct = path.join(linked, ".GIT");
      fs.copyFileSync(dotGit, caseDistinct);
      writeMetadata(registration, `${caseDistinct}\n`);
      assert.notDeepEqual((await validateClosureFormatting(linked)).errors, []);
      writeMetadata(registration, originalRegistration);
    }
    if (process.platform !== "win32") {
      const index = path.join(gitDir, "index");
      const external = path.join(source, "external.index");
      fs.copyFileSync(index, external);
      fs.rmSync(index);
      fs.symlinkSync(external, index, "file");
      assert.notDeepEqual((await validateClosureFormatting(linked)).errors, []);
      fs.rmSync(index);
      fs.copyFileSync(external, index);
    }
  } finally {
    if (fs.existsSync(savedDotGit)) {
      fs.rmSync(dotGit, { force: true });
      fs.renameSync(savedDotGit, dotGit);
    }
    if (fs.existsSync(gitDir)) writeMetadata(commonFile, originalCommon);
    if (fs.existsSync(gitDir))
      writeMetadata(registration, originalRegistration);
    removeLinkedFixture(source, linked);
  }
});

test("R18 object parity command is exact, singular, and mutation-sensitive", async () => {
  const root = fixture();
  const objects = path.join(root, ".git", "objects");
  const exactArgs = [
    "rev-parse",
    "--path-format=absolute",
    "--git-path",
    "objects",
  ];
  const invoke = async (output) => {
    const calls = [];
    const result = await validateClosureFormatting(root, {
      checkedGitResult: ({ command, args, spawnArgs }) => {
        if (JSON.stringify(args) !== JSON.stringify(exactArgs))
          return undefined;
        calls.push({ command, args, spawnArgs });
        return { stdout: Buffer.from(output), stderr: Buffer.alloc(0) };
      },
    });
    assert.equal(
      calls.length,
      1,
      "object parity command must execute exactly once",
    );
    assert.equal(calls[0].command, "git");
    assert.deepEqual(calls[0].args, exactArgs);
    assert.deepEqual(calls[0].spawnArgs.slice(-exactArgs.length), exactArgs);
    return result;
  };
  assert.deepEqual((await invoke(`${objects}\n`)).errors, []);
  const wrongDirectory = path.join(root, "wrong-existing-directory");
  fs.mkdirSync(wrongDirectory);
  for (const [name, output] of [
    ["wrong existing directory", `${wrongDirectory}\n`],
    ["nonexistent path", `${path.join(root, "missing-objects")}\n`],
    ["blank", ""],
    ["leading blank", `\n${objects}\n`],
    ["trailing blank", `${objects}\n\n`],
    ["extra line", `${objects}\nextra\n`],
    ["CR ambiguity", `${objects}\r\n`],
    ["NUL", `${objects}\0\n`],
    ["leading whitespace", ` ${objects}\n`],
    ["trailing whitespace", `${objects} \n`],
    ["file instead of directory", `${path.join(root, "AGENTS.md")}\n`],
  ]) {
    const result = await invoke(output);
    assert.notDeepEqual(result.errors, [], `${name} bypassed object parity`);
  }
});

test("R16 Git execution failures and malformed output fail closed", async () => {
  const root = fixture();
  const missing = await validateClosureFormatting(root, {
    gitCommand: path.join(root, "definitely-missing-git"),
  });
  assert.ok(missing.errors.some((error) => error.includes("failed closed")));

  const fake = path.join(root, "fake-git.mjs");
  fs.writeFileSync(
    fake,
    "const mode=process.env.UPFS_FAKE_GIT; if(mode==='timeout') await new Promise(r=>setTimeout(r,1000)); else if(mode==='nonzero') process.exit(7); else if(mode==='stderr') process.stderr.write('unexpected'); else if(mode==='signal') process.kill(process.pid,'SIGTERM'); else process.stdout.write('malformed');\n",
  );
  const malformed = await withGitEnvironment(
    { UPFS_FAKE_GIT: "malformed" },
    () =>
      validateClosureFormatting(root, {
        gitCommand: process.execPath,
        gitCommandPrefix: [fake],
      }),
  );
  assert.ok(
    malformed.errors.some((error) => error.includes("malformed porcelain-v2")),
  );
  const timedOut = await withGitEnvironment({ UPFS_FAKE_GIT: "timeout" }, () =>
    validateClosureFormatting(root, {
      gitCommand: process.execPath,
      gitCommandPrefix: [fake],
      gitTimeoutMs: 25,
    }),
  );
  assert.ok(timedOut.errors.some((error) => error.includes("failed closed")));
  for (const mode of ["nonzero", "stderr", "signal"]) {
    const failed = await withGitEnvironment({ UPFS_FAKE_GIT: mode }, () =>
      validateClosureFormatting(root, {
        gitCommand: process.execPath,
        gitCommandPrefix: [fake],
      }),
    );
    assert.ok(
      failed.errors.some((error) => error.includes("failed closed")),
      `${mode}: ${failed.errors.join("\n")}`,
    );
  }
});

test("R15 rejects representative porcelain-v2 dirty states", async () => {
  const cases = [
    [
      "unstaged modification",
      (root) => fs.appendFileSync(path.join(root, "AGENTS.md"), "dirty\n"),
    ],
    [
      "staged modification",
      (root) => {
        fs.appendFileSync(path.join(root, "AGENTS.md"), "dirty\n");
        execFileSync("git", ["add", "AGENTS.md"], { cwd: root });
      },
    ],
    [
      "both staged and unstaged",
      (root) => {
        fs.appendFileSync(path.join(root, "AGENTS.md"), "staged\n");
        execFileSync("git", ["add", "AGENTS.md"], { cwd: root });
        fs.appendFileSync(path.join(root, "AGENTS.md"), "unstaged\n");
      },
    ],
    [
      "untracked",
      (root) => fs.writeFileSync(path.join(root, "untracked.txt"), "dirty\n"),
    ],
    ["unstaged deletion", (root) => fs.rmSync(path.join(root, "AGENTS.md"))],
    [
      "staged deletion",
      (root) =>
        execFileSync("git", ["rm", "AGENTS.md"], {
          cwd: root,
          stdio: "ignore",
        }),
    ],
    [
      "staged rename",
      (root) =>
        execFileSync("git", ["mv", "AGENTS.md", "AGENTS-renamed.md"], {
          cwd: root,
        }),
    ],
    [
      "staged new file",
      (root) => {
        fs.writeFileSync(path.join(root, "new.txt"), "new\n");
        execFileSync("git", ["add", "new.txt"], { cwd: root });
      },
    ],
    [
      "intent to add",
      (root) => {
        fs.writeFileSync(path.join(root, "intent.txt"), "intent\n");
        execFileSync("git", ["add", "-N", "intent.txt"], { cwd: root });
      },
    ],
    [
      "assume unchanged",
      (root) => {
        execFileSync(
          "git",
          ["update-index", "--assume-unchanged", "AGENTS.md"],
          { cwd: root },
        );
        fs.appendFileSync(path.join(root, "AGENTS.md"), "masked\n");
      },
    ],
    [
      "skip worktree",
      (root) =>
        execFileSync("git", ["update-index", "--skip-worktree", "AGENTS.md"], {
          cwd: root,
        }),
    ],
    [
      "unmerged",
      (root) => {
        const blob = execFileSync("git", ["rev-parse", "HEAD:AGENTS.md"], {
          cwd: root,
          encoding: "utf8",
        }).trim();
        execFileSync("git", ["update-index", "--force-remove", "AGENTS.md"], {
          cwd: root,
        });
        execFileSync("git", ["update-index", "--index-info"], {
          cwd: root,
          input: `100644 ${blob} 1\tAGENTS.md\n100644 ${blob} 2\tAGENTS.md\n100644 ${blob} 3\tAGENTS.md\n`,
        });
      },
    ],
  ];
  for (const [name, mutate] of cases) {
    const root = fixture();
    mutate(root);
    const result = await validateClosureFormatting(root);
    assert.notDeepEqual(result.errors, [], `${name}: accepted dirty state`);
    fs.rmSync(root, { recursive: true, force: true });
  }
});
