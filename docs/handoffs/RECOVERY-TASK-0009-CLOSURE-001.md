# Handoff: RECOVERY-TASK-0009-CLOSURE-001

- Task and scope: revalidate and correct historical `TASK-0009` as the smallest current policy, versioned policy-publication, workflow, checkpoint/history/outbox, and independent-approval reference vertical slice. The implementation is intentionally an in-memory, injected-persistence reference seam and is not production durability.
- Agent role: Backend, exclusively bound to `agents/BACKEND.md`; SHA-256 `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`.
- Agent thread: `/root/backend_task_0009_closure_r1`. The runtime has no native UPFS custom-role field; the initial assignment bound this documented role and required path/digest proof before editing.
- Worktree, branch, and base: `C:\source\upfs-backend-task-0009-closure-r1`; `recovery/task-0009-closure-r1`; protected base `572b6d6f31ab10f41c6077bcf1fe7b12a159070a`.
- Implementation/task commit: `944a854ae3ffcb14f08e118887c6ea37a2dc3bf5`. This handoff is a separate descendant and is the candidate to be independently reviewed.
- Files changed: `services/policy-workflow.mjs`; `services/policy-workflow.test.mjs`; `tasks/recovery/RECOVERY-TASK-0009-CLOSURE-001.yaml`; and this handoff only.
- Contracts/migrations: no contract or migration changed. The reference service aligns with existing `/v1` write/concurrency conventions and the normative policy/workflow documents, but no API host or deployed route is claimed.

## Governing inputs and exact provenance

