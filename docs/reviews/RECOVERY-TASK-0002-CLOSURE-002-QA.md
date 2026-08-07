# Independent QA/Security review: RECOVERY-TASK-0002-CLOSURE-002

## Disposition

**ACCEPTED** for exact candidate
`c13b0134091937cfcb3cc4db4304ed7be3c5f740`.

This acceptance covers the in-repository, in-memory reference composition only. It does not establish durable PostgreSQL/RLS persistence, production OIDC or workload identity, API route wiring, deployment, managed secrets, or production runtime operation. Protected hosted checks and merge evidence remain required before TASK-0002 may be promoted.

## Review provenance and topology

- Reviewer: independent Codex QA/Security under `agents/QA_SECURITY.md`; thread `/root/qa_task_0002_closure_r2`. The reviewer did not author or remediate R1 or R2 and did not edit implementation.
- Isolated worktree and branch: `C:\source\upfs-qa-task-0002-closure-r2`; `qa/task-0002-closure-r2`.
- Exact reviewed candidate: `c13b0134091937cfcb3cc4db4304ed7be3c5f740`.
- R2 base and independent R1 rejection review: `870014d0d02873eeab4f14efa741cc43e06c7fd5`.
- R2 structured task: `603b20ed995c76369e0643405ee1582c2a4af3b7`.
- R2 implementation: `8e77b1107f94e756f4865b3988aff7cd4a1b268b`.
- R2 final handoff candidate: `c13b0134091937cfcb3cc4db4304ed7be3c5f740`. This is deliberately distinct from the implementation commit; the handoff cannot self-name its own resulting commit, and this independent review binds the exact final candidate externally.
- R1 rejected implementation `d791351ca51102da289f7c3e40bf61bfa2ebd850`, rejected final candidate `96e7834682eb6de1f1f9605f5c8bf8a497bce46a`, and rejection review `870014d0d02873eeab4f14efa741cc43e06c7fd5` remain preserved. Blob identity checks confirm the R1 task, handoff, and rejection review are unchanged between the R2 base and candidate.
- Base is the exact merge-base and an ancestor of the candidate. The R2 net diff contains exactly four authorized paths: the new R2 task and handoff plus the service and focused test modifications. No queue, closure matrix, historical handoff, R1 record, contract, specification, TASK-0001, TASK-0003+, or TASK-0111+ path changed.

## Role and input digests

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`
- `agents/QA_SECURITY.md`: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`
- `docs/MASTER_PLAN.md`: `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`
- `specs/03_architecture/system_architecture.md`: `4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6`
- `specs/04_schema/identity_tenant_model.md`: `c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf`
- `specs/05_apis/api_standards.md`: `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`
- `specs/10_security/security_baseline.md`: `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`
- `specs/10_security/threat_model.md`: `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`
- `specs/12_testing/test_strategy.md`: `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`
- `contracts/schemas/identity-foundation.schema.json`: `4d1e9ece1ca131fea50c0b0b35761c7086a6610747cbfbd0913cb4d860c7f022`
- `tasks/queue.yaml`: `0a68c4b846e9daacd2eefc6d18bafa1ab5a1567ac848c5bf1ca6b94e5376e02b`
- `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md`: `05e29ce65b83b934fa80b116bb4052e74088de9e766d4b8de703941c091b2922`
- `docs/handoffs/TASK-0002.md`: `87c46cf294e267470264b0ffe4cb941fd519a0a3ce4e73a39b9e37e09ae4818d`
- `tasks/recovery/RECOVERY-TASK-0002-CLOSURE-001.yaml`: `6b84be559a692b8e2680d93c0d7af857fc4013210a98b54567c796162ae046a7`
- `docs/handoffs/RECOVERY-TASK-0002-CLOSURE-001.md`: `bed0ba7d71701cb4d00f28d5ef7cfa1345db6276f48cfd523d31bb6dc51796fc`
- `docs/reviews/RECOVERY-TASK-0002-CLOSURE-001-QA.md`: `99c232ffdee046ed65217a8b3a86b71a4c5ecb90471eea5055ef632a0d4bc53a`
- `tasks/recovery/RECOVERY-TASK-0002-CLOSURE-002.yaml`: `102402d3e1c989688e2809165c82ec279dc62a6d815523941a7fffeb490aa2a2`
- `docs/handoffs/RECOVERY-TASK-0002-CLOSURE-002.md`: `bbc0fc4d40206bf64126aa4652dcfe53862ef33e86aa6f99434ac38104cb07df`
- Service: `1f2f78f270eb89bc0b8a65b3d19726f205914b5fef36e52f673c48071519a730`
- Focused test: `eab0e37e9ed3c207ad28ae03fb91ea483e732d28e8c6c65af0b7cc8de7fbce11`

## R1 defect reproduction and correction evidence

