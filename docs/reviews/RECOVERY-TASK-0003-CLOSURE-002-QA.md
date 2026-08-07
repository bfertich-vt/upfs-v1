# Independent QA/Security review: RECOVERY-TASK-0003-CLOSURE-002

## Verdict

**REJECT.** Exact candidate `7fc5e3e3916f2d7eb16146969dc2e0ae7817cbcc` corrects the R1 whitespace-only verified-actor failure and its canonical-transaction whitespace/control tests pass. Independent adversarial review nevertheless found two fail-open contract defects: the service accepts provider and provenance-kind strings longer than their JSON Schema bounds, and the connector accepts whitespace/control provider categories into evidence intake before the canonical service rejects them. This violates contract-drift, canonical metadata, fail-before-mutation, and connector pre-evidence requirements. Preserve R1 and R2 evidence; use a separate corrective-forward implementation and fresh independent review.

## Reviewer provenance

- Task: `RECOVERY-TASK-0003-CLOSURE-002`, historical `TASK-0003`.
- Role: Independent QA/Security under `agents/QA_SECURITY.md`; this reviewer did not author, remediate, or review the R2 implementation.
- Role file: `agents/QA_SECURITY.md`; SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Agent thread: `/root/qa_task_0003_closure_r2`.
- Worktree: `C:\source\upfs-qa-task-0003-closure-r2`.
- Branch: `qa/task-0003-closure-r2`.
- Exact candidate: `7fc5e3e3916f2d7eb16146969dc2e0ae7817cbcc`.
- Corrective implementation: `4d0cf3476312601090a40aad211ca9db934cf4be`.
- Preserved R1 rejection: `188f9a9e644a025913866eb6ea2d68298ba2a4f9`.
- Review method: isolated worktree created directly from the exact committed candidate; implementation files were not edited. This review adds only this report.

## Governing inputs loaded

The reviewer read the complete applicable inputs and affected code/tests before testing.

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
| `tasks/recovery/RECOVERY-TASK-0003-CLOSURE-001.yaml` | `b30e59fa20a66ab93a4c53603699d9b6e18ac63e9fadded315a4a2b0863601cd` |
| `tasks/recovery/RECOVERY-TASK-0003-CLOSURE-002.yaml` | `306f74c1d7905865731a18075f914a692c01fab17e395eb6a816541360ecb65f` |
| `docs/handoffs/RECOVERY-TASK-0003-CLOSURE-001.md` | `1a01a0a81ed34efa2e814b1f673ca25662a5e103582dde0a5e1cc3e539a8af1f` |
| `docs/handoffs/RECOVERY-TASK-0003-CLOSURE-002.md` | `a460616185764df0302880c1ba58f7715e12a7fd9c8e80f70a2e24b5922a1452` |
| `docs/reviews/RECOVERY-TASK-0003-CLOSURE-001-QA.md` | `3dd3bc096caa6356b70f2c586162910ac2f8e8018f0d1c3956c3fab31b7b0987` |
| `docs/handoffs/TASK-0003.md` | `ef2a4e0348ae92f4862c172027a9c32831095caa925bd48f10dd1f22c58e9ec2` |
| `contracts/schemas/transaction.schema.json` | `4d19012b395b60ff3322c4dc4c2983b20a52c6822e443a32250ba496f6991565` |
| `contracts/schemas/canonical-transaction.schema.json` | `7ffa70302a6d04d5f32c116ba829d6a85452b5c47fa356865f0526be58b62c43` |
| `contracts/schemas/provider-transaction.schema.json` | `182f03a7d1436da5f2502a5eca1eb4d215f94efcd8e3fa3f85827961b54fd25d` |
| `contracts/schemas/identity-foundation.schema.json` | `4d1e9ece1ca131fea50c0b0b35761c7086a6610747cbfbd0913cb4d860c7f022` |
| `artifacts/schema-registry.json` | `648bfbc053d127617d3e6f88fdbfb8127ce91edcd5ce771b6354eba3aa6e2431` |
| `scripts/generate-registry.mjs` | `963f26c231f7369772e8d90fbfee8277dbe43cf882e67489652c50f0be868326` |
| `services/transaction-registry.mjs` | `3b5d85da3ea86c2a948e4c141fb56212a18d5419a86faa944086765bfc9028a7` |
| `services/transaction-registry.test.mjs` | `1f7032715351a2b7be926aa9efcb04d49b9ea4308451a64d3bab8673beea4dbe` |
| `services/connector-ingestion.mjs` | `d8c2e8ce26df0c2b4d2865d874b92b40a1075bf1fc0f139df2ca9ec9f63ab65e` |
| `services/connector-ingestion.test.mjs` | `a258e0957411f7b56a35f8644fa28051ee04cac8bbd5315e9ac510e1da7e5d13` |

The current TASK-0003 queue and closure-matrix rows were inspected but not treated as proof of acceptance.

## Acceptance trace and security assessment

