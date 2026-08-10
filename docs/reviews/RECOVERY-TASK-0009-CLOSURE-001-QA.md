# Independent QA/Security review: RECOVERY-TASK-0009-CLOSURE-001

- Verdict: **REJECT**.
- Candidate reviewed: `08f98c88e331c6466c5ceba3a3fccabd035a9886` (`docs: hand off TASK-0009 closure`).
- Implementation/task commit: `944a854ae3ffcb14f08e118887c6ea37a2dc3bf5`.
- Reviewer role: Independent QA/Security, exclusively bound to `agents/QA_SECURITY.md`.
- Reviewer thread: `/root/qa_task_0009_closure_r1`.
- Worktree and branch: `C:\source\upfs-qa-task-0009-closure-r1`; `qa/task-0009-closure-r1`.
- Independence: this reviewer did not author or remediate the candidate. Review began from the exact committed candidate in an isolated worktree. No implementation, task, handoff, contract, specification, queue, or matrix file was edited.
- Authorized QA write: this review artifact only.

## Role and input provenance

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`.
- `agents/QA_SECURITY.md`: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`.
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- `docs/MASTER_PLAN.md`: `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`.
- `tasks/queue.yaml`: `c9d580400eba050ef77fec73905b1fd3894db2e3775b650510afadfb63782cdd`.
- `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md`: `9dc8062736337984b35cbc5713b1386ebebeb940c1e5de32c89a5fa2da367d4d`.
- `docs/handoffs/TASK-0009.md`: `1ffde24b5bb28e8424d421d5157b5def59a711597931858cc3eba27d82808319`.
- `tasks/recovery/RECOVERY-TASK-0009-CLOSURE-001.yaml`: `67f1dca701c2d1ec7099c3188b585336998ff12f34d9c8fb1a74cb1490b717a2`.
- Candidate handoff: `f32c4a0860ab83805c5c316edbfa48cbce1c698e13f4a34a627ec34e49914d90`.
- Architecture/API/workflow/policy inputs: `4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6`, `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`, `c7d4c2e4594bc7c9e33b905f845020aada740e0643bcc61215063c35980e0d8a`, `ed41f87a9748089932b9a384d816148ce501f2bc810d247259ffff4fe463f8ed`.
- CI/security/threat/testing/docs inputs: `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`, `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`, `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`, `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`, `79097cb4fb008f43a58eda063a5cee2536a87b31d52cf7626283fda698e9921d`.
- Public OpenAPI, admin OpenAPI, and platform AsyncAPI: `617998625a50a60aaa8f826954c856d0088fe07f135e8983846a0478ea7b3bb1`, `0f2624165cd0bf9ff4b54fbfc9e529503907ab58cccea22742e3b8a957fa0931`, `5968e3065330aa13ba26ddb553e4eb30c385f7496b18951b083eee31e833a7f8`.
- Candidate service and test bytes: `5e4624fb174b3447dc37c77b69b9b6e6e8e786de6b12d19c3fb0dd1a1c83d1ec`; `16e0ddeca822d73496c4060d84b9ea66c86882d5aadcbdfad5320ed087082efa`.

## Scope and acceptance trace

The candidate changes exactly the four authorized files: `services/policy-workflow.mjs`, `services/policy-workflow.test.mjs`, `tasks/recovery/RECOVERY-TASK-0009-CLOSURE-001.yaml`, and `docs/handoffs/RECOVERY-TASK-0009-CLOSURE-001.md`. Historical evidence and prohibited files remain preserved. Focused tests cover deny-default policy evaluation, exact policy/version provenance, policy publication gates, server-verified tenant/environment authorization, cross-scope denial, immutable workflow definitions, scoped dual control/quorum, stale ETags, operation-scoped replay/conflict, typed execution, timers/retry/timeout/cancel, action requests/postconditions, compensation, atomic persistence failure, and integrity-bound export/recovery. The candidate truthfully limits its claim to an in-memory reference implementation and does not claim PostgreSQL durability, production identity, API-host wiring, workers, managed infrastructure, deployment, or customer operation.

The recovery and metadata-only acceptance criteria are not satisfied because the recovery verifier validates only tenant/environment equality for audit records. It does not enforce a closed audit-record schema. Since the bundle digest is an integrity checksum rather than an authenticated signature, a supplied bundle can be modified and consistently re-signed. The verifier accepts the modified audit record, and the authorized audit API returns the injected field.

## Rejection defect

### QA-0009-001 — High: recovery accepts and releases unknown audit fields

