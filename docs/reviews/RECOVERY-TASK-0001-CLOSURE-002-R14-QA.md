# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R14

## Disposition

**REJECTED** for exact candidate
`bf41a6b2e3fcf21e4fece2b49fe1f5e201620a44`.

Do not create the structured acceptance attestation, activate the closure record,
push or merge this candidate, or advance `TASK-0002`. Preserve this review and
all R1-R13 rejection history, then correct forward and obtain a fresh independent
QA/Security review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated worktree: `C:\source\upfs-task-0001-closure-qa-r14`.
- Branch: `qa/task-0001-closure-r14`, created directly at exact candidate
  `bf41a6b2e3fcf21e4fece2b49fe1f5e201620a44`.
- Declared corrective base and exact merge base:
  `9486c01e1bdcb01dcbbf66a73e53cdac1d5a1c14`, the immutable R13 rejection.
- Reviewed implementation chain: `81ca0dffcd91303d94185cb6cf3085741438ca41`,
  corrective test commit `a9e26665655c489361b06514b1efedfc53f8f82a`, and
  handoff candidate `bf41a6b2e3fcf21e4fece2b49fe1f5e201620a44`.
- The candidate is a clean three-commit, single-parent corrective chain and its
  net diff contains exactly the six R14-authorized paths. `TASK-0001` and
  `TASK-0002` remain blocked, and no attestation or activation exists.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree guidance; R13 rejection; R14 task and handoff; matrix; canonical
  Stage A record; changed validator and tests; repository topology; and complete
  exact-base diff.
- Threat model: an author or execution environment may redirect Git plumbing to
  a clean alternate index while the canonical worktree index contains mutable
  closure-authorizing state, or may cause a Git command to fail and have empty
  output interpreted as success. Runtime tenant, financial, API, migration, and
  durable-state boundaries are unchanged.

## Blocking finding

### High: process-selected alternate index bypasses the clean committed-HEAD invariant

R14 invokes Git with the inherited process environment. It neither resolves and
binds the canonical repository, common directory, worktree, object directory,
and index nor removes repository-redirecting `GIT_*` variables. Every cleanliness
and authority query therefore trusts `GIT_INDEX_FILE`.

An independent Windows reproduction in the isolated exact-candidate worktree:

1. Copied the candidate's clean canonical index to a temporary file outside the
   worktree.
2. Replaced only the real index blob for tracked root authority `SECURITY.md`
   with a different blob. The canonical repository reported `MM SECURITY.md`.
3. Set `GIT_INDEX_FILE` to the clean copied index and ran
   `node scripts/closure-format-check.mjs`.
4. The alternate view reported no status, and the validator printed
   `Closure formatting passed` and exited zero.
5. Removed the override and temporary file, reset to the exact reviewed commit,
   and verified the isolated worktree was clean.

This is an actual authority-boundary bypass: the validator accepts while the
canonical repository index differs from both reviewed `HEAD` and the worktree.
The same trust applies to other Git environment redirections. In addition,
`nulGit` catches every Git error and returns an empty buffer, so the new status
and diff checks interpret command failure exactly like a clean result. Other
later checks happen to reject some failure shapes, but the cleanliness protocol
itself is not fail-closed and provides no proof that all required Git queries
succeeded.

Required correction: derive the canonical top-level, Git directory, common
directory, worktree, object store, and index independently; invoke Git with an
explicit sanitized environment and canonical paths; reject redirecting Git
environment variables rather than inheriting them; and convert every Git spawn,
exit, signal, timeout, stderr/protocol, and parse failure into a validation error.
Add negative fixtures for alternate index/worktree/repository/object/config
redirection and for every command-failure path.

## Promised-test coverage audit

The R14 test diff adds no ordinary dirty-state table. It renames the inherited
R13 test and changes R13 strings to R14 strings. The production cleanliness
check consequently has no committed regression fixture for generic staged,
unstaged, both-staged-and-unstaged, untracked, ignored-governance, deleted, new,
type-change, rename, copy, or unmerged porcelain-v2 records; intent-to-add,
skip-worktree, assume-unchanged, sparse/index-only/worktree-only states; alternate
indexes; or Git command failures. The inherited canonical-state dirty and
intent-to-add mutations do not exercise the complete repository-wide contract.

The committed fixtures are real and execute production code, but they are not
comprehensive enough to prove the R14 task and handoff claims. Passing 6/6
targeted tests therefore does not satisfy the promised adversarial matrix.

## Adversarial and regression results

- Exact candidate topology, exact-base merge boundary, and six-path authorization
  boundary are valid.
- The canonical index can be dirty while a process-selected clean alternate
  index makes authoritative closure validation pass.
- Static inspection confirms Git command errors are collapsed into empty output
  by `nulGit`, including the new cleanliness queries.
- Existing inherited Unicode, ADS, hardlink, blob/mode, index, full-tree, matrix,
  attestation, topology, and evidence tests pass, but they do not close the new
  environment and command-failure boundary.
- No structured attestation was created.

## Independent commands and results

| Command                                                                                           | Result                                                        |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `npm ci --ignore-scripts --offline`                                                               | Pass; 106 packages added, 107 audited, zero vulnerabilities.  |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs` | Pass; 6/6 in 85.9 seconds.                                    |
| Real dirty index plus clean `GIT_INDEX_FILE` reproduction                                         | **Fail**; validator printed pass and exited zero.             |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                   | Pass; 287 Markdown, 65 JSON contracts, 5 YAML contracts.      |
| `npm test`                                                                                        | Pass; 942 total, 941 passed, 0 failed, 1 documented skip.     |
| `npm audit --audit-level=high --offline`                                                          | Pass; zero vulnerabilities.                                   |
| `git fsck --full --strict`                                                                        | Pass; only dangling local test objects, no integrity failure. |
| `git diff --check 9486c01e..bf41a6b2`                                                             | Pass.                                                         |

## Final verdict

**Verdict: REJECTED** for exact candidate
`bf41a6b2e3fcf21e4fece2b49fe1f5e201620a44`.

No structured attestation was created. Preserve this narrative rejection and
correct forward with canonical repository/index derivation, a sanitized Git
environment, explicit failure propagation, and comprehensive real dirty-state
and environment-override fixtures before any attestation, activation, hosted
integration, merge, or work on `TASK-0002`.
