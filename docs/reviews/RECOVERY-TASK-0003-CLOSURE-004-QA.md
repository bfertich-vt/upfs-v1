# Independent QA/Security review: RECOVERY-TASK-0003-CLOSURE-004

## Verdict

**ACCEPT.** Exact candidate `6f53a94e40715b4058f47f979abbc4081c6e4837` corrects the independently rejected R3 C1-control and configured-provider mutation-order defects without weakening the contract or altering prohibited files. Independent review reproduced the complete R1-R4 acceptance and security surface. C0 and C1 controls fail closed across verified actor, observations, evidence, provider/category, all taxonomy fields, provenance, and connector provider; invalid actors and providers do not consume scope, evidence, canonical, nonce, idempotency, or audit state; and corrected same-key retry succeeds. The capability remains truthfully classified as an in-memory reference implementation only.

## Reviewer provenance

- Task: `RECOVERY-TASK-0003-CLOSURE-004`; historical task `TASK-0003`.
- Role: Independent QA/Security under `agents/QA_SECURITY.md`. This reviewer did not author or remediate R1, R2, R3, or R4.
- Role file: `agents/QA_SECURITY.md`; SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Agent thread: `/root/qa_task_0003_closure_r4`.
- Worktree: `C:\source\upfs-qa-task-0003-closure-r4`.
- Branch: `qa/task-0003-closure-r4`.
- Exact candidate: `6f53a94e40715b4058f47f979abbc4081c6e4837`.
- Structured task: `5c24f8a99b642d081ce045a33049bf73fc26fa07`; implementation: `1ed8e0dd5f216484a778eb00abe4ee223cedb24c`; handoff commits: `6bf4f13` and `6f53a94`.
- Preserved rejection commits: R1 `188f9a9e644a025913866eb6ea2d68298ba2a4f9`; R2 `01a2c97f5c6a7ec6045705ac5e3ef4c25228938b`; R3 `1080d94ec9659852a5e63f278a05dd6e9aa84329`. All three are ancestors of the candidate.
- Review method: isolated worktree created directly from the exact committed candidate. No implementation, task, handoff, queue, matrix, contract, artifact, workflow, package, script, or specification was edited. This commit adds only this review.

## Governing inputs loaded

The reviewer completely read the assigned role, constitution, structured task inputs, applicable contracts, historical closure evidence, affected implementation, and tests before review.

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
| `contracts/schemas/transaction.schema.json` | `4d19012b395b60ff3322c4dc4c2983b20a52c6822e443a32250ba496f6991565` |
| `contracts/schemas/canonical-transaction.schema.json` | `7ffa70302a6d04d5f32c116ba829d6a85452b5c47fa356865f0526be58b62c43` |
| `contracts/schemas/provider-transaction.schema.json` | `182f03a7d1436da5f2502a5eca1eb4d215f94efcd8e3fa3f85827961b54fd25d` |
| `contracts/schemas/identity-foundation.schema.json` | `4d1e9ece1ca131fea50c0b0b35761c7086a6610747cbfbd0913cb4d860c7f022` |
| `tasks/recovery/RECOVERY-TASK-0003-CLOSURE-003.yaml` | `5989a44e3f0c78ee7b210ff1a0d627f8f0ffc998f763df7d1173eef0ee4cd4d8` |
| `docs/handoffs/RECOVERY-TASK-0003-CLOSURE-003.md` | `96d658508a3749a6e13601ff7f2522c22f32d21e7b47ad41ef2284c326679dd5` |
| `docs/reviews/RECOVERY-TASK-0003-CLOSURE-003-QA.md` | `ca945db6477826bbc0204a6b52ebe5a4186ac9275ee52ca3e609db644283dfc6` |
| `tasks/recovery/RECOVERY-TASK-0003-CLOSURE-004.yaml` | `886425e7c70203bad37340ccfa1693c9d347a1e26d15d9bfcb3d6997357fec2e` |
| `docs/handoffs/RECOVERY-TASK-0003-CLOSURE-004.md` | `e535f510236b44d357f1f12530008c0f6a75b0d4e01e27e3c3e691d143c2df29` |
| `services/transaction-registry.mjs` | `79c29171f8422d975be57cd05f4a8f9fbc2c934c039c5b0072ff82a5e93e886d` |
| `services/transaction-registry.test.mjs` | `6851df781d4f69324f98c4d5298a08a5c995efc83931bd6cdb83d925d09c7a54` |
| `services/connector-ingestion.mjs` | `7b402d2f6ed96f7a4826acacafa3e753e15b88b32d34684bc9abe59ce6ba8229` |
| `services/connector-ingestion.test.mjs` | `d602dddf67833a531d82a7c094c9557f5cd8de5ae684a1ef256abe7d37701d55` |
| `tasks/queue.yaml` | `c9846f5f16e88ef9453fa91458e68540a472384e0643bbe69db60cca54fe4159` |
| `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md` | `786fa0747061bed3f2b8d33f58195acf366bf49782a9f3a41acedf621299ad40` |
| `docs/handoffs/TASK-0003.md` | `ef2a4e0348ae92f4862c172027a9c32831095caa925bd48f10dd1f22c58e9ec2` |

