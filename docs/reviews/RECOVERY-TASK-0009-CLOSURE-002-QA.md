# Independent QA/Security review: RECOVERY-TASK-0009-CLOSURE-002

- Verdict: **ACCEPT**, limited strictly to a **Proven reference implementation**.
- Candidate reviewed: `3af44b7ee48e5a60fa479693b72482ff3a1b805a` (`docs: hand off TASK-0009 recovery correction`).
- Implementation/task commit: `af3eeb73af2ec083fd7014dff2c72177dc0e700e`.
- Preserved rejected R1 candidate/review: `08f98c88e331c6466c5ceba3a3fccabd035a9886`; rejection commit `5b56ff40e6c881600f840239c967b8f87bbcff37`.
- Reviewer role: Independent QA/Security, exclusively bound to `agents/QA_SECURITY.md`.
- Reviewer thread: `/root/qa_task_0009_closure_r2`.
- Worktree and branch: `C:\source\upfs-qa-task-0009-closure-r2`; `qa/task-0009-closure-r2`.
- Independence: this Codex reviewer did not author or remediate R1 or R2. Review began from the exact committed R2 candidate in a fresh isolated worktree. No implementation, test, task, handoff, specification, contract, queue, matrix, or historical evidence file was edited. This review artifact is the sole authorized write.

## Role and input provenance

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`.
- `agents/QA_SECURITY.md`: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`.
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- `docs/MASTER_PLAN.md`: `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`.
- `tasks/queue.yaml`: `c9d580400eba050ef77fec73905b1fd3894db2e3775b650510afadfb63782cdd`.
- `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md`: `9dc8062736337984b35cbc5713b1386ebebeb940c1e5de32c89a5fa2da367d4d`.
- Historical `docs/handoffs/TASK-0009.md`: `1ffde24b5bb28e8424d421d5157b5def59a711597931858cc3eba27d82808319`.
- R1 task/handoff/rejection: `67f1dca701c2d1ec7099c3188b585336998ff12f34d9c8fb1a74cb1490b717a2`; `f32c4a0860ab83805c5c316edbfa48cbce1c698e13f4a34a627ec34e49914d90`; `102ce90a6b2310f13566f857620f5c3485e455178d7f66637661239a4eb02a70`.
- R2 task/handoff: `66c1484d733d50a1643b80e36906a0d1aff039b1ea95191ed9b61a83e9004c25`; `0146250fd098b7a7c8c9b438da5afdcfd8a0e02f3a81b199b7fbeba912d338c3`.
- Architecture, API, workflow, and policy specifications: `4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6`; `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`; `c7d4c2e4594bc7c9e33b905f845020aada740e0643bcc61215063c35980e0d8a`; `ed41f87a9748089932b9a384d816148ce501f2bc810d247259ffff4fe463f8ed`.
- Delivery, security, threat, testing, and documentation specifications: `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`; `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`; `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`; `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`; `79097cb4fb008f43a58eda063a5cee2536a87b31d52cf7626283fda698e9921d`.
- Public/admin OpenAPI and platform AsyncAPI: `617998625a50a60aaa8f826954c856d0088fe07f135e8983846a0478ea7b3bb1`; `0f2624165cd0bf9ff4b54fbfc9e529503907ab58cccea22742e3b8a957fa0931`; `5968e3065330aa13ba26ddb553e4eb30c385f7496b18951b083eee31e833a7f8`.
- Reviewed service/tests: `42cd65afaeb2dda6b2d6ce13bb42a0a4994622b5fedf07faed5f8cacf33d1889`; `ae46fdc941b92f9e3c201a04ed8abaa80b639e69090914f27806602a978fef22`.

## Scope, history, and acceptance trace

The R2 corrective lineage changes the four authorized files `services/policy-workflow.mjs`, `services/policy-workflow.test.mjs`, `tasks/recovery/RECOVERY-TASK-0009-CLOSURE-002.yaml`, and `docs/handoffs/RECOVERY-TASK-0009-CLOSURE-002.md`. It inherits the unchanged R1 implementation/task/handoff and the immutable R1 rejection artifact. Prohibited specifications, contracts, queue, closure matrix, historical handoff, accepted dependencies, TASK-0010+, and TASK-0112 through TASK-0123 are unchanged.

The implementation closes every persisted recovery region: root bundle, scope, data maps, policies/rules/releases, workflow definitions/steps/retry controls, approval decisions, checkpoints, idempotency request hash and result/body/headers, audit, history, outbox envelopes, and outbox history payloads. Required fields, exact keys, types, bounds, identifiers, timestamps, sequences, uniqueness, scope, and cross-record linkage are checked before assignment. Constructor rejection is atomic because verification and cloning complete before private state assignment.

The broader TASK-0009 acceptance remains green: deny-default policy evaluation and exact version provenance; independently approved immutable policy publication; server-derived tenant/environment authorization; immutable workflow definitions; scoped quorum and creator separation; optimistic concurrency; operation-scoped replay/conflict; typed execution; timers/retry/timeout/cancellation; action requests and verified postconditions; compensation; atomic state/history/audit/outbox/idempotency persistence; and deterministic integrity-bound export/recovery.

