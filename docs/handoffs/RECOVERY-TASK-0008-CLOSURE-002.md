# Handoff: RECOVERY-TASK-0008-CLOSURE-002

- Task and scope: corrective-forward remediation of the independently rejected `TASK-0008` reference slice. Require, validate, immutably retain, and emit configured policy provenance without weakening any R1 governed-chat control.
- Agent role: Schema/Search/AI, exclusively bound to `agents/SCHEMA_SEARCH_AI.md`; SHA-256 `8b05d11c936e7d0eac9ea63cf5b34cc594b620205292054bfcd6e01046050d9d`.
- Agent thread: `/root/schema_task_0008_closure_r2`. The runtime has no native UPFS custom-role field; the initial assignment bound this documented role and required pre-edit path/digest proof.
- Worktree, branch, and base: `C:\source\upfs-schema-task-0008-closure-r2`; `recovery/task-0008-closure-r2`; exact rejected-evidence base `275863078ee8829bd984e0d6be9af827934dfcf9`.
- Implementation/task commit: `50d28fee68c7ce9dbb9bccaec356c0daad2c87e8`. This separate descendant contains only this handoff and is the candidate to be reviewed.
- Files changed: `services/governed-chat.mjs`; `services/governed-chat.test.mjs`; `tasks/recovery/RECOVERY-TASK-0008-CLOSURE-002.yaml`; and this handoff only.
- Contracts/migrations: none. The existing governed-chat OpenAPI and generated derivatives are unchanged. No schema, persistence, index, cache, or deployment migration exists or is claimed.

## Governing inputs and exact provenance

- `AGENTS.md` `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`; `agents/WORKTREES.md` `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`; `agents/HANDOFF_TEMPLATE.md` `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`; engineering constitution `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- R1 structured task `0bda2fd8ba4bd2125f2d81e127376023ae0611b2cb14026afff52d691e713060`; R1 handoff `7fb469157dc6d3b88b861841942976e79a01c3d3ec60e057f862b4e5468e32b9`; preserved QA rejection `a98133b334518dd637c5aa8bc1a151c6461bd5598eb87de81440324ef9486722`.
- Master plan `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`; closure matrix `8f4941b47b090d4cd3eaf02b668dc4d1f32073a4c5930a4aeaf0e88b8c407d7f`; queue `4cdc5df2d5521d8929a171a8c3b168c29a030ab9dff80a594d022d661a320425`; historical handoff `6a7f183bba483cd3a2f2534607d27afde8f02dcaad6a2416608beffced20dc7c`.
- Architecture `4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6`; canonical model `5c874d646cae8693a48a5f42de75249c5007c1a7bd296da7fd29bd1875cf8ed0`; identity/tenant model `c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf`; API standards `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`.
- AI runtime `2238b3be196a9289e661dbeee579526a81c8db238d81428be2f3447d78df0384`; workflow runtime `c7d4c2e4594bc7c9e33b905f845020aada740e0643bcc61215063c35980e0d8a`; policy system `ed41f87a9748089932b9a384d816148ce501f2bc810d247259ffff4fe463f8ed`; delivery pipeline `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`.
- Security baseline `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`; threat model `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`; testing strategy `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`; documentation platform `79097cb4fb008f43a58eda063a5cee2536a87b31d52cf7626283fda698e9921d`.
- Starting service `b19295d9d73a7c4c064eebc6687ddc0c72564337f0d771f9031b1ed32580cbbd`; starting test `7e0e4311c211b9ca3d0990a61cb7a7c7c897a9caadb14a7b32715a5ba2d9ea59`; governed-chat OpenAPI `a64bfc648916433e8d463ad7d6569d1b2a819321432b2767283a9713adcdcb0a`; generated API reference `3c7d00e144fe74196801794453dee7bd5263ba4cef35c74e2cd460deb831c0cb`; generated SDK `d3f011231b185b62b499917a043e4d732c13616e9b2dad21e929d5605a49d166`.
- Final implementation bytes: service `b5602b352d9eb2349ae8ceb806622ef74015dbc5448da1f34c3a77e4283a536b`; tests `8faad8e48993dec13ea40bbd2c071f78c0338993bb0b39bc37e84b58f7ed6487`; R2 task `598867166126de5e794298779babe0ff1f355bd401f470e66ea7d3b4b19b6d9b`.

## Implementation plan and acceptance trace

1. Preserve the R1 candidate, handoff, rejection, API contract, generated outputs, and broader repository evidence unchanged.
2. Reject absent or unsafe `policyVersion` configuration during construction, before any request or injected dependency can execute.
3. Store the accepted identifier in a private class field so public instance mutation and request/retrieval/model data cannot replace it.
4. Emit that exact configured version on every metadata-only audit event. Where independent policy evaluation succeeded, also bind the exact returned `policy_id` and decision `version`.
5. Exercise the original `configured-v9` QA assertion and hostile/missing/accessor/proxy/control/oversize/non-override cases, while retaining the complete R1 negative suite.

The constructor now requires a primitive policy version matching the existing bounded safe identifier contract (`1..200` allowlisted identifier characters). Missing, empty, oversized, control-bearing, whitespace-bearing, coercible-object, accessor-config, and proxy-config values fail closed. The validated value is stored in private `#policyVersion` state. Audit composition happens after event fields and therefore always binds the trusted configured value. Valid policy decisions contribute only their bounded, already-validated identifier/version metadata; pre-policy failures explicitly record null decision provenance while still carrying configured policy provenance.

