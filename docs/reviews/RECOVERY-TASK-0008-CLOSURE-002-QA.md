# Independent QA/Security review: RECOVERY-TASK-0008-CLOSURE-002

- Verdict: **ACCEPT** at the strict **Proven reference implementation** ceiling.
- Historical task: `TASK-0008`; corrective task: `RECOVERY-TASK-0008-CLOSURE-002`.
- Candidate reviewed: `facbafdf422033bd2dfbd9b2086fdd9bba12eb0c` (implementation `50d28fee68c7ce9dbb9bccaec356c0daad2c87e8`).
- Reviewer: independent Codex QA/Security agent `/root/qa_task_0008_closure_r2`; assigned only `agents/QA_SECURITY.md`; did not author or remediate R1 or R2.
- Worktree and branch: `C:\source\upfs-qa-task-0008-closure-r2`; `qa/task-0008-closure-r2`. The checkout was clean at the exact candidate before review. The runtime exposes no native custom-role field, so the initial prompt bound the documented role and required path/digest proof.
- Review output restriction: this document is the only file authored by QA. No candidate implementation, task, handoff, contract, queue, matrix, or specification was edited.

## Role and input provenance

- `AGENTS.md` `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`; `agents/QA_SECURITY.md` `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`; `agents/WORKTREES.md` `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`; `agents/HANDOFF_TEMPLATE.md` `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`; constitution `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- Schema/Search/AI role `8b05d11c936e7d0eac9ea63cf5b34cc594b620205292054bfcd6e01046050d9d`; master plan `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`; closure matrix `8f4941b47b090d4cd3eaf02b668dc4d1f32073a4c5930a4aeaf0e88b8c407d7f`; queue `4cdc5df2d5521d8929a171a8c3b168c29a030ab9dff80a594d022d661a320425`; historical handoff `6a7f183bba483cd3a2f2534607d27afde8f02dcaad6a2416608beffced20dc7c`.
- R1 task `0bda2fd8ba4bd2125f2d81e127376023ae0611b2cb14026afff52d691e713060`; R1 handoff `7fb469157dc6d3b88b861841942976e79a01c3d3ec60e057f862b4e5468e32b9`; preserved R1 rejection `a98133b334518dd637c5aa8bc1a151c6461bd5598eb87de81440324ef9486722`; R2 task `598867166126de5e794298779babe0ff1f355bd401f470e66ea7d3b4b19b6d9b`; R2 handoff `20f6e34b7b5d49e219197c6caab47cc521d5a90c0e369bea96bda71ec5ac2cde`.
- Architecture `4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6`; canonical model `5c874d646cae8693a48a5f42de75249c5007c1a7bd296da7fd29bd1875cf8ed0`; identity/tenant `c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf`; API standards `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`; AI runtime `2238b3be196a9289e661dbeee579526a81c8db238d81428be2f3447d78df0384`; workflow `c7d4c2e4594bc7c9e33b905f845020aada740e0643bcc61215063c35980e0d8a`; policy `ed41f87a9748089932b9a384d816148ce501f2bc810d247259ffff4fe463f8ed`; delivery `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`; security baseline `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`; threat model `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`; testing `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`; documentation `79097cb4fb008f43a58eda063a5cee2536a87b31d52cf7626283fda698e9921d`.
- Reviewed service `b5602b352d9eb2349ae8ceb806622ef74015dbc5448da1f34c3a77e4283a536b`; tests `8faad8e48993dec13ea40bbd2c071f78c0338993bb0b39bc37e84b58f7ed6487`; OpenAPI `a64bfc648916433e8d463ad7d6569d1b2a819321432b2767283a9713adcdcb0a`; generated API reference `3c7d00e144fe74196801794453dee7bd5263ba4cef35c74e2cd460deb831c0cb`; generated SDK `d3f011231b185b62b499917a043e4d732c13616e9b2dad21e929d5605a49d166`.

## Acceptance and security findings

- The R1 defect was reproduced from its recorded assertion: audit provenance expected `configured-v9` but was previously `undefined`. R2 closes it by requiring a primitive, bounded, allowlisted `policyVersion` during construction and retaining it in private instance state.
- Missing, null, empty, oversized, control-bearing, whitespace-bearing, coercible-object, boxed-string, hostile-proxy, accessor-bearing, and proxy configuration cannot create a service. These failures occur before retrieval, policy, model, audit, or other sensitive request processing.
- Public-property assignment and request, retrieval, or model fields cannot override the private configured version. Every independently probed audit event carried exactly `configured-v9`.
- After a validated policy decision, audits bind exact `policy_id` and `policy_decision_version`; pre-policy failures retain null decision provenance. Denials, invalid input, policy exception, foreign/malformed retrieval, model/retrieval failure and timeout, replay conflict, rate limit, cancellation, refusal, success, and audit-sink failure remain fail closed.
- The independent adversarial probe covered 13 audited paths. Serialized events contained none of the injected prompt, financial description, amount, currency, tenant UUID, or record payload. Existing tests retain actor/scope derivation, cross-tenant atomic rejection, injection isolation, no-tool/no-write behavior, closed shapes, deterministic citations, replay, cancellation/supersession, and mandatory audit rollback.
- No migration, production identity, durable audit, live retrieval/RAG, real model, Redis, PostgreSQL/OpenSearch adapter, API host, deployment, managed infrastructure, SLO, customer operation, certification, or human review is proven. Tenant and external dependencies remain injected synthetic boundaries. Classification must not exceed **Proven reference implementation**.

## Commands and exact results

- `node --test --test-concurrency=1 services/governed-chat.test.mjs`: PASS, 16/16, 0 failed/skipped, 137.5 ms TAP / 192 ms wall.
- Related governed-chat, policy-workflow, and AI-context suite: PASS, 37/37, 0 failed/skipped, 304.8 ms TAP / 354 ms wall.
- Independent stdin adversarial probe: PASS, 13 audited outcomes; exact immutable policy provenance and sensitive-data absence asserted, 0.2 seconds.
- Initial `npm test -- --test-concurrency=1`: environmental FAIL preserved, 931 total, 923 passed, 7 loader failures, 1 pre-existing opt-in PostgreSQL skip, 4.9 seconds. Exact smallest reproducer reported `ERR_MODULE_NOT_FOUND` for lockfile package `yaml`; this isolated QA worktree had no complete local install.
- `npm ci`: PASS, 106 packages installed, 107 audited, zero vulnerabilities, 4.157 seconds. No tracked file changed.
- Single post-install `npm test -- --test-concurrency=1`: PASS, 1,026 total, 1,025 passed, 0 failed, 1 pre-existing opt-in PostgreSQL skip, 1,680,798.3 ms TAP / 1,681,327 ms wall.
- `npm run contracts:check` PASS 784 ms; `generated:check` PASS 721 ms; `static:check` PASS 1,177 ms; `policy:check` PASS 6/6 in 547 ms; `prompt:check` PASS 16/16 in 585 ms.
- `npm run format:check` PASS, pinned Prettier plus 48-file closure, 3,154 ms; `npm run lint` PASS 4,876 ms; `npm run queue:check` PASS 11,101 ms; `npm run traceability:check` PASS 27,411 ms.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`: PASS, 371 Markdown / 65 JSON / 5 YAML, 10,825 ms. `npm audit --audit-level=high`: PASS, zero vulnerabilities, 1,139 ms.
- `git fsck --full --strict`: PASS 13,032 ms; it reported only preserved dangling audit objects. `git diff --check 2758630..facbafd`: PASS. Authorized range contains exactly `services/governed-chat.mjs`, its test, the R2 structured task, and R2 handoff. Candidate remained clean at exact head.

## Verdict, limitations, and corrective-forward

Every R2 criterion and the surviving R1 authorization, tenant, citation, replay, failure, audit, contract-drift, and leakage controls is evidenced at the exact committed candidate. The environmental first-run failure was independently diagnosed, preserved here, and closed solely by installing the lockfile-pinned dependencies; no source or validator was altered. **ACCEPT** for protected integration at the **Proven reference implementation** ceiling.

Rollback: before integration, abandon the candidate while preserving commits and this review. After integration, use a separately reviewed revert or bounded corrective-forward change. Never remove configured policy provenance, mandatory audit-before-release, server-derived scope, atomic cross-tenant denial, closed schemas, or deterministic citation verification. TASK-0008 is not accepted until this sole-file review commit is integrated with the candidate, exact-head local and hosted gates pass, retained artifacts are inspected, and protected merge/post-merge proof completes. TASK-0009 and TASK-0112–TASK-0123 remain frozen.
