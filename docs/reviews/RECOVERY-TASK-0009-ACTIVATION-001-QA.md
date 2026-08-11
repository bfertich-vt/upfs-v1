# Independent QA/Security review: RECOVERY-TASK-0009-ACTIVATION-001

## Verdict and reviewed state

**ACCEPT** exact committed candidate `a1a10253fb0d79886b49ffee8647944e80eaa810` for supervisor promotion through a new protected pull request only. The reviewed lineage is implementation/task commit `8cf26434cd594613f6acdbfcefb8e8bd99cf7db2`, corrective test-fixture commit `4801d6e232a6635f1f3d2a94c67763e0d4bf05fc`, and handoff-containing candidate `a1a10253fb0d79886b49ffee8647944e80eaa810`, based on protected integration commit `77e24476f2ee2ad7168200c9ab94e14d602d9032`.

Acceptance is capped at **Proven reference implementation**. It does not make TASK-0009 operationally final by itself: the exact candidate plus this review must pass a new protected pull-request validation/security flow, retained validation artifact inspection, protected merge, and successful post-merge validation/security checks. TASK-0010 remains blocked and TASK-0112 through TASK-0123 remain frozen.

## Reviewer independence and role provenance

- Reviewer role: Independent QA/Security, exclusively bound to `agents/QA_SECURITY.md`; SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Reviewer thread: `/root/qa_task_0009_activation_r1`.
- Review worktree and branch: `C:\source\upfs-qa-task-0009-activation-r1`; `qa/task-0009-activation-r1`.
- Reviewed candidate: `a1a10253fb0d79886b49ffee8647944e80eaa810`; clean before review and unchanged throughout testing.
- Independence: this reviewer did not author or remediate the activation candidate or either TASK-0009 closure candidate. Review began from the committed candidate in a separate worktree. The reviewer edited no candidate implementation, task, queue, matrix, validator, closure, handoff, contract, specification, service, application, or provenance file. This document is the sole review output.
- Runtime limitation: there is no native UPFS custom-role field. The assignment explicitly bound the documented QA/Security role and required path/digest proof before review. This is independent Codex QA/Security evidence, not human review.

## Governing inputs read and SHA-256

- `AGENTS.md` `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`; `agents/QA_SECURITY.md` `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`; `agents/WORKTREES.md` `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`; `agents/HANDOFF_TEMPLATE.md` `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- Engineering constitution `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`; API standards `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`; workflow runtime `c7d4c2e4594bc7c9e33b905f845020aada740e0643bcc61215063c35980e0d8a`; policy system `ed41f87a9748089932b9a384d816148ce501f2bc810d247259ffff4fe463f8ed`; delivery pipeline `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`; security baseline `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`; test strategy `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- Master plan `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`; repository governance `d03d12cb12acd9ecf91eb29f3703a9b7c6fd29854076d2deda168585eabb9116`; queue `dc317ce086ca9c104916b499e6dcef5c4ec1ac6f6d023c8435ff288fc13ddd6b`; matrix `5e35a4251a2637e33e6751719ce1d9187dd3e193de323cd35d215dae0e33558f`.
- R1/R2 structured closure tasks `67f1dca701c2d1ec7099c3188b585336998ff12f34d9c8fb1a74cb1490b717a2` and `66c1484d733d50a1643b80e36906a0d1aff039b1ea95191ed9b61a83e9004c25`; R1/R2 handoffs `f32c4a0860ab83805c5c316edbfa48cbce1c698e13f4a34a627ec34e49914d90` and `0146250fd098b7a7c8c9b438da5afdcfd8a0e02f3a81b199b7fbeba912d338c3`; R1 rejection/R2 acceptance reviews `102ce90a6b2310f13566f857620f5c3485e455178d7f66637661239a4eb02a70` and `a1250b23eaa3ffc464e808a9138d41d4f5bf74a1741336f3ae182c82f29cf5c2`.
- TASK-0008 accepted closure analog `df391e82762bf2b436980314368e04cf67ba1cf1400c09684b101459b625105c`; activation task `96367a36a9b8a54915a5bb9eaa0ce46243d0878573d89c2828fca89d6176573f`; activation handoff `aace8fbeda6d2e5ceb4261510ad1dbf2680c70dac57266c088a73f57993adb86`; TASK-0009 closure `1b2610495ebd09fd6ba85d7d0a77c582d496fc027e88ab71c9133f0201c5283d`; validator `c0cf0dcad9b53ab5ad1e1238eaf5db2af8f40baa2e6bf95522980c8955c4fae2`; validator tests `7912b2bf3414a77b292ee52a95757e6ed8113aff599323a2e76e8c085eadd3e7`.

## Acceptance and provenance trace

