# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R10

## Disposition

**REJECTED** for exact candidate
`6feb47c5c90904820f31eb83adf2a0ccf8b5003e`.

Do not create the structured acceptance attestation, activate the closure record,
push or merge this candidate, or advance `TASK-0002`. Preserve this review and
all R1-R9 rejection history, then correct forward and obtain fresh independent
QA/Security review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated worktree: `C:\source\upfs-task-0001-closure-qa-r10`.
- Branch: `qa/task-0001-closure-r10`, created directly at exact candidate
  `6feb47c5c90904820f31eb83adf2a0ccf8b5003e`.
- Declared corrective base and exact merge base:
  `27efb657b54096f97443a1c47eececd6f01fa7d0`, the immutable R9 rejection.
- Reviewed implementation:
  `f1623503dee17238d210754710cdf5e25604ef48`; reviewed handoff candidate:
  `6feb47c5c90904820f31eb83adf2a0ccf8b5003e`.
- The candidate is a clean two-commit, single-parent corrective chain and its net
  diff contains exactly the six R10-authorized paths. `TASK-0001` remains
  blocked, no attestation or activation exists, and later tasks did not advance.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree and handoff guidance; R9 rejection; R10 task and handoff; matrix;
  canonical Stage A record; changed validator and tests; inherited structural
  controls; repository topology; and complete exact-base diff.
- Threat model: an author may hide another state claim in ignored, generated,
  nested, Unicode, reparse, hardlink, or NTFS alternate-stream namespaces;
  exploit traversal bounds or read errors; split candidate/index/worktree state;
  manipulate Git topology or authorization evidence; or activate state without
  valid separation of duties. Runtime tenant, financial, API, migration, and
  durable-state boundaries are unchanged.

## Blocking findings

### High: combined Unicode confusables bypass the fail-closed recognizer

R10 correctly abandons a small explicit confusable table, but its replacement is
still an incomplete heuristic. `stateLookalike()` deletes every non-ASCII code
point and then requires one surviving ASCII token (`task0001`, or both `stage`
and `state`). Replacing characters across all three tokens can remove every
trigger while leaving a visually governance-like Stage A filename.

Independent reproduction created the untracked pathname
`docs/alternate/TАSK-0001-stаge-a-stаte.json`, where the `А` in `TASK` and the
`а` characters in `stage` and `state` are Cyrillic confusables. With that file
present, `node scripts/closure-format-check.mjs` printed its pass message and
exited zero. This directly contradicts the R10 requirement that any non-ASCII
governance-like Stage A record outside the canonical ASCII path fail closed.

Required correction: use an explicit repository-wide ASCII-only pathname
grammar, or an equally closed allowlist, so authorization does not depend on
Unicode confusable recognition. Before imposing that compatibility boundary,
inventory and document all current tracked and worktree pathnames. Test
non-ASCII code points across all pathname components and tokens, including
combined substitutions, combining marks, bidi controls, zero-width characters,
full-width forms, and non-ASCII directory segments.

### High: NTFS alternate data streams are outside discovery

On Windows, an alternate data stream is addressable content attached to a
pathname but is not returned by `readdirSync()`. Independent reproduction added
stream `TASK-0001-stage-a-state.json` to the canonical state file containing a
conflicting completion-shaped JSON value. `Get-Item -Stream *` proved both the
primary `$DATA` stream and the 28-byte governance-named alternate stream existed.
The closure validator still printed its pass message and exited zero; removing
the stream left the Git worktree clean.

Required correction: the closed pathname/topology policy must explicitly reject
alternate streams on Windows, including streams on the canonical file and on
other in-scope repository files, or establish and enforce an equivalent
repository storage boundary that makes them impossible. Add a platform-gated
negative test and retain fail-closed behavior when stream enumeration itself
fails. Document behavior on filesystems that do not expose NTFS streams.

## Adversarial and regression results

- R10's inherited fixtures reject individual ignored/dependency/build/generated
  duplicates, ordinary nested duplicates, the included individual Unicode
  examples, hardlinks, bad modes, split index/worktree blobs, dirty worktrees,
  and intent-to-add state.
- Code inspection confirms traversal includes ignored directories, excludes only
  the root `.git`, does not recurse through entries reported as symbolic links,
  caps metadata collection at 100,000 entries, and converts traversal exceptions
  into a validation error. Inherited R5/R9 candidate, parent, interposition,
  whole-diff, state, evidence, and authorization controls still pass.
- Combined-confusable and NTFS alternate-stream attacks both returned success
  from the validator. Each violates an explicit closed-world acceptance boundary
  and is independently disqualifying.
- No structured attestation was created.

## Independent commands and results

| Command                                                                                           | Result                                                                   |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npm ci --ignore-scripts`                                                                         | Pass; 106 packages added, 107 audited, zero vulnerabilities.             |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs` | Pass; 6/6 in 83.8 seconds.                                               |
| Combined Cyrillic-confusable pathname reproduction                                                | **Fail**; invalid governance-like pathname accepted with exit zero.      |
| Canonical-file NTFS alternate-stream reproduction                                                 | **Fail**; conflicting governance-named stream accepted with exit zero.   |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                   | Pass; 279 Markdown, 65 JSON contracts, 5 YAML contracts.                 |
| `npm test`                                                                                        | Pass; 942 total, 941 passed, 0 failed, 1 documented skip, 254.1 seconds. |
| `npm audit --audit-level=high`                                                                    | Pass; zero vulnerabilities.                                              |
| `git fsck --full --strict`                                                                        | Pass; only dangling local test objects, no integrity failure.            |
| `git diff --check 27efb657..6feb47c5`                                                             | Pass.                                                                    |

## Final verdict

**Verdict: REJECTED** for exact candidate
`6feb47c5c90904820f31eb83adf2a0ccf8b5003e`.

No structured attestation was created. Preserve this narrative rejection and
correct forward with a closed ASCII pathname/storage policy, comprehensive
multi-confusable coverage, and explicit NTFS alternate-stream rejection before
any attestation, activation, hosted integration, merge, or work on `TASK-0002`.
