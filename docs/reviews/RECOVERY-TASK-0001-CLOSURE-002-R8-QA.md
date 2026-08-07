# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R8

## Disposition

**REJECTED** for exact candidate
`3503fb354b29a66f7b43f952c34791f7e714fc33`.

Do not create the structured acceptance attestation, activate the closure record,
push or merge this candidate, or advance `TASK-0002`. Preserve this review and
all R1-R7 rejection history, then correct forward and obtain fresh independent
QA/Security review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated worktree: `C:\source\upfs-qa-task-0001-closure-r8`.
- Branch: `qa/task-0001-closure-r8`, created directly at exact candidate
  `3503fb354b29a66f7b43f952c34791f7e714fc33`.
- Declared corrective base and exact merge base:
  `6c8cf4bedd26b94f1018f3f276bc218af05ea883`, the immutable R7 rejection.
- Reviewed implementation:
  `2ada73f2776b32120e3fe1f091b55bce5a7e18bc`; reviewed handoff candidate:
  `3503fb354b29a66f7b43f952c34791f7e714fc33`.
- The candidate is a clean two-commit, single-parent corrective chain and its net
  diff contains exactly the six R8-authorized paths. TASK-0001 remains blocked,
  no attestation or activation exists, and later tasks did not advance.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree and handoff guidance; R7 rejection; R8 task and handoff; matrix;
  canonical Stage A record; changed validator and tests; inherited R5 structural
  controls; repository topology; and complete exact-base diff.
- Threat model: an author may place a duplicate state claim outside the one
  inspected directory, exploit case or Unicode path variants, substitute staged
  and unstaged bytes, preserve a valid mode/path while indexing a different
  object, replace filesystem topology, interpose commits, smuggle unauthorized
  paths, pre-seed evidence, or activate state without valid authorization.
  Runtime tenant, financial, API, migration, and durable-state boundaries are
  unchanged by this governance-only candidate.

## Blocking findings

### High: state-record uniqueness is not repository-wide

R8 requires exactly one canonical-path TASK-0001 Stage A state record
repository-wide. `validateClosureFormatting()` calls `readdirSync()` only on
`docs/governance/task-closures` and examines only the immediate filenames in
that directory. It never enumerates the repository index or worktree.

Independent reproduction copied the canonical bytes to
`docs/alternate/TASK-0001-stage-a-state.json`. Validation returned `errors=[]`.
The control therefore accepts a second authoritative-looking state record in a
different directory, contrary to the closed-world acceptance criterion.

Required correction: enumerate tracked and relevant untracked worktree paths
repository-wide using NUL-safe Git/path handling; normalize and reject exact,
alternate, case-variant, Unicode-normalized, and lookalike TASK-0001 Stage A
state records everywhere except the single canonical path. Add nested-directory,
case, Unicode, separator, extension, and untracked duplicate fixtures.

### High: the indexed Git blob is not bound to validated filesystem bytes

The Git check accepts any `100644` object ID at the canonical index path because
its regular expression validates only mode, hexadecimal shape, stage, and path.
Canonical content is checked separately from the worktree file, without proving
that the index object contains those same bytes or that the path is clean.

Independent reproduction wrote `{}` as a Git blob, replaced the canonical index
entry with that blob at mode `100644`, and left canonical JSON in the worktree.
Git reported `MM` for the path, yet validation returned `errors=[]`. A candidate
can therefore present canonical worktree bytes to validation while committing a
different state object.

Required correction: read the exact stage-zero index object by object ID, require
it to be a blob containing the canonical bytes, require byte equality among the
index blob, candidate tree entry, and filesystem file, and reject staged or
unstaged mismatch, split-index substitutions, multiple stages, intent-to-add,
skip-worktree/assume-unchanged ambiguity, mode changes, symlink, junction,
hardlink, gitlink, directory, and escape topology. Add direct fixtures for each
index/worktree/tree substitution.

## Adversarial and regression results

- Exact whole-row equality rejects ordinary additions, deletions, rewordings,
  whitespace, pipe, and CRLF/LF mutations covered by the implementation tests.
- Exact canonical JSON rejects missing, extra, reordered, malformed, and wrong
  state values at the canonical filesystem path.
- Same-directory duplicate and alternate-name fixtures plus symlink, gitlink,
  and executable-index-mode fixtures pass their negative assertions.
- Inherited R5 structural tests pass for candidate/parent/interposition,
  whole-diff status/rename/copy/NUL/path tricks, pre-seeded or malformed
  evidence, authorization mismatch, and premature activation. Those controls do
  not cure the repository-wide discovery and index-object binding failures.
- No structured attestation was created because either High finding is
  independently disqualifying.

## Independent commands and results

| Command                                                                                           | Result                                                                   |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npm ci --ignore-scripts`                                                                         | Pass; 106 packages added, 107 audited, zero vulnerabilities.             |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs` | Pass; 6/6 in 85.8 seconds.                                               |
| Outside-directory duplicate fixture                                                               | **Fail**; invalid duplicate returned `errors=[]`.                        |
| Index/worktree different-blob fixture                                                             | **Fail**; `MM` state with noncanonical index blob returned `errors=[]`.  |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                   | Pass; 275 Markdown, 65 JSON contracts, 5 YAML contracts.                 |
| Format, repository validation, queue, and traceability gates                                      | Pass.                                                                    |
| `npm test`                                                                                        | Pass; 942 total, 941 passed, 0 failed, 1 documented skip, 277.4 seconds. |
| `npm audit --audit-level=high`                                                                    | Pass; zero vulnerabilities.                                              |
| `git fsck --full --strict`                                                                        | Pass; only dangling local objects, no integrity failure.                 |
| `git diff --check 6c8cf4b..3503fb3`                                                               | Pass.                                                                    |

## Final verdict

**Verdict: REJECTED** for exact candidate
`3503fb354b29a66f7b43f952c34791f7e714fc33`.

No structured attestation was created. Preserve this narrative rejection and
correct forward with repository-wide closed-world discovery plus exact
candidate-tree/index/worktree blob binding before any attestation, activation,
hosted integration, merge, or work on `TASK-0002`.
