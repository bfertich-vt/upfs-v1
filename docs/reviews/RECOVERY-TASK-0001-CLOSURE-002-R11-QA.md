# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R11

## Disposition

**REJECTED** for exact candidate
`f8991722dbbeb5a1ee9909794982edbada441065`.

Do not create the structured acceptance attestation, activate the closure record,
push or merge this candidate, or advance `TASK-0002`. Preserve this review and
all R1-R10 rejection history, then correct forward and obtain fresh independent
QA/Security review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated worktree: `C:\source\upfs-task-0001-closure-qa-r11`.
- Branch: `qa/task-0001-closure-r11`, created directly at exact candidate
  `f8991722dbbeb5a1ee9909794982edbada441065`.
- Declared corrective base and exact merge base:
  `243b2a36ccbf4c534f26bca8bb2657183db4be86`, the immutable R10 rejection.
- Reviewed implementation:
  `9e8080529cc4567ff22e53dc09e4ff4cd57daf48`; reviewed handoff candidate:
  `f8991722dbbeb5a1ee9909794982edbada441065`.
- The candidate is a clean two-commit, single-parent corrective chain and its net
  diff contains exactly the six R11-authorized paths. `TASK-0001` remains
  blocked, `TASK-0002` remains blocked, and no attestation or activation exists.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree and handoff guidance; R10 rejection; R11 task and handoff; matrix;
  canonical Stage A record; changed validator and tests; inherited structural
  controls; repository topology; and complete exact-base diff.
- Threat model: an author may hide a conflicting closure claim in ignored,
  generated, nested, Unicode, reparse, hardlink, index-only, or NTFS
  alternate-stream namespaces; exploit traversal bounds, command failures, or
  unbounded subprocesses; split candidate/index/worktree state; manipulate Git
  topology or authorization evidence; or activate state without separation of
  duties. Runtime tenant, financial, API, migration, and durable-state
  boundaries are unchanged.

## Blocking finding

### High: ADS rejection covers only the canonical state file

R11's `namedStreams()` implementation is called only for
`docs/governance/task-closures/TASK-0001-stage-a-state.json`. It does not
enumerate streams on the matrix, task definitions, handoffs, reviews, evidence,
validators, or other regular files that can authorize or influence closure.
That leaves a second content namespace available on the same governed source
tree even though R11's acceptance criterion requires Windows native ADS
enumeration to reject every named stream.

Independent reproduction attached a 14-byte `Zone.Identifier` named stream to
the tracked, authoritative-input file
`docs/HISTORICAL_TASK_CLOSURE_MATRIX.md`. `Get-Item -LiteralPath ... -Stream *`
reported both the primary `:$DATA` stream and `Zone.Identifier`. With the stream
present, `node scripts/closure-format-check.mjs` printed its pass message and
exited zero. The stream was removed afterward and the Git worktree returned
clean. The same omission applies to arbitrary stream names and to every other
noncanonical governance file because none is passed to `namedStreams()`.

Required correction: perform one bounded, native, literal-path PowerShell batch
enumeration over an explicit closed set covering every closure-authorizing
input/output and governed source root: at minimum `docs`, `tasks`, `scripts`,
`specs`, `agents`, `.github`, plus root governance/configuration/lock manifests
and evidence. Return structured path, stream, and length JSON; reject every
named stream regardless of its name or content; reject duplicate, missing, or
unexpected enumeration records; and fail closed on nonzero exit, malformed or
unexpected output, timeout, scan-limit overflow, or per-path enumeration error.
Do not spawn one PowerShell process per file. Define the non-Windows boundary
explicitly and retain applicable regular-file, path, index, blob, and link
checks there.

The batch must cover ordinary and governance-like filenames and stream names,
including `Zone.Identifier`, spaces, quotes, shell metacharacters, mixed case,
and JSON-conflicting content. Its tests must prove that streams on the matrix,
task, handoff, review, attestation, evidence, validator, canonical state, and
root manifests all fail closed. Add deterministic failure, malformed-JSON,
encoding, duplicate-result, omission, limit, and timeout tests without relying
on narrative text as authorization.

## Adversarial and regression results

- Repository-wide printable-ASCII inspection rejects non-ASCII pathname
  components independently of lookalike recognition. The changed fixtures cover
  combined Cyrillic substitutions, combining marks, zero-width characters,
  full-width forms, and non-ASCII directory segments; code inspection confirms
  control characters, bidi controls, reserved punctuation, empty segments,
  trailing dots/spaces, and case-insensitive Windows device basenames are
  rejected by the closed grammar.
- Full-tree discovery combines tracked/untracked Git paths with bounded physical
  traversal, includes ignored trees, excludes only root `.git`, and does not
  recurse through entries reported as links. A live directory-junction loop was
  not followed and was rejected as an invalid path; it was removed safely.
  Traversal exceptions and the 100,000-entry limit become validation errors.
- Inherited fixtures reject nested/ignored/generated state duplicates,
  hardlinks to canonical state, bad Git modes, split index/worktree blobs,
  dirty state, intent-to-add state, candidate/parent/interposition/topology
  substitutions, matrix drift, evidence drift, and authorization attacks.
- Arbitrary named streams on the canonical state file are detected by the
  existing Windows-gated fixtures. A named stream on a noncanonical in-scope
  governance file is accepted, establishing the blocking scope bypass.
- No structured attestation was created.

## Independent commands and results

| Command                                                                                           | Result                                                              |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `npm ci --ignore-scripts`                                                                         | Pass; 106 packages added, 107 audited, zero vulnerabilities.        |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs` | Pass; 6/6 in 85.3 seconds.                                          |
| Noncanonical matrix-file `Zone.Identifier` ADS reproduction                                       | **Fail**; named stream accepted and validator exited zero.          |
| Directory-junction loop reproduction                                                              | Pass; reparse entry was not traversed and validation failed closed. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                   | Pass; 281 Markdown, 65 JSON contracts, 5 YAML contracts.            |
| `npm test`                                                                                        | Pass; 942 total, 941 passed, 0 failed, 1 documented skip.           |
| `npm audit --audit-level=high`                                                                    | Pass; zero vulnerabilities.                                         |
| `git fsck --full --strict`                                                                        | Pass; only dangling local test objects, no integrity failure.       |
| `git diff --check 243b2a36..f8991722`                                                             | Pass.                                                               |

## Final verdict

**Verdict: REJECTED** for exact candidate
`f8991722dbbeb5a1ee9909794982edbada441065`.

No structured attestation was created. Preserve this narrative rejection and
correct forward with bounded fail-closed ADS enumeration across the entire
closure-authorizing storage boundary before any attestation, activation, hosted
integration, merge, or work on `TASK-0002`.
