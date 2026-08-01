# RECOVERY-NPM-VALIDATE-002 independent QA/Security review

- Task ID: `RECOVERY-NPM-VALIDATE-002-QA`, reviewing `RECOVERY-NPM-VALIDATE-002`.
- Decision: **PASS**. Candidate implementation `01f3808f892598c72e43b97f494f9dc2442fe5c6` and candidate handoff `805c07f42c3967c25b363274a10750c52a356336` may be considered for supervisor integration.
- Reviewer role: Independent QA/Security (`agents/QA_SECURITY.md`, SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`).
- Reviewer thread ID: `/root/qa_npm_validate_002`.
- QA worktree and branch: `C:\source\upfs-qa-npm-validate-002`; `qa/npm-validate-002`.
- Candidate worktree and branch: `C:\source\upfs-recovery-npm-validate-002`; `recovery/npm-validate-002`.
- Candidate base: `029d8ab`; clean candidate ancestry and scope verified.

## Role and input provenance

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`.
- `agents/QA_SECURITY.md`: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`.
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- `tasks/recovery/RECOVERY-NPM-VALIDATE-002.yaml`: `06da88310bf736d902cf9137ef2c75c7c8c0a74d9ef85f699fe5a434e0fca7ab`.
- `docs/handoffs/RECOVERY-NPM-VALIDATE-002.md`: `8b91de7a63768d6ca3b977e564856d2231ea0e250fe0544e284c0acd09101b06`.
- `package.json`: `e7bc74f92cf0397af746a21f51ca4bfcba3c600b2c5002c25498e1c5d49bcfe9`.
- `scripts/validate-repository.mjs`: `7fa258376f5c03997588e2e4d809753141811f5c1c7852420063da2829d90b29`.
- `specs/09_cicd/delivery_pipeline.md`: `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`.
- `specs/12_testing/test_strategy.md`: `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- Prior rejection reviewed: `177321873404ba6a40329c523060d22bea8fa205`, `docs/reviews/RECOVERY-NPM-VALIDATE-001-QA.md`, Git-byte SHA-256 `3772a029530c9c2fc4e3c983329acc582a5cbabd4f2fee225d39dbd060494847`.

## Acceptance evidence

The implementation commit changes only `package.json` and `tasks/recovery/RECOVERY-NPM-VALIDATE-002.yaml`; the distinct subsequent handoff commit changes only `docs/handoffs/RECOVERY-NPM-VALIDATE-002.md`. `git diff --check 029d8ab..805c07f` passed. The task input correctly authorizes those paths, prohibits script/workflow/product changes, and the committed handoff identifies the documented Backend role, role digest, worktree, branch, candidate commit, tests, negative cases, corrective-forward history, limitations, and pending independent review.

`package.json` defines `validate` as the literal command `node scripts/validate-repository.mjs`. It has no PowerShell, shell interpolation, shim, added argument, configuration mutation, external download, credential handling, tenant/customer-data access, authorization path, or queue/provenance/security-check bypass. The candidate does not modify the validator, queue, contracts, workflows, lockfile, or runtime product code.

An isolated full-repository fixture was exercised twice for each invocation. The valid fixture used a structurally valid ready task and only fixture-local corrections for pre-existing workflow-pin expectation inconsistencies; direct Node and plain `npm run validate` both exited `0`, wrote `passed` reports, and their reports were byte-for-byte equal after removing only `generated_at`. The malformed-YAML negative fixture caused both invocations to exit `1`, write `failed` reports, and produce the same normalized report. Plain npm prepends its own expected command banner; that outer npm text is not emitted by, or attributed to, the validator. This directly remedies the earlier review's incorrect byte-level stdout requirement without masking failures.

On the real candidate checkout, direct Node and plain npm both failed closed with exit `1` because of the existing 2,921 untrusted historical-queue violations. Neither was made green. Traceability also failed on pre-existing historical handoff-digest defects; this correction neither suppresses nor reclassifies them.

## Tests executed

- `npm ci --ignore-scripts`: passed; package manager reported one pre-existing moderate advisory.
- `npm test`: passed, 873 passed, 0 failed, 1 opt-in skipped, 874 total.
- Literal-script assertion: passed (`scripts.validate === "node scripts/validate-repository.mjs"`).
- Isolated valid-fixture direct Node versus plain npm: passed, exits `0/0`, reports `passed/passed`, normalized report equality `true`.
- Isolated malformed-queue direct Node versus plain npm: passed, exits `1/1`, reports `failed/failed`, normalized report equality `true`.
- Candidate-checkout direct Node and plain npm: both exit `1` for the same existing untrusted-queue condition; npm displays its expected outer banner.
- `git diff --check 029d8ab..805c07f`: passed.

## Security and tenant-isolation review

No runtime data path changed. The command is a direct Node invocation and preserves the validator's child-process exit behavior. The malformed-fixture check proves a validation failure remains observable through npm. No actor, tenant, environment, policy, audit, credential, provider, or sensitive data is introduced or changed. Therefore no tenant-isolation regression is present in this bounded package-metadata correction.

## Residual limitations and corrective-forward

This PASS approves only portable semantic invocation parity. It does not certify the repository queue, traceability inventory, workflow-pin rules, CI, governance, or product readiness. Those gates remain independently failing and must be corrected and re-reviewed before production work resumes. If this correction is later unsuitable, revert only `01f3808f892598c72e43b97f494f9dc2442fe5c6` and preserve the prior failure record and this review; do not rewrite history.
