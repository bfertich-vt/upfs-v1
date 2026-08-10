# Handoff: RECOVERY-TASK-0009-CLOSURE-002

- Task ID: `RECOVERY-TASK-0009-CLOSURE-002` (corrective-forward for `TASK-0009`).
- Agent role: Backend, exclusively bound to `agents/BACKEND.md`.
- Role-file path and SHA-256: `agents/BACKEND.md`; `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`.
- Agent thread ID: `/root/backend_task_0009_closure_r2`.
- Worktree and branch: `C:\source\upfs-backend-task-0009-closure-r2`; `recovery/task-0009-closure-r2`.
- Preserved rejected candidate and review: `08f98c88e331c6466c5ceba3a3fccabd035a9886`; rejection commit `5b56ff40e6c881600f840239c967b8f87bbcff37`; review SHA-256 `102ce90a6b2310f13566f857620f5c3485e455178d7f66637661239a4eb02a70`.
- Implementation/task commit: `af3eeb73af2ec083fd7014dff2c72177dc0e700e`.
- Handoff commit: recorded by the supervisor from the committed candidate; this file is committed separately after implementation.
- Independent reviewer and result: pending a distinct QA/Security agent reviewing the exact committed candidate; implementation is not accepted or promotable from this handoff alone.

## Role and input provenance

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`.
- `agents/BACKEND.md`: `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`.
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`.
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- `docs/MASTER_PLAN.md`: `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`.
- `tasks/queue.yaml`: `c9d580400eba050ef77fec73905b1fd3894db2e3775b650510afadfb63782cdd`.
- `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md`: `9dc8062736337984b35cbc5713b1386ebebeb940c1e5de32c89a5fa2da367d4d`.
- `docs/handoffs/TASK-0009.md`: `1ffde24b5bb28e8424d421d5157b5def59a711597931858cc3eba27d82808319`.
- R1 task and handoff: `67f1dca701c2d1ec7099c3188b585336998ff12f34d9c8fb1a74cb1490b717a2`; `f32c4a0860ab83805c5c316edbfa48cbce1c698e13f4a34a627ec34e49914d90`.
- Architecture/API/workflow/policy specifications: `4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6`; `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`; `c7d4c2e4594bc7c9e33b905f845020aada740e0643bcc61215063c35980e0d8a`; `ed41f87a9748089932b9a384d816148ce501f2bc810d247259ffff4fe463f8ed`.
- CI/security/threat/testing/docs specifications: `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`; `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`; `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`; `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`; `79097cb4fb008f43a58eda063a5cee2536a87b31d52cf7626283fda698e9921d`.
- Public/admin OpenAPI and platform AsyncAPI: `617998625a50a60aaa8f826954c856d0088fe07f135e8983846a0478ea7b3bb1`; `0f2624165cd0bf9ff4b54fbfc9e529503907ab58cccea22742e3b8a957fa0931`; `5968e3065330aa13ba26ddb553e4eb30c385f7496b18951b083eee31e833a7f8`.

## Files changed

- `services/policy-workflow.mjs` — `42cd65afaeb2dda6b2d6ce13bb42a0a4994622b5fedf07faed5f8cacf33d1889`.
- `services/policy-workflow.test.mjs` — `ae46fdc941b92f9e3c201a04ed8abaa80b639e69090914f27806602a978fef22`.
- `tasks/recovery/RECOVERY-TASK-0009-CLOSURE-002.yaml` — `66c1484d733d50a1643b80e36906a0d1aff039b1ea95191ed9b61a83e9004c25`.
- This handoff, committed separately. The inherited rejection artifact is unchanged. No prohibited file changed.

## Acceptance and implementation evidence

- Reproduced `QA-0009-001` before remediation: a checksum-consistent bundle with `data.audit[0].secret = "customer-financial-data"` was accepted and the authorized audit read returned it.
- Introduced required-key plus allowlisted-key validation and canonical timestamp/bounded-array helpers.
- Recovery now validates exact root, scope, data-map, policy/rule/release, workflow definition, approval decision, checkpoint, idempotency result, audit, history, outbox envelope, and outbox payload shapes.
- Linkage and sequence checks bind history to workflows and outbox payloads to exact history records; duplicates and sequence substitution fail closed.
- The constructor verifies and clones the complete bundle before assigning private state. Rejections therefore occur before service state exists, do not invoke persistence, and expose only fixed error codes without hostile values.
- Valid deterministic export/recovery remains supported and a corrected bundle can be loaded after every rejected mutation.

## Tests and negative cases

- Pre-handoff focused: `node --test --test-concurrency=1 services/policy-workflow.test.mjs` — PASS, 15/15, 0 failed/skipped, 155.9 ms after exact nested-shape tightening.
- Pre-handoff full: `npm test -- --test-concurrency=1` — PASS, 1,036 total / 1,035 passed / 0 failed / 1 pre-existing opt-in PostgreSQL skip, 2,476,607.705 ms (shell 2,477.3 seconds).
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` — PASS, 378 Markdown / 65 JSON / 5 YAML.
- `npm run format:check` — PASS, 48 pinned-Prettier files and structural exclusions.
- `npm run lint`; `npm run static:check`; `npm run queue:check`; `npm run traceability:check` — PASS.
- `npm audit --audit-level=high` — PASS, zero vulnerabilities.
- `git fsck --full --strict` — PASS; only preserved dangling objects reported.
- `git diff --check`, base-to-head authorized-file diff, scope inspection, and clean worktree — PASS.
- Negative coverage re-signs hostile bundles after unknown, missing, malformed, duplicated, mis-sequenced, or cross-linked changes in every recovered collection and nested security-bearing region.
- Dedicated unsafe recovery inputs cover throwing accessors, hostile proxy traps, symbols, sparse arrays, circular graphs, and oversized strings. Tests assert no hostile value appears in an error, source state remains byte-equivalent, and corrected retry succeeds.
- Historical persistence failure, cross-tenant/environment denial, idempotency conflict, stale concurrency, approval separation, retry/timeout/cancellation/compensation, audit minimization, and corruption/substitution tests remain green.

## Security, tenant isolation, and limitations

- Recovery rejects unknown customer/financial/credential-bearing fields rather than stripping or later releasing them. Tenant/environment equality, workflow/history/outbox linkage, immutable policy/version provenance, and replay result schemas are verified before assignment.
- Errors remain fixed non-sensitive codes; attacker-supplied values are never included in recovery errors or generated audit records. No authorization or persistence dependency runs during constructor verification.
- This is a local in-memory reference implementation only. It does not prove PostgreSQL transactions/RLS, durable outbox/workers, production OIDC/workload identity, API-host wiring, authenticated backup custody, managed infrastructure, deployment, SLO/load/DR, or customer operation.
- Final-candidate gates are rerun after this handoff commit. A different QA/Security agent must independently reproduce fail-closed behavior from that exact commit and issue an explicit ACCEPT before promotion.

## Rollback and corrective-forward

- Before integration, preserve this branch and abandon it if rejected. After integration, use a separately reviewed revert or corrective-forward change. Do not remove the R1 candidate/rejection, rewrite history, weaken nested validation, or relabel this reference implementation as production.
