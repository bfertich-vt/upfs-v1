# Independent QA/Security review: RECOVERY-TASK-0011-CLOSURE-001

- Verdict: **REJECT**.
- Exact reviewed candidate: `c90e593282963d2695071db69beb31268018bc72`; tree `e6ab0b5da2a2f3d409fac3336f9ebcd4835430d5`; implementation `ee855f768b8e394d1f3cb61d434d039cd98d6758`.
- Reviewer role/thread: fresh independent QA/Security, exclusively bound to `agents/QA_SECURITY.md`; SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`; `/root/qa_task_0011_closure_r1`.
- Worktree/branch: `C:\source\upfs-qa-task-0011-closure-r1`; `qa/task-0011-closure-r1`.
- Implementation was read-only. This is the sole reviewer-written file.

## Inputs and scope

The reviewer loaded all task-declared governance, plan, queue, historical handoff, architecture, delivery, security, threat-model, testing, task, implementation, test, and author-handoff inputs before review. Key SHA-256 bindings: `AGENTS.md` `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`; worktree rules `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`; constitution `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`; master plan `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`; closure matrix `4b8a115230eed4090cc8e704985fce2c1572c02b2a158f19f4fabc7ee5b76209`; queue `91e14c16f6b992e1a1d01d940753493da30cd48068c3900e5ef3d526a80543bc`; historical TASK-0011 handoff `0cbbb31dfa3e1154ae0d336b2ffed0c389d8fa07d5e9b71cfc6c2121c2a08186`; recovery task `926da2aca5b7e1903e0769a03812eb61debb90cf4933b96f4e3aa8e21df2868c`; author handoff `7d7425089de24bbf963abd735a0e8c2359c6dc544b3bc0b2914e571a83a95027`.

The exact eight-file candidate scope against protected base `2fa81b57e0787afe5ed290012aebf70645d897bc` is authorized: six implementation/test files, the recovery task, and author handoff. No queue, matrix, contract, generated, workflow, migration, specification, TASK-0012+, or TASK-0111–0123 change is present. Classification remains reference-only; no production deployment, persistence, workload identity, provider, customer-data, authorization, release-readiness, or operator evidence is accepted.

## Blocking defect

`createProductionBoundarySet`, `createProductionServiceSet`, and `createProductionRuntimeConfig` silently accept extra arguments. An oversized hostile value can therefore cross each supposedly closed factory boundary and still produce a registered candidate accepted by downstream validation. The value's Proxy traps are not invoked, so there is no immediate secret leak, but accepting undeclared capability/configuration input violates the task's closed, bounded, fail-closed input requirement and makes over-arity configuration mistakes indistinguishable from valid composition.

Smallest reproducer (run with `node --input-type=module`) supplied valid registered capabilities plus a fifth hostile Proxy argument to the service-set factory, a fourth hostile Proxy argument to the boundary-set factory, and a fourth hostile Proxy argument to the runtime-config factory. All three calls succeeded, `createProductionBoundaries` and `createProductionRuntime` accepted their results, and the exact output was `DEFECT_CONFIRMED: over-arity hostile values accepted ...; traps=0`. Control cases confirmed unregistered Symbol and circular runtime inputs reject generically.

Required remediation: each closed factory must reject wrong arity before registering a token, without inspecting, coercing, enumerating, stringifying, iterating, or otherwise touching the extra value. Add negative tests for zero/under/over arity across boundary, service-set, runtime-config, service, and adapter factories, including Proxy/accessor/Symbol/circular/oversized values and generic non-disclosing errors. Preserve the current identity registration, non-substitutability, production-mode, tenant/security, audit/evidence, recovery, idempotency, rollback, failure, and reference-only controls.

## Independent commands and results

- `node --test --test-concurrency=1 services/production-boundaries.test.mjs scripts/release-rehearsal.test.mjs`: PASS 5/5, 0 fail/skip; TAP 202.2657 ms; wall 0.322 s. This suite lacks the decisive over-arity negatives.
- Independent over-arity/Proxy/Symbol/circular reproducer: defect CONFIRMED, exit 0, wall 0.099 s. Extra hostile arguments were accepted by all three factories; Proxy trap count remained zero; Symbol/circular unregistered controls rejected.
- `node scripts/production-composition-check.mjs`: PASS, 0.109 s. `node scripts/release-rehearsal.mjs`: PASS 15 synthetic gates, 0.067 s.
- `git diff --check 2fa81b57e0787afe5ed290012aebf70645d897bc..HEAD`: PASS, 0.045 s. Authorized scope inspection: PASS.
- `npm audit --audit-level=high`: PASS, zero vulnerabilities, 1.148 s.
- `git fsck --full --strict`: PASS, 15.476 s, with only pre-existing dangling audit objects.
- A QA full-suite invocation was stopped before completion after the supervisor confirmed the decisive fail-closed rejection should be bound without spending approximately an hour restating it. It is not acceptance evidence. The author handoff separately reports an implementation-head full result of 1,043 pass / 0 fail / 1 pre-existing opt-in PostgreSQL skip; that author result is provenance only and is not represented as independent QA execution.

## Security and disposition

Existing focused evidence covers generic rejection of unregistered accessors/Proxies, immutable and non-substitutable registered tokens, explicit PostgreSQL/outbox/checkpoint seams, production repository wiring, synthetic BOLA/tenant isolation, recovery, audit/evidence, rollback, and injected failure. No sensitive data was observed. Those passing controls do not cure the over-arity acceptance defect.

Do not push, promote, activate TASK-0011, or advance TASK-0012. Preserve this rejection commit and assign a separate Backend corrective-forward pass limited to the affected factories/tests and updated handoff/task evidence. A different fresh independent QA/Security reviewer must review the exact corrected candidate.
