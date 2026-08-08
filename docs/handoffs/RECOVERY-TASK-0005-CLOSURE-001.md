# Handoff: RECOVERY-TASK-0005-CLOSURE-001

- Task ID: `RECOVERY-TASK-0005-CLOSURE-001`; historical capability `TASK-0005`.
- Scope/classification: connector-to-canonical transaction vertical slice, independently reviewable as a **Proven reference implementation** at most. No real provider, durable persistence, deployment, or production-operation claim is made.
- Agent role: Schema/Search/AI.
- Role file/digest: `agents/SCHEMA_SEARCH_AI.md` (`8b05d11c936e7d0eac9ea63cf5b34cc594b620205292054bfcd6e01046050d9d`).
- Agent thread ID: `/root/schema_task_0005_closure_r1` (the runtime provides no native UPFS role field; role binding was established in the initial assignment and proven by file digests before editing).
- Worktree/branch/base: `C:\source\upfs-schema-task-0005-closure-r1`; `recovery/task-0005-closure-r1`; `5fa7e69458568d8c80bcbb4e913291e16afbdd60`.
- Implementation commit: `b40ca058036d256584a0a9f6295f6ed6ce6e26f1`.
- Final candidate/handoff commit: pending this separate handoff-binding commit.
- Files changed: `services/connector-ingestion.mjs`; `services/connector-ingestion.test.mjs`; `tasks/recovery/RECOVERY-TASK-0005-CLOSURE-001.yaml`; this handoff. The authorized provider schema was inspected but did not require a byte change.
- Prohibited files unchanged: queue, closure matrix, historical handoff, specifications, workflows/packages, accepted TASK-0001–0004 evidence, unrelated files, TASK-0006+, and TASK-0112–0123.

## Inputs and exact provenance

- `AGENTS.md` (`9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`); `agents/SCHEMA_SEARCH_AI.md` (`8b05d11c936e7d0eac9ea63cf5b34cc594b620205292054bfcd6e01046050d9d`); `agents/WORKTREES.md` (`f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`); `agents/HANDOFF_TEMPLATE.md` (`4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`).
- Constitution (`e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`); master plan (`2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`); queue (`aee0d6ec813016136d26479bc73fcae34ce973ae0c043da82be37d4162550343`); closure matrix including TASK-0005 row (`f908b1fb3dba36c41fa31ec6db0127a6abbf240213ea2795101f3890d7ec84e5`).
- Canonical model (`5c874d646cae8693a48a5f42de75249c5007c1a7bd296da7fd29bd1875cf8ed0`); identity/tenant model (`c47f97669b5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf`); API standards (`23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`); security baseline (`53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`); threat model (`716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`); test strategy (`349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`).
- Provider transaction contract (`contracts/schemas/provider-transaction.schema.json`, `182f03a7d1436da5f2502a5eca1eb4d215f94efcd8e3fa3f85827961b54fd25d`); historical TASK-0005 handoff (`8871a4fd1f5b80174f58200ad65f651976ffd2e27e8b332f885b7b769b9e6c55`); starting service (`a4161d202f31bab42ec2b6c8a890e04816d342f9f22ff10a312208d9324c3354`) and tests (`7046505cc420f788ea3f0179cb025d281c37aaa0f411fb7520edc2181dce8687`); `package.json` (`99bc305b048b739b1a2929aec1dc62c9ce1925557d0070363862ddfc7405dfa9`).
- Accepted dependency evidence read for compatibility: TASK-0004 handoff (`e560b7871ca403e9e79d12e92f6b4aeceb483eaa5224f877f86a8ce290700fcf`) and QA (`0c68e42dc53a09f92fe427637e8b4bcb71e570523a0451bc6ad3c92c207d56c0`).

## Acceptance, security, and negative evidence

- Valid signed single webhooks and signed provider pages produce deterministic tenant/environment-scoped canonical transactions and immutable raw evidence references. Provider categories are preserved; canonical taxonomy stays governed by the accepted registry boundary.
- The page boundary verifies actor, configured provider, timestamp, nonce, signature, connector authorization, and idempotency before preserving bytes. Tenant/environment identifiers come only from the configured connector and verified authorization path.
- Page shape is closed-world and bounded to 500 transactions. Unknown fields, malformed page metadata, provider drift, invalid provider transactions, scanner quarantine, and partial pages fail closed. Signed page bytes and source provenance remain available in quarantine; incomplete pages return `207` and never claim completion.
- Mutation is serialized. Concurrent duplicate delivery produces exactly one canonical effect; replay and payload-bound idempotency conflicts are deterministic. Authorization/cross-tenant denial leaves evidence, canonical, replay, idempotency, and audit state unchanged and permits a corrected retry.
- Injected canonical failure produces a bounded retryable item failure while retaining raw evidence. A separate corrected delivery may reuse only exact matching evidence content and scope; substitution or cross-scope reuse remains rejected by the accepted evidence boundary.
- Connector audit metadata contains scope, identifiers, counts, digests, and action only. Tests prove amount, description, category, malformed value, secrets, and raw provider content are absent.
- Contract/generated drift is covered by registry generation, committed-artifact diff, repository validation, and traceability. No validator or test was weakened.

## Exact implementation-head tests

- Focused: `node --test services/connector-ingestion.test.mjs services/evidence-intake.test.mjs services/transaction-registry.test.mjs services/registry-generator.test.mjs` — PASS, 48/48, 0 fail/skip, 166 ms test duration (289 ms command). Connector-only result is 16/16.
- Full: `npm test` — PASS, 993 total; 992 passed; 0 failed; 1 pre-existing opt-in PostgreSQL skip; 426684.5 ms test duration, 427344 ms command.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` — PASS, 349 Markdown, 65 JSON, 5 YAML; 8654 ms.
- `npm run format:check` — PASS, 48 pinned-Prettier files and structural closure checks; 3311 ms.
- `npm run lint` — PASS, 5930 ms. `npm run queue:check` — PASS, 9006 ms. `npm run traceability:check` — PASS, 30460 ms.
- `node scripts/generate-registry.mjs` — PASS, 6 schemas, 68 ms; `git diff --exit-code -- artifacts/schema-registry.json` — PASS/no drift.
- `npm audit --audit-level=high` — PASS, 0 vulnerabilities, 1160 ms. `git diff --check`; `git fsck --full --strict`; authorized-diff and clean-head checks — PASS. Strict fsck reports pre-existing unreachable objects but no corruption.
- Final-candidate rerun after this handoff commit: pending; every listed gate will be rerun and bound to the exact final SHA before QA assignment.

## Limitations, rollback, and independent review

- This is local, synthetic, in-memory reference composition. It does not prove provider connectivity, webhook delivery, pagination against a real provider, durable PostgreSQL/RLS, outbox/checkpoints, production OIDC, deployed routes, managed scanning, runtime operations, or production readiness. Those remain dependency-controlled/external prerequisites.
- Preserve historical commit/handoff and this candidate. Before release, rollback is a reviewed revert of the task commits. After integration, correct forward through a new bounded change and independent review. Never delete rejection evidence or weaken signature, provenance, tenant, contract, or validation gates.
- Independent reviewer/result: pending a distinct QA/Security agent under `agents/QA_SECURITY.md`, using an isolated worktree from the exact committed final candidate and editing no implementation. No push, PR, merge, activation, queue/matrix change, TASK-0006 work, or self-approval is authorized here.
