# Independent QA/Security review: RECOVERY-TASK-0003-CLOSURE-003

## Verdict

**REJECT.** Exact candidate `e9c87f046aaa131cdcde86e212226a7055169122` corrects the two R2 findings and its committed focused and full suites pass. Independent adversarial review nevertheless found two fail-closed defects outside the committed coverage: C1 control characters (`U+0080` through `U+009F`) are accepted in verified actor and every bounded canonical metadata family, and a non-canonical configured connector provider reaches evidence intake and canonical mutation before rejection. These violate the R3 control-character, actor/provider boundary, pre-mutation, audit-attribution, and corrected-retry criteria. Preserve R1 rejection `188f9a9e644a025913866eb6ea2d68298ba2a4f9`, R2 rejection `01a2c97f5c6a7ec6045705ac5e3ef4c25228938b`, and this R3 rejection; use a separate corrective-forward implementation and fresh independent review.

## Reviewer provenance

- Task: `RECOVERY-TASK-0003-CLOSURE-003`, historical `TASK-0003`.
- Role: Independent QA/Security under `agents/QA_SECURITY.md`; this reviewer did not author or remediate R1, R2, or R3.
- Role file: `agents/QA_SECURITY.md`; SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Agent thread: `/root/qa_task_0003_closure_r3`.
- Worktree: `C:\source\upfs-qa-task-0003-closure-r3`.
- Branch: `qa/task-0003-closure-r3`.
- Exact candidate: `e9c87f046aaa131cdcde86e212226a7055169122`.
- R3 implementation: `719d9d2`; structured-task commit `5b770af`; handoff commits `256c4c6` and `e9c87f0`.
- Preserved rejected QA commits: `188f9a9e644a025913866eb6ea2d68298ba2a4f9` and `01a2c97f5c6a7ec6045705ac5e3ef4c25228938b`.
- Review method: isolated worktree created directly from the exact committed candidate. No implementation, contract, generated artifact, task, handoff, queue, or matrix file was edited. This commit adds only this review.

## Governing inputs loaded

The reviewer read the complete applicable inputs, contracts, all R1-R3 task/handoff/review records, and affected source/tests before testing.

