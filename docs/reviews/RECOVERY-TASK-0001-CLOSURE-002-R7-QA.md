# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R7

## Disposition

**REJECTED** for exact candidate
`0a3e99b7c2a7e5c82b025973c3c881b840515d86`.

Do not create the structured acceptance attestation, activate the closure record,
push or merge this candidate, or advance `TASK-0002`. Preserve this review and
all R1-R6 rejection history, then correct forward and obtain fresh independent
QA/Security review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated worktree: `C:\source\upfs-qa-task-0001-closure-r7`.
- Branch: `qa/task-0001-closure-r7`, created directly at exact candidate
  `0a3e99b7c2a7e5c82b025973c3c881b840515d86`.
- Declared corrective base and exact merge base:
  `f68cd86aee783775486dece9247a10d1b1acd03a`, the immutable R6 rejection.
- Reviewed implementation:
  `d5d50f1443831dc3beb00b4db89f8e05e17ae646`; reviewed handoff candidate:
  `0a3e99b7c2a7e5c82b025973c3c881b840515d86`.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree and handoff guidance; TASK-0001 queue inputs; engineering
  constitution; delivery and testing specifications; R5 structural task,
  handoff, rejection, validator, and tests; R6 rejection; R7 task and handoff;
  queue, matrix, governance, exact topology, and complete net diff.
- Threat model: an author may preserve the canonical marker while adding state
  claims in unconstrained wording, create multiple similarly named canonical
  state records, replace the record with a symlink, substitute a candidate or
  parent, interpose an ordinary or merge commit, smuggle extra paths or Git
  entry types, exploit rename/copy/NUL/path parsing, pre-seed or duplicate
  evidence, bind malformed or unrelated evidence, or activate queue/matrix
  state prematurely. Runtime tenant, financial, API, migration, and durable-state
  boundaries are unchanged by this governance-only candidate.

## Blocking finding

### High: the claimed single-valued Stage A state remains fail-open

R7 acceptance requires state-claim prose and duplicate or alternate records to
fail closed. `validateClosureFormatting()` instead removes one exact marker and
applies a finite natural-language blacklist to the remaining TASK-0001 row. It
does not bind the complete row to one exact canonical value or generated
representation. It also reads the state path by following it and does not
enforce repository-wide uniqueness or a regular Git blob.

Independent fixtures retained the canonical marker and appended each of these
contradictory instructions or claims:

```text
This task is complete.
The task is now unblocked.
A verdict artifact has been published.
Proceed immediately to activation.
Independent QA should inspect the prior round instead.
```

Every mutation returned `errors=[]`. A copied canonical record at
`docs/governance/task-closures/TASK-0001-stage-a-state-copy.json` also returned
`errors=[]`. Replacing the canonical state path with a filesystem symlink to
canonical bytes outside that directory returned `errors=[]` as well. These are
not cosmetic misses: they permit mutually exclusive status, attestation,
review-target, and next-action claims while the control reports success.

Required correction: bind the entire TASK-0001 matrix row to exact canonical
bytes or generate it deterministically from the structured record; do not add
another prose blacklist. Enforce repository-wide exactly one permitted
TASK-0001 Stage A state record/path, reject alternate or similarly named
records, and require the canonical path to be a contained regular Git blob
rather than a symlink, gitlink, or untracked substitute. Add each reproduction
above plus case, spacing, punctuation, synonym, duplicate-record, alternate-path,
symlink, and Git-entry-mode fixtures.

## Adversarial and regression results

- Exact topology is clean: the R7 handoff is a single-parent commit over the R7
  implementation; the implementation is a single-parent corrective commit over
  immutable R6 rejection; declared base and merge base are exact.
- The net candidate diff contains exactly the six R7-authorized paths. The
  isolated worktree was clean before review. Current Git stores the canonical
  state as mode `100644`, and TASK-0001 remains blocked with no attestation or
  active closure record. TASK-0002 and frozen later work did not advance.
- Canonical JSON parsing rejects missing, extra, duplicate, reordered,
  malformed, wrong-value, noncanonical, and BOM/encoding variants at the exact
  path. The blocker is that uniqueness, path type, and all contradictory prose
  are not closed-world controlled.
- Inherited R5 tests pass for remediation/Stage-A substitution; wrong, direct,
  interposed ordinary and merge parents; whole-diff status/rename/copy/NUL/path
  tricks; pre-seeded, modified, deleted, symlink, and gitlink attestations;
  malformed or duplicate attestation JSON; unrelated/rejected evidence;
  authorization mismatch; and premature activation. Those attestation controls
  do not cure the new state-record and matrix-row bypass.

## Independent commands and results

| Command                                                                                           | Result                                                                   |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npm ci --ignore-scripts`                                                                         | Pass; 106 packages added, 107 audited, zero vulnerabilities.             |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs` | Pass; 6/6 in 87.5 seconds.                                               |
| Independent contradictory-prose, duplicate-record, and state-symlink fixtures                     | **Fail**; every invalid fixture returned `errors=[]`.                    |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                   | Pass; 273 Markdown, 65 JSON contracts, 5 YAML contracts.                 |
| `npm run format:check`                                                                            | Pass; pinned Prettier and closure-format gate.                           |
| `npm run validate`                                                                                | Pass.                                                                    |
| `npm run queue:check`                                                                             | Pass.                                                                    |
| `npm run traceability:check`                                                                      | Pass.                                                                    |
| `npm test`                                                                                        | Pass; 942 total, 941 passed, 0 failed, 1 documented skip, 301.1 seconds. |
| `npm audit --audit-level=high`                                                                    | Pass; zero vulnerabilities.                                              |
| `git fsck --full --strict`                                                                        | Pass; only existing dangling local objects, no integrity failure.        |
| `git diff --check f68cd86..0a3e99b`                                                               | Pass.                                                                    |
| Exact base, ancestry, status, freeze, attestation absence, and net-diff inspection                | Pass except for the fail-open Stage A state controls above.              |

## Final verdict

**Verdict: REJECTED** for exact candidate
`0a3e99b7c2a7e5c82b025973c3c881b840515d86`.

No structured attestation was created. Preserve this narrative rejection and
correct forward with exact whole-row binding plus closed-world regular-blob
state-record uniqueness before any attestation, activation, hosted integration,
merge, or work on `TASK-0002`.
