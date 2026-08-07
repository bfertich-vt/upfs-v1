# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R16

## Disposition

**REJECTED** for exact candidate
`f3dfddb6e49c7155e05d25592826c8b091680898`.

Do not create the structured acceptance attestation, activate the closure record,
push or merge this candidate, or advance `TASK-0002`. Preserve this review and
all R1-R15 rejection history, then correct forward and obtain a fresh independent
QA/Security review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated worktree: `C:\source\upfs-task-0001-closure-qa-r16`.
- Branch: `qa/task-0001-closure-r16`, created directly at exact candidate
  `f3dfddb6e49c7155e05d25592826c8b091680898`.
- Declared corrective base and exact merge base:
  `96a4f3a1688e5e545e536c77b0e7baed4e7eb583`, the immutable R15 rejection.
- Reviewed implementation commit:
  `419e426c0f0bd4af712223621c6161e77d21d8b8`, followed by the exact R16 handoff
  commit.
- The candidate is a clean two-commit, single-parent corrective chain and its
  net diff contains exactly the six R16-authorized paths. `TASK-0001` and
  `TASK-0002` remain blocked, and no attestation or activation exists.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree guidance; R15 rejection; R16 task and handoff; matrix; canonical
  Stage A record; changed validator and tests; repository topology; and complete
  exact-base diff.
- Threat model: aliased or ambiguously parsed Git administrative metadata may
  cause a closure decision to rely on an identity other than the registered,
  canonical repository state. Runtime tenant, financial, API, migration, and
  durable-state boundaries are unchanged.

## Blocking finding

### High: canonical Git identity contract remains incomplete

R16 does not satisfy its explicit criterion that direct metadata resolution and
sanitized Git plumbing agree on the object store. `canonicalGitContext` checks
`commonDir/objects` directly, but `verifyCanonicalGitIdentity` checks only the
worktree, Git directory, common directory, and index. It never requests and
compares sanitized `git rev-parse --git-path objects` (or an equivalent object
directory protocol). The inherited `GIT_OBJECT_DIRECTORY` attack is neutralized
because the child environment overwrites it with the directly resolved path, so
this review did not reproduce an active object redirect. Nevertheless, the
required independent identity agreement is absent and its protocol and failure
paths are untested.

The metadata grammar is also not closed. `oneMetadataLine` counts only nonempty
lines and then trims the complete body. A disposable legitimate linked worktree
whose `commondir` contained leading and trailing blank lines still returned an
empty validation error array. These blank lines were semantically inert in the
reproduction, but they contradict the task's malformed-metadata fail-closed
criterion and leave parser behavior broader than the documented one-line
authority format.

Finally, `samePath` lowercases paths on every platform. On a case-sensitive
filesystem, distinct paths that differ only by case compare equal. Therefore the
linked-worktree registration check can accept a `gitdir` registration naming a
different case-distinct `.git` file, even though the requirement is exact
registration agreement. This platform-independent implementation defect is not
exercised by the Windows-only run but prevents acceptance of the portable
identity control.

Required correction: add sanitized object-directory plumbing parity and its
malformed/failure fixtures; require exactly one nonempty metadata line with no
leading, trailing, or extra lines; and make path identity comparison reflect the
host filesystem semantics rather than unconditionally folding case. Preserve
legitimate registered linked worktrees and all prior rejected evidence.

## Independent commands and results

| Command                                                                                           | Result                                                                 |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `npm ci --ignore-scripts --offline`                                                               | Pass; 106 packages added, 107 audited, zero vulnerabilities.           |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs` | Pass; 11/11, with active real-worktree and failure-path fixtures.      |
| Disposable linked-worktree blank-line `commondir` reproduction                                    | **Fail**; malformed metadata was accepted with zero validation errors. |
| Inherited object-directory redirect analysis                                                      | Pass; child environment pins the direct object directory.              |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                   | Pass; 291 Markdown, 65 JSON contracts, and 5 YAML contracts.           |
| `npm test`                                                                                        | Pass; 947 total, 946 passed, 0 failed, 1 documented skip.              |
| `npm audit --audit-level=high --offline`                                                          | Pass; zero vulnerabilities.                                            |
| `git fsck --full --strict`                                                                        | Pass; dangling local test objects only, no integrity failure.          |
| `git diff --check 96a4f3a..f3dfddb`                                                               | Pass.                                                                  |

## Final verdict

**Verdict: REJECTED** for exact candidate
`f3dfddb6e49c7155e05d25592826c8b091680898`.

No structured attestation was created. Preserve this narrative rejection and
correct forward before any attestation, activation, hosted integration, merge,
or work on `TASK-0002`.
