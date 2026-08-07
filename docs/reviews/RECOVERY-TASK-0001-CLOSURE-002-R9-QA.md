# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R9

## Disposition

**REJECTED** for exact candidate
`d404288a10307c90f85fe30717f044bf93c64d0a`.

Do not create the structured acceptance attestation, activate the closure record,
push or merge this candidate, or advance `TASK-0002`. Preserve this review and
all R1-R8 rejection history, then correct forward and obtain fresh independent
QA/Security review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated worktree: `C:\source\upfs-task-0001-closure-qa-r9`.
- Branch: `qa/task-0001-closure-r9`, created directly at exact candidate
  `d404288a10307c90f85fe30717f044bf93c64d0a`.
- Declared corrective base and exact merge base:
  `2f6e362438873ce757ee607a6b6726acd50b3484`, the immutable R8 rejection.
- Reviewed implementation:
  `b823fde6ab8e25475cd34eef24563c28e824f390`; reviewed handoff candidate:
  `d404288a10307c90f85fe30717f044bf93c64d0a`.
- The candidate is a clean two-commit, single-parent corrective chain and its net
  diff contains exactly the six R9-authorized paths. `TASK-0001` remains blocked,
  no attestation or activation exists, and later tasks did not advance.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree and handoff guidance; R8 rejection; R9 task and handoff; matrix;
  canonical Stage A record; changed validator and tests; inherited structural
  controls; repository topology; and complete exact-base diff.
- Threat model: an author may hide a second state claim in an excluded or ignored
  subtree, use Unicode confusables that survive NFKC, alias canonical bytes to an
  external hardlink, split candidate/index/worktree state, manipulate index
  stages or flags, interpose commits, smuggle unauthorized paths, pre-seed
  evidence, or activate state without valid authorization. Runtime tenant,
  financial, API, migration, and durable-state boundaries are unchanged.

## Blocking findings

### High: declared repository-wide uniqueness excludes governance-like records

R9 claims repository-wide uniqueness but `worktreePaths()` skips `.git`,
`node_modules`, `dist`, `build`, `coverage`, and `.next`. Git discovery also uses
`--exclude-standard`, so ignored untracked paths are omitted. A byte-identical
duplicate placed at `node_modules/TASK-0001-stage-a-state.json` was therefore
invisible and `node scripts/closure-format-check.mjs` exited zero.

Generated dependency content is not Git-authoritative evidence by itself, but
the implementation and acceptance language promise repository-wide worktree
uniqueness and use filesystem discovery as an authorization boundary. An
ignored record can also be surfaced by tooling or copied into later evidence.
The validator must either narrow its declared security contract to a precise
Git-authoritative inventory or enforce the promised closed world without
silently excluding governance-like basenames.

Required correction: perform a targeted full-tree name discovery, including
ignored/generated directories, while avoiding recursive parsing of their
contents. Reject any governance-like state-record pathname outside the exact
allowed path. Add ignored `node_modules`, `build`, nested, and generated-directory
fixtures and make the contract accurately distinguish Git authority from
worktree debris.

### High: Unicode-confusable state names bypass lookalike discovery

`stateLookalike()` applies NFKC, lowercases, then deletes non-ASCII characters.
NFKC is not a Unicode confusable skeleton. Replacing the Latin `a` in `stage`
with Cyrillic small `а` created the untracked path
`docs/alternate/TASK-0001-stage-а-state.json`; validation exited zero.

Required correction: fail closed on non-ASCII/confusable governance-like
TASK-0001 state-record names, or use an exact allowed-path inventory plus a
well-defined conservative recognizer. Do not rely on an incomplete hand-written
confusable mapping. Add Cyrillic, Greek, full-width, combining-mark,
bidirectional-control, case, punctuation, and separator fixtures.

### High: an external hardlink is accepted at the canonical path

R9 explicitly requires hardlinks to fail closed, but the implementation checks
only `lstat().isFile()`, realpath containment, index bytes, and worktree bytes.
It does not require a single-link regular file. Replacing the canonical path
with an NTFS hardlink to an external temporary file preserved identical bytes;
PowerShell reported `LinkType=HardLink` and closure formatting exited zero.
External mutation can therefore alter the canonical filesystem object through
an alias after the check.

Required correction: require a supported regular-file topology with link count
one and reject hardlinks explicitly. Add same-volume external and in-repository
hardlink fixtures, along with inherited symlink, junction, gitlink, directory,
mode, containment, index-stage, flag, and byte-substitution fixtures.

## Adversarial and regression results

- Exact whole-row and canonical JSON mutations covered by inherited tests fail
  closed, as do their candidate/parent/interposition, whole-diff, status,
  schema, evidence, authorization, and premature-activation attacks.
- R9's nested ordinary duplicate, split index/worktree blob, dirty worktree, and
  intent-to-add fixtures pass their negative assertions.
- Independent excluded-directory, Unicode-confusable, and hardlink attacks all
  returned success from the validator. Each contradicts an explicit acceptance
  criterion and is independently disqualifying.
- No structured attestation was created.

## Independent commands and results

| Command                                                                                           | Result                                                                   |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npm ci --ignore-scripts`                                                                         | Pass; 106 packages added, 107 audited, zero vulnerabilities.             |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs` | Pass; 6/6 in 89.3 seconds.                                               |
| Excluded `node_modules` duplicate reproduction                                                    | **Fail**; invalid duplicate accepted with exit zero.                     |
| Cyrillic-confusable untracked duplicate reproduction                                              | **Fail**; invalid duplicate accepted with exit zero.                     |
| External NTFS hardlink reproduction                                                               | **Fail**; canonical hardlink accepted with exit zero.                    |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                   | Pass; 277 Markdown, 65 JSON contracts, 5 YAML contracts.                 |
| Format, repository validation, queue, and traceability gates                                      | Pass.                                                                    |
| `npm test`                                                                                        | Pass; 942 total, 941 passed, 0 failed, 1 documented skip, 280.7 seconds. |
| `npm audit --audit-level=high`                                                                    | Pass; zero vulnerabilities.                                              |
| `git fsck --full --strict`                                                                        | Pass; only dangling local test objects, no integrity failure.            |
| `git diff --check 2f6e362..d404288`                                                               | Pass.                                                                    |

## Final verdict

**Verdict: REJECTED** for exact candidate
`d404288a10307c90f85fe30717f044bf93c64d0a`.

No structured attestation was created. Preserve this narrative rejection and
correct forward with a truthful Git-authority contract, targeted full-tree
governance-name discovery, conservative Unicode fail-closed handling, and
single-link canonical topology before any attestation, activation, hosted
integration, merge, or work on `TASK-0002`.
