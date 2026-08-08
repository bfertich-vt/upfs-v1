# Independent QA/Security Review: RECOVERY-TASK-0006-CLOSURE-001

## Verdict

**REJECT** exact candidate `605b16fd830441272c323ff8a6f6f23d5cc202bb`. The projection reconciliation boundary throws raw JavaScript exceptions for non-serializable but field-valid canonical inputs, and search accepts non-string tenant identifiers when an authorization adapter returns true. These are fail-closed and tenant-boundary defects. This reviewer did not edit the implementation, tests, task, handoff, queue, matrix, or contracts.

## Reviewer independence and provenance

- Assigned role: Independent QA/Security under `agents/QA_SECURITY.md`.
- Reviewer thread: `/root/qa_task_0006_closure_r1`.
- Worktree: `C:\source\upfs-qa-task-0006-closure-r1`.
- Branch: `qa/task-0006-closure-r1`.
- Candidate: `605b16fd830441272c323ff8a6f6f23d5cc202bb`.
- Candidate tree: `27d8443372b25947805a6b0d3103305f2b4e466f`.
- Candidate parent: `acdc9692d8be1a7f92eed76120171a92efcaa549`.
- Assigned base: `38f187386747acff0e3a62449b025ac406bb06e3`.
- Implementation/task commit: `96b3c73ab5806bd8f6462ef282cdb2792e7bbe17`; initial handoff `fa25d6a3c0e3e7e3314565963f461edcf174968b`; corrective `acdc9692d8be1a7f92eed76120171a92efcaa549`; handoff update `605b16fd830441272c323ff8a6f6f23d5cc202bb`.
- Independence: this reviewer did not author or remediate any candidate commit and began from its committed, clean state in a separate QA worktree.

## Governing inputs loaded before review

