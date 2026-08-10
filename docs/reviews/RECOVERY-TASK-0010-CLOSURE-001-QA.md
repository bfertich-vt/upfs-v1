# Independent QA/Security review: RECOVERY-TASK-0010-CLOSURE-001

- Verdict: **REJECT**. The candidate must not be pushed, promoted, integrated, or used to change `TASK-0010` status.
- Candidate: `265ff0d127e5eaed1516a6e898eb043c17941fac`, reviewed from protected base `572b6d6f31ab10f41c6077bcf1fe7b12a159070a`.
- Reviewer: independent Codex QA/Security agent `/root/qa_task_0010_closure_r1`, exclusively bound to `agents/QA_SECURITY.md`; SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Worktree and branch: `C:\source\upfs-qa-task-0010-closure-r1`; `qa/task-0010-closure-r1`.
- Independence: this reviewer did not author or remediate the candidate, started from the exact committed candidate in an isolated worktree, did not edit implementation, and created only this review artifact.
- Classification ceiling: in-memory **reference implementation only**. This review supplies no production identity, persistence, API-host, support-broker, managed-infrastructure, deployment, operational, or human-review evidence.

## Role, inputs, scope, and provenance

The reviewer completely read the assigned role and all applicable task inputs before testing. SHA-256 digests were: `AGENTS.md` `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`; `agents/QA_SECURITY.md` `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`; `agents/WORKTREES.md` `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`; `agents/HANDOFF_TEMPLATE.md` `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`; constitution `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`; master plan `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`; closure matrix `9dc8062736337984b35cbc5713b1386ebebeb940c1e5de32c89a5fa2da367d4d`; queue `c9d580400eba050ef77fec73905b1fd3894db2e3775b650510afadfb63782cdd`; historical handoff `c30b515260d2cbffba09b7b08ea109c8b561adb3f4469aa0aed4904fa599d2ee`.

Applicable specifications were read at these digests: console experience `453b21160bc0f0b79b9654435f1053a24f9fb473dd80f5aba16d588030b3afbf`; page template `42fb427b09d50e915004ee900c6b07d8321f460a96fa7a3d359635e6bd0b1f08`; system architecture `4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6`; identity/tenant model `c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf`; API standards `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`; delivery pipeline `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`; security baseline `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`; threat model `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`; test strategy `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`; documentation platform `79097cb4fb008f43a58eda063a5cee2536a87b31d52cf7626283fda698e9921d`; admin control plane `d3fb8765668fc12d9939b6a715c0c1b790d0d6f5c6e949f37afd7c854e4279e9`.

The structured task `tasks/recovery/RECOVERY-TASK-0010-CLOSURE-001.yaml` was `6f5b89b39c8b89aa52cd3dc445fb29a933f8cd84c913b8202db06778a8943a7f`. The committed handoff reviewed at the candidate was `250e42ad2f1819960189e124903b20f6ec368828f9197ea486c3aa2efbeaeb4b`. The exact base-to-candidate scope contained only six authorized changed files: `services/admin-control-plane.mjs`, `services/admin-control-plane.test.mjs`, `contracts/openapi/admin-api.yaml`, generator-produced `docs/generated/api-reference.md`, the structured recovery task, and its handoff. `packages/sdk-generated/index.ts` was unchanged. No queue, closure-matrix, TASK-0009, TASK-0011+, specification, script, workflow, or frozen TASK-0112 through TASK-0123 file changed.

## Material finding

### QA-0010-001 — hostile cancellation objects execute code and escape the read boundary

Severity: material fail-closed/security acceptance failure.

All three read paths accept `signal` as an unvalidated object and evaluate `signal?.aborted`. A getter-backed `aborted` property or Proxy `get` trap therefore runs attacker-controlled code after request parsing and throws an unbounded exception out of the service. The candidate's hostile-shape test covers actor/request accessors and proxies but does not cover the nested cancellation object, despite the structured task explicitly requiring hostile request/adapter/response shapes to fail closed before adapter or audit side effects.

Independent read-only reproducer at exact candidate:

```text
AdminControlPlaneService(...).healthRead({ actor, signal: accessorSignal }) -> THREW getter-ran
AdminControlPlaneService(...).healthRead({ actor, signal: proxySignal })    -> THREW proxy-ran
```