An independently constructed valid reference state was exported, `data.audit[0].secret` was set to `customer-financial-data`, and the documented deterministic SHA-256 was recomputed over `schema_version`, `scope`, and `data`. `new PolicyWorkflowService({ state: bundle })` accepted the bundle. A scoped authorized `audit()` read then returned `secret: "customer-financial-data"`.

Observed terminal assertion:

```text
AssertionError [ERR_ASSERTION]: recovery must reject or strip unknown audit fields
+ actual - expected
+ 'customer-financial-data'
- undefined
```

This violates the explicit criteria that recovery reject malformed/extra-field state, that hostile recovery fail closed before partial load, and that audit records remain metadata-only without customer/financial payload leakage. The committed tests exercise extra fields only on workflow records and therefore do not cover this audit-record boundary. The same verifier section also lacks closed structural validation for history records; remediation must review every recovered collection rather than narrowly patch only the demonstrated key.

Required corrective-forward work:

1. Define and enforce exact closed schemas for every recovered audit, history, idempotency-result, outbox payload, approval decision, and checkpoint record, including required fields, types, bounds, identifiers, timestamps, allowed statuses, scope/linkage, and duplicate/sequence rules.
2. Reject unknown fields and metadata values capable of carrying customer, credential, financial, reason, or evidence payloads before assigning any recovered state.
3. Add fail-closed tests that re-sign hostile but checksum-consistent bundles containing extra, missing, malformed, duplicated, cross-linked, and oversized records in every collection.
4. Prove rejection is atomic and produces no partial state or authorized read leakage.
5. Use a separate remediation author and a fresh independent QA/Security review of the new exact committed candidate.

## Commands and results

- `node --test --test-concurrency=1 services/policy-workflow.test.mjs`: PASS, 14/14, zero fail/skip, 115.5 ms.
- Independent inline adversarial recovery/audit leakage reproducer: **FAIL as expected**, exit 1, deterministic assertion shown above, approximately 0.4 seconds. It imported the committed service without editing candidate files.
- First `npm test -- --test-concurrency=1` before dependency installation: environment-only FAIL, 939 total / 931 pass / 7 module-resolution failures / 1 pre-existing skip, 3.95 seconds; missing `yaml`, `prettier`, and `pg`. This is preserved and is not attributed to candidate behavior.
- `npm ci`: PASS, 106 packages installed, 107 audited, zero vulnerabilities, 4.5 seconds.
- Final `npm test -- --test-concurrency=1`: PASS, 1,035 total / 1,034 pass / 0 fail / 1 pre-existing opt-in PostgreSQL skip, TAP 2,519,600.4 ms, shell 2,520.3 seconds.
- `npm run format:check`: PASS; all pinned files formatted and closure formatting passed for 48 files, approximately 5 seconds.
- `npm run lint`; `npm run static:check`: PASS, approximately 9.1 seconds combined.
- `npm run queue:check`; `npm run traceability:check`: PASS, approximately 52.6 seconds combined.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`: PASS, 377 Markdown / 65 JSON / 5 YAML, approximately 15 seconds.
- `npm audit --audit-level=high`: PASS, zero vulnerabilities.
- `git fsck --full --strict`: PASS exit 0; only preserved dangling objects reported.
- Base-to-candidate `git diff --check`: PASS. Exact authorized four-file diff confirmed. Candidate worktree was clean before this sole-file review write.

## Security and tenant-isolation assessment

The ordinary request paths demonstrate strong server-derived tenant/environment scope, deny-default authorization, cross-scope non-disclosure, operation-scoped idempotency, optimistic concurrency, independent approval, workflow policy binding, failure rollback, and metadata-minimized generated audit events. However, a recovery boundary is an equally privileged state-ingress path. Because it can restore attacker-supplied unknown audit fields and later disclose them through an authorized API, the overall leakage and recovery controls fail closed-shape acceptance. Tenant equality alone does not make arbitrary recovered payload safe.

No production durability is proven. PostgreSQL transactions/RLS, durable outbox/workers, production OIDC/workload identity, API routes, signing/authenticated backup custody, deployment, load/SLO/DR, and managed infrastructure remain external or unimplemented prerequisites.

## Final disposition

**REJECT.** Do not integrate, promote, activate, or classify `TASK-0009` as accepted from this candidate. Preserve candidate `08f98c88e331c6466c5ceba3a3fccabd035a9886`, this rejection, and the historical handoff. Open the smallest corrective-forward Backend remediation for the complete recovered-record validation boundary, then obtain a fresh independent QA/Security review. `TASK-0010` remains blocked; `TASK-0112` through `TASK-0123` remain frozen.
