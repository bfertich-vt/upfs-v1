# Independent QA/Security Review: RECOVERY-TASK-0005-CLOSURE-001

- Verdict: **ACCEPT** for historical `TASK-0005`, bounded to **Proven reference implementation**.
- Reviewer: independent Codex QA/Security agent `/root/qa_task_0005_closure_r1`; assigned role `agents/QA_SECURITY.md` (`6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`). The runtime has no native UPFS role field; the initial assignment bound this thread to the documented role. This reviewer did not author or remediate the implementation or handoff.
- Isolated review state: `C:\source\upfs-qa-task-0005-closure-r1`; branch `qa/task-0005-closure-r1`; base `5fa7e69458568d8c80bcbb4e913291e16afbdd60`.
- Exact candidate: `7b8c698e910199e86ae027bf2e6b96c77acafabb`; tree `1ee2b828174a28e785bc8dece586baad9510252d`; implementation parent `b40ca058036d256584a0a9f6295f6ed6ce6e26f1` (tree `ae5a2cf1b2f28a838d2381034737f463a27724ab`).

## Governing inputs loaded before review

- `AGENTS.md` (`9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`); `agents/QA_SECURITY.md` (`6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`); `agents/WORKTREES.md` (`f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`); `agents/HANDOFF_TEMPLATE.md` (`4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`).
- `specs/00_constitution/engineering_constitution.md` (`e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`); `docs/MASTER_PLAN.md` (`2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`); `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md` including the TASK-0005 row (`f908b1fb3dba36c41fa31ec6db0127a6abbf240213ea2795101f3890d7ec84e5`).
- `specs/04_schema/canonical_model.md` (`5c874d646cae8693a48a5f42de75249c5007c1a7bd296da7fd29bd1875cf8ed0`); `specs/04_schema/identity_tenant_model.md` (`c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf`); `specs/05_apis/api_standards.md` (`23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`).
- `specs/10_security/security_baseline.md` (`53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`); `specs/10_security/threat_model.md` (`716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`); `specs/12_testing/test_strategy.md` (`349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`).
- Structured task `tasks/recovery/RECOVERY-TASK-0005-CLOSURE-001.yaml` (`13d7c67e97bd842a08358b759ea568077581709252a5cb904d84864ce198177d`); candidate handoff `docs/handoffs/RECOVERY-TASK-0005-CLOSURE-001.md` (`b915064e61ef405eb71396ea20bd398263d9b089ee031245adcf7eebd77729ad`); historical handoff `docs/handoffs/TASK-0005.md` (`8871a4fd1f5b80174f58200ad65f651976ffd2e27e8b332f885b7b769b9e6c55`); queue `tasks/queue.yaml` (`aee0d6ec813016136d26479bc73fcae34ce973ae0c043da82be37d4162550343`).
- Candidate service/test: `services/connector-ingestion.mjs` (`1a84e28e01095864b6c251af6407c222996e7769daded70dc786a02737275497`) and `services/connector-ingestion.test.mjs` (`17c1d7abf1cc203636a26246860dbb83c32b6d2c1d60c1f5038a8f084bbb73fb`). Provider contract `contracts/schemas/provider-transaction.schema.json` is unchanged (`182f03a7d1436da5f2502a5eca1eb4d215f94efcd8e3fa3f85827961b54fd25d`). Supporting evidence, canonical, and registry implementations/tests were read and hash-bound during review.

## Acceptance and adversarial evidence