The reproducer used a valid `admin:read` actor and a valid service fixture; `accessorSignal` was an ordinary object whose own `aborted` descriptor was a throwing getter, and `proxySignal` was a Proxy whose `get` trap threw. Both exceptions escaped instead of returning a bounded audited denial/cancellation envelope. Equivalent unsafe dereferences exist in `healthRead`, `tenantList`, and `tenantRead`.

Impact: a hostile or framework-supplied request object can invoke code across the trust boundary and cause an uncaught availability failure. The candidate has not proven the required accessor/proxy rejection, audit-before-release behavior, or bounded failure semantics for cancellation inputs. Existing passing tests cannot satisfy this explicit negative criterion.

Required corrective-forward: in a separate implementation pass, structurally normalize cancellation state without invoking user accessors/proxy traps, reject non-closed shapes before adapter/audit-sensitive work, and add independent negative tests for accessor, Proxy, symbol, sparse/extra, throwing, and malformed cancellation inputs across health, tenant-list, and tenant-detail reads. Preserve this rejection and obtain fresh QA/Security review of the new exact committed candidate.

## Commands and results

- `node --test --test-concurrency=1 services/admin-control-plane.test.mjs`: PASS, 16/16, 0 fail/skip, TAP 108.3 ms, wall 164 ms.
- Related admin/identity/policy command from the structured task: PASS, 33/33, 0 fail/skip, TAP 254.1 ms, wall 306 ms.
- Independent hostile-signal inline Node reproducer: FAIL-CLOSED FAILURE, two of two hostile variants escaped (`THREW getter-ran`; `THREW proxy-ran`). This is the rejection evidence, not a passing test.
- Fresh-worktree setup: the first `contracts:check` correctly failed because dependencies were absent (`ERR_MODULE_NOT_FOUND: yaml`). `npm ci` then installed 106 packages in 5,042 ms with zero vulnerabilities; the unchanged candidate passed the rerun and every remaining gate.
- `npm run contracts:check` PASS 1,028 ms; `generated:check` PASS 684 ms; `static:check` PASS 1,341 ms; `format:check` PASS 3,656 ms (48 pinned-Prettier files); `lint` PASS 5,166 ms; `queue:check` PASS 13,466 ms; `traceability:check` PASS 30,846 ms.
- `powershell -ExecutionPolicy Bypass -File scripts\validate.ps1`: PASS, 377 Markdown / 65 JSON / 5 YAML, 13,304 ms.
- `npm audit --audit-level=high`: PASS, zero vulnerabilities, 1,231 ms. `git diff --check`: PASS, 69 ms. `git fsck --full --strict`: PASS, 16,624 ms, with pre-existing dangling audit objects only.
- `npm test -- --test-concurrency=1`: PASS, 1,032 total / 1,031 pass / 0 fail / 1 pre-existing opt-in PostgreSQL skip; TAP 2,811,871.2 ms; wall 2,812,565 ms. This suite did not contain the rejected hostile-signal cases.
- Candidate scope, `git diff --check`, branch cleanliness, and exact HEAD were independently verified before review. Only this review file is permitted to be added by QA.

## Acceptance trace and security conclusion

Authentication/RBAC denial, server-derived tenant/environment filtering, non-disclosing foreign/absent-resource behavior, response allowlisting/classification, support-session actor/case/approval/step-up/scope/expiry checks, cursor binding/tamper bounds, dependency/audit failures, source-fixture mutation resistance, read/write separation, OpenAPI closure, generated drift, and the reference-only claim are exercised by passing candidate tests and repository gates. Those green results are preserved.

The candidate nevertheless fails the explicit acceptance criteria requiring hostile request shapes, proxies, and accessors to fail closed before side effects and requiring cancellation/failure paths to return bounded non-leaking results. Independent QA therefore cannot accept the implementation, handoff, protected promotion, or historical status change. No tenant/customer/financial data was used; all fixtures and evidence are synthetic. No production runtime or external prerequisite was exercised.

Rollback is to leave the unintegrated candidate and this rejection preserved. Correct forward on a separate role-bound branch, then use a different fresh QA/Security agent against the new committed state. Do not amend, delete, or relabel this rejection.
