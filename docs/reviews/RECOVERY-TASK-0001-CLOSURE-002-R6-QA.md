# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R6

## Disposition

**REJECTED** for exact candidate
`ee4e1966a7fd081c86b3177f0fb53e9b2013bec6`.

Do not create the structured acceptance attestation, activate the closure record,
push or merge this candidate, or advance `TASK-0002`. Preserve this review and
all R1-R5 rejection history, then correct forward and obtain fresh independent
QA/Security review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated worktree: `C:\source\upfs-task-0001-closure-r6-qa`.
- Branch: `review/task-0001-closure-r6`, created directly at exact candidate
  `ee4e1966a7fd081c86b3177f0fb53e9b2013bec6`.
- Declared corrective base and exact merge base:
  `0c67e24591f903e496d87ed3ec3e9560a788f690`, the immutable R5 rejection.
- Reviewed implementation:
  `8b9fbd6825e7bba4c5e755270e98fb17a9d37ec6`; reviewed handoff candidate:
  `ee4e1966a7fd081c86b3177f0fb53e9b2013bec6`.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree and handoff guidance; TASK-0001 queue inputs; engineering
  constitution; delivery and testing specifications; R4 and R5 rejection
  reviews; R5 structural validator, tests, task, and handoff; R6 task and
  handoff; queue, matrix, governance, exact topology, and complete net diff.
- Threat model: an author may preserve required substrings while adding a
  contradictory active round, attestation state, or predecessor-review
  instruction. The inherited structural review/attestation threat model also
  covers candidate-class substitution, wrong/direct/interposed/merge parents,
  extra whole-commit paths and statuses, rename/copy/NUL/path tricks,
  symlink/gitlink entries, pre-seeding, malformed or duplicate JSON, unrelated
  or rejected evidence, authorization mismatch, and premature activation.
  Runtime tenant, financial, API, migration, and durable-state boundaries are
  unchanged by this governance-only candidate.

## Blocking finding

### High: matrix authorization is fail-open under additive contradictions

R6 acceptance requires the regression gate to reject a predecessor round, a
wrong active task, an attestation-state contradiction, and premature
acceptance. `validateClosureFormatting()` instead establishes current state by
checking that several prose substrings occur somewhere in the TASK-0001 row.
It does not parse single-valued state or reject conflicting statements.

Three independent fixtures retained every required substring and added one
contradiction. All three returned an empty error array:

```text
contradict_attestation: []
wrong_active: []
predecessor_wording: []
```

The accepted mutations were:

1. Retain `No attestation exists, TASK-0001 remains blocked` and append
   `nevertheless structured attestation has been issued`.
2. Retain every R6 phrase and append `R7 is the active corrective task`.
3. Retain the exact R6 review instruction and append
   `fresh independent QA reviews R5`. The rejection regex recognizes only the
   narrow phrase shape `Fresh QA ... reviews r[1-5]`.

This is authorization-relevant documentation drift: a future row can direct
execution to mutually exclusive states or to a rejected predecessor while the
gate remains green. Authored replacement-only mutations do not cover additive,
ambiguous, or alternate-wording attacks.

Required correction: stop deriving authorization state from unconstrained
prose substring presence. Parse exact dedicated fields or a canonical
machine-readable companion record with one active Stage A task/round, one
attestation state, one disposition, and one next-action target. Reject duplicate
state markers, multiple active rounds, any contradiction, unknown round, and
ambiguous narrative. Add additive contradiction, multiple-active-round,
predecessor-review, case/punctuation/spacing, duplicate-marker, and ambiguous
narrative fixtures. Narrative may explain state but must not authorize it.

## Adversarial and regression results

- Exact topology is clean: the R6 handoff is a single-parent commit over the R6
  implementation; the implementation is a single-parent corrective commit over
  immutable R5 rejection; declared base and merge base are exact.
- The net candidate diff contains exactly five R6-authorized files. The
  worktree was clean before review. No active closure record or attestation is
  present. `TASK-0001`, `TASK-0002` through `TASK-0110`, and frozen later tasks
  remain blocked.
- Current matrix prose truthfully says R5 was rejected, R6 is active through its
  handoff without a self-referential SHA, no attestation exists, TASK-0001 is
  blocked, and separate activation follows. The blocker is that the claimed
  regression control does not preserve that truth under adversarial changes.
- Inherited R5 fixtures reject remediation/Stage-A candidate substitution;
  wrong, direct, interposed ordinary, and interposed merge parent topologies;
  extra whole-commit paths and non-add statuses; rename/copy/NUL tricks;
  pre-seeded, modified, deleted, symlink, and gitlink attestations; malformed,
  noncanonical, duplicated, extra-key, wrong-task/candidate/role/verdict JSON;
  unrelated/rejected evidence; authorization and hosted-evidence mismatch; and
  premature queue/matrix activation. Those controls remain intact but do not
  cure R6's additive matrix-state bypass.

## Independent commands and results

| Command                                                                                           | Result                                                                   |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npm ci --ignore-scripts`                                                                         | Pass; 106 packages added, 107 audited, zero vulnerabilities.             |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs` | Pass; 6/6 in 93.8 seconds.                                               |
| Independent additive matrix contradiction fixtures                                                | **Fail**; all three invalid rows returned `errors=[]`.                   |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                   | Pass; 271 Markdown, 65 JSON contracts, 5 YAML contracts.                 |
| `npm run format:check`                                                                            | Pass; pinned Prettier and closure-format gate.                           |
| `npm run validate`                                                                                | Pass.                                                                    |
| `npm run queue:check`                                                                             | Pass.                                                                    |
| `npm run traceability:check`                                                                      | Pass.                                                                    |
| `npm test`                                                                                        | Pass; 942 total, 941 passed, 0 failed, 1 documented skip, 307.7 seconds. |
| `npm audit --audit-level=high`                                                                    | Pass; zero vulnerabilities.                                              |
| `git fsck --full --strict`                                                                        | Pass; only four existing dangling local objects, no integrity failure.   |
| `git diff --check 0c67e24..ee4e196`                                                               | Pass.                                                                    |
| Exact base, ancestry, status, freeze, attestation absence, authorization, and net-diff inspection | Pass except for the fail-open matrix control above.                      |

## Final verdict

**Verdict: REJECTED** for exact candidate
`ee4e1966a7fd081c86b3177f0fb53e9b2013bec6`.

No structured attestation was created. Preserve this narrative rejection and
correct forward with exact parsed, single-valued matrix state and adversarial
contradiction coverage before any attestation, activation, hosted integration,
merge, or work on `TASK-0002`.
