# Handoff: RECOVERY-TASK-0006-CLOSURE-001

- Task ID: `RECOVERY-TASK-0006-CLOSURE-001`; historical capability `TASK-0006`.
- Scope/classification: OpenSearch projection, reconciliation, and search API vertical slice, independently reviewable as a **Proven reference implementation** at most. No real OpenSearch, Redis, PostgreSQL, deployed API, managed infrastructure, or production-operation claim is made.
- Agent role: Schema/Search/AI.
- Role file/digest: `agents/SCHEMA_SEARCH_AI.md` (`8b05d11c936e7d0eac9ea63cf5b34cc594b620205292054bfcd6e01046050d9d`).
- Agent thread ID: `/root/schema_task_0006_closure_r1` (the runtime provides no native UPFS role field; the initial assignment bound this role and file/digest proof was reported before editing).
- Worktree/branch/base: `C:\source\upfs-schema-task-0006-closure-r1`; `recovery/task-0006-closure-r1`; `38f187386747acff0e3a62449b025ac406bb06e3`.
- Implementation/task commit: `96b3c73ab5806bd8f6462ef282cdb2792e7bbe17`.
- Initial handoff commit: `fa25d6a3c0e3e7e3314565963f461edcf174968b`; a final adversarial corrective-forward commit additionally bounds malformed actors, throwing authorization adapters, and non-serializable payloads. Final candidate SHA is reported by the supervisor from the committed head.
- Files changed: `services/transaction-projection.mjs`; `services/transaction-projection.test.mjs`; `tasks/recovery/RECOVERY-TASK-0006-CLOSURE-001.yaml`; this handoff. The authorized response schema was inspected but required no byte change.
- Prohibited files unchanged: queue, closure matrix, historical handoff, specifications, workflows/packages, accepted TASK-0001 through TASK-0005 implementation/evidence, unrelated files, TASK-0007+, and TASK-0112 through TASK-0123.

## Inputs and exact provenance

- `AGENTS.md` (`9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`); `agents/SCHEMA_SEARCH_AI.md` (`8b05d11c936e7d0eac9ea63cf5b34cc594b620205292054bfcd6e01046050d9d`); constitution (`e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`); worktree rules (`f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`); handoff template (`4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`).
- Master plan (`2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`); queue and TASK-0006 structured row (`7cd5264f889857ecb628154de09e97db677825daaaa43ccdfe120d06275ddefc`); closure matrix and TASK-0006 row (`b9c016fec8e8a4fde1b8932879646de7b365ddbebd339e404ce1e030e394761d`).
- Architecture (`4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6`); canonical model (`5c874d646cae8693a48a5f42de75249c5007c1a7bd296da7fd29bd1875cf8ed0`); API standards (`23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`); CI/CD (`f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`); security baseline (`53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`); threat model (`716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`); testing (`349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`); documentation platform (`79097cb4fb008f43a58eda063a5cee2536a87b31d52cf7626283fda698e9921d`).
- Starting projection service (`c534966dce799b4593aa017ee1d532979713a3baf7a85e12a5aa56c3973bfb7f`) and test (`b2369173285b883b8992cb15cd3a323f555a65c37f359100bb72bca39b81c6b7`); response schema (`b3098605e8809aa5757282d65ffedc7f80031644e61a132d23f5510bf55589dd`); OpenAPI contract (`a72153d9ab4956288f07693d27e6d2ee9ba31eb8897742db67b80fb5518603f7`); registry (`79c29171f8422d975be57cd05f4a8f9fbc2c934c039c5b0072ff82a5e93e886d`) and test (`6851df781d4f69324f98c4d5298a08a5c995efc83931bd6cdb83d925d09c7a54`); outbox (`9831d498e05a0b9597abc7f11c50e41e9ee1a2a3d38c2e1801fafb55bdcd636c`) and test (`2e8b2baec66c55336203177eb35396b38041558d1e3d6e16407e7105f23567c9`); historical TASK-0006 handoff (`56fb6a2997cf04c285ffd6d5b2e53aaec978714859e7cb7e5da2b99a0fc2bed0`).

