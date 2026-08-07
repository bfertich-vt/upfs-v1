# Handoff: RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R3

## Task and provenance

- Task ID: `RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R3`.
- Scope: reconstruct only the independently accepted corrected 110-row historical closure matrix and its accepted R2 task, handoff, and QA evidence on the current protected base.
- Agent role: Schema/Search/AI.
- Role file: `agents/SCHEMA_SEARCH_AI.md`.
- Role-file SHA-256: `8b05d11c936e7d0eac9ea63cf5b34cc594b620205292054bfcd6e01046050d9d`.
- Agent thread ID: `/root/schema_historical_closure_matrix_r3` (the runtime has no native UPFS role field; the initial assignment bound this thread to the documented role and required digest proof before edits).
- Worktree: `C:\source\upfs-schema-historical-closure-matrix-r3`.
- Branch: `codex/recovery-historical-closure-matrix-r3`.
- Base commit: `a7514bfb494805dd591277cfab980f33de20830a`.
- Commit: candidate `2e3707172c7798513254838616039709b5fbca20`.
- Reconstruction commits: matrix/R2 task `589de0a`; R2 handoff `7e3b19d`; R2 QA review `e4e2a62`; R3 task `4853ab078211cc6c62352a2dece8557b885d3079`; evidence-neutral EOF normalization `2e3707172c7798513254838616039709b5fbca20`.
- Independent reviewer and result: pending. A distinct QA/Security agent must review exact candidate `2e3707172c7798513254838616039709b5fbca20` from an isolated worktree without editing implementation.

## Governing inputs read before editing

All files were read completely. Digests are SHA-256:

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`.
- `agents/SCHEMA_SEARCH_AI.md`: `8b05d11c936e7d0eac9ea63cf5b34cc594b620205292054bfcd6e01046050d9d`.
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`.
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- `docs/MASTER_PLAN.md`: `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`.
- `tasks/queue.yaml`: `05ed87243f7baa6060c6d650023ce9130741f529949d338cfe2c3d30806347c3`.
- `specs/09_cicd/delivery_pipeline.md`: `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`.
- `specs/10_security/security_baseline.md`: `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`.
- `specs/12_testing/test_strategy.md`: `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- Current provenance recovery tasks, handoffs, and QA reviews under `RECOVERY-PROVENANCE-CODEOWNERS-037` and `-R4` were read from protected base `a7514bf` before reconstruction.

## Exact source-object derivation

- Accepted matrix and R2 task source: commit `e58c3d0c3d6440a19bb87ec422a53f9150f301e9`; matrix blob `d6793840a11e8dba3b55bd6fcf810caa3f6118f5`.
- Accepted R2 handoff source: commit `04774a2b0d915e8955d785e8c438f285887f521e`.
- Accepted independent Codex QA source: commit `8bf9b6018286825a730d04bdeb07704d11e1e5f2`.
- Preserved rejected initial candidate: `a2db1dc363ab0e3ed57dbdb947302ae2b1b58642`.
- Preserved corrected rejection record: `84e0b0eb4d4d3a98270b84db860d7cefa48b3965`.
- The rejected `036` task/handoff/review files are intentionally excluded from this narrow replacement. Their commits and branches remain preserved; no history was rewritten or evidence deleted.

## Files changed

- `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md`.
- `tasks/recovery/RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R2.yaml`.
- `docs/handoffs/RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R2.md`.
- `docs/reviews/RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R2-QA.md`.
- `tasks/recovery/RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R3.yaml`.
- `docs/handoffs/RECOVERY-HISTORICAL-CLOSURE-MATRIX-036-R3.md`.

No queue, historical task status, product, specification, contract, validator, workflow, provenance bundle, ADR-007, or TASK-0112 through TASK-0123 file changed.

## Acceptance criteria and results

- Exact row parser: PASS; 110 rows, 110 unique contiguous IDs `TASK-0001` through `TASK-0110`, exactly 18 nonempty fields per row, and zero post-0110 data rows.
- Classification: unchanged from accepted R2. All rows conservatively retain unknown/absent evidence and blocked disposition; no production, runtime, tenant-isolation, or completion inference was added.
- Contracts and runtime evidence: the matrix continues to identify them as task-specific work requiring proof. File or handoff existence is not treated as acceptance evidence.
- Rejected history: preserved by exact commit identity and excluded from the replacement diff.

## Tests and commands

- `npm ci --ignore-scripts`: PASS; 106 packages installed from the lockfile; one existing moderate advisory reported.
- Exact 18-field Node parser: PASS.
- `npm run format:check`: PASS.
- `npm run validate`: PASS.
- `npm run queue:check`: PASS.
- `npm run traceability:check`: PASS.
- `git diff --check a7514bfb494805dd591277cfab980f33de20830a..HEAD`: PASS.
- `npm test`: PASS; 932 total, 931 passed, 0 failed, 1 documented opt-in skip; duration 253025.5278 ms.

The first combined gate invocation is preserved as a setup/diagnostic failure: the fresh worktree lacked dependencies (`prettier` and `yaml` were unavailable), an ad-hoc regex incorrectly scanned explanatory prose instead of matrix data rows, and `git diff --check` found one inherited trailing blank line at the end of the accepted R2 YAML. Lockfile installation resolved the environment issue, the parser was correctly scoped to data rows, and commit `2e3707172c7798513254838616039709b5fbca20` removed only that EOF blank line. No matrix row, classification, disposition, assertion, validator, or gate was changed.

## Negative tests and security/tenant analysis

- Structural negatives reject missing, duplicate, noncontiguous, post-0110, wrong-field-count, and empty-field matrix rows.
- The repository suite retained authorization-denial, cross-tenant, idempotency, replay, concurrency, audit, failure, rollback, leakage, contract-drift, accessibility, recovery, and immutable-provenance coverage where applicable.
- This change is documentation/governance reconstruction only and introduces no runtime tenant-controlled path. It does not claim tenant isolation from local evidence; future task-specific revalidation remains mandatory.
- No secrets, credentials, customer data, private financial data, provider traffic, production system, or real tenant input was used or added.

## Documentation, limitations, and corrective-forward plan

The matrix is a conservative governance artifact, not product implementation or production evidence. Historical statuses remain unchanged. Protected hosted `repository-validation` and `repository-security` checks on the eventual exact PR head remain required, as does fresh independent Codex QA/Security review of the committed R3 candidate and handoff state.

If review rejects this reconstruction, preserve the rejection and correct forward in a separate branch followed by fresh review. Rollback is a normal reviewed revert of only the R3 reconstruction commits; never rewrite history, delete accepted or rejected evidence, weaken validation, or promote a historical task from this matrix alone.
