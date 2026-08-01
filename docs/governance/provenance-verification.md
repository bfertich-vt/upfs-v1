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

Run this literal PowerShell command from the repository root, replacing the
two ordinary positional arguments:

```powershell
node -e 'const childProcess = require(''child_process''); const crypto = require(''crypto''); const commit = process.argv[1]; const file = process.argv[2]; const bytes = childProcess.execFileSync(''git'', [''show'', commit + '':'' + file]); console.log(crypto.createHash(''sha256'').update(bytes).digest(''hex''));' <commit> <path>
```

The single-quoted Node program is deliberate: PowerShell passes its contents
literally and doubled single quotes become JavaScript single quotes. Record the
immutable commit, repository-relative path, algorithm (`SHA-256`), and the
resulting lowercase hexadecimal digest together. A working-tree digest may be
recorded only when labeled as such; it is never a substitute for committed-byte
evidence.

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
