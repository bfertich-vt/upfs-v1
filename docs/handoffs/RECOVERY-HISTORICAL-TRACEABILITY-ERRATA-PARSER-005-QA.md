# RECOVERY-HISTORICAL-TRACEABILITY-ERRATA-PARSER-005 QA/Security review

- **Disposition: ACCEPT.** Candidate `b6b541b594c84c5c3f7ef5082d58d8656a7f9945` implements one fail-closed, immutable exception only. No privilege, evidence, tenant, or leakage bypass was found.
- **Scope and role:** Fresh independent QA/Security review of candidate `b6b541b594c84c5c3f7ef5082d58d8656a7f9945` and separate author handoff `647625293000c41e48e3dfe22b785b7bf24ea482`, in `C:\source\upfs-qa-historical-traceability-errata-parser-005` on `qa/recovery-historical-traceability-errata-parser-005`. This role limitation is prompt-enforced, not a repository/runtime authorization boundary. QA wrote only this report; no candidate, historical handoff, queue, matrix, product, workflow, or CI file was changed. No merge or push was performed.
- **Object and chain verification:** Both supplied IDs are Git `commit` objects; `647625293000c41e48e3dfe22b785b7bf24ea482^` is exactly `b6b541b594c84c5c3f7ef5082d58d8656a7f9945`. Candidate diff is exactly `scripts/ci-gate-validator.mjs` and `scripts/ci-gate-validator.test.mjs`; handoff diff adds only `docs/handoffs/RECOVERY-HISTORICAL-TRACEABILITY-ERRATA-PARSER-005.md`.
- **Role binding:** `agents/QA_SECURITY.md`, working-tree SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`; reviewer thread `/root/qa_historical_traceability_errata_parser_005`.

## Sources and independently derived digests

All SHA-256 values below were calculated from the named working-tree file unless marked Git-byte. Required inputs reviewed: `AGENTS.md` `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`; `agents/QA_SECURITY.md` `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`; `agents/WORKTREES.md` `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`; `agents/HANDOFF_TEMPLATE.md` `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`; `specs/00_constitution/engineering_constitution.md` `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`; `specs/09_cicd/delivery_pipeline.md` `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`; `specs/10_security/security_baseline.md` `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`; `specs/12_testing/test_strategy.md` `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`; `docs/governance/provenance-verification.md` `0410af4ac9a261f79cb154e05ce55e96fadd47beeeb22faeee692e801341ff69`.

Task and prior-QA evidence reviewed: `tasks/recovery/RECOVERY-HISTORICAL-TRACEABILITY-ERRATA-PARSER-005.yaml` `5a3755b7405b515b66526def2a87730392688136deac0bd690d6eba1ac486e32`; `tasks/recovery/RECOVERY-HISTORICAL-TRACEABILITY-ERRATA-PARSER-002.yaml` `0136683dd6d62b0502a8a33cf99a459e3daab82a5221eee04adc1db1fd716d6a`; `tasks/recovery/RECOVERY-HISTORICAL-TRACEABILITY-ERRATA-PARSER-004.yaml` `5a3775c8dd4b92d963b1d5631638d4afbc0a90aff14e9d93561518200bf470f4`; `docs/handoffs/RECOVERY-HISTORICAL-TRACEABILITY-ERRATA-PARSER-002-QA.md` `475c52d91dea83cf810854ee3d9dd80614b1750d288bca16d174ba64bdaaaf1e`; `docs/handoffs/RECOVERY-HISTORICAL-TRACEABILITY-ERRATA-PARSER-004-QA.md` `f0d41eac1f6d0b5d7f21eddbdd34cfd80e4f57d2ee069316e5f482d36af64008`; `docs/handoffs/RECOVERY-CI-GATES-001.md` `5304c673b6c5c03b457680e1d6924ec11e8848cd2c3d601d3bb29a28e81f1f99`; author handoff `docs/handoffs/RECOVERY-HISTORICAL-TRACEABILITY-ERRATA-PARSER-005.md` `0baed64f5f9bfde5031b45fb0dacc05a96a7a1ad5fd7f0d5a4cda3492e7078f0`.

Validator/test and gate sources reviewed: `scripts/ci-gate-validator.mjs` `c821227d047a1b995ffd5d6c7b540d1afe4081e1755e8be959467cc2161eb8b0`; `scripts/ci-gate-validator.test.mjs` `e4babde458475c2d8da3548bd54147ffe76a9b5dcc5b861b11261d90ec2e2338`; `.github/workflows/validate.yml` `7bbb4ec079c7f1f13483c4e0a7255a2f4b86f69c330764a4ad9fd9a3529c3703`; `.github/workflows/security.yml` `d182e8fecbd2c7c3c9d9692165634dc59888f590eb8640daaf16c9f3f98d420f`; `scripts/validate-repository.mjs` `bfd834d6620203973d55ddc31d87745ffe6cdd8e63b8437c349a92b6be6cdfff`; `scripts/queue-validator.mjs` `709945d3a2767035c3fe11d2b899b08928b1f0a6ca7f4a72f4f731c223e4c562`; `package.json` `e7bc74f92cf0397af746a21f51ca4bfcba3c600b2c5002c25498e1c5d49bcfe9`.

Using `git show <candidate>:<path>` and SHA-256 of the raw resulting bytes, I independently obtained the exact correction-table bindings at immutable candidate `90208c69504893c7a01cbcd51a8eb35caf21f5e3`:

| Path | Git blob | Derived SHA-256 |
| --- | --- | --- |
| `AGENTS.md` | `99e50e2f3590aac292a3608192346fe207765e1e` | `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1` |
| `agents/BACKEND.md` | `0ff4c7fec07f3e54fb361a399655f7b8981da712` | `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784` |
| `agents/WORKTREES.md` | `52dee22c57967e8efc1b7ec4b5b29387ede083c1` | `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1` |
| `agents/HANDOFF_TEMPLATE.md` | `ec9815efb847ad5ef1ac4813957b51ae44b14645` | `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4` |
| `specs/00_constitution/engineering_constitution.md` | `736626a809bd94d332d696a7b9122f7d69304316` | `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73` |
| `specs/09_cicd/delivery_pipeline.md` | `4fa6ad4c19b94bda2d5255d65240bdbf9eb246a8` | `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb` |
| `specs/10_security/security_baseline.md` | `337c9b7972f8dc34b1fe0d3af83f35df9516f9a6` | `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add` |
| `specs/12_testing/test_strategy.md` | `c3cc9bd303b720b6b6abb58b7d20edb08f9896bf` | `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172` |

## Acceptance and adversarial evidence

- The exception is conjunctively bound to task `RECOVERY-HISTORICAL-TRACEABILITY-ERRATA-PARSER-005`, path `docs/handoffs/RECOVERY-CI-GATES-001.md`, source `4ae7e95f0af88e21dde526be44443846a8d8d9a6`, candidate `90208c69504893c7a01cbcd51a8eb35caf21f5e3`, and the literal full original `Specifications and contracts read` record. The original immutable record is partially paired: the eight paired entries are followed by unpaired prose. Any one-byte change to that source record cannot retain the fixed source Git object; an erratum-body text mutation fails its exact literal-record/prefix binding.
- The focused immutable-fixture test accepted the valid eight-row correction only. It rejected task, path, source, candidate, correction-row path, duplicate row, omitted row, row candidate, blob, digest, oversize Reason, whitespace Correction provenance, freeform extension, and original-prefix/claim mutation. Shared v1 erratum tests additionally rejected missing, duplicate, whitespace-only, and over-bound Reason/Correction provenance fields, malformed table shape, wrong target/source/blob/digest, unknown rows, and claim-changing extension; the implementation uses that same mandatory schema and field parser for this exception.
- Existing focused cases continued to reject arbitrary partial records before row parsing, accept only the generic fully paired correction, and accept only the exact separate queue unpaired legacy record. The partial exception cannot reach those modes, and neither mode has broadened identity predicates.
- The table must have all and only the eight literal paths, bind each row to the original candidate, resolve its actual Git blob/raw bytes, and match its SHA-256. Original bytes must remain the append-only prefix; the terminal allowlist permits no freeform or claim-changing text.

## Commands and results

- `npm ci --ignore-scripts`: passed; one inherited moderate npm advisory reported.
- `node --test scripts/ci-gate-validator.test.mjs`: passed, 15/15. The exact immutable partial CI test passed.
- `npm test`: passed, 896 passed, 0 failed, 1 opt-in skipped.
- `npm run traceability:check`: command executed and reported only the inherited eight original digest mismatches in `RECOVERY-CI-GATES-001.md` plus the pre-existing unpaired `RECOVERY-QUEUE-VALIDATION-001.md` record. It reported no candidate-origin error; these historical records are intentionally preserved and are the bounded erratum subjects.
- `git diff --check b6b541b594c84c5c3f7ef5082d58d8656a7f9945^ b6b541b594c84c5c3f7ef5082d58d8656a7f9945` and the candidate-to-handoff diff: passed. Review working tree was clean before this QA report.

## Security and operational analysis

This is repository-local, read-only provenance validation: no API, authentication, tenant input, product state, credentials, financial data, or durable write path changes. Therefore no tenant boundary or authorization bypass is introduced; the full suite retains existing deny-by-default, cross-tenant, idempotency, audit, rollback, and sensitive-data-redaction tests. Failed validation returns errors without changing evidence. Replay over identical immutable Git objects is deterministic. Raw Git object/binary digest checks and append-only prefix enforcement prevent evidence replacement and historical claim erasure.

The remaining risk is deliberately narrow: a literal exceptional historical record is maintained in source. It is not a general parser for partial records, and any expansion requires a new corrective-forward candidate and independent QA. Rollback is a revert of this candidate only; retain source handoffs, prior rejections, author handoff, and this QA evidence. No external prerequisites are created by this metadata-only review.