## Acceptance, negative testing, and security findings

- Shared control policy: the exported canonical metadata boundary uses one explicit `U+0000`-`U+001F` and `U+007F`-`U+009F` predicate, reused by transaction validation and connector provider/category validation.
- Exhaustive field families: committed focused cases exercised observations, evidence references, provider, category, all eight taxonomy fields, provenance kind/actor/source reference, verified actor issuer/subject, and connector provider with `U+0000`, `U+001F`, `U+007F`, `U+0080`, `U+0085`, `U+009F`, and mixed C0/C1 content. Every invalid case failed closed with bounded non-echoing errors.
- Actor mutation order: malformed actor cases are rejected before scope derivation. Audit, idempotency, and history remain empty; no invalid attribution persists.
- Connector mutation order: invalid configured provider is rejected immediately after authenticated actor and connector lookup, before timestamp/signature replay lookup, nonce mutation, idempotency lookup/mutation, evidence intake, canonical upsert, or connector audit. Evidence, canonical, and audit call/state counts remain zero.
- Corrected retry: correcting the same connector instance and retrying the identical nonce/idempotency key succeeds with `201`, proving the rejection consumed no replay or idempotency state.
- Bounds and Unicode: provider lengths 1 and exactly 100 pass; length 101 fails. Canonical string maxima remain schema-aligned. Valid accented and symbolic Unicode outside C0/C1 passes within the same bounds.
- R1-R3 regression surface: deny-by-default authorization, tenant/environment derivation from verified membership, forged scope denial, cross-tenant non-disclosure, payload-bound idempotency/replay, optimistic concurrency, copied state, append-only redacted audit, injected failure atomicity, corrected retry, deterministic schema generation, digest binding, and atomic publication rollback remain green.
- Contract and generated drift: no contract or generated artifact changed in R4; deterministic regeneration and raw-byte schema digests remain equal to committed artifacts.
- Leakage: invalid metadata is not echoed in response or audit evidence. Existing audit tests exclude financial/provider payload data.
- Classification: **proven reference implementation only**. This review does not prove PostgreSQL/RLS durability, durable idempotency/audit, OIDC verification, a real provider, deployed API routing, managed secrets, production observability, or production operation.

## Commands and exact results

| Command | Result |
| --- | --- |
| `node --test services/transaction-registry.test.mjs services/connector-ingestion.test.mjs` | PASS; 26/26, 0 failed, 0 skipped; Node duration 0.138 s, wall 0.191 s. |
| `npm ci --ignore-scripts` | PASS; 106 lockfile-pinned packages installed; 0 vulnerabilities; 4.376 s. |
| `npm test` | PASS; 977 total, 976 passed, 0 failed, 1 pre-existing explicit opt-in PostgreSQL skip; Node duration 273.514 s, wall 274.127 s. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` | PASS; 337 Markdown, 65 JSON, 5 YAML; 8.946 s. |
| `npm run format:check` | PASS; 48 pinned-Prettier files and structural exclusions; 4.683 s. |
| `npm run queue:check` | PASS; 9.082 s. |
| `npm run traceability:check` | PASS; 31.079 s. |
| `npm run lint` | PASS; 7.306 s. |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities; 1.584 s. |
| `git fsck --full --strict` | PASS; only preserved dangling objects reported; 13.928 s. |
| `git diff --check 1080d94ec9659852a5e63f278a05dd6e9aa84329..HEAD` | PASS. |
| Authorized-diff inspection | PASS; exactly the six R4-authorized task, handoff, service, and test paths changed from preserved R3 rejection. |
| `git status --porcelain=v2`; `git rev-parse HEAD` | PASS; clean exact candidate `6f53a94e40715b4058f47f979abbc4081c6e4837`. |
| Rejection ancestry checks | PASS; R1 `188f9a9`, R2 `01a2c97`, and R3 `1080d94` are all ancestors of the candidate. |

## Limitations and promotion conditions

The one skipped PostgreSQL rehearsal is pre-existing and explicitly opt-in. The accepted evidence is local, in-memory, and reference-only. It must not be described as durable or deployed production capability.

Promotion requires the supervisor to integrate this sole-file attestation into the exact candidate, rerun candidate-head gates, use the protected pull-request flow, require exact-head hosted repository-validation and repository-security checks, inspect retained evidence, and verify post-merge checks. If integration changes implementation identity or behavior, obtain a fresh independent review. Preserve every R1-R3 rejection and use a reviewed revert before integration or a separate corrective-forward task after integration.