- A valid signed webhook and a signed page produce deterministic connector-, tenant-, and environment-scoped canonical records with immutable evidence references and preserved provider categories. The legacy single-webhook `ingest` path remains covered.
- Signature, timestamp, nonce, verified actor, configured connector, authorization, and idempotency checks fail closed. The reviewer independently omitted the page idempotency key and observed `400 idempotency_key_required` with zero evidence, canonical, or connector-audit mutation.
- Forged actor scope and cross-tenant/authorization denial disclose no connector scope and leave evidence, canonical, nonce, idempotency, and audit state unchanged; corrected authorized retry succeeds.
- Closed-world page validation quarantines provider drift and malformed pages while retaining signed raw page provenance. Invalid transactions produce a partial `207`, retain page evidence, mark `complete: false`, and never claim page completion.
- Replay, payload-bound idempotency conflict, serialized concurrent duplicates, and duplicate page delivery produce at most one canonical effect. Returned results and audit collections are copied, resisting caller mutation.
- Scanner quarantine and injected canonical failure prevent unsupported canonical promotion. Page evidence survives the injected failure, and a separately identified corrected delivery succeeds without weakening validation.
- Connector audit is metadata-only and tests exclude amount, description, category, malformed values, secrets, and raw provider content. Contract and generated-registry provenance remain deterministic and drift-free.
- Authorized candidate diff contains only `services/connector-ingestion.mjs`, `services/connector-ingestion.test.mjs`, `tasks/recovery/RECOVERY-TASK-0005-CLOSURE-001.yaml`, and `docs/handoffs/RECOVERY-TASK-0005-CLOSURE-001.md`. Queue, matrix, historical handoff, specifications, workflows/packages, dependencies, TASK-0006+, and TASK-0112-TASK-0123 are unchanged.

## Commands and exact results

- `node --test services/connector-ingestion.test.mjs services/evidence-intake.test.mjs services/transaction-registry.test.mjs services/registry-generator.test.mjs` — PASS, 48/48, 0 failed/skipped; 215 ms command.
- Initial `npm test` before dependency installation — QA-environment failure only: seven module-resolution failures for absent lockfile dependencies (`yaml`, `prettier`, `pg`); 893 passed, 7 failed, 1 skipped; 7,572 ms. No candidate assertion failed. `npm ci --ignore-scripts` then installed 106 lockfile-pinned packages, PASS, 0 vulnerabilities, 4,703 ms.
- Dependency-corrected `npm test` — PASS, 993 total; 992 passed; 0 failed; 1 pre-existing opt-in embedded-PostgreSQL skip; 426,795 ms command. The skip is not claimed as coverage.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` — PASS, 350 Markdown, 65 JSON, 5 YAML; 12,080 ms.
- `npm run format:check` — PASS, 48 pinned-Prettier files plus structural closure checks; 4,818 ms. `npm run lint` — PASS; 7,396 ms.
- `npm run queue:check` — PASS; 12,180 ms. `npm run traceability:check` — PASS; 32,698 ms. `npm audit --audit-level=high` — PASS, 0 vulnerabilities; 2,010 ms.
- `node scripts/generate-registry.mjs` — PASS, 6 schemas; `git diff --exit-code -- artifacts/schema-registry.json` — PASS/no drift.
- `git diff --check` and `git fsck --full --strict` — PASS; strict fsck reports only pre-existing dangling objects, no corruption. Authorized-diff and clean-candidate checks — PASS at exact candidate `7b8c698e910199e86ae027bf2e6b96c77acafabb`.

## Security assessment, limitations, and disposition

- Tenant/environment scope is derived from the configured connector and verified actor authorization, never caller-provided tenant fields. HMAC verification uses constant-time comparison before evidence preservation. Replay/idempotency keys are scoped; page and item mutation is serialized; denials are non-disclosing and mutation-free.
- The evidence-first design intentionally retains signed raw provenance across provider drift, partial synchronization, and canonical failure. Financial/provider payloads are absent from connector audit metadata. Failure recovery is corrective-forward using a separately identified delivery; rejection evidence and immutable raw evidence remain preserved.
- This review proves only an in-memory, synthetic reference composition. It does **not** prove a real provider adapter, real webhooks or pagination, durable PostgreSQL/RLS, outbox/checkpoints, managed object storage/scanning, production OIDC, deployed routes, credentials, managed runtime, or production operations. The one skipped opt-in PostgreSQL rehearsal supplies none of that missing evidence.
- Rollback: preserve historical/candidate/review evidence; use a separately reviewed revert before release or a bounded corrective-forward commit after integration. Never weaken signature, provenance, tenant, contract, or validation gates.
- Independent result: **ACCEPT** the exact candidate for protected promotion and later disposition as **Proven reference implementation**, subject to exact-head hosted repository-validation/security checks, retained artifact inspection, protected merge, post-merge checks, and a separately reviewed activation/status update. No production capability claim is authorized.
