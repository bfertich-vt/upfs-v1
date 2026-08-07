# Independent QA/Security Review: RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R4

## Result

**REJECTED** — independent Codex QA/Security review of exact candidate `4fc689c7bec4935ff56ea8f5b0f6b3b1d4ae02f4`. The SHA correction, object identity, preserved rejection, matrix structure, and repository test suite pass, but the candidate fails the required diff gate because `tasks/recovery/RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R4.yaml` adds a blank line at EOF. QA did not edit implementation.

## Reviewer provenance and governing inputs

- Task: `RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R4`.
- Reviewer identity: independent Codex QA/Security, not a human reviewer.
- Role: Independent QA/Security (`agents/QA_SECURITY.md`).
- Reviewer thread: `/root/qa_historical_closure_matrix_r4`.
- Worktree: `C:\source\upfs-qa-historical-closure-matrix-r4`.
- Branch: `codex/qa-historical-closure-matrix-r4`.
- Exact candidate: `4fc689c7bec4935ff56ea8f5b0f6b3b1d4ae02f4`.
- R4 correction: `acd0d818afaa676cc418d9ae00a0b06c4616a6c8`.
- Actual matrix implementation: `2e370717294a45a2e4109aaf4cfc47694f72e77c`.
- Preserved R3 rejection: `35e6aa33ed7ac54e62e9f9840dab706bbc866ed6` (review blob unchanged at `1b182a26b870bc638679f26b528fce44cf9438bb`).
- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`.
- `agents/QA_SECURITY.md`: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`.
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- `docs/MASTER_PLAN.md`: `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`.
- `specs/09_cicd/delivery_pipeline.md`: `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`.
- `specs/10_security/security_baseline.md`: `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`.
- `specs/12_testing/test_strategy.md`: `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- R4 task: `ae617cda7dc99edaa3fd574fead7a15fead9585fc13323a31fa889d62ec513d8`.
- R4 handoff: `7cafa2e3bed5bb30fc60fd858311f526ca2a53d7f605b5a9763934c529597f5e`.
- R3 rejection review: `376d7341a639d111e4f37bebeeb75bf45d9ee361cc8e198f997057138f53e9b7`.
- Matrix: `a26b60d7a44115b684298172831ed582fa9327c5ac1db4f1c01cad9565b681bd`.
- Queue: `05ed87243f7baa6060c6d650023ce9130741f529949d338cfe2c3d30806347c3`.

All named governing, R2, R3, R4, matrix, task, handoff, and accepted/rejected review inputs were read before testing.

## Acceptance evidence

- Targeted SHA check: PASS; false SHA occurs zero times and actual SHA occurs exactly four times in the corrected R3 handoff.
- `git cat-file -e 2e370717294a45a2e4109aaf4cfc47694f72e77c^{commit}`: PASS; the referenced object is a commit.
- R3 rejection preservation: PASS; its Git blob is identical at base and candidate.
- R4 scope: PASS; relative to `35e6aa33`, only the corrected R3 handoff, R4 task, and R4 handoff changed.
- Matrix parser: PASS; exactly 110 unique contiguous rows `TASK-0001` through `TASK-0110`, exactly 18 nonempty fields per row, no post-0110 row.
- Matrix content remained unchanged by R4. Queue, product, specifications, contracts, validators, workflows, provenance fixtures, ADR-007, and post-0111 files remained unchanged by R4.
- Targeted changed-file sensitive-data scan: PASS; no secret, credential, customer-data, private-financial-data, or private-key pattern found.

## Commands, durations, and results

- Initial dependency-free diagnostic: expected setup failure because this fresh QA worktree had no `node_modules`; it is not treated as candidate evidence.
- `npm ci --ignore-scripts`: PASS; 106 packages installed, 107 audited, one existing moderate advisory; 4,626 ms.
- Exact SHA/object/scope/rejection/parser/sensitive-pattern checks: all substantive checks PASS; the combined command correctly ended nonzero on the diff defect.
- `npm run format:check`: PASS; 1,396 ms.
- `npm run validate`: PASS; 4,311 ms.
- `npm run queue:check`: PASS; 4,285 ms.
- `npm run traceability:check`: PASS; 21,795 ms.
- `npm test`: PASS; 932 tests, 931 passed, 0 failed, 1 documented opt-in skip; test runner 255,717.5403 ms, command 256,160 ms.
- `git fsck --strict --no-reflogs`: PASS, exit 0; preserved dangling audit objects were reported but no corruption.
- `git diff --check 35e6aa33ed7ac54e62e9f9840dab706bbc866ed6..HEAD`: **FAIL**, exit 2: `tasks/recovery/RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R4.yaml:49: new blank line at EOF.`

## Negative, security, and tenant assessment

The repository suite exercises fail-closed provenance, malformed traceability, authorization denial, cross-tenant isolation, idempotency/replay, concurrency, audit, failure, rollback, leakage, contract drift, accessibility, and recovery controls. R4 is documentation-only and adds no runtime or tenant-controlled path. It cannot establish production capability or tenant-isolation proof; every matrix row remains conservatively blocked with unknown/absent evidence pending task-specific revalidation. The one opt-in PostgreSQL test and existing moderate dependency advisory remain explicit limitations.

## Required corrective-forward action and rollback

Remove only the extra EOF blank line from `tasks/recovery/RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R4.yaml` in a separate author corrective-forward commit, update the handoff truthfully, rerun `git diff --check` and required gates, then obtain a fresh independent review of the new exact candidate. Preserve this rejection and all earlier evidence. Rollback remains a reviewed revert of only R4 commits; do not amend, rewrite history, or weaken validation.