## Security, tenant isolation, audit, and leakage analysis

- This correction does not alter identity derivation, authorization, tenant/environment scope, retrieval bounds, citation verification, tool/write prohibition, replay, cancellation, supersession, timeout, rate limit, or audit-release rollback.
- Request values, public-property assignment, malformed retrieval rows, and extra model-output fields cannot override the private configured policy version. Malformed dependency output continues to fail closed.
- Every attempted audited result uses the same exact configured version, including invalid request/authentication, derived-scope denial, policy outage/denial, rate limit, retrieval/model outage or timeout, malformed dependency output, cancellation, supersession, replay/conflict, deterministic refusal, verified success, and the event delivered to a failing audit sink.
- After an accepted independent policy decision, audit records also contain its exact bounded `policy_id` and `policy_decision_version`. Earlier failures contain null decision provenance and disclose no resource existence.
- Audit remains metadata-only. Tests and source review found no prompt, record, answer, description, account/transaction/evidence identifier, amount, currency, tenant/environment identifier, provider/customer payload, credential, or secret in serialized evidence.
- Audit-sink failure still returns `audit_unavailable`, does not release an answer, and does not populate replay state. The attempted event retains exact configured and decision policy provenance.
- Tenant isolation remains server-derived and deny-by-default; mixed or foreign retrieval is still rejected atomically without disclosure.

## Tests, negative cases, and exact results

- `npm ci`: PASS; 106 packages installed, 107 audited, zero vulnerabilities, 4.3 seconds.
- Focused `node --test --test-concurrency=1 services/governed-chat.test.mjs`: PASS 16/16, zero failure/skip, 153.9 ms.
- Related governed-chat/policy/AI context group: PASS 37/37, zero failure/skip, 282.3 ms.
- Negative coverage added: missing/null/empty/oversized/control/whitespace policy version; coercible object; hostile value proxy; accessor-bearing and proxy constructor configuration; attempted public instance override; request/retrieval/model override attempts; exact configured version on invalid request, scope denial, policy exception, malformed retrieval/model, refusal, replay, retrieval/model timeout, success, and audit-sink failure.
- Existing R1 negative coverage retained: forged/cross-tenant/cross-environment scope; authorization denial; mixed retrieval; hostile closed shapes; prompt injection; missing/duplicate/foreign/mismatched citations; dependency outage/timeout; replay conflict; rate limiting; cancellation; supersession; leakage; and atomic audit rollback.
- `npm run contracts:check`, `generated:check`, `static:check`, `lint`, `queue:check`, and `traceability:check`: PASS.
- `npm run policy:check`: PASS 6/6. `npm run prompt:check`: PASS 16/16. `npm audit --audit-level=high`: PASS, zero vulnerabilities.
- First exact implementation-head full suite: **FAIL preserved**, 1,026 total; 1,024 pass; 1 fail; 1 pre-existing opt-in PostgreSQL skip; TAP 1,731,150.9 ms / 1,731.8 seconds wall. The sole failure was unrelated `scripts/ci-gate-validator.test.mjs` v3 transport setup losing its unique fresh-clone bundle before a copy (`ENOENT` at line 705). No authorized source was changed in response.
- Exact smallest unchanged-head reproducer `node --test --test-concurrency=1 --test-name-pattern="v3 provenance bundle is complete" scripts/ci-gate-validator.test.mjs`: PASS 1/1, zero failure/skip, 78,575.6 ms.
- Single unchanged-head full rerun: PASS 1,026 total; 1,025 pass; 0 fail; 1 pre-existing opt-in PostgreSQL skip; TAP 1,683,735.2 ms / 1,685.4 seconds wall.
- Committed-head `scripts/validate.ps1`: PASS, 370 Markdown / 65 JSON / 5 YAML. `npm run format:check`: PASS, pinned Prettier plus 48-file structural closure.
- `git fsck --full --strict`: PASS with preserved dangling audit objects reported. `git diff --check`: PASS. Authorized diff from base contains only the service, service test, R2 task, and this handoff. Worktree was clean at exact implementation head before this handoff was authored.

## Classification, limitations, rollback, and independent review

- Classification ceiling remains **Proven reference implementation**. This correction repairs governance metadata in an injected local boundary; it does not elevate production capability.
- Not implemented or claimed: real model/provider integration, production RAG/retrieval, governed registries, Redis, PostgreSQL/OpenSearch adapters, production OIDC/workload identity, durable audit, API-host wiring, deployment, managed infrastructure, customer operation, SLO/load evidence, certification, or human review.
- External/dependency prerequisites remain production identity, governed registries/model credentials, durable canonical/projection retrieval, Redis, durable audit, managed infrastructure, protected deployment, and real runtime evidence.
- Rollback/corrective-forward: before integration, abandon this branch while preserving its commits; after integration, use a reviewed revert or a new bounded corrective-forward change. Never remove required configured policy provenance, weaken mandatory audit release, or relax R1 authorization/tenant/citation controls.
- Preserved rejection: R1 remains rejected at `docs/reviews/RECOVERY-TASK-0008-CLOSURE-001-QA.md`; no historical evidence was edited or discarded.
- Independent reviewer: pending a fresh, distinct QA/Security agent operating from this exact committed candidate in an isolated worktree. The reviewer must not edit implementation. TASK-0008 is not accepted, no activation is authorized, TASK-0009 remains blocked, and TASK-0112–TASK-0123 remain frozen until independent acceptance and protected integration.
