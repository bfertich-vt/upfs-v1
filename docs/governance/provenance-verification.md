# Recovery provenance verification

## Scope and evidence boundary

This control governs provenance for recovery work. It does not accept a task,
alter product behavior, repair missing historical proof, or convert a passing
local test into production-capability evidence. Missing historical fields are
recorded as `unknown` or `unsupported completion claim`; they are never
backfilled from inference.

## Canonical committed-byte hashing

For an artifact asserted at an immutable commit, calculate SHA-256 over the
exact Git blob bytes, not a checked-out file. This prevents platform newline
conversion (including CRLF) from changing recorded evidence.

Save this literal PowerShell command as `provenance-hash.ps1` and invoke it
from the repository root using `-Commit` and `-Path` arguments. The script
accepts only a lowercase 40-character Git commit ID and a tracked,
repository-relative slash-delimited path whose components use letters,
numbers, `.`, `_`, or `-`. This deliberately rejects abbreviated or named
refs, whitespace, shell metacharacters, absolute paths, traversal, and paths
outside the asserted commit. The argument values are bound by PowerShell as
data; do not substitute them into this script.

```powershell
param(
  [Parameter(Mandatory = $true)][string]$Commit,
  [Parameter(Mandatory = $true)][string]$Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($Commit -cnotmatch '^[0-9a-f]{40}$') {
  throw 'Commit must be a lowercase 40-character Git commit ID.'
}
if ($Path -cnotmatch '^[A-Za-z0-9][A-Za-z0-9._-]*(?:/[A-Za-z0-9][A-Za-z0-9._-]*)*$') {
  throw 'Path must be a safe repository-relative slash-delimited path.'
}

$trackedPath = @(& git ls-tree -r --name-only $Commit -- $Path)
if ($LASTEXITCODE -ne 0 -or $trackedPath.Count -ne 1 -or $trackedPath[0] -cne $Path) {
  throw 'Path is not tracked at the asserted commit.'
}

$env:UPFS_PROVENANCE_COMMIT = $Commit
$env:UPFS_PROVENANCE_PATH = $Path
try {
  $program = @'
const childProcess = require('child_process');
const crypto = require('crypto');
const commit = process.env.UPFS_PROVENANCE_COMMIT;
const file = process.env.UPFS_PROVENANCE_PATH;
childProcess.execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`]);
const bytes = childProcess.execFileSync('git', ['show', `${commit}:${file}`]);
console.log(crypto.createHash('sha256').update(bytes).digest('hex'));
'@
  & node -e $program
  if ($LASTEXITCODE -ne 0) {
    throw 'Git-byte hash command failed.'
  }
} finally {
  Remove-Item Env:UPFS_PROVENANCE_COMMIT -ErrorAction SilentlyContinue
  Remove-Item Env:UPFS_PROVENANCE_PATH -ErrorAction SilentlyContinue
}
```

For example, invoke the saved exact script with
`powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File .\provenance-hash.ps1 -Commit <40-lowercase-hex> -Path AGENTS.md`.
Record the immutable commit, repository-relative path, algorithm (`SHA-256`),
and the resulting lowercase hexadecimal digest together. A working-tree digest
may be recorded only when labeled as such; it is never a substitute for
committed-byte evidence.

## Required record chain

Each recovery change uses a non-self-referential chain:

1. An implementation candidate commit contains only the authorized change.
2. A separate author-handoff commit identifies that candidate, the author role
   binding, task inputs, owned files, tests, security analysis, limitations,
   rollback/corrective-forward plan, and `QA pending` status.
3. A different QA/Security agent starts from that committed candidate state and
   creates an immutable QA-authored review report in its own review stream. The
   report identifies the candidate and handoff commits, records its role-file
   digest and thread ID, traces each acceptance criterion to commands/results,
   and ends in `accepted` or `rejected`.
4. The supervisor may integrate only after inspecting the immutable author
   handoff and a distinct accepted QA report. The QA report is evidence about
   the handoff; it must not require a review of itself.

The author handoff must not name an unperformed reviewer as accepted. It records
`unknown/pending` until the distinct QA report exists. A rejected review requires
a new corrective-forward candidate and new chain; no amend, reset, force-push,
or deletion of prior evidence is allowed.

## Minimum provenance fields

The author handoff and QA report together must provide: task ID; assigned role;
role-file path and committed-byte digest; agent thread ID; worktree; branch;
owned/changed files; candidate and handoff commits; sources/specifications and
contracts read; acceptance criteria; commands and results; negative cases;
tenant-isolation and security analysis; audit/evidence behavior; known
limitations; external prerequisites; rollback/corrective-forward disposition;
and independent-review result. Evidence that cannot be located is `unknown`,
not inferred from file existence or a Markdown handoff.

## Clean review setup

In a clean, isolated review worktree, install only locked dependencies before
Node-based validation:

```powershell
npm ci --ignore-scripts
```

`--ignore-scripts` prevents lifecycle scripts during setup. Run declared
read-only validation, confirm `git status --short`, and quarantine unrelated
changes by reporting them instead of deleting or silently absorbing them.
