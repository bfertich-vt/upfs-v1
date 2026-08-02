import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verificationDocument = fs.readFileSync(
  path.join(repositoryRoot, 'docs/governance/provenance-verification.md'),
  'utf8',
);
const documentedCommand = verificationDocument.match(/```powershell\r?\n([\s\S]*?)\r?\n```/)[1];

function executeLiteralCommand(scriptPath, commit, artifact) {
  return spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      '-Commit',
      commit,
      '-Path',
      artifact,
    ],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );
}

const windowsPowerShellOnly = {
  skip:
    process.platform === 'win32'
      ? false
      : 'requires Windows PowerShell; Linux validates the literal command source and injection guard without claiming execution',
};

test('the literal documented PowerShell command retains fail-closed source-level injection guards on every platform', () => {
  assert.match(documentedCommand, /\[Parameter\(Mandatory = \$true\)\]\[string\]\$Commit/);
  assert.match(documentedCommand, /\[Parameter\(Mandatory = \$true\)\]\[string\]\$Path/);
  assert.match(documentedCommand, /\$Commit -cnotmatch '\^\[0-9a-f\]\{40\}\$'/);
  assert.match(documentedCommand, /\$Path -cnotmatch '\^\[A-Za-z0-9\]/);
  assert.match(documentedCommand, /git ls-tree -r --name-only \$Commit -- \$Path/);
  assert.match(documentedCommand, /execFileSync\('git', \['cat-file', '-e', `\$\{commit\}\^\{commit\}`\]\)/);
  assert.match(documentedCommand, /execFileSync\('git', \['show', `\$\{commit\}:\$\{file\}`\]\)/);
  assert.doesNotMatch(documentedCommand, /(?:Invoke-Expression|\biex\b|Start-Process)/i);
});

test('the literal documented PowerShell Git-byte SHA-256 command executes on Windows', windowsPowerShellOnly, () => {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim();
  const artifact = 'AGENTS.md';
  const expected = crypto.createHash('sha256').update(
    execFileSync('git', ['show', `${commit}:${artifact}`], { cwd: repositoryRoot }),
  ).digest('hex');
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'upfs-provenance-command-'));
  const scriptPath = path.join(tempDirectory, 'documented-command.ps1');

  try {
    fs.writeFileSync(scriptPath, documentedCommand, 'utf8');
    const result = executeLiteralCommand(scriptPath, commit, artifact);
    assert.equal(result.status, 0, result.stderr);
    const actual = result.stdout.trim();
    assert.match(actual, /^[a-f0-9]{64}$/);
    assert.equal(actual, expected);
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('the literal documented command rejects malformed and injection-bearing inputs without execution on Windows', windowsPowerShellOnly, () => {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim();
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'upfs-provenance-command-negative-'));
  const scriptPath = path.join(tempDirectory, 'documented-command.ps1');
  const cases = [
    ['semicolon injection', commit, 'AGENTS.md; Write-Output INJECTED'],
    ['whitespace injection', commit, 'AGENTS.md INJECTED'],
    ['quote/metacharacter injection', commit, "AGENTS.md'$(Write-Output INJECTED)"],
    ['missing ref', '0000000000000000000000000000000000000000', 'AGENTS.md'],
    ['malformed ref', 'not-a-commit', 'AGENTS.md'],
    ['absolute path', commit, 'C:/Windows/system32/drivers/etc/hosts'],
    ['traversal path', commit, '../AGENTS.md'],
    ['untracked path', commit, 'not-tracked.txt'],
    ['missing path', commit, 'docs/missing.md'],
  ];

  try {
    fs.writeFileSync(scriptPath, documentedCommand, 'utf8');
    for (const [name, candidateCommit, artifact] of cases) {
      const result = executeLiteralCommand(scriptPath, candidateCommit, artifact);
      assert.notEqual(result.status, 0, `${name} unexpectedly succeeded`);
      assert.doesNotMatch(`${result.stdout}${result.stderr}`, /INJECTED/);
    }
  } finally {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test('provenance control requires distinct candidate, handoff, and QA records', () => {
  assert.match(verificationDocument, /implementation candidate commit/i);
  assert.match(verificationDocument, /separate author-handoff commit/i);
  assert.match(verificationDocument, /QA-authored review report/i);
  assert.match(verificationDocument, /must not require a review of itself/i);
  assert.match(verificationDocument, /unknown[\s\S]*not inferred/i);
});
