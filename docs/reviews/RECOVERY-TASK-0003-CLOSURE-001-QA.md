# Independent QA/Security review: RECOVERY-TASK-0003-CLOSURE-001

## Verdict

**REJECT.** Candidate `4cf37740480dcea9002451331e9b9dd02e5fa774` passes its committed tests and repository gates, but independently reproduced malformed-identity and malformed-metadata fail-open behavior. A verified actor with whitespace-only issuer and subject is accepted and persisted as meaningless attribution. Whitespace-only taxonomy, provider-category, evidence, and provenance strings are also accepted although the structured task requires malformed values to fail closed. A separate corrective-forward implementation and fresh independent review are required.

## Reviewer provenance

- Task: `RECOVERY-TASK-0003-CLOSURE-001`, historical `TASK-0003`.
- Role: Independent QA/Security under `agents/QA_SECURITY.md`; this reviewer did not author or remediate the candidate.
- Role file: `agents/QA_SECURITY.md`; SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Agent thread: `/root/qa_task_0003_closure_r1`.
- Worktree: `C:\source\upfs-qa-task-0003-closure-r1`.
- Branch: `qa/task-0003-closure-r1`.
- Base: `1156e7e8d2c03463768c0306a73fbaa584af3539`.
- Exact candidate: `4cf37740480dcea9002451331e9b9dd02e5fa774`.
- Structured task: `a71e5a43e46afcc4e5da4d9315be4f861a27ad5a`.
- Implementation: `40a95f565f7de370a022b75c69cdf38e5c863274`.
- Connector corrective-forward: `02d91ddaed45802b50b06450b9745d69331d59c1`.
- Candidate handoff commits: `e0cecb1c5bd28486366435f78c9953695125e586` and `4cf37740480dcea9002451331e9b9dd02e5fa774`.
- Review method: exact committed candidate in a fresh isolated worktree; no implementation file was edited.

## Governing inputs loaded

The reviewer read the complete content of each applicable input before review:

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
| `docs/handoffs/RECOVERY-TASK-0003-CLOSURE-001.md` | `1a01a0a81ed34efa2e814b1f673ca25662a5e103582dde0a5e1cc3e539a8af1f` |
| `contracts/schemas/transaction.schema.json` | `4d19012b395b60ff3322c4dc4c2983b20a52c6822e443a32250ba496f6991565` |
| `contracts/schemas/canonical-transaction.schema.json` | `7ffa70302a6d04d5f32c116ba829d6a85452b5c47fa356865f0526be58b62c43` |
| `contracts/schemas/provider-transaction.schema.json` | `182f03a7d1436da5f2502a5eca1eb4d215f94efcd8e3fa3f85827961b54fd25d` |
| `contracts/schemas/identity-foundation.schema.json` | `4d1e9ece1ca131fea50c0b0b35761c7086a6610747cbfbd0913cb4d860c7f022` |
| `services/transaction-registry.mjs` | `1a20f4dfaa0e767abc4a7ed99516ddac76a524aae7bdfe9681d9ee8de2718822` |
| `services/transaction-registry.test.mjs` | `a4487aec76f1f99dc72c5e11238897f64b44277d56b375ba2a841f53758e7a43` |
| `scripts/generate-registry.mjs` | `963f26c231f7369772e8d90fbfee8277dbe43cf882e67489652c50f0be868326` |
| `services/connector-ingestion.mjs` | `fdeffad52ee878832358df6542fe7731caec88001c9e3e20218383ceee8d7922` |
| `services/connector-ingestion.test.mjs` | `b6a595cad4a9f9c3ffb835497be10ede3d384f145e9eb2531eb7240c9485f355` |
| `artifacts/schema-registry.json` | `648bfbc053d127617d3e6f88fdbfb8127ce91edcd5ce771b6354eba3aa6e2431` |

The current `tasks/queue.yaml` and `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md` TASK-0003 rows and historical `docs/handoffs/TASK-0003.md` were also inspected. The historical handoff digest remains `ef2a4e0348ae92f4862c172027a9c32831095caa925bd48f10dd1f22c58e9ec2` and is not treated as current independent evidence.

## Acceptance trace and security assessment

