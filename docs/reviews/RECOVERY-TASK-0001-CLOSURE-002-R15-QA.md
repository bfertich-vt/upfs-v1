# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R15

## Disposition

**REJECTED** for exact candidate
`d0c8b2901df725b2eb7d48bd8e8c6eb86fef48ac`.

Do not create the structured acceptance attestation, activate the closure record,
push or merge this candidate, or advance `TASK-0002`. Preserve this review and
all R1-R14 rejection history, then correct forward and obtain a fresh independent
QA/Security review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated worktree: `C:\source\upfs-task-0001-closure-qa-r15`.
- Branch: `qa/task-0001-closure-r15`, created directly at exact candidate
  `d0c8b2901df725b2eb7d48bd8e8c6eb86fef48ac`.
- Declared corrective base and exact merge base:
  `cd1b4b09476e881d40e7f0e91dc34e5f4072ec68`, the immutable R14 rejection.
- Reviewed implementation commit:
  `eb5bb3aa5ba79c7d3ed02305ccfb29d3508b4713`, followed by the exact R15 handoff
  commit.
- The candidate is a clean two-commit, single-parent corrective chain and its
  net diff contains exactly the six R15-authorized paths. `TASK-0001` and
  `TASK-0002` remain blocked, and no attestation or activation exists.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree guidance; R14 rejection; R15 task and handoff; matrix; canonical
  Stage A record; changed validator and tests; repository topology; and complete
  exact-base diff.
- Threat model: mutable or aliased Git administrative metadata may present a
  clean external index while the reviewed repository's original index contains
  uncommitted closure-authorizing state. Runtime tenant, financial, API,
  migration, and durable-state boundaries are unchanged.

## Blocking finding

### High: externally aliased index bypasses canonical metadata identity

R15 resolves the index as `gitDir/index` and verifies it with `stat`, but it does
not require that directory entry to be a non-reparse regular file with a single
filesystem link. It therefore verifies the path spelling, not the identity and
containment of the index bytes.

An independent local reproduction used a disposable linked worktree at the
exact candidate. Its genuine index was changed so ordinary porcelain-v2 reported
a staged deletion and an untracked replacement for tracked root authority
`SECURITY.md`. The index directory entry was then made an alias of an external
clean index while the dirty original bytes remained separate. R15 validation
returned an empty error array and accepted the worktree. The complete disposable
fixture and external alias were removed afterward, and the supplied QA worktree
was confirmed clean.

This is the same authority-boundary class R15 is intended to close: external Git
metadata can mask mutable canonical repository state. Sanitizing child-process
environment variables does not address filesystem identity aliases established
before Git is invoked.

Required correction: fail closed unless the canonical index is a direct,
non-reparse regular file with exactly one filesystem link and an identity wholly
owned by the verified Git administrative directory. Verify direct `.git`,
`commondir`, index, object store, and linked-worktree registration agreement
using sanitized plumbing while preserving legitimate linked worktrees. Add real
temporary-worktree negative fixtures for index aliases and forged `.git` or
`commondir` indirection, including symlink/reparse forms where the platform
supports them.

## Coverage observations

- The inherited-environment regression sets every redirect variable in one
  case, so it does not independently prove sanitization of repository,
  worktree, index, common-directory, object, alternate-object, configuration,
  namespace, replacement-reference, and discovery redirects.
- Git failure fixtures cover a missing executable, one malformed status output,
  and a timeout. They do not separately exercise nonzero exit, signal, stderr,
  or malformed output for each parsed Git protocol.
- The dirty-state table covers useful representative states but does not include
  every state promised by the R14 correction request, including ignored
  governance paths, type changes, sparse/index-only/worktree-only cases, and
  copy-like transitions.

These coverage gaps reinforce the required corrective work, but the reproduced
index-identity bypass independently requires rejection.

## Independent commands and results

| Command                                                                                           | Result                                                           |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `npm ci --ignore-scripts --offline`                                                               | Pass; 106 packages added, 107 audited, zero vulnerabilities.     |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs` | Pass; 9/9.                                                       |
| Disposable linked-worktree index-identity reproduction                                            | **Fail**; dirty original state was masked and validation passed. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                   | Pass; 289 Markdown, 65 JSON contracts, and 5 YAML contracts.     |
| `npm test`                                                                                        | Pass; 945 total, 944 passed, 0 failed, 1 documented skip.        |
| `npm audit --audit-level=high --offline`                                                          | Pass; zero vulnerabilities.                                      |
| `git fsck --full --strict`                                                                        | Pass; dangling local test objects only, no integrity failure.    |
| `git diff --check cd1b4b0..d0c8b29`                                                               | Pass.                                                            |

## Final verdict

**Verdict: REJECTED** for exact candidate
`d0c8b2901df725b2eb7d48bd8e8c6eb86fef48ac`.

No structured attestation was created. Preserve this narrative rejection and
correct forward with canonical Git-metadata identity and registration checks,
real alias/indirection fixtures, and complete failure-path fixtures before any
attestation, activation, hosted integration, merge, or work on `TASK-0002`.