- R1 whitespace reproduction: whitespace-only/control-bearing actor issuer and subject now fail before scope derivation, state, idempotency, provenance, or audit mutation. Surrounding valid whitespace is canonically trimmed for authorization, record attribution, provenance, and audit.
- Canonical metadata whitespace/control: source observations, evidence references, provider/category pairs, all taxonomy values, and provenance kind/actor/source reference reject empty-after-trim, boundary whitespace, and control characters in the canonical service. Rejections are bounded `invalid_*` envelopes and do not echo rejected values.
- Authorization and isolation: verified actor-derived organization/tenant/environment behavior, forged request scope, cross-tenant/environment denial, and identical non-disclosing absent/cross-scope results pass committed tests. Invalid actor claims do not reach `deriveScope`.
- Canonical 1.1 model: money, currency, timestamps, valid/system time, observations, evidence, confidence, classification, lifecycle, taxonomy, provider categories, provenance, actors, and server-owned versions are exercised. The service/schema length mismatch below prevents contract acceptance.
- Registry: deterministic path/id/version/raw-byte SHA-256 generation, committed artifact parity, atomic publication, malformed identity rejection, and injected failure preservation pass.
- Idempotency/replay/concurrency: payload-bound replay, changed-payload conflict, optimistic concurrency, stale-write rejection, immutable returned copies, failure retry, and append-only version history pass committed tests.
- Audit/failure/rollback/leakage: success, replay, denial, read, history, and injected-failure evidence stays metadata-only; financial descriptions, money, provider payloads, credentials, and mutation payloads are excluded. Canonical invalid metadata is mutation-free. Connector malformed category handling is not pre-evidence and therefore fails the stronger boundary requirement.
- Classification: only a reference implementation is supportable. No PostgreSQL/RLS, durable idempotency/audit, OIDC verifier, real provider, route/host, deployment, managed-secret, or production-runtime evidence exists.

## Blocking findings

### QA-0003-R2-001 — High — service accepts values beyond the authoritative schema bounds

`contracts/schemas/transaction.schema.json` limits `provider_categories[].provider` and `provenance[].kind` to 100 characters. `validateTransaction` calls `isCanonicalString(..., 300)` for both. Independent reproduction returned `null` (valid) for a 101-character provider and a 101-character provenance kind. These records would be accepted by the service but rejected by its advertised schema, violating the R1 acceptance criteria that contract drift fail closed and the R2 bounded-string criterion.

Required remediation: use the exact contract bounds for each field, add boundary tests at 100/101 characters for provider and provenance kind, and re-run deterministic registry/contract drift checks. Do not broaden the contract merely to match the implementation without a separately justified contract decision.

### QA-0003-R2-002 — High — malformed connector category mutates evidence state before rejection

`normalizeProviderTransaction` checks only type and maximum length for optional `category`. Independent reproduction accepted both `"   "` and `"FOOD\tBAD"`. A signed connector request with the whitespace category called evidence intake once and canonical upsert once before returning `invalid_provider_category`. This contradicts the R2 handoff claim that connector rejection occurs before evidence/nonce/idempotency state and the acceptance requirement that non-canonical provider/category metadata fail before mutation.

Required remediation: fail closed in provider normalization for empty-after-trim, boundary whitespace, control characters, and over-bound values before evidence intake or nonce/idempotency mutation. Add direct normalizer and end-to-end tests proving evidence, canonical, connector audit, nonce, and idempotency state remain unchanged and a corrected retry can succeed.

## Commands and results

| Command | Result |
| --- | --- |
| `node --test services/transaction-registry.test.mjs services/connector-ingestion.test.mjs` | PASS, 22/22, 0 failed, 0 skipped; 0.182 s wall time. |
| Independent service/schema boundary reproducer via `node --input-type=module -` | FAIL-CLOSED EXPECTATION VIOLATED: 101-character provider and provenance kind each returned `null` from `validateTransaction`; 0.2 s. |
| Independent connector category reproducer via `node --input-type=module -` | FAIL-CLOSED EXPECTATION VIOLATED: whitespace/control categories normalized as values; signed whitespace-category request called evidence once and canonical once before bounded `invalid_provider_category`; 0.3 s. |
| `npm ci` | PASS; 106 lockfile-pinned packages installed; 0 vulnerabilities; 5.0 s. |
| `npm test` | PASS, 973 total, 972 pass, 0 fail, 1 pre-existing opt-in PostgreSQL skip; 274.122 s wall time. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` | PASS; 333 Markdown, 65 JSON, 5 YAML; 9.875 s. |
| `npm run format:check` | PASS; 48 pinned-Prettier files and closure structures; 5.070 s. |
| `npm run queue:check` | PASS; 10.003 s. |
| `npm run traceability:check` | PASS; 31.476 s. |
| `npm run lint` | PASS; 7.720 s. |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities; 2.084 s. |
| `git fsck --full --strict` | PASS; preserved dangling blobs/trees only. |
| `git diff --check` | PASS. |
| `git diff --name-only 188f9a9...HEAD` | PASS authorized-path inspection: exactly the R2 task, handoff, and four service/test paths. |
| `git status --short`; `git rev-parse HEAD` before review | Clean exact candidate `7fc5e3e3916f2d7eb16146969dc2e0ae7817cbcc`. |

## Limitations and corrective-forward requirement

This is local committed-state QA evidence, not hosted or production-runtime evidence. The one skipped PostgreSQL rehearsal is pre-existing and opt-in. Synthetic and in-memory results do not prove durable PostgreSQL bitemporality, RLS, OIDC, provider operation, deployed routing, managed secrets, backup, or production observability.

Preserve R1 rejection `188f9a9e644a025913866eb6ea2d68298ba2a4f9` and this R2 rejection. Create a separate Schema/Search/AI corrective-forward task for the two exact findings, commit its implementation and handoff, then assign a fresh QA/Security reviewer to that exact candidate. Do not integrate or activate TASK-0003, and do not begin TASK-0004 from this rejected state.
