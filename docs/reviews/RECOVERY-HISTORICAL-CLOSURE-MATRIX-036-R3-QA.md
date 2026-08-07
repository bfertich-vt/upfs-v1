# Independent QA/Security Review: RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R3

## Result

**REJECTED** — independent Codex QA/Security review of exact candidate head `f49b4568112e3c4559b4aca14d58a5103026866f`. The reconstructed matrix content and repository gates pass, but the provenance-complete handoff names a nonexistent implementation commit. This is a release-blocking provenance failure. QA did not edit implementation, task input, handoff, queue, matrix, specification, product, workflow, or historical evidence files.

## Reviewer provenance and governing inputs

- Task: `RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R3`.
- Reviewer identity: independent Codex QA/Security, not a human reviewer.
- Role: Independent QA/Security (`agents/QA_SECURITY.md`).
- Reviewer thread: `/root/qa_historical_closure_matrix_r3`.
- Worktree: `C:\source\upfs-qa-historical-closure-matrix-r3`.
- Branch: `codex/qa-historical-closure-matrix-r3`.
- Candidate head: `f49b4568112e3c4559b4aca14d58a5103026866f`.
- Protected base: `a7514bfb494805dd591277cfab980f33de20830a`.
- Claimed implementation identity in the assignment and R3 handoff: `2e3707172c7798513254838616039709b5fbca20` (does not resolve as a Git object).
- Actual reconstruction implementation commit: `2e370717294a45a2e4109aaf4cfc47694f72e77c`.
- Accepted sources: implementation `e58c3d0c3d6440a19bb87ec422a53f9150f301e9`; handoff `04774a2b0d915e8955d785e8c438f285887f521e`; independent QA `8bf9b6018286825a730d04bdeb07704d11e1e5f2`.
- Preserved rejected sources: initial candidate `a2db1dc363ab0e3ed57dbdb947302ae2b1b58642`; corrected rejection record `84e0b0eb4d4d3a98270b84db860d7cefa48b3965`.