1. **Tenant idempotency collision oracle — corrected.** Idempotency state is namespaced by verified organization, tenant, environment, operation, and caller key. The authored and independent tests prove the same key succeeds independently in two scopes while a changed-payload replay conflicts only inside its own scope.
2. **Non-atomic domain/idempotency/audit state — corrected for the repository contract.** `commitWithAudit` is the required atomic primitive. Injected atomic failure leaves domain maps, idempotency, and audit empty; retry succeeds. Service failure leaves no domain/idempotency state and appends a bounded failure event. Runtime-throwing adapters return `REPOSITORY_UNAVAILABLE` without leaking exception text.
3. **Incomplete adapter and raw exception leakage — corrected.** Composition validates every required method and initial state/audit shapes. Missing or malformed adapters fail `CONFIGURATION_ERROR`; throwing adapters produce bounded, retryable repository errors.
4. **UUID/schema/lifecycle mismatch — corrected.** Actor and scope identifiers require UUIDs; nested returned resources contain only schema-declared fields with UUID IDs, RFC3339 timestamps, integer versions, and `active`/`suspended`/`deactivated` lifecycle values. Deactivated organization or tenant parents make child reads and transitions opaque; terminal resources cannot be resurrected.
5. **Replay omitted from audit — corrected.** Valid replay appends redacted `replayed` evidence while leaving one domain effect. Changed-payload replay appends a bounded failure code without payload values.
6. **Malformed actor accepted — corrected.** Missing, unverified, empty, whitespace, wrong-type, and non-UUID actor identifiers fail closed. Missing permission, forged scope, and cross-tenant attempts return non-disclosing denial.
7. **Ambiguous final-candidate provenance — corrected.** The handoff names `8e77b11...` only as the implementation/Git-bound evidence head and requires external review to bind the resulting final handoff commit. This report binds exact final candidate `c13b013...`.
8. **Nonexistent gate commands — corrected.** The R2 task requires the repository's actual `queue:check` and `traceability:check` commands; both pass.

## Independent security and negative testing

The independent in-memory adversarial harness passed after one QA-harness-only correction: its first two invocations mistakenly allowed a JavaScript default parameter to substitute a valid actor for the intended missing actor. No repository file changed and no candidate defect was inferred from that invalid harness. The corrected harness then passed all assertions.

Independent cases covered same-key cross-tenant independence, within-scope changed-payload replay, null/empty/whitespace/wrong-type/non-UUID/unverified actor denial, missing permission, forged scope, cross-tenant read/write non-disclosure, stale concurrency, invalid transition, service/atomic repository failure, retry, incomplete and throwing adapters, bounded error leakage, replay audit without duplicate mutation, defensive audit copies, organization and tenant parent deactivation, child opacity, terminal lifecycle, and audit payload/name/secret/token leakage checks.

The audit sequence contains identifiers and bounded outcome/error codes, not mutation payload values, credentials, tokens, prompts, documents, account data, or financial descriptions. Tests use synthetic UUIDs and names only. No customer data or production credential was used.

## Commands and results

| Command | Result |
| --- | --- |
| `node --test services/identity-organization-tenant-and-environment-foundation.test.mjs` | PASS: 11/11, 0 failed; Node 98.537 ms, wall 155 ms. |
| Corrected independent adversarial harness via `node --input-type=module -` | PASS: tenant/idempotency, actor/authz, cross-tenant, replay, concurrency, lifecycle, atomicity, adapter, retry, audit immutability, and leakage assertions; wall 101 ms. |
| Independent organization-parent and changed-replay-audit harness | PASS: organization deactivation makes children opaque; replay conflict is redacted and auditable. |
| `npm test` | PASS: 960 total, 959 passed, 0 failed, 1 pre-existing skip; Node 305.095 s, wall 305.797 s. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` | PASS: 323 Markdown, 65 JSON, 5 YAML; wall 8.585 s. |
| `npm run format:check` | PASS: Prettier and closure structure, 48 pinned files; wall 5.334 s. |
| `npm run queue:check` | PASS; wall 8.811 s. |
| `npm run traceability:check` | PASS; wall 31.624 s. |
| `npm audit --audit-level=high` | PASS: zero vulnerabilities; wall 2.296 s. |
| `git fsck --full --strict` | PASS in 13.664 s; only preserved dangling local objects reported. |
| `git diff --check`, exact ancestry/merge-base, authorized-path inventory, R1 blob-identity comparison, exact HEAD, and clean-worktree checks | PASS at `c13b013...`. |

The fresh QA worktree initially lacked `node_modules`, so an attempted format check could not find local `prettier`. A concurrent partial dependency setup then left an ignored incomplete `node_modules` tree and `npm ci` returned `ENOTEMPTY`. After confirming no QA validation process remained, only that generated ignored directory inside the exact QA worktree was removed; lockfile-pinned `npm ci` then passed with 106 packages and zero vulnerabilities. All reported acceptance gates above ran afterward against the unchanged candidate.

## Classification, limitations, and rollback

`InMemoryFoundationRepository` remains explicitly a **reference composition seam**. Its transactional interface defines required semantics, but this review does not prove a durable adapter, PostgreSQL transaction/RLS behavior, multi-process concurrency, production identity integration, API hosting, deployment, managed infrastructure, or operational runtime evidence. Those are external or later dependency-controlled requirements and must not be represented as TASK-0002 production deployment.

Preserve R1, its rejection, R2, and this review. Before integration, rollback is a reviewed revert of only the additive R2 commits. After integration, use lifecycle corrective-forward recovery or a reviewed revert without deleting audit evidence. Any hosted-check or integration failure requires a separate correction and re-review; this local acceptance is not permission to bypass protected promotion.

## Final verdict

**ACCEPTED** for exact candidate `c13b0134091937cfcb3cc4db4304ed7be3c5f740`, subject to successful exact-head protected hosted validation/security checks and merge evidence. No queue, matrix, historical-status, production-capability, or deployment claim is approved by this report alone.
