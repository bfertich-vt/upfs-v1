# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R12

## Disposition

**REJECTED** for exact candidate
`ccf8bbb343fe330261abed523397f2bbf931b478`.

Do not create the structured acceptance attestation, activate the closure record,
push or merge this candidate, or advance `TASK-0002`. Preserve this review and
all R1-R11 rejection history, then correct forward and obtain a fresh independent
QA/Security review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated worktree: `C:\source\upfs-task-0001-closure-qa-r12`.
- Branch: `qa/task-0001-closure-r12`, created directly at exact candidate
  `ccf8bbb343fe330261abed523397f2bbf931b478`.
- Declared corrective base and exact merge base:
  `701c26ba66becb5c5118a3944347fc5f05c733d8`, the immutable R11 rejection.
- Reviewed implementation:
  `936fb8d38fd6d0ed148916c707cfdefa884496de`; reviewed handoff candidate:
  `ccf8bbb343fe330261abed523397f2bbf931b478`.
- The candidate is a clean two-commit, single-parent corrective chain and its net
  diff contains exactly the six R12-authorized paths. `TASK-0001` remains
  blocked, `TASK-0002` remains blocked, and no attestation or activation exists.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree guidance; R11 rejection; R12 task and handoff; matrix; canonical
  Stage A record; changed validator and tests; repository topology; and complete
  exact-base diff.
- Threat model: an author may hide a conflicting closure claim in a named NTFS
  stream on an omitted root artifact, or in a tracked, staged, untracked,
  symlink, gitlink, conflict-stage, or worktree-only entry absent from the ADS
  inventory. Runtime tenant, financial, API, migration, and durable-state
  boundaries are unchanged.

## Blocking finding

### High: heuristic worktree scope omits closure-authorizing root and index entries

R12 does not establish the promised complete ADS inventory. `closureScope()` is
fed only the physical `treePaths` result and selects root files with a narrow
filename/extension heuristic. It therefore omits root governance and integrity
artifacts including `MANIFEST.sha256`, `CODEOWNERS`, `.env.example`,
`.gitattributes`, `.gitignore`, `SECURITY.md`, and `START_HERE.md`. It also
silently filters symlinks and cannot see index-only staged paths because
`gitPaths` is not passed to the scope builder.

Independent Windows reproductions attached the same `qa-r12-stream` named ADS
to each root artifact listed above. `Get-Item -Stream *` showed the named stream,
yet `node scripts/closure-format-check.mjs` printed its pass result and exited
zero for every file. As a control, the same stream on
`docs/HISTORICAL_TASK_CLOSURE_MATRIX.md` was detected and returned exit one.
All streams were removed after each run and the worktree returned clean.

A second reproduction staged an index-only mode-`120000` entry at
`docs/qa-r12-link.md`. Validation again printed its pass result and exited zero.
The entry was reset afterward. This proves a candidate index can contain an
in-scope link that the expected ADS inventory omits entirely. The same
tree-only construction leaves staged deletions, index-only regular files,
conflict stages, and other index/worktree disagreement outside exact parity.

The R12 test diff does not add the table-driven coverage required by the R11
rejection. Its Windows-gated ADS loop remains limited to the canonical state
file. There are no ADS cases for the matrix, queue, task, recovery definition,
handoff, review, attestation, evidence, validator, workflow, manifest, config,
or lock classes; nor tests for scope omissions, duplicate/unexpected records,
malformed/truncated/oversized JSON, stderr, nonzero exit, timeout, record/size
caps, casing/normalization, structured-stdin injection, or staged/index-only
entries. Passing targeted and full tests therefore demonstrates a coverage gap,
not satisfaction of the acceptance criterion.

Required correction: derive a closed inventory from complete NUL-delimited Git
index data for every stage plus bounded physical/untracked discovery, and an
explicit authoritative root allowlist rather than extension heuristics. Require
exact index/worktree/scope parity; classify modes and fail closed on symlink,
gitlink, conflict-stage, deletion, or unsupported entries in the
closure-authorizing scope. Batch-enumerate ADS for every resulting regular file
with exact record parity. Add table-driven Windows and deterministic mocked
protocol tests covering every promised file class, every omitted root artifact,
arbitrary stream names and content, omission/duplication/unexpected paths,
malformed/truncated/oversized output, stderr/nonzero/signal/timeout, record and
byte limits, path case/normalization/order, spaces/quotes/metacharacters/Unicode,
and structured-stdin injection. Retain all inherited full-tree, Unicode, hardlink,
blob, index, topology, matrix, attestation, and evidence attacks.

## Adversarial and regression results

- The exact candidate topology and six-path authorization boundary are valid.
- The canonical matrix ADS control fails closed, but seven omitted root-file ADS
  attacks all pass validation.
- An index-only staged symlink under `docs/` passes validation, confirming scope
  omission independent of ADS naming or content.
- Existing inherited Unicode, path, hardlink, index/blob, topology, matrix,
  attestation, and evidence tests pass, but R12 adds no promised multi-class ADS
  or subprocess-protocol test matrix.
- No structured attestation was created.

## Independent commands and results

| Command                                                                                           | Result                                                        |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `npm ci --ignore-scripts`                                                                         | Pass; 106 packages added, 107 audited, zero vulnerabilities.  |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs` | Pass; 6/6 in 84.4 seconds.                                    |
| Matrix-file named ADS control                                                                     | Pass; validator rejected it with exit one.                    |
| Named ADS on seven omitted root artifacts                                                         | **Fail**; each validator run exited zero.                     |
| Index-only staged `docs/qa-r12-link.md` mode-120000 reproduction                                  | **Fail**; validator exited zero.                              |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                   | Pass; 283 Markdown, 65 JSON contracts, 5 YAML contracts.      |
| `npm test`                                                                                        | Pass; 942 total, 941 passed, 0 failed, 1 documented skip.     |
| `npm audit --audit-level=high`                                                                    | Pass; zero vulnerabilities.                                   |
| `git fsck --full --strict`                                                                        | Pass; only dangling local test objects, no integrity failure. |
| `git diff --check 701c26ba..ccf8bbb`                                                              | Pass.                                                         |

## Final verdict

**Verdict: REJECTED** for exact candidate
`ccf8bbb343fe330261abed523397f2bbf931b478`.

No structured attestation was created. Preserve this narrative rejection and
correct forward with complete index/worktree inventory parity, explicit root
coverage, fail-closed entry classification, and comprehensive batch/protocol
tests before any attestation, activation, hosted integration, merge, or work on
`TASK-0002`.