All required inputs were read completely before review. SHA-256 digests:

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`.
- `agents/QA_SECURITY.md`: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`.
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- `docs/MASTER_PLAN.md`: `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`.
- `tasks/queue.yaml`: `05ed87243f7baa6060c6d650023ce9130741f529949d338cfe2c3d30806347c3`.
- `specs/09_cicd/delivery_pipeline.md`: `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`.
- `specs/10_security/security_baseline.md`: `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`.
- `specs/12_testing/test_strategy.md`: `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- `tasks/recovery/RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R3.yaml`: `11d24310eb0afceac8ae0a41c82e34413b2a9d9d7214739c9e697e9ebff8a5fc`.
- `docs/handoffs/RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R3.md`: `f47b0a8ef5ee98ee3ed318e7dcc80bf2621c6e65dd645342505adf983fa7bdd9`.
- `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md`: `a26b60d7a44115b684298172831ed582fa9327c5ac1db4f1c01cad9565b681bd`.
- `tasks/recovery/RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R2.yaml`: `df28607d4426cbea58f0a28ae54a62f6c0c160b116f20fb7382cb5b2edbf643e`.
- `docs/handoffs/RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R2.md`: `3f5f628321b0f437e5660efc74849c11603a2587e78dba546de2f3fbbcb65066`.
- `docs/reviews/RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R2-QA.md`: `8554abcf43d78282ca9d2bb3b7477fdf3521dbf919f8e97ddab5efaf54689a57`.

## Acceptance mapping and source inspection

- Structural matrix acceptance: PASS. Exact independent parser found 110 rows, 110 unique contiguous IDs from `TASK-0001` through `TASK-0110`, exactly 18 nonempty fields per row, and zero post-0110 rows.
- Accepted content reconstruction: PASS with one disclosed normalization. Matrix, R2 handoff, and R2 QA blobs are byte-identical to their accepted source commits. The R2 task differs from its accepted source only by removal of one trailing blank line; its semantic content is unchanged and the R3 handoff discloses the normalization.
- Conservative classification: PASS. All rows retain unknown/absent evidence and blocked disposition. The matrix does not infer acceptance, production capability, runtime proof, or tenant isolation from a file, handoff, or local test.
- Rejected evidence preservation: PASS. Both rejected commits resolve and their rejected `036` artifacts are absent from the replacement diff; history was not rewritten.
- Scope: PASS. The base-to-candidate diff adds only the six authorized matrix/R2/R3 governance artifacts. It changes no queue, product, specification, validator, workflow, provenance bundle, ADR, contract, or TASK-0112–TASK-0123 file.
- Provenance-complete handoff: **FAIL**. The R3 handoff's `Commit` field names `2e3707172c7798513254838616039709b5fbca20`, while Git proves the actual commit is `2e370717294a45a2e4109aaf4cfc47694f72e77c`. The claimed object does not exist. The candidate therefore cannot be accepted or promoted even though its content gates pass.

## Commands, durations, and results

- Exact independent Node row parser — PASS; 110 rows, 110 unique IDs, first `TASK-0001`, last `TASK-0110`, 18 fields, 0 bad rows, 0 post-0110 rows; 72 ms.
- First `npm run format:check` — environmental setup failure; `prettier` was unavailable in the fresh QA worktree; 631 ms. No implementation defect was inferred.
- `npm ci --ignore-scripts` — PASS; 106 packages installed, 107 audited, one existing moderate advisory; 4,505 ms.
- Repeated `npm run format:check` — PASS; 1,349 ms.
- `npm run validate` — PASS; 4,370 ms.
- `npm run queue:check` — PASS; 4,319 ms.
- `npm run traceability:check` — PASS; 22,550 ms.
- `git diff --check a7514bfb494805dd591277cfab980f33de20830a..HEAD` — PASS; 33 ms.
- `npm test` — PASS; 932 total, 931 passed, 0 failed, 1 documented opt-in skip; Node-reported 253,061.4027 ms, wall duration 253,677 ms.
- Accepted-source blob identity checks — PASS for matrix, R2 handoff, and R2 QA; R2 task shows exactly one removed trailing blank line.
- Claimed-commit resolution check — FAIL as expected: `git cat-file -e 2e3707172c7798513254838616039709b5fbca20^{commit}` reports an invalid object; `git rev-parse 2e37071` resolves the actual object to `2e370717294a45a2e4109aaf4cfc47694f72e77c`.
- Targeted changed-file sensitive-material scan — PASS; 0 private-key, common credential-token, password, client-secret, or API-key assignment matches.

## Negative, security, tenant, and audit review

The exact parser independently enforces the positive structure. The repository suite passes its existing missing/duplicate/noncontiguous/post-0110/wrong-field/empty-field and applicable authorization-denial, cross-tenant, idempotency, replay, concurrency, audit, failure, rollback, leakage, contract-drift, accessibility, recovery, and immutable-provenance coverage. This governance-only reconstruction adds no runtime path and supplies no production tenant-isolation evidence. Its conservative rows truthfully leave runtime and security proof pending task-specific revalidation.

The changed files contain no detected secrets, credentials, customer data, private financial data, or provider material. No production access, provider traffic, or real tenant input was used. The remaining moderate package advisory and documented opt-in PostgreSQL skip are existing limitations, not evidence of acceptance or production readiness.

## Required corrective-forward action

Do not integrate this candidate. Preserve this rejection. In a separate author remediation commit, replace every false `2e3707172c7798513254838616039709b5fbca20` provenance reference with the exact existing commit `2e370717294a45a2e4109aaf4cfc47694f72e77c`, update any affected handoff/task digest evidence truthfully, and obtain a fresh independent QA/Security review of the new exact committed candidate. Do not amend, rewrite, delete, or bypass this rejected evidence.

