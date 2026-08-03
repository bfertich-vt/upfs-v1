# Independent Codex QA/Security Review — RECOVERY-HISTORICAL-BUNDLE-EXPANSION-034-R2

## Decision

**ACCEPT.** This is an independent Codex QA/Security review, not human review and not a native GitHub approval.

- Candidate commit reviewed: `e65734c9b17d3a66e5e534ccf5fd5bc5c33a3a38`
- Implementation: `e3ef877899553d8471dc5db95d7e9ecb577f779c`
- Author handoff: `e2b60ad1e01b6dda93a5adc039c7fe313e55524f`
- QA role: `agents/QA_SECURITY.md` (`6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`)
- Reviewer thread: `/root/qa_historical_bundle_expansion_034_r2`
- Reviewer worktree/branch: `C:\source\upfs-qa-historical-bundle-expansion-034-r2` / `qa/recovery/historical-bundle-expansion-034-r2`
- Candidate began at the committed author state; `git status --short` was clean before review. Author and reviewer are distinct worktrees/threads.

## Binding and artifact digests

Before review, I loaded and hashed AGENTS (`9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`), QA role (`6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`), constitution (`e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`), WORKTREES (`f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`), HANDOFF_TEMPLATE (`4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`), CI/CD (`f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`), security (`53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`), and testing (`349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`).

Reviewed task SHA-256: `d782f353a8ce854173b445025553fb1f7e132247d71e1d7a1e7c4e7086f62bff`.
Reviewed R2 handoff SHA-256: `7cc1505558b1551e3d3b2c1c6f602f4b0b5160498ddf833da743b64a791dc33a`.
Validator SHA-256: `6e17cf1c50862cef5db465106e4470f3c57f5a75d26593af52e4842ab41f72a2`.
Focused test SHA-256: `5150e8b974e39527a678d0cd7e605d382082f1683563ce5042ebaaaeb8e3be3b`.
Manifest SHA-256: `7b3f70520191e4753a14837c01f751adcaf67235952d7c5f6b7076a5961c8ba4`.
Bundle SHA-256: `761495352df8ceee8399fc10adbdfb04562a1796f003b630ce52a7d17bb3a6b9`.
The prior rejection record `c1fa48fb` was not present in candidate ancestry; I did not fabricate it. The author handoff truthfully records that limitation and the concrete prior fixture-staging finding.

## Bundle and provenance evidence

`git bundle verify scripts/fixtures/historical-provenance-v3.bundle` passed and reported a complete history with exactly 34 refs. The manifest contains 32 `handoff-candidate` objects plus the two exact erratum sources (`4ae7e95…`, `e7c81bf…`), each with immutable commit identity, object SHA-256, deriving handoff path and deriving-handoff SHA-256. The manifest explicitly explains why the earlier 30-candidate wording was insufficient: two later accepted strict-current candidates (`4057635…`, `dbfd2ff…`) are required in a fresh shallow clone.

The R2 diff changes only the temporary source-clone fixture setup. The bundle, manifest, validator semantics, workflow, and negative-test assertions are unchanged from v3. No wildcard, unavailable-source bypass, current-task exemption, or semantic weakening is present.

## Executed gates

- `npm ci --ignore-scripts`: PASS (pre-existing moderate `yaml` advisory; no high-severity failure).
- `node --test scripts/ci-gate-validator.test.mjs`: PASS, 20/20.
- `npm test`: PASS, 931 passed, 0 failed, 1 documented opt-in PostgreSQL skip (932 total).
- `npm run validate`: PASS.
- `npm run ci:gates`: PASS.
- format, lint, static/type, contracts, generated, documentation, policy, prompt, skill, accessibility, tenant-isolation, and traceability checks: PASS.
- `npm run provenance:check`: PASS, 4/4.
- `npm run queue:check`: PASS.
- `node --test scripts/postgres-service-ci-gate.test.mjs`: PASS, 26/26.
- `npm run migration:check`: correctly failed closed because Docker/disposable PostgreSQL is unavailable locally; this is an environment limitation, not a migration pass. Hosted CI must supply the service.

The focused regression and full suite cover fresh-clone hydration, pre-hydration failure, exact object restoration, omission, ref substitution, bundle-byte tampering, duplicate/mismatch, corrupted current TASK-0123/current-handoff records, copied historical markers, and exact historical-pair matching. All passed.

## Security and limitations

No secrets, credentials, customer data, provider data, private financial data, or production material were introduced. No runtime API, authorization, tenant isolation, idempotency, replay, audit, persistence, or provider behavior changed; those product security dimensions are therefore non-applicable to this fixture-only correction. Negative transport and provenance attacks fail closed. The only limitation is local migration execution without Docker/PostgreSQL; hosted execution remains required.

## Handoff

QA commit will contain this review only. Integration is acceptable only after this committed independent review and subsequent hosted-equivalent gates. Preserve all rejected historical evidence; do not merge PR #1 or treat this Codex review as human/native approval.
