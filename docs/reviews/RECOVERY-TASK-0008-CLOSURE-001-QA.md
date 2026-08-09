# Independent QA/Security review: RECOVERY-TASK-0008-CLOSURE-001

## Verdict

**REJECT** exact candidate `a296fe5fed7114566e9e5c6419d03828ece10dba`.

The candidate omits required versioned policy provenance from every audit event. The constructor accepts `policyVersion` (default `governed-chat-v2`) and `#emit` attempts to write `this.policyVersion`, but the constructor never assigns that property. Consequently `policy_version` is `undefined` and disappears from serialized audit evidence. This violates the versioned-policy and audit-completeness requirements and prevents an investigator from identifying the policy contract under which a response or refusal was released.

Required corrective-forward action: assign and validate the configured policy version before any request processing, bind the actual independently returned policy decision identifier/version into metadata-only audit evidence where required by the current policy/audit contracts, and add positive plus malformed/missing/accessor/proxy/control/oversize negative tests. Preserve this rejection and obtain a fresh independent review of a new committed candidate. Do not weaken audit, policy, or schema validation.

## Reviewer independence and provenance

- Role: Independent QA/Security, exclusively bound to `agents/QA_SECURITY.md`.
- Reviewer thread: `/root/qa_task_0008_closure_r1`.
- Candidate author/remediator: `/root/schema_task_0008_closure_r1`; this reviewer did not author or remediate the candidate.
- Worktree: `C:\source\upfs-qa-task-0008-closure-r1`.
- Branch: `qa/task-0008-closure-r1`.
- Exact reviewed candidate: `a296fe5fed7114566e9e5c6419d03828ece10dba` (implementation `aecfce1d68910f9752ea6f097513161e5face971`).
- Starting state: exact HEAD and branch verified; worktree clean; candidate diff inspected against protected base `a9996e0496683f6297bee1833e527f004a3e64d6`.
- Allowed output: this review only. No implementation, contract, generated output, task, handoff, queue, matrix, specification, PR, or activation file was edited.

## Governing inputs read and SHA-256

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`
- `agents/QA_SECURITY.md`: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`
- `tasks/recovery/RECOVERY-TASK-0008-CLOSURE-001.yaml`: `0bda2fd8ba4bd2125f2d81e127376023ae0611b2cb14026afff52d691e713060`
- `docs/handoffs/RECOVERY-TASK-0008-CLOSURE-001.md`: `7fb469157dc6d3b88b861841942976e79a01c3d3ec60e057f862b4e5468e32b9`
- `docs/handoffs/TASK-0008.md`: `6a7f183bba483cd3a2f2534607d27afde8f02dcaad6a2416608beffced20dc7c`
- `docs/MASTER_PLAN.md`: `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`
- `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md`: `8f4941b47b090d4cd3eaf02b668dc4d1f32073a4c5930a4aeaf0e88b8c407d7f`
- `tasks/queue.yaml`: `4cdc5df2d5521d8929a171a8c3b168c29a030ab9dff80a594d022d661a320425`
- Architecture/canonical/identity/API: `4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6`, `5c874d646cae8693a48a5f42de75249c5007c1a7bd296da7fd29bd1875cf8ed0`, `c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf`, `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`.
- AI/workflow/policy/delivery: `2238b3be196a9289e661dbeee579526a81c8db238d81428be2f3447d78df0384`, `c7d4c2e4594bc7c9e33b905f845020aada740e0643bcc61215063c35980e0d8a`, `ed41f87a9748089932b9a384d816148ce501f2bc810d247259ffff4fe463f8ed`, `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`.
- Security/threat/testing/docs: `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`, `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`, `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`, `79097cb4fb008f43a58eda063a5cee2536a87b31d52cf7626283fda698e9921d`.
- OpenAPI/generated SDK/docs/service/tests: `a64bfc648916433e8d463ad7d6569d1b2a819321432b2767283a9713adcdcb0a`, `3c7d00e144fe74196801794453dee7bd5263ba4cef35c74e2cd460deb831c0cb`, `d3f011231b185b62b499917a043e4d732c13616e9b2dad21e929d5605a49d166`, `b19295d9d73a7c4c064eebc6687ddc0c72564337f0d771f9031b1ed32580cbbd`, `7e0e4311c211b9ca3d0990a61cb7a7c7c897a9caadb14a7b32715a5ba2d9ea59`.

## Acceptance and security assessment

