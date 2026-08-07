# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R5

## Disposition

**REJECTED** for exact candidate
`80af55312b3341e0bcb6db221ad2610d810cc5de`.

Do not create the structured acceptance attestation, activate the closure record,
push or merge this candidate, or advance `TASK-0002`. Preserve this review and
all R1-R4 rejection history, then correct forward and obtain fresh independent
QA/Security review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated worktree: `C:\source\upfs-qa-task-0001-closure-r5`.
- Branch: `qa/task-0001-closure-r5`, created directly at exact candidate
  `80af55312b3341e0bcb6db221ad2610d810cc5de`.
- Declared corrective base and exact merge base:
  `437378580db46f5fb982f9a0aa85bf65a71b141c`, the immutable R4 rejection.
- Reviewed implementation:
  `43aed7690df53887d255d1448a463dba2754f510`; reviewed handoff candidate:
  `80af55312b3341e0bcb6db221ad2610d810cc5de`.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree and handoff guidance; engineering constitution; delivery, security,
  and testing specifications; R4 task, handoff, and rejection; R5 task and
  handoff; closure validator, tests, governance, queue, matrix, and exact Git
  topology and net diff.
- Threat model: an author may substitute the old remediation candidate for the
  Stage A candidate, bind an incorrect parent, interpose an ordinary or merge
  commit, smuggle extra paths or Git entry types, exploit status/path parsing,
  pre-seed or duplicate an attestation, substitute rejected or unrelated
  evidence, or activate queue/matrix state before Stage A completes. Runtime
  tenant, financial, API, migration, and durable-state boundaries are unchanged
  by this governance-only candidate.

## Blocking finding

### Medium: the authoritative closure matrix still directs execution to rejected R4

`docs/HISTORICAL_TASK_CLOSURE_MATRIX.md` is the authoritative ledger for the
historical closure program, but its `TASK-0001` row still says:

- fresh QA must review R4 and introduce the attestation;
- the allowed correction scope is R4; and
- the next action is fresh QA review of R4.

R4 candidate `77dd5b9305889956538eb2ca46ea281c39225e89` was already independently
rejected by commit `437378580db46f5fb982f9a0aa85bf65a71b141c`. R5 is the active corrective
candidate and changes the evidence model materially by separating historical
remediation QA from `stage_a`. If this R5 review created an attestation, the
matrix would continue to prescribe review of a rejected candidate and would not
identify the R5 evidence being issued. That is current-state and next-action
drift in the very ledger meant to control authorization of closure.

The engineering constitution states that documentation drift blocks release.
The R5 task already authorizes the matrix path, so the omission is correctable
without expanding scope. Required correction: update only the `TASK-0001` row
to preserve the R4 rejection, identify exact R5 Stage A review/attestation as the
pending sequence, describe the R5 authorized scope and separated `stage_a`
model, and retain `blocked` status until a fresh QA attestation and separately
reviewed activation exist. Add a regression assertion that the matrix's active
round and next action cannot remain pinned to a rejected predecessor.

## Adversarial and regression results

- Exact candidate topology is clean: the handoff is a single-parent commit over
  the implementation; the implementation is a single-parent corrective commit
  over the immutable R4 rejection; the exact merge base equals the declared
  base; and the isolated worktree was clean before review.
- The net candidate diff stays within the R5 authorized write set. `TASK-0001`
  remains blocked; the active closure record is absent; the rejected record is
  preserved; and `TASK-0002` and later frozen work did not advance.
- Cross-class substitution between the historical remediation candidate and
  Stage A fails. The Stage A narrative review must be the direct sole-parent
  child of its exact candidate; the attestation parent must equal that review
  commit; ordinary and merge interposition fail.
- The complete NUL-delimited rename/copy-aware attestation diff accepts only one
  canonical `A` record. Extra paths, `M`, `D`, `R`, `C`, type change, symlink,
  gitlink, pre-seeding, modification, deletion, and empty/multiple records fail.
- Canonical JSON rejects BOM, invalid UTF-8, prose, duplicates, missing/extra
  keys, wrong version/task/candidate/verdict/role, and noncanonical serialization.
- Immutable digest/blob, rejected-history, unrelated-blob, hosted evidence,
  authorized task state, dependency, queue, and matrix activation substitutions
  continue to fail closed in the authored integration fixture.

## Independent commands and results

| Command                                                                                           | Result                                                                          |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `npm ci --ignore-scripts`                                                                         | Pass; 106 packages added, 107 audited, zero vulnerabilities.                    |
| `node --test scripts/historical-closure-validator.test.mjs scripts/closure-format-check.test.mjs` | Pass; 5/5 in 87.9 seconds.                                                      |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                   | Pass; 269 Markdown, 65 JSON contracts, 5 YAML contracts.                        |
| `npm run format:check`                                                                            | Pass; pinned Prettier and structural closure-format gate.                       |
| `npm run validate`                                                                                | Pass.                                                                           |
| `npm run queue:check`                                                                             | Pass.                                                                           |
| `npm run traceability:check`                                                                      | Pass.                                                                           |
| `npm test`                                                                                        | Pass; 941 total, 940 passed, 0 failed, 1 documented opt-in skip, 293.9 seconds. |
| `npm audit --audit-level=high`                                                                    | Pass; zero vulnerabilities.                                                     |
| `git fsck --full --strict`                                                                        | Pass; only four existing dangling local objects, no integrity failure.          |
| `git diff --check 4373785..80af553`                                                               | Pass.                                                                           |
| Exact base, ancestry, status, freeze, rejected-record, authorization, and net-diff inspection     | Pass except for the stale authoritative matrix instructions reported above.     |

## Final verdict

**Verdict: REJECTED** for exact candidate
`80af55312b3341e0bcb6db221ad2610d810cc5de`.

No structured attestation was created. Preserve this narrative rejection and
correct forward by making the authoritative matrix accurately name the R5
Stage A sequence before any attestation, activation, hosted integration, merge,
or work on `TASK-0002`.