## Acceptance, security, and negative evidence

- Deterministic projection/search remains scoped by verified actor authorization and tenant. Mixed-tenant or malformed canonical inputs are rejected rather than filtered, preventing disclosure and false reconciliation parity.
- Event identity is payload-bound. Exact replay is idempotent; conflicting event reuse, same-version mutation, and out-of-order versions fail closed or safely preserve the latest projection.
- Search cursors are HMAC-bound to tenant, normalized query, offset, and the tenant projection generation. Tampering, scope/query substitution, invalid bounds, and mutation between pages return the same bounded invalid-cursor envelope.
- Reconciliation compares a rebuildable projection with caller-supplied canonical truth and never changes canonical input. Drift and stale/unavailable watermarks are surfaced.
- Rebuild writes a staged generation and promotes the alias before replacing the live in-memory projection. Injected document-indexing or alias-promotion failure returns retryable `503`, retains the prior projection, reports `alias_promoted: false`, and creates a payload-free failure audit record.
- Consume indexing failure likewise mutates no projection, watermark, generation, or idempotency record, remains retryable, and records only identifiers/version/actor/time. Search responses redact `source_hash` and `projected_at`.
- Actor claims are bounded strings, authorization adapter exceptions become non-disclosing denials, and non-serializable transaction payloads return a stable invalid-event envelope without state or audit mutation.
- Contract/generated/documentation drift remains covered by repository validation and traceability. No validator, contract, or dependency boundary was weakened.

## Exact implementation-head tests

- Focused: `node --test --test-concurrency=1 services/transaction-projection.test.mjs` — PASS, 11/11, 0 fail/skip, 104.1 ms test duration.
- Compatibility: `node --test --test-concurrency=1 services/transaction-projection.test.mjs services/transaction-registry.test.mjs services/transaction-outbox.test.mjs` — PASS, 33/33, 0 fail/skip, 403.9 ms test duration; 467 ms command.
- Full: `npm test` — PASS, 998 total; 997 passed; 0 failed; 1 pre-existing opt-in PostgreSQL skip; 598499.3 ms test duration; 599000 ms command.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` — PASS, 353 Markdown, 65 JSON, 5 YAML; 10328 ms.
- `npm run format:check` — PASS, 48 pinned-Prettier files and structural closure checks; 3425 ms. `npm run lint` — PASS; `npm run queue:check` — PASS, 10151 ms. `npm run traceability:check` — PASS, 28991 ms.
- `npm audit --audit-level=high` — PASS, 0 vulnerabilities, 1348 ms. `git diff --check` — PASS. `git fsck --full --strict` — PASS, 14544 ms; only pre-existing dangling objects were reported, with no corruption.
- The worktree used a verified ignored `node_modules` junction to `C:\source\upfs-v1\node_modules` because disk space was constrained. It will be removed before final clean-head proof.
- Final-candidate rerun after this handoff commit: pending; the focused/compatibility tests and all repository gates will be rebound to the exact final SHA before independent QA assignment.

## Limitations, rollback, and independent review

- The service is an in-memory reference seam with injectable indexing and alias-promotion adapters. It proves deterministic logic, isolation, failure recovery, and contracts only. It does not prove real OpenSearch aliases/indexes, Redis acceleration, PostgreSQL/RLS composition, a deployed API host, production OIDC, managed infrastructure, operational reconciliation, load/SLOs, or production readiness.
- Preserve the historical commit/handoff and this candidate. Before release, rollback is a reviewed revert of the task commits. After integration, correct forward through a new bounded change and independent review. Never delete rejection evidence or weaken tenant, cursor, reconciliation, contract, or validation gates.
- Independent reviewer/result: pending a distinct QA/Security agent under `agents/QA_SECURITY.md`, using an isolated worktree from the exact committed final candidate and editing no implementation. No push, PR, merge, activation, queue/matrix change, TASK-0007 work, or self-approval is authorized here.