- `AGENTS.md` `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`; `agents/BACKEND.md` `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`; `agents/WORKTREES.md` `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`; `agents/HANDOFF_TEMPLATE.md` `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- Engineering constitution `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`; master plan `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`; queue `c9d580400eba050ef77fec73905b1fd3894db2e3775b650510afadfb63782cdd`; accepted closure matrix `9dc8062736337984b35cbc5713b1386ebebeb940c1e5de32c89a5fa2da367d4d`; historical handoff `1ffde24b5bb28e8424d421d5157b5def59a711597931858cc3eba27d82808319`.
- Workflow runtime `c7d4c2e4594bc7c9e33b905f845020aada740e0643bcc61215063c35980e0d8a`; policy system `ed41f87a9748089932b9a384d816148ce501f2bc810d247259ffff4fe463f8ed`; architecture `4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6`; API standards `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`.
- Delivery pipeline `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`; security baseline `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`; threat model `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`; testing strategy `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`; documentation platform `79097cb4fb008f43a58eda063a5cee2536a87b31d52cf7626283fda698e9921d`.
- Public OpenAPI `617998625a50a60aaa8f826954c856d0088fe07f135e8983846a0478ea7b3bb1`; admin OpenAPI `0f2624165cd0bf9ff4b54fbfc9e529503907ab58cccea22742e3b8a957fa0931`; platform AsyncAPI `5968e3065330aa13ba26ddb553e4eb30c385f7496b18951b083eee31e833a7f8`.
- Starting service `d33e6d2426ad0b0b92732a53c1a83975275302d41a34f908d2d3142c0be21372`; starting tests `db2ed34d4b35766307c65e55c8140cbddb95c1bc021d15139aa63e6199b53bba`. Final implementation bytes: service `5e4624fb174b3447dc37c77b69b9b6e6e8e786de6b12d19c3fb0dd1a1c83d1ec`; tests `16e0ddeca822d73496c4060d84b9ea66c86882d5aadcbdfad5320ed087082efa`; structured task `67f1dca701c2d1ec7099c3188b585336998ff12f34d9c8fb1a74cb1490b717a2`.

## Implementation and acceptance trace

1. A bounded closed-data reader rejects accessors, symbols, unsupported prototypes, hostile proxies, circular graphs, controls, oversized strings/graphs, and unknown top-level fields without coercion.
2. Every authorization decision derives tenant and environment scope from the verified actor boundary and fails closed on absent, malformed, throwing, mismatched, or unauthorized results.
3. Policy evaluation denies by default and returns exact policy ID/version, reason code, obligations, bounded evaluated attributes, and correlation ID. Evaluation audit is committed through the same injected atomic boundary.
4. Policy publication requires passing tests, impact evidence, an independently authorized `policy_approver`, approval reason/evidence, shadow results, measured rollout, immutable versioning, optimistic concurrency, operation-scoped idempotency, and a valid rollback target.
5. Workflow definitions are immutable versioned closed shapes. Each step has a typed kind, retry/timeout controls, and one normative classification. Timer, compensation, irreversible action-request, and postcondition fields are required when applicable.
6. Workflow creation binds the exact policy version and definition digest, initializes checkpoints, and appends history/outbox/audit atomically. Reads use composite tenant/environment/workflow keys.
7. Approval enforces creator separation, authorized role scope, quorum, reason/evidence bounds, policy re-evaluation, stale ETags, duplicate approver denial, exact replay, and replay conflicts.
8. Execution enforces legal states, ordered checkpoints, bounded retry/timing, terminal-state closure, cancellation, action-request identity, postcondition verification, and explicit compensation evidence.
9. The injected persistence callback receives the complete next snapshot before any in-memory mutation. A throw rolls back state, history, audit, outbox, and idempotency together.
10. Export requires authorized scope and produces an integrity-bound versioned bundle. Recovery rejects digest corruption, recomputed duplicate/substituted/foreign/malformed/extra-field state, hostile accessors, broken definition digests, and scope mismatch before load.

## Security, tenant isolation, audit, and negative analysis

- Authorization denial and cross-tenant/cross-environment reads return bounded envelopes without resource existence, workflow state, policy content, or supplied payloads. Unauthorized audit access returns no entries.
- Idempotency is scoped by operation, verified actor, tenant, environment, and key. Exact requests replay byte-equivalent results; substituted requests conflict. State-sensitive writes use exact ETags.
- Creator self-approval, wrong role, duplicate approver, stale approval, insufficient quorum, policy denial, illegal transition, out-of-order step, unverified irreversible action, reopening terminal state, missing compensation, and malformed definitions fail without partial mutation.
- Audit and outbox records contain bounded operational metadata and policy/workflow provenance. Approval reasons and evidence references remain in authorized workflow state but are intentionally omitted from audit events.
- Hostile accessor, proxy, circular, unsupported prototype, unknown-field, control-character, and oversize inputs are rejected before authorization or persistence dependencies execute.
- Injected request-ID, clock, authorization, and persistence failures fail closed. Persist failure is atomic and retryable; invalid clock cannot create partially timestamped evidence.
- Recovery is a deterministic local reference seam, not a signature, backup system, or production store. Integrity and structural validation protect accidental or supplied corruption; a production adapter still requires authenticated storage, PostgreSQL transactions/RLS, encryption, signing as applicable, and durable outbox custody.

## Tests, preserved failures, and exact results

- `npm ci`: PASS; 106 packages installed, 107 audited, zero vulnerabilities, 4.4 seconds.
- First pre-format focused run: **FAIL preserved**, 13 total / 11 pass / 2 fail. The self-approval test supplied an actor without the required `policy_approver` role and therefore correctly failed at `invalid_policy` before dual-control; one negative workflow fixture contained explicit `undefined` and correctly failed at the closed input boundary before workflow validation. Test fixtures were corrected to exercise the intended deeper boundaries; implementation security was not weakened.
- Final implementation-head focused `node --test --test-concurrency=1 services/policy-workflow.test.mjs`: PASS 14/14, zero fail/skip, 109.9 ms. The immediately preceding post-format run also passed 13/13 before the clock/re-signed recovery cases were added.
- Negative coverage includes deny-default/no-policy; unauthorized/cross-tenant/cross-environment access; self/wrong-role/duplicate/stale/quorum approval; idempotent replay and substitution; invalid policy tests/impact/approval/shadow/rollout/rollback; malformed typed steps; action/postcondition; timeout/retry/cancel/terminal; compensation; accessor/proxy/circular/oversize; request-ID/clock/persist failure; atomic rollback; corrupt/substituted/duplicate/foreign/malformed/extra-field recovery; and audit leakage.
- `npm run static:check`: PASS. `npm run lint`: PASS. `npm run policy:check`: PASS 13/13 at the pre-final focused checkpoint. Pinned Prettier check for the three implementation/task files: PASS.
- Exact implementation-head full `npm test -- --test-concurrency=1`: PASS 1,035 total / 1,034 pass / 0 fail / 1 pre-existing opt-in PostgreSQL skip; TAP duration 2,481,031.3 ms and shell wall 2,481.7 seconds.
- Final-candidate formatting, lint, queue, traceability, repository validation, audit, strict Git integrity, authorized-diff/scope, cleanliness, and full-suite confirmation are required after this handoff commit and before independent QA.

## Classification, limitations, rollback, and independent review

- Classification ceiling: **Proven reference implementation** if and only if fresh independent QA/Security accepts this exact candidate and protected hosted integration passes. It is not production capability.
- Not implemented or claimed: PostgreSQL/RLS persistence, a production transactional outbox, durable workflow workers/schedulers, distributed concurrency, production OIDC/workload identity, API-host/route wiring, provider/action adapters, managed secrets, deployment, customer operation, SLO/load/DR evidence, certification, or human review.
- External/dependency prerequisites: durable PostgreSQL repositories and migrations, workload identity, deployed APIs/workers, managed event delivery, action adapters/provider credentials, secrets, observability, backup/recovery infrastructure, and protected runtime evidence.
- Rollback/corrective-forward: before integration, preserve and abandon the candidate or use a reviewed revert. After integration, use a new bounded corrective-forward candidate and independent review. Never delete history or weaken tenant, policy, approval, idempotency, audit, outbox, postcondition, compensation, or recovery controls.
- Historical `docs/handoffs/TASK-0009.md` and commit `d10124666bb3d448c7b9afc628c36ac37c5a2fae` remain preserved and unedited; their existence is not treated as acceptance.
- Independent reviewer and result: pending a fresh, distinct QA/Security agent operating under `agents/QA_SECURITY.md` from the exact final committed candidate in an isolated worktree. The reviewer must not edit implementation. `TASK-0009` remains unaccepted, `TASK-0010` remains blocked, and `TASK-0112` through `TASK-0123` remain frozen until independent acceptance and protected integration.
