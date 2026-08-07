# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R17

## Disposition

**REJECTED** for exact candidate
`14de5bb1dff0ed4bf86c25d53708247a782af753`.

Do not create the structured acceptance attestation, activate the closure record,
push or merge this candidate, or advance `TASK-0002`. Preserve this review and
all R1-R16 rejection history, then correct forward and obtain a fresh independent
QA/Security review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated detached worktree:
  `C:\source\upfs-qa-task-0001-closure-r17`.
- Exact reviewed candidate:
  `14de5bb1dff0ed4bf86c25d53708247a782af753`.
- Declared corrective base and exact merge base:
  `aac12f6d5fb6fc89cc881bdb304c457550b6146a`, the immutable R16 rejection.
- Reviewed implementation commit:
  `5cee583a54d69b1e22f737108c4fd9f39b6cc21c`, followed by the exact R17 handoff
  commit.
- The candidate is a clean two-commit, single-parent corrective chain and its
  net diff contains exactly the six R17-authorized paths. `TASK-0001` and
  `TASK-0002` remain blocked, and no attestation or activation exists.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree guidance; R16 rejection; R17 task and handoff; matrix; canonical
  Stage A record; changed validator and tests; repository topology; and complete
  exact-base diff.
- Threat model: redirected or ambiguously parsed Git administrative metadata
  may substitute a different repository authority. Runtime tenant, financial,
  API, migration, and durable-state boundaries are unchanged.

## Blocking finding

### High: object-store parity test is not sensitive to the R17 control

The production change adds sanitized
`git rev-parse --path-format=absolute --git-path objects` comparison against the
directly derived common object directory, but the only new object-plumbing test
does not prove that comparison exists or executes. It supplies inherited
`GIT_OBJECT_DIRECTORY` and `GIT_ALTERNATE_OBJECT_DIRECTORIES` values and expects
validation to succeed. The child Git environment already overwrote those values
in R16, so this test exercises pre-existing sanitization rather than the new R17
parity branch.

The defect was reproduced with a mutation-sensitivity check against a disposable
working copy of the exact candidate: remove only the new object-directory tuple
from `verifyCanonicalGitIdentity`, leaving all other production behavior
unchanged, then run
`node --test scripts/closure-format-check.test.mjs`. All 9 tests passed,
including `R17 object plumbing is canonical despite inherited redirect`. The
exact candidate was restored byte-for-byte and clean before the remaining gates.
This proves the new test is a no-op with respect to the required object-store
parity control.

Required correction: preserve the R17 production logic unless a separate bypass
is found, and add narrow negative tests that inject checked Git output by exact
command and arguments. For
`rev-parse --path-format=absolute --git-path objects`, return a wrong existing
directory, blank output, extra-line output, CR/NUL/edge-whitespace output, and a
nonexistent path; assert each fails closed for object-directory disagreement or
malformed output. Add a direct spy/call assertion or equivalent
mutation-sensitive coverage proving that the object-parity branch executes.
Keep legitimate linked worktrees and filesystem-proven same-object aliases
passing.

## Other defensive results

- The one-line metadata grammar rejects blank, extra, CR, NUL, and surrounding
  whitespace forms covered by the linked-worktree fixture.
- Filesystem-aware path identity no longer folds case unconditionally. The
  platform-specific fixtures preserve valid Windows case aliases and reject
  case-distinct files on case-sensitive systems.
- Git environment, index, linked-worktree registration, ADS, portable-path,
  matrix, Stage A state, attestation absence, evidence, and clean committed-head
  controls remained fail closed in the targeted and full suites.
- The changed tests are substantive overall, but the required object-parity
  test specifically is not mutation-sensitive, which blocks acceptance.

## Independent commands and results

| Command                                                                                                   | Result                                                                                                             |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm ci --ignore-scripts --offline`                                                                       | Pass; 106 packages added, 107 audited, zero vulnerabilities.                                                       |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs`         | Pass; 12/12.                                                                                                       |
| Remove only the object-directory comparison, then run `node --test scripts/closure-format-check.test.mjs` | **Failing QA evidence:** all 9/9 tests still passed, proving the R17 parity fixture is insensitive to the control. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                           | Pass; 293 Markdown, 65 JSON, and 5 YAML files.                                                                     |
| `npm test`                                                                                                | Pass; 948 total, 947 passed, 0 failed, 1 documented skip.                                                          |
| `npm audit --audit-level=high --offline`                                                                  | Pass; zero vulnerabilities.                                                                                        |
| `git fsck --full --strict`                                                                                | Pass; dangling local test objects only, no integrity failure.                                                      |
| `git diff --check aac12f6d5fb6fc89cc881bdb304c457550b6146a..14de5bb1dff0ed4bf86c25d53708247a782af753`     | Pass.                                                                                                              |
| Clean-state and exact-head check after restoring the mutation                                             | Pass; clean exact candidate `14de5bb1dff0ed4bf86c25d53708247a782af753`.                                            |

## Final verdict

**Verdict: REJECTED** for exact candidate
`14de5bb1dff0ed4bf86c25d53708247a782af753`.

No structured attestation was created. Preserve this narrative rejection and
correct forward before any attestation, activation, hosted integration, merge,
or work on `TASK-0002`.
