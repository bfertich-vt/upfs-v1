# Independent QA/Security review: TASK-0002 activation

## Verdict

**ACCEPTED** for exact candidate `ae03aca72dfe246a359178073c6ddacbc4ffeb6e`.

This acceptance is limited to governance activation of the already accepted,
protected TASK-0002 in-memory reference implementation. It does not approve a
production runtime, durable PostgreSQL/RLS persistence, production OIDC or
workload identity, API route wiring, managed operation, or deployment. Hosted
promotion of this activation remains conditional on successful required checks
on its exact future PR head.

## Reviewer independence and provenance

- Role: Independent Codex QA/Security under `agents/QA_SECURITY.md`.
- Role-file SHA-256: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Agent thread: `/root/qa_task_0002_activation_r1`.
- Isolated worktree and branch: `C:\source\upfs-qa-task-0002-activation-r1`; `qa/task-0002-activation-r1`.
- Exact reviewed candidate: `ae03aca72dfe246a359178073c6ddacbc4ffeb6e`.
- Activation implementation head: `da7ee10ddaf30c58c3ec5e8d98214cf48b1f0905`.
- Protected base: `92e6ac9345e7cdd92db21e7fa65c0dcf531fd28c`.
- The reviewer did not author or remediate the TASK-0002 implementation,
  closure, protected-flow evidence, or activation candidate. The reviewer made
  no implementation edit. This review file is the sole permitted review output.

## Governing inputs read

All hashes below are SHA-256.

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`
- `START_HERE.md`: `34f7748abb4107764bf54d669262fe289df1b9c41636868459112efadcdb43e9`
- `agents/QA_SECURITY.md`: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`
- `specs/09_cicd/delivery_pipeline.md`: `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`
- `specs/10_security/security_baseline.md`: `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`
- `specs/12_testing/test_strategy.md`: `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`
- `docs/MASTER_PLAN.md`: `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`
- `tasks/queue.yaml`: `c9846f5f16e88ef9453fa91458e68540a472384e0643bbe69db60cca54fe4159`
- `tasks/recovery/RECOVERY-TASK-0002-ACTIVATION-001.yaml`: `37e4975ead2be10fede800f942b597f4c4ba7ce9f9fa98f8bf8c461c57dd26b5`
- `docs/handoffs/RECOVERY-TASK-0002-ACTIVATION-001.md`: `d0129383b691dec2265330658949890534e8419db4335c46823634dd507b3001`
- `docs/governance/task-closures/TASK-0002.json`: `3f8bbade200bb23b3ace4011a658ca7d0933f5cf13eafa5386ec01344721dd49`
- `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md`: `786fa0747061bed3f2b8d33f58195acf366bf49782a9f3a41acedf621299ad40`
- `docs/reviews/RECOVERY-TASK-0002-CLOSURE-002-QA.md`: `1f5c249334fd8638084da8790168f422e24ab4009351bcdd2921e90bbbebc00e`
- `scripts/historical-closure-validator.mjs`: `fc5c1105bc07e98ef49e5f183a4e91350275a292509d3e4c5716c3361a3ed1d7`
- `scripts/historical-closure-validator.test.mjs`: `9d30a62cbed9b4f3fec106f5279ff506e26d6fc8253152fd5b2c2ab9e6fee076`

## Exact evidence and topology

- Remediation implementation `8e77b1107f94e756f4865b3988aff7cd4a1b268b`
  and final candidate `c13b0134091937cfcb3cc4db4304ed7be3c5f740`
  are exact and reachable.
- Independent implementation QA commit
  `64782c157a50e02146cdad45049b8333033979c6` binds the final candidate and
  immutable review SHA-256
  `1f5c249334fd8638084da8790168f422e24ab4009351bcdd2921e90bbbebc00e`.
- QA commit `64782c1...` and PR head
  `21c2eaa0a1087923d9086ddeb2647d8c57a82fc6` are distinct single-parent
  children of candidate `c13b013...` and have the same exact tree
  `d470b55d94edac5288b4d673cd85f76651a47444`.
- GitHub API reinspection confirmed PR #20 base
  `e84699d502d684ec1772e507379d47770f00f132`, exact head `21c2eaa...`,
  protected merge `92e6ac9345e7cdd92db21e7fa65c0dcf531fd28c`, and merge time
  `2026-08-07T16:07:01Z`.
- Exact pre-merge validation run/job `31195839513`/`92923707381` and security
  `31195838719`/`92923709435` succeeded on `21c2eaa...`. Exact post-merge
  validation `31196001793`/`92924244237` and security
  `31196001771`/`92924243995` succeeded on `92e6ac9...`.