| Path | SHA-256 |
| --- | --- |
| `AGENTS.md` | `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1` |
| `agents/QA_SECURITY.md` | `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0` |
| `agents/WORKTREES.md` | `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1` |
| `agents/HANDOFF_TEMPLATE.md` | `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4` |
| `specs/00_constitution/engineering_constitution.md` | `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73` |
| `docs/MASTER_PLAN.md` | `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec` |
| `specs/04_schema/canonical_model.md` | `5c874d646cae8693a48a5f42de75249c5007c1a7bd296da7fd29bd1875cf8ed0` |
| `specs/04_schema/identity_tenant_model.md` | `c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf` |
| `specs/05_apis/api_standards.md` | `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b` |
| `specs/10_security/security_baseline.md` | `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add` |
| `specs/12_testing/test_strategy.md` | `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172` |
| `tasks/queue.yaml` | `c9846f5f16e88ef9453fa91458e68540a472384e0643bbe69db60cca54fe4159` |
| `docs/handoffs/TASK-0003.md` | `ef2a4e0348ae92f4862c172027a9c32831095caa925bd48f10dd1f22c58e9ec2` |
| `tasks/recovery/RECOVERY-TASK-0003-CLOSURE-001.yaml` | `b30e59fa20a66ab93a4c53603699d9b6e18ac63e9fadded315a4a2b0863601cd` |
| `docs/handoffs/RECOVERY-TASK-0003-CLOSURE-001.md` | `1a01a0a81ed34efa2e814b1f673ca25662a5e103582dde0a5e1cc3e539a8af1f` |
| `docs/reviews/RECOVERY-TASK-0003-CLOSURE-001-QA.md` | `3dd3bc096caa6356b70f2c586162910ac2f8e8018f0d1c3956c3fab31b7b0987` |
| `tasks/recovery/RECOVERY-TASK-0003-CLOSURE-002.yaml` | `306f74c1d7905865731a18075f914a692c01fab17e395eb6a816541360ecb65f` |
| `docs/handoffs/RECOVERY-TASK-0003-CLOSURE-002.md` | `a460616185764df0302880c1ba58f7715e12a7fd9c8e80f70a2e24b5922a1452` |
| `docs/reviews/RECOVERY-TASK-0003-CLOSURE-002-QA.md` | `5839005d7134031b11c0b60559de02116929aae330f3aa7bfd15546d774abc7e` |
| `tasks/recovery/RECOVERY-TASK-0003-CLOSURE-003.yaml` | `5989a44e3f0c78ee7b210ff1a0d627f8f0ffc998f763df7d1173eef0ee4cd4d8` |
| `docs/handoffs/RECOVERY-TASK-0003-CLOSURE-003.md` | `96d658508a3749a6e13601ff7f2522c22f32d21e7b47ad41ef2284c326679dd5` |
| `contracts/schemas/transaction.schema.json` | `4d19012b395b60ff3322c4dc4c2983b20a52c6822e443a32250ba496f6991565` |
| `contracts/schemas/canonical-transaction.schema.json` | `7ffa70302a6d04d5f32c116ba829d6a85452b5c47fa356865f0526be58b62c43` |
| `contracts/schemas/provider-transaction.schema.json` | `182f03a7d1436da5f2502a5eca1eb4d215f94efcd8e3fa3f85827961b54fd25d` |
| `contracts/schemas/identity-foundation.schema.json` | `4d1e9ece1ca131fea50c0b0b35761c7086a6610747cbfbd0913cb4d860c7f022` |
| `scripts/generate-registry.mjs` | `963f26c231f7369772e8d90fbfee8277dbe43cf882e67489652c50f0be868326` |
| `artifacts/schema-registry.json` | `648bfbc053d127617d3e6f88fdbfb8127ce91edcd5ce771b6354eba3aa6e2431` |
| `services/transaction-registry.mjs` | `1403d302867428484d3a16b9ab3be8f421917f7ef4eb4c4605aad3297266f18a` |
| `services/transaction-registry.test.mjs` | `f1421ee0d677385e4b90f855e01087bc0c0b26aafd6ccaca71d410da73f46acd` |
| `services/connector-ingestion.mjs` | `e7f7048e2ee7d5647ad41301e50c61143e22a790c413a4b50cc9475d4bf47e53` |
| `services/connector-ingestion.test.mjs` | `0f2a797fad27a71be82131784b4073b394e683570ee05fce188f2e4058ac2544` |

## Acceptance trace and security assessment

- R1 defects: empty/whitespace and C0-control actor and canonical metadata cases now fail before mutation; valid surrounding actor whitespace is canonicalized consistently.
- R2 defects: provider and provenance-kind maximums match the 100-character schema limits, and invalid payload category values fail before evidence/canonical/audit/nonce/idempotency mutation. Corrected same-nonce/same-key retry succeeds.
- Boundary parity: zero, one, exact maximum, maximum plus one, boundary whitespace, and C0/mixed C0 cases pass for observation/evidence/provider/category/all eight taxonomy fields/provenance kind, actor, and source reference. C1 control cases fail open as finding `QA-0003-R3-001`.
- Authorization/isolation: actor-derived tenant/environment, forged client-scope denial, same-envelope absent/cross-scope non-disclosure, replay/idempotency, optimistic concurrency, copied state, audit redaction, and injected-failure rollback pass committed tests. C1 actor acceptance corrupts attribution as described below.
- Connector compatibility: signed delivery, timestamp/signature/replay handling, derived scope, quarantine, category preservation, and corrected category retry pass. Configured provider validation is too late as finding `QA-0003-R3-002`.
- Registry and drift: deterministic source path/schema identity/version/raw-byte digest, atomic publication failure preservation, committed regeneration parity, repository validation, queue, traceability, formatting, lint, audit, and Git integrity pass.
- Classification: only a proven reference implementation is supportable. No PostgreSQL/RLS durability, OIDC verifier, real provider, deployed API host/route, managed secrets, or production-runtime evidence exists.

## Blocking findings

### QA-0003-R3-001 — High — C1 controls pass actor and canonical metadata boundaries