1. Exact R1 implementation `944a854ae3ffcb14f08e118887c6ea37a2dc3bf5`, rejected candidate `08f98c88e331c6466c5ceba3a3fccabd035a9886`, and rejection `5b56ff40e6c881600f840239c967b8f87bbcff37` remain resolvable and immutable.
2. Exact R2 implementation `af3eeb73af2ec083fd7014dff2c72177dc0e700e`, accepted candidate `3af44b7ee48e5a60fa479693b72482ff3a1b805a`, and independent review commit `90ef572be4457d47d4c4d817ba46cda891613332` remain resolvable and match the closure record.
3. GitHub currently reports PR #37 `OPEN`, head `90ef572be4457d47d4c4d817ba46cda891613332`, and `mergeCommit: null`. Exact-head pull-request runs `31420758944` / job `93560631707` (`repository-validation`) and `31420759086` / job `93560632371` (`repository-security`) both succeeded.
4. Retained artifact `9075398527`, `validation-evidence`, is unexpired and has GitHub archive digest `sha256:be102389407d119b4c190e7b2df1e0fc28285708027bd6f145822c5b194bffbb`. Independent download produced report SHA-256 `b05f4804c33b63971a40a2fc190945405c1cb44f97b2d9b24dd43930783d467e`, status `passed`, for exact PR head `90ef572be4457d47d4c4d817ba46cda891613332`.
5. Local/GitHub-authored commit `77e24476f2ee2ad7168200c9ab94e14d602d9032` is exactly two-parent: base `572b6d6f31ab10f41c6077bcf1fe7b12a159070a` and PR head `90ef572be4457d47d4c4d817ba46cda891613332`; its subject identifies PR #37. No push-triggered post-merge checks exist. The closure therefore records an exact anomaly, not a normal API merge.
6. The activation changes exactly seven authorized paths and no prohibited path. TASK-0009 alone becomes queue `complete` and matrix/closure `ACCEPTED`; TASK-0010 remains `blocked`; TASK-0112 through TASK-0123 remain frozen. No provenance bundle/manifest, prior evidence, service, application, contract, specification, workflow, or TASK-0010+ implementation changed.
7. The exception is exact-field and exact-object bound. Independent mutation tests reject substituted R1/R2 identities/digests, protected-review tree/head, repository/PR/base/check/run/job/conclusion fields, artifact identity/digests/status, API state/null merge, local merge identity/reason/corrective requirement, merge topology/time/PR, missing exception object, limitations, dependencies, classification inflation, TASK-0009 status regression, TASK-0010 promotion, and missing current closure. There is no wildcard, unavailable-source, emergency, or current/resolvable-record bypass.

## Independent commands and results

- `npm ci`: PASS; 106 packages installed, 107 audited, zero vulnerabilities; approximately 4 seconds.
- `node --test --test-concurrency=1 --test-name-pattern="TASK-0009 activation fails closed" scripts/historical-closure-validator.test.mjs`: PASS, 1/1, zero failed/skipped; TAP `594,350.649 ms`, shell `594,400 ms`. This executes 53 exact field substitutions plus limitation, dependency, classification, queue-status, later-task-promotion, and missing-current-record negatives.
- `node --test --test-concurrency=1 scripts/historical-closure-validator.test.mjs`: PASS, 12/12, zero failed/skipped; TAP `3,583,462.2668 ms`, shell `3,583,561 ms`.
- `npm test -- --test-concurrency=1`: PASS, 1,037 total / 1,036 passed / 0 failed / 1 pre-existing opt-in PostgreSQL skip; TAP `3,232,335.1216 ms`, shell `3,233,019 ms`.
- `npm run format:check`: PASS, 48 pinned-Prettier files; `3,480 ms`.
- `npm run lint`: PASS; `4,488 ms`. `npm run static:check`: PASS; `1,258 ms`.
- `npm run queue:check`: PASS; `13,850 ms`. `npm run traceability:check`: PASS; `29,023 ms`.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`: PASS, 381 Markdown / 65 JSON / 5 YAML; `12,862 ms`.
- `npm audit --audit-level=high`: PASS, zero vulnerabilities; `1,442 ms`.
- `git fsck --full --strict`: PASS; only preserved dangling objects reported, no corruption; `14,361 ms`.
- `git diff --check 77e24476f2ee2ad7168200c9ab94e14d602d9032..HEAD`: PASS; authorized-scope symmetric difference zero; candidate head exact; worktree clean before creating this sole review artifact.

Persistent QA captures were retained outside the repository at `C:\source\upfs-qa-task9-activation-focused.log`, `C:\source\upfs-qa-task9-activation-historical.log`, and `C:\source\upfs-qa-task9-activation-full-npm.log`; they are execution aids, not committed evidence substitutes.

## Security, tenant isolation, and classification

This activation adds no runtime request or data path and therefore introduces no new customer, financial, credential, provider, tenant, identity, policy, workflow, persistence, or deployment behavior. It preserves the accepted reference implementation findings: deny-by-default server-derived tenant/environment scope, cross-scope non-disclosure, independent approval and creator separation, quorum, exact policy/version provenance, operation-scoped idempotency/replay, optimistic concurrency, atomic audit/history/outbox rollback, hostile recovery rejection before mutation, fixed non-sensitive errors, and successful corrected retry.

The strict ceiling remains **Proven reference implementation**. The evidence does not prove PostgreSQL/RLS durability, durable workflow workers/outbox custody, production OIDC/workload identity, API-host wiring, distributed concurrency, managed secrets or infrastructure, deployment, load/SLO/DR, provider operation, customer operation, certification, native GitHub approval, or human review. The one skipped PostgreSQL test is an existing opt-in infrastructure gate and is not converted into production evidence.

## Promotion and rollback conditions

The supervisor may attach this sole-file review commit to the exact candidate, revalidate the integrated head, and promote it only through a new protected pull request with exact-head `repository-validation` and `repository-security`, retained-artifact inspection, protected merge, and successful post-merge checks. If any gate fails, preserve this acceptance and the failure, correct forward in a new bounded implementation stream, and obtain a fresh independent review. Before integration the branch may be abandoned; after integration use a separately reviewed corrective-forward change or reviewed revert. Never delete or rewrite R1/R2/PR #37 evidence, weaken exact anomaly validation, promote TASK-0010 early, or claim production capability.