- Retained artifact `9000781611` is unexpired, belongs to validation run
  `31195839513` at `21c2eaa...`, and has archive digest
  `sha256:27b01ad4a58152520ec18269a011e16c3d6e8936892bf30b0adca34bc5d45fc0`.
  Fresh download contained `validation-report.json` with SHA-256
  `f36a945b547137050c61c1b3b890ce5959674faa8a2c0de76892e815758b99e1`
  and status `passed`.
- Protected merge `92e6ac9...` has exact parents `e84699d...` and
  `21c2eaa...`; its tree equals the protected head tree.

## Scope, security, and adversarial findings

The net activation diff from the protected base contains exactly the seven
authorized paths: queue, matrix, TASK-0002 closure JSON, validator, validator
tests, structured activation task, and activation handoff. It changes no
service, application, contract, specification, workflow, package, TASK-0001,
or TASK-0003+ file.

The mechanism is fail closed and task-specific. Only `TASK-0002` may select
`independent-codex-qa-protected-flow`; a separate temporary-clone adversarial
test attempted to reuse the complete mechanism for `TASK-0003` and was rejected
with `protected_review is not authorized for this task`. The focused suite
rejects mutation or substitution of implementation/candidate/review identity,
review digest, review/PR tree or parent relationship, run/job/head identity,
artifact ID/archive/content digest, merge identity/topology, limitations,
classification, queue status, and later-task promotion. Exact immutable
allowlisting and required reachability prevent current/local-only evidence from
substituting for the recorded protected evidence.

TASK-0001's closure JSON and structured attestation blobs are byte-identical
between protected base and candidate (`2bc13b0a...` and `d3018573...`
respectively), and the full unchanged TASK-0001 attestation mutation suite
passes. TASK-0002 remains classified exactly `Proven reference implementation`.
Its durable persistence, OIDC/workload identity, route wiring, managed runtime,
and deployment limitations are mandatory and preserved.

This governance-only change introduces no product write, tenant selector,
credential, customer or financial data, identity mutation, API, migration,
runtime, or deployment path. The accepted implementation's authorization,
cross-tenant non-disclosure, idempotency/replay, concurrency, atomic audit,
failure, rollback, schema, lifecycle, and leakage evidence remains immutable.

## Commands and results

| Command/evidence                                                                                                     | Result                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                                                             | PASS in 5.4 s; 106 packages installed; 0 vulnerabilities.                                                                                                                                    |
| `node --test scripts/historical-closure-validator.test.mjs`                                                          | PASS in 170.1 s; 5/5. An initial dependency-missing attempt and one 124 s harness timeout produced no verdict; both are preserved as setup/transient evidence and the complete rerun passed. |
| Temporary-clone generic-mechanism adversarial harness                                                                | PASS in 8.8 s; TASK-0003 reuse rejected.                                                                                                                                                     |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                                      | PASS in 7.6 s; 325 Markdown, 65 JSON, 5 YAML.                                                                                                                                                |
| `npm run format:check`                                                                                               | PASS in 5.4 s; 48 pinned-Prettier files and closure structure.                                                                                                                               |
| `npm run queue:check`                                                                                                | PASS in 9.6 s.                                                                                                                                                                               |
| `npm run traceability:check`                                                                                         | PASS in 31.6 s.                                                                                                                                                                              |
| `npm test`                                                                                                           | PASS in 300.2 s; 961 total, 960 passed, 0 failed, 1 pre-existing skip.                                                                                                                       |
| `npm audit --audit-level=high`                                                                                       | PASS in 2.6 s; 0 vulnerabilities.                                                                                                                                                            |
| `git fsck --full --strict`                                                                                           | PASS in 17.0 s; only preserved dangling blobs/trees reported.                                                                                                                                |
| `git diff --check`                                                                                                   | PASS in 0.4 s.                                                                                                                                                                               |
| GitHub PR/run/job/artifact API inspection and fresh artifact download                                                | PASS; exact identities, conclusions, archive digest, file digest, and passed content match the closure record.                                                                               |
| Exact seven-path diff, ancestry/tree, TASK-0001 blob equality, candidate HEAD, and clean implementation-state checks | PASS at `ae03aca...` before this sole review artifact was added.                                                                                                                             |

## Risks, rollback, and promotion boundary

The hosted facts in the closure record remain an immutable inspected snapshot;
offline validation cannot independently re-query GitHub. This review did
re-query them and freshly downloaded the retained artifact. Future expiry of the
retained artifact does not turn the reference implementation into production
evidence.

Before activation integration, revert only the additive activation commits after
review. After integration, correct forward through a separately reviewed closure
or status record. Never erase accepted/rejected history or silently upgrade the
classification. This review does not authorize direct push, self-approval,
deployment, production claims, or later-task promotion. Hosted validation and
security must pass on the exact activation PR head before protected merge.
