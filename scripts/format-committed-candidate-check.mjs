import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const SUPPORTED_FORMATS = new Set([".json", ".mjs", ".yaml", ".yml"]);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: options.encoding ?? "utf8",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed: ${result.error?.message ?? result.stderr ?? `exit ${result.status}`}`,
    );
  }
  return result.stdout;
}

function candidateFiles(base, commit, root) {
  return run("git", ["diff", "--name-only", `${base}..${commit}`], {
    cwd: root,
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((relative) => SUPPORTED_FORMATS.has(path.extname(relative)));
}

export function checkCommittedCandidateFormatting(
  commit,
  base,
  root = process.cwd(),
) {
  if (!/^[0-9a-f]{7,64}$/i.test(commit ?? ""))
    throw new Error("A candidate commit SHA is required.");
  if (!/^[0-9a-f]{7,64}$/i.test(base ?? ""))
    throw new Error("The accepted-base commit SHA is required.");
  const files = candidateFiles(base, commit, root);
  if (!files.length)
    throw new Error(
      "Candidate contains no Prettier-supported files to verify.",
    );
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "upfs-committed-format-"),
  );
  try {
    for (const relative of files) {
      const destination = path.join(temporaryRoot, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      const content = run("git", ["show", `${commit}:${relative}`], {
        cwd: root,
        encoding: "buffer",
      });
      fs.writeFileSync(destination, content);
    }
    const prettier = path.join(
      root,
      "node_modules",
      "prettier",
      "bin",
      "prettier.cjs",
    );
    if (!fs.existsSync(prettier))
      throw new Error(
        "Prettier is not installed; run npm ci --ignore-scripts first.",
      );
    run(process.execPath, [prettier, "--check", ...files], {
      cwd: temporaryRoot,
    });
    return { base, commit, files };
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const [commit, base] = process.argv.slice(2);
  const result = checkCommittedCandidateFormatting(commit, base);
  console.log(
    `committed candidate ${result.commit} formatting passed for ${result.files.length} Git blobs since ${result.base}`,
  );
}