`services/transaction-registry.mjs` defines `CONTROL_CHARACTER` as only `U+0000`–`U+001F` plus `U+007F`, while the connector correctly treats `U+0080`–`U+009F` as controls. Independent reproduction inserted `U+0085` or `U+009F` into source observations, evidence references, provider, category, every taxonomy field, and provenance kind/actor/source reference. `validateTransaction` returned `null` for every case. A verified actor with `U+0085` in subject reached `deriveScope`, returned `201`, and persisted the control-bearing value in `created_by` and audit attribution.

This violates the structured requirement for control and mixed-string rejection across every bounded metadata family and malformed actor fail-closed behavior. Required remediation: adopt one shared explicit C0/C1 control definition for actor and all canonical strings; add C1 and mixed-C1 cases for every named family; prove actor rejection precedes scope, persistence, idempotency, provenance, and audit mutation; and prove a corrected retry succeeds.

### QA-0003-R3-002 — High — invalid configured connector provider mutates evidence before rejection

The R3 connector correction validates payload `category`, but never validates `connector.provider` before constructing raw evidence. Independent reproduction used a configured provider containing `U+0085`. The signed request called evidence intake once and canonical upsert once before returning bounded `invalid_provider_category`. Thus the provider boundary does not meet the task's pre-evidence/pre-canonical mutation rule, and the existing corrected-retry proof covers category only.

Required remediation: validate the connector provider with the authoritative 100-character canonical bound before evidence, nonce, idempotency, or audit mutation. Add zero/one/100/101, whitespace, C0/C1, and mixed provider cases and prove the same nonce/idempotency key succeeds after correcting provider configuration. Keep error output bounded and non-echoing.

## Commands and results

| Command | Result |
| --- | --- |
| `node --test services/transaction-registry.test.mjs services/connector-ingestion.test.mjs` | PASS, 24/24, 0 failed, 0 skipped; 0.123 s. |
| First `npm test` before worktree dependency installation | Environment/setup failure only: 877 pass, 7 module-loader failures for absent `yaml`/`prettier`/`pg`, 1 skip; 7.0 s suite duration. Not candidate rejection evidence. |
| `npm ci --ignore-scripts` | PASS; 106 lockfile-pinned packages installed, 0 vulnerabilities; 4.6 s. |
| Dependency-complete `npm test` | PASS, 975 total, 974 pass, 0 fail, 1 pre-existing opt-in PostgreSQL skip; 278.702 s suite duration, 279.4 s wall time. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` | PASS; 335 Markdown, 65 JSON, 5 YAML; 6.804 s. |
| `npm run format:check` | PASS; 48 pinned-Prettier files and closure structures; 3.448 s. |
| `npm run queue:check` | PASS; 6.593 s. |
| `npm run traceability:check` | PASS; 29.292 s. |
| `npm run lint` | PASS; 5.065 s. |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities; 1.244 s. |
| `git fsck --full --strict` | PASS; only preserved dangling blobs/trees; 13.039 s. |
| `git diff --check 1156e7e8...HEAD` | PASS; 0.049 s. |
| Authorized diff inspection | PASS: only R1-R3 structured tasks/handoffs/reviews and task-authorized registry/schema/service/test paths relative to base `1156e7e8...`. |
| Independent all-family C1 reproducer | FAIL-CLOSED EXPECTATION VIOLATED: all 15 observation/evidence/provider/category/taxonomy/provenance cases returned `null` (valid). |
| Independent C1 actor reproducer | FAIL-CLOSED EXPECTATION VIOLATED: returned `201`, invoked scope once, and persisted control-bearing actor attribution and audit. |
| Independent invalid-provider connector reproducer | FAIL-CLOSED EXPECTATION VIOLATED: response `invalid_provider_category`, but evidence and canonical call counts were both 1. |
| `git status --short`; `git rev-parse HEAD` before this report | Clean exact candidate `e9c87f046aaa131cdcde86e212226a7055169122`. |

## Limitations and corrective-forward requirement

The one skipped PostgreSQL rehearsal is pre-existing and explicitly opt-in. Local in-memory and synthetic evidence does not prove PostgreSQL bitemporality/RLS, durable idempotency/audit, OIDC, real provider integration, managed secrets, deployed routing, backup, observability, or production operation.

Create a separate Schema/Search/AI corrective-forward task for both findings, commit implementation and provenance-complete handoff, and assign a fresh QA/Security reviewer to the exact corrected candidate. Do not integrate or activate TASK-0003, and do not begin TASK-0004 from this rejected candidate.