The committed tests and source inspection substantiate closed server-derived actor/tenant/environment scope, zero-call denial of forged request scope, atomic rejection of cross-scope and malformed retrieval, injection treatment as untrusted data, an empty tool allowlist, no write/action surface, exact content-digest citations, bounded request/context/model/response shapes, deterministic refusal, timeout/outage/rate-limit/replay/conflict/cancellation/supersession handling, and answer-release rollback on audit failure. Generated outputs are generator-bound and the candidate diff is limited to the authorized governed-chat slice plus generated derivatives and provenance records.

Independent hostile-object checks covered proxy/accessor/symbol/sparse/circular/BigInt/control/bidi/oversize cases through the focused suite and source-level tracing. The candidate remains a **Proven reference implementation** only: identity, retrieval, policy, audit and model boundaries are injected/synthetic. No real model, RAG, registry, Redis, durable audit, production identity, API host, managed deployment, customer operation, or production-readiness claim is accepted.

Despite those controls, acceptance criterion 7 and the normative versioned-policy/audit requirements are not satisfied because the emitted audit record cannot identify its configured policy version. Passing repository tests do not override this independently reproduced failure.

## Commands, results, and durations

- `node --test --test-concurrency=1 services/governed-chat.test.mjs`: PASS 14/14, zero fail/skip, 94 ms runner duration.
- `node --test --test-concurrency=1 services/governed-chat.test.mjs services/policy-workflow.test.mjs scripts/task-0099-ai-context-safety.test.mjs`: PASS 35/35, zero fail/skip, 240 ms runner duration.
- Independent inline Node audit assertion: **FAIL as expected**. With `policyVersion: "configured-v9"`, the successful response emitted an audit event whose `policy_version` was `undefined`; exact assertion expected `configured-v9`. The serialized event contained only hashes, request/action/decision/outcome/count/time metadata.
- Initial `npm test -- --test-concurrency=1`: environment setup failure, 921 pass/7 module-resolution failures/1 skip, 4.05 seconds; fresh isolated worktree lacked `yaml`, `prettier`, and `pg`. This is not candidate evidence and was preserved.
- `npm ci`: PASS, 106 packages installed, 107 audited, zero vulnerabilities, 4.3 seconds.
- Exact-candidate `npm test -- --test-concurrency=1`: PASS 1,024 total; 1,023 pass; 0 fail; 1 pre-existing opt-in PostgreSQL skip; TAP 1,682,427 ms, wall 1,683.1 seconds.
- `npm run contracts:check`: PASS, 0.8 seconds; `npm run generated:check`: PASS, 0.9 seconds; `npm run static:check`: PASS, 1.5 seconds.
- `npm run policy:check`: PASS 6/6, 0.8 seconds; `npm run prompt:check`: PASS 14/14, 0.8 seconds.
- `npm run format:check`: PASS, 48 pinned files plus structural closure, 3.3 seconds; `npm run lint`: PASS, 5.4 seconds.
- `npm run queue:check`: PASS, 11.4 seconds; `npm run traceability:check`: PASS, 28.0 seconds.
- `npm audit --audit-level=high`: PASS, zero vulnerabilities, 1.3 seconds.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`: PASS, 369 Markdown/65 JSON/5 YAML, 11.0 seconds.
- `git diff --check`: PASS. `git fsck --full --strict`: PASS with only preserved dangling audit objects reported, 13.1 seconds combined with inspection.

## Negative tests, leakage, rollback, and limitations

Negative coverage exercised authorization denial, forged/cross-tenant/cross-environment scope, partial mixed retrieval, malformed dependency shapes, injection, unavailable/timeout dependencies, policy exception, citations, rate limits, replay conflicts, cancellation, supersession, stale response suppression, audit failure rollback, metadata leakage, contract/generated drift, and deterministic refusal. No prompt, record, answer, evidence identifier, amount, currency, tenant/environment identifier, provider/customer payload, credential, or secret was observed in serialized audit output. The defect is missing non-sensitive governance metadata, not sensitive-data exposure.

Rollback/corrective-forward: do not promote or activate this candidate. Preserve candidate, handoff, this rejection, and all command evidence. Correct on a new role-bound Schema/Search/AI branch with a separate commit and handoff, then use a different fresh QA/Security reviewer from that exact committed candidate. TASK-0009 remains blocked; TASK-0112 through TASK-0123 remain frozen.
