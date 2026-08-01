import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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

test('the literal documented PowerShell Git-byte SHA-256 command executes', () => {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim();
  const artifact = 'AGENTS.md';
  const expected = crypto.createHash('sha256').update(
    execFileSync('git', ['show', `${commit}:${artifact}`], { cwd: repositoryRoot }),
  ).digest('hex');
  const literalCommand = documentedCommand.replace('<commit>', commit).replace('<path>', artifact);
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'upfs-provenance-command-'));
  const scriptPath = path.join(tempDirectory, 'documented-command.ps1');

  try {
    fs.writeFileSync(scriptPath, literalCommand, 'utf8');
    const actual = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { cwd: repositoryRoot, encoding: 'utf8' },
    ).trim();
    assert.match(actual, /^[a-f0-9]{64}$/);
    assert.equal(actual, expected);
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