- Deterministic registry identity/version/path/raw-byte digest and atomic publication: covered by focused tests and independently passed.
- Canonical schema 1.1 financial, lifecycle, valid/system time, observation, evidence, confidence, provider category, taxonomy, provenance, actor and version fields: present and exercised, but malformed string semantics are incomplete as described below.
- Verified actor-derived organization/tenant/environment authorization: tenant/environment derivation, forged client scope, cross-tenant/environment denial, and non-disclosing absent/cross-scope reads pass. Whitespace-only verified identity claims fail open.
- Idempotency/replay/concurrency: payload-bound replay, changed-payload conflict, `If-Match` stale-write rejection, immutable returned copies, and retry after injected pre-commit failure pass.
- Audit/atomic failure/rollback: success, replay, failure, read and history evidence is metadata-only; injected pre-commit failure leaves domain/history/idempotency state unchanged. Audit identity integrity is undermined by whitespace-only actor acceptance.
- Connector compatibility: the initial implementation-head full run is truthfully preserved at 964 pass, 2 connector failures, 1 pre-existing skip. Corrective commit `02d91ddaed45802b50b06450b9745d69331d59c1` updates only the authorized connector files and the focused connector composition passes without a legacy bypass.
- Contract/generated/document drift: deterministic regeneration and raw schema digests pass; validation, formatting, queue, traceability and authorized-diff checks pass.
- Production claims: the handoff correctly limits classification to a proven reference implementation. There is no PostgreSQL/RLS, OIDC verification, public route, real provider, durable audit/idempotency, deployment, or managed-runtime proof.

## Blocking findings

### QA-0003-001 — High — malformed verified identity is accepted and persisted

`CanonicalTransactionService.#scope` tests only JavaScript truthiness for `actor.issuer` and `actor.subject`. Whitespace-only values pass. With a scope adapter returning an authorized UUID tenant/environment, the exact candidate returned HTTP-like status `201` for:

```js
actor: { verified: true, issuer: "   ", subject: "   " }
```

The created record contained `created_by`, `updated_by`, and appended canonical provenance actor value `"   |   "`. This violates the structured security requirement that malformed actors fail closed and makes audit attribution meaningless.

Required remediation: reject empty-after-trim issuer and subject before calling or accepting authorization-derived scope; add focused negative cases showing no domain, history, idempotency, or unsafe audit mutation and no resource-existence disclosure. Do not normalize an invalid claim into a valid identity silently.

### QA-0003-002 — High — malformed canonical metadata strings fail open

The same truthiness-only pattern accepts whitespace-only values in provider/category pairs, all governed taxonomy fields, source observations/evidence references, and provenance `kind`, `actor`, and `source_ref`. These values satisfy `value.length > 0` or `!value === false`, so `validateTransaction` returns success. The structured task expressly requires malformed taxonomy, category, evidence, and provenance values to fail closed; these fields also feed evidence custody and attribution.

Required remediation: enforce non-whitespace bounded strings consistently in the service and contract, preserve exact provider category values without silently trimming or remapping them, regenerate the deterministic registry, and add negative cases for every affected family. Verify contract/service agreement and generated-digest drift after the correction.

## Commands and results

| Command | Result |
| --- | --- |
| `node --test services/transaction-registry.test.mjs services/connector-ingestion.test.mjs` | PASS, 17/17, 0 failed, 0 skipped; 0.181 s wall time. |
| Initial `npm test` before dependency install | Environment/setup failure only: 870 pass, 7 module-loader failures (`yaml`, `prettier`, `pg` absent), 1 skip; 7.765 s. Not acceptance evidence. |
| `npm ci` | PASS; 106 lockfile-pinned packages installed; 0 vulnerabilities; 4.9 s. |
| Dependency-complete `npm test` | PASS, 968 total, 967 pass, 0 fail, 1 pre-existing opt-in PostgreSQL skip; 276.662 s wall time. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` | PASS; 331 Markdown, 65 JSON, 5 YAML; 9.171 s. |
| `npm run format:check` | PASS; 48 pinned-Prettier files and closure structures; 4.660 s. |
| `npm run queue:check` | PASS; 9.331 s. |
| `npm run traceability:check` | PASS; 30.646 s. |
| `npm run lint` | PASS; 7.762 s. |
| `npm audit --audit-level=high` | PASS; 0 vulnerabilities; 2.077 s. |
| `git fsck --full --strict` | PASS; only preserved dangling blobs/trees reported; 13.5 s shared command. |
| `git diff --check` | PASS. |
| `git diff --name-only 1156e7e8...HEAD` | PASS authorized-path inspection: exactly the nine task-authorized paths. |
| `git status --short`; `git rev-parse HEAD` | Clean implementation head at exact candidate before this sole review file; `4cf37740480dcea9002451331e9b9dd02e5fa774`. |
| Independent whitespace-only actor reproducer | FAIL-CLOSED EXPECTATION VIOLATED: returned `201` and persisted whitespace attribution. |

## Limitations and required next action

This review is local committed-state evidence, not hosted or production-runtime evidence. The one skipped PostgreSQL rehearsal is pre-existing and explicitly opt-in. Synthetic/in-memory tests do not prove durable bitemporal PostgreSQL, OIDC, real provider, public API, managed secrets, deployment, backup, or operational behavior.

Preserve this rejection and the initial implementation rejection. Create a separate Schema/Search/AI corrective-forward commit addressing `QA-0003-001` and `QA-0003-002`, update contract/registry hashes and targeted negative tests, run all gates, and assign a different fresh QA/Security reviewer to the exact corrected candidate. Do not integrate, activate TASK-0003, or begin TASK-0004 on this rejected candidate.