## Independent adversarial evidence

- The original R1 defect was independently reproduced against exact rejected candidate `08f98c88e331c6466c5ceba3a3fccabd035a9886`: an exported bundle was modified with `data.audit[0].secret = "customer-financial-data"`, its documented deterministic SHA-256 was recomputed, construction succeeded, and authorized `audit()` returned the injected value. Result: `R1_LEAK_REPRODUCED`.
- The identical checksum-consistent attack against R2 threw a bounded `TypeError`; the hostile value was absent from the error. The unchanged source service remained byte-equivalent and a clean corrected bundle recovered successfully. Result: `R2_FAIL_CLOSED_AND_CORRECTED_RETRY_PASS`.
- A separate independent 30-case matrix re-signed unknown, missing, wrong-type, duplicate, or cross-linked mutations across root/scope/data maps, policy/rule/release/approval, workflow/definition/step/retry/approval/checkpoint, idempotency request hash/result/body, audit, history, outbox envelope/payload, plus accessor, proxy, symbol, sparse-array, circular, and oversized shapes. Every hostile case failed closed with generic errors, no supplied-value leakage, no source-state mutation, and successful corrected retry. Result: `R2_ADVERSARIAL_MATRIX_PASS 30`.
- Committed focused tests additionally exercise malformed required fields, approval-decision provenance, checkpoint values, response headers, duplicate and mis-sequenced history/outbox records, invalid workflow-history/outbox linkage, cross-tenant/environment scope, corrupted digest, persist failure, replay conflict, stale write, authorization denial, retry, timeout, cancellation, postcondition, and compensation behavior.

## Commands and exact results

- `npm ci`: PASS; 106 packages installed, 107 audited, zero vulnerabilities; 4.5 seconds.
- `node --test --test-concurrency=1 services/policy-workflow.test.mjs`: PASS, 15/15, zero failed/skipped; 172.6611 ms.
- Independent R1 leakage and R2 corrected-attack command: PASS, both expected markers; 0.4 seconds after worktree preparation.
- Independent R2 30-case adversarial matrix: PASS; 0.4 seconds within the combined reproducer run.
- `npm test -- --test-concurrency=1`: PASS, 1,036 total / 1,035 passed / 0 failed / 1 pre-existing opt-in PostgreSQL skip; TAP duration 2,606,040.4351 ms; shell duration 2,606.8 seconds.
- `npm run format:check`: PASS; 48 pinned-Prettier files and stable structural exclusions; 6.5 seconds.
- `npm run lint`; `npm run static:check`: PASS; 11.1 seconds combined.
- `npm run queue:check`; `npm run traceability:check`: PASS; 47.5 seconds combined.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`: PASS, 379 Markdown / 65 JSON / 5 YAML; 17.1 seconds.
- `npm audit --audit-level=high`: PASS, zero vulnerabilities; 11.2 seconds.
- `git fsck --full --strict`: PASS; only preserved dangling objects reported. `git diff --check`, exact authorized scope, candidate HEAD, and pre-review worktree cleanliness: PASS.

## Security, tenant isolation, and limitations

Recovery now rejects rather than strips unknown customer, financial, credential, reason, or evidence-bearing fields. Scope checks, workflow/history/outbox linkage, immutable policy/version provenance, closed idempotency results, and sequence/duplicate rules execute before state is installed. Errors use fixed non-sensitive codes. Constructor verification invokes neither authorization nor persistence, so hostile recovery cannot create partial audit, outbox, workflow, or idempotency state. Request paths continue to prove server-derived scope, cross-tenant/environment non-disclosure, deny-default authorization, creator separation, replay safety, stale-write denial, metadata-only audit, and atomic injected-persistence rollback.

This remains a local in-memory reference implementation only. It does **not** prove PostgreSQL transactions/RLS, a durable outbox or scheduler, distributed concurrency, production OIDC/workload identity, API-host/route wiring, authenticated backup/signing custody, managed secrets/infrastructure, deployment, SLO/load/DR, provider operation, customer operation, certification, or human review. Those remain unimplemented or external/dependency-controlled prerequisites.

## Final disposition and rollback

**ACCEPT** exact candidate `3af44b7ee48e5a60fa479693b72482ff3a1b805a` for supervisor promotion only when combined with this sole-file attestation commit and subsequently passing exact-head local and protected hosted validation/security gates. Acceptance is capped at **Proven reference implementation**; TASK-0009 is not complete until protected integration and activation evidence are accepted. TASK-0010 remains blocked, and TASK-0112 through TASK-0123 remain frozen.

Before integration, preserve and abandon the candidate if a later gate fails. After integration, use a separately scoped corrective-forward change or reviewed revert. Never delete the R1 rejection, rewrite history, weaken exact recovery validation, or promote this evidence as production durability.