- `AGENTS.md` — `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`.
- `agents/QA_SECURITY.md` — `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- `agents/SCHEMA_SEARCH_AI.md` — `8b05d11c936e7d0eac9ea63cf5b34cc594b620205292054bfcd6e01046050d9d`.
- `specs/00_constitution/engineering_constitution.md` — `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- `agents/WORKTREES.md` — `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`; `agents/HANDOFF_TEMPLATE.md` — `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- `tasks/recovery/RECOVERY-TASK-0006-CLOSURE-001.yaml` — `b709cd8cfe3641e960bedac8879bc2c13cecb1d0f6c4838e6a1c422a3c7cc5c4`; candidate handoff — `85f3436dfab33a2559af8c9db8fe7279a03c35c4600eba9bb5b6fbf30df0388e`; historical handoff — `56fb6a2997cf04c285ffd6d5b2e53aaec978714859e7cb7e5da2b99a0fc2bed0`.
- `tasks/queue.yaml` — `7cd5264f889857ecb628154de09e97db677825daaaa43ccdfe120d06275ddefc`; closure matrix — `b9c016fec8e8a4fde1b8932879646de7b365ddbebd339e404ce1e030e394761d`; master plan — `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`.
- Architecture `4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6`; canonical model `5c874d646cae8693a48a5f42de75249c5007c1a7bd296da7fd29bd1875cf8ed0`; identity/tenant model `c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf`; API standards `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`.
- CI/CD `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`; security baseline `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`; threat model `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`; testing `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`; documentation `79097cb4fb008f43a58eda063a5cee2536a87b31d52cf7626283fda698e9921d`.
- Projection service `7337260b3db85ef1abfb948d3b0225b954b4564778f0d666654dfa75cd09b148`; projection tests `730faba3c0f83b0711617a91f556dec7b16cc1230df4e884461b2804dc41677c`; response schema `b3098605e8809aa5757282d65ffedc7f80031644e61a132d23f5510bf55589dd`; OpenAPI `a72153d9ab4956288f07693d27e6d2ee9ba31eb8897742db67b80fb5518603f7`.
- Registry/service tests `79c29171f8422d975be57cd05f4a8f9fbc2c934c039c5b0072ff82a5e93e886d` / `6851df781d4f69324f98c4d5298a08a5c995efc83931bd6cdb83d925d09c7a54`; outbox/service tests `9831d498e05a0b9597abc7f11c50e41e9ee1a2a3d38c2e1801fafb55bdcd636c` / `2e8b2baec66c55336203177eb35396b38041558d1e3d6e16407e7105f23567c9`.

## Scope and test evidence

- `git diff --name-status 38f187386747acff0e3a62449b025ac406bb06e3..605b16fd830441272c323ff8a6f6f23d5cc202bb` proves exactly four authorized files: projection service/test, structured recovery task, and handoff. The response schema and every prohibited file are unchanged. `git diff --check` passed. Initial worktree status was clean.
- Focused compatibility command: `node --test --test-concurrency=1 services/transaction-projection.test.mjs services/transaction-registry.test.mjs services/transaction-outbox.test.mjs` — PASS, 34/34, 0 failed/skipped, 294.9 ms test duration and 348 ms command duration. This differs from the handoff's stale 33/33 count because the committed corrective test adds one case.
- Independent inline Node probe exercised BigInt, circular data, Symbol/BigInt tenant IDs across reconciliation, rebuild, and search. Result: `reconcile()` threw `TypeError: Do not know how to serialize a BigInt` and `TypeError: Converting circular structure to JSON`; `search()` returned HTTP-style 200 envelopes for Symbol and BigInt tenant IDs when authorization returned true. Rebuild converted serialization errors to 503, but mislabeled malformed input as infrastructure failure.
- Full `npm test` and downstream validation/lint/audit/fsck gates were not rerun after this deterministic acceptance-blocking defect. Passing repository-wide gates cannot cure a directly reproduced security boundary failure. The implementation author's recorded full run remains 997 pass/0 fail/1 opt-in PostgreSQL skip; that skip is a limitation, not PostgreSQL coverage.

## Acceptance and security trace

- Tenant-scoped deterministic projection, authorization denial, exact replay, out-of-order handling, same-version conflicts, cursor HMAC/query/generation binding, stale cursor rejection, reconciliation drift, staged alias promotion, rollback on injected indexing/alias failure, audit redaction, response redaction, and registry/outbox compatibility are exercised by the passing committed suite.
- **Failed malformed/non-serializable input criterion:** `validTransaction()` permits arbitrary extra properties. `reconcile()` hashes the whole object outside an exception boundary, allowing BigInt/circular inputs to escape as raw runtime exceptions instead of a stable non-disclosing `400` response. This violates fail-closed API behavior and availability requirements.
- **Failed tenant-boundary criterion:** `search()` does not require `tenantId` to be a bounded string. With an authorization adapter returning true, Symbol and BigInt scopes are accepted and produce successful responses. Scope identifiers must be validated independently of authorization adapter behavior.
- Because the candidate fails these boundaries, concurrent mutation, copy isolation, injected failures, cursor behavior, and compatibility successes do not establish acceptance. No real OpenSearch, Redis, PostgreSQL/RLS, deployed API, production OIDC, managed runtime, or production-operation claim is supported.

## Required corrective-forward and rollback

Create a separate Schema/Search/AI remediation commit that validates tenant IDs as bounded strings before authorization/state access and makes reconciliation/rebuild serialization validation deterministic and fail closed without mutation or misleading infrastructure/audit events. Add regression tests for BigInt, circular, Symbol, and throwing-accessor payloads across consume/reconcile/rebuild, plus Symbol/BigInt/object tenant IDs across reconcile/rebuild/search. Then rerun focused compatibility, full suite, validation, formatting, lint, queue, traceability, high audit, strict fsck, exact diff/scope/clean proofs, and assign a fresh independent QA agent to the new exact candidate. Preserve this rejection and all prior evidence; do not push, promote, activate TASK-0006, or begin TASK-0007 from this rejected candidate.
