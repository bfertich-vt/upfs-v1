# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R13

## Disposition

**REJECTED** for exact candidate
`146b23d9436c59cb86176a7adb1fddc1961ee160`.

Do not create the structured acceptance attestation, activate the closure record,
push or merge this candidate, or advance `TASK-0002`. Preserve this review and
all R1-R12 rejection history, then correct forward and obtain a fresh independent
QA/Security review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated worktree: `C:\source\upfs-task-0001-closure-qa-r13`.
- Branch: `qa/task-0001-closure-r13`, created directly at exact candidate
  `146b23d9436c59cb86176a7adb1fddc1961ee160`.
- Declared corrective base and exact merge base:
  `6ba714c6fa192331aa8283990f6f4ff24c72a5d7`, the immutable R12 rejection.
- Reviewed implementation:
  `13943dec4b00d480bc1e4f4e3af4769d7914a40a`; reviewed handoff candidate:
  `146b23d9436c59cb86176a7adb1fddc1961ee160`.
- The candidate is a clean two-commit, single-parent corrective chain and its net
  diff contains exactly the six R13-authorized paths. `TASK-0001` and
  `TASK-0002` remain blocked, and no attestation or activation exists.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree guidance; R12 rejection; R13 task and handoff; matrix; canonical
  Stage A record; changed validator and tests; repository topology; and complete
  exact-base diff.
- Threat model: an author may validate a mutable worktree or index whose
  closure-authorizing bytes differ from the reviewed commit, or introduce a new
  staged authority file that is absent from the reviewed `HEAD`. Runtime tenant,
  financial, API, migration, and durable-state boundaries are unchanged.

## Blocking finding

### High: complete index inventory accepts mutable authority outside the canonical state file

R13 enumerates every stage-zero regular index entry and checks that a regular,
single-link worktree file exists, but it compares index and worktree bytes only
for `TASK-0001-stage-a-state.json`. It never requires the repository-wide index
to equal `HEAD`, the complete worktree to equal the index, or the set of tracked
authority paths to equal the reviewed commit. Consequently the control can print
its pass result while most authority files are staged, unstaged, or newly added.

Three independent Windows reproductions proved the fail-open behavior:

1. Appending `QA R13 worktree mismatch reproduction.` to tracked root authority
   `SECURITY.md`, while leaving its index blob canonical, produced an unstaged
   modification; `node scripts/closure-format-check.mjs` printed its pass result
   and exited zero.
2. Replacing only the `SECURITY.md` index blob with `R13 staged index mismatch`
   while retaining the canonical worktree produced `MM SECURITY.md`; the same
   validator again printed its pass result and exited zero.
3. Creating and staging the new regular authority path
   `docs/qa-r13-new-authority.md` produced `A  ...`; validation again printed its
   pass result and exited zero.

All mutations were removed after their individual runs and the isolated
worktree returned clean. These are actual control bypasses, independent of the
test-coverage defect.

Required correction: run closure authorization only against one clean committed
`HEAD`. Reject repository-wide staged, unstaged, untracked, conflicted,
intent-to-add, assume-unchanged, and skip-worktree state using a closed,
NUL-delimited porcelain/index protocol. Bind the complete authority inventory
and bytes to `HEAD`, while retaining exact authorized-diff validation against the
declared corrective base. Any genuinely unavoidable ephemeral exclusion must be
explicit, narrow, non-authoritative, and proven unable to affect discovery or
validation. Add table-driven tests for every porcelain-v2 state and every index
mode/flag transition.

## Promised-test coverage audit

The R13 test diff adds ten root files to the fixture and changes R12 labels to
R13; it adds no table-driven complete-index or batch-protocol attacks. The
inherited test covers only the canonical state file for named ADS, hardlink,
Unicode lookalikes, modes `120000`/`160000`/`100755`, one split index/worktree
blob, one dirty worktree, and intent-to-add. The generic R13 control has no test
for any of the three reproduced bypasses.

Missing promised cases include ADS on every root and nested tracked class;
generic regular/`100755` entries; generic symlink, gitlink, conflict stages,
deletions, missing worktree files, worktree/index/`HEAD` mismatches, staged new
files, and index-only entries; skip-worktree and assume-unchanged flags; exact
inventory parity; case and normalization variants; and deterministic batch
protocol cases for omission, duplication, unexpected paths, extra or malformed
records, truncated or oversized JSON, stdout/stderr behavior, nonzero exit,
signal, timeout, record/byte caps, ordering, spaces, quotes, metacharacters,
Unicode, and structured-stdin injection. Passing inherited tests therefore does
not satisfy R13's task or handoff claims.

## Adversarial and regression results

- Exact candidate topology and six-path authorization boundary are valid.
- Unstaged tracked authority bytes, staged divergent authority bytes, and a
  staged new authority file all pass validation incorrectly.
- Existing inherited state-file Unicode, ADS, hardlink, blob, index, topology,
  matrix, attestation, and evidence tests pass, but do not exercise the generic
  complete-index control promised by R13.
- No structured attestation was created.

## Independent commands and results

| Command                                                                                           | Result                                                        |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `npm ci --ignore-scripts`                                                                         | Pass; 106 packages added, 107 audited, zero vulnerabilities.  |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs` | Pass; 6/6 in 85.8 seconds.                                    |
| Unstaged tracked `SECURITY.md` byte mismatch                                                      | **Fail**; validator exited zero.                              |
| Staged divergent `SECURITY.md` index blob                                                         | **Fail**; validator exited zero.                              |
| Staged new regular `docs/qa-r13-new-authority.md`                                                 | **Fail**; validator exited zero.                              |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                   | Pass; 285 Markdown, 65 JSON contracts, 5 YAML contracts.      |
| `npm test`                                                                                        | Pass; 942 total, 941 passed, 0 failed, 1 documented skip.     |
| `npm audit --audit-level=high`                                                                    | Pass; zero vulnerabilities.                                   |
| `git fsck --full --strict`                                                                        | Pass; only dangling local test objects, no integrity failure. |
| `git diff --check 6ba714c6..146b23d`                                                              | Pass.                                                         |

## Final verdict

**Verdict: REJECTED** for exact candidate
`146b23d9436c59cb86176a7adb1fddc1961ee160`.

No structured attestation was created. Preserve this narrative rejection and
correct forward with a clean-committed-`HEAD` invariant, repository-wide
index/worktree/`HEAD` parity, exact base-to-candidate authorization, and the
complete promised adversarial test matrix before any attestation, activation,
hosted integration, merge, or work on `TASK-0002`.
