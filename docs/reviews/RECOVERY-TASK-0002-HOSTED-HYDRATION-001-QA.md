# Independent QA/Security review: RECOVERY-TASK-0002-HOSTED-HYDRATION-001

## Disposition

**ACCEPTED** for exact candidate
`e9ca7423cbe1262113290e7d31e2ba28eda4b672`.

This acceptance is limited to deterministic hosted-clone transport of the exact
TASK-0002 independent QA commit object. It does not independently accept a
production capability, alter TASK-0002 disposition, or replace the required
exact-head hosted checks and protected integration.

## Review provenance and independence

- Reviewer: independent Codex QA/Security operating under
  `agents/QA_SECURITY.md`; thread
  `/root/qa_task_0002_hosted_hydration_r1`.
- Independence: the reviewer did not author or remediate this candidate or any
  earlier TASK-0002 implementation/activation candidate and did not edit the
  implementation. The only review write is this report.
- Isolated worktree and branch:
  `C:\source\upfs-qa-task-0002-hosted-hydration-r1`;
  `qa/task-0002-hosted-hydration-r1`.
- Exact reviewed candidate:
  `e9ca7423cbe1262113290e7d31e2ba28eda4b672`.
- Failed hosted base preserved:
  `9ec5b0397843a7022113439ba9e213a5a46d67ab`.
- Candidate chain: task `44a10e8f97f71e7746ceb680432c7705d6a7f065`;
  implementation `477200421e88a075793eff9864c180ae2edaf72c`;
  format corrective-forward `833a54e0f3374731115ee7fcf36845e8173a1ddc`;
  handoff `3c53fd7cd11ffa18602ebeb8db4655d3fe594b87`;
  final handoff binding `e9ca7423cbe1262113290e7d31e2ba28eda4b672`.
- Hosted failure evidence: PR #21 repository-validation run `31200872843`,
  job `92940267392`, failed because commit
  `64782c157a50e02146cdad45049b8333033979c6` was unavailable in the hosted
  clone. Repository-security run `31200872487`, job `92940266232`, passed.

## Governing inputs read and SHA-256 digests

- `AGENTS.md`:
  `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`.
- `agents/QA_SECURITY.md`:
  `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- `agents/WORKTREES.md`:
  `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`.
- `agents/HANDOFF_TEMPLATE.md`:
  `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- `specs/00_constitution/engineering_constitution.md`:
  `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- `specs/09_cicd/delivery_pipeline.md`:
  `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`.
- `specs/10_security/security_baseline.md`:
  `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`.
- `specs/12_testing/test_strategy.md`:
  `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- `tasks/recovery/RECOVERY-TASK-0002-HOSTED-HYDRATION-001.yaml`:
  `5291f23ecb364ddcc8f5d38aa131b1d4968d31d976b35af0b4e27461d87ba756`.
- `docs/handoffs/RECOVERY-TASK-0002-HOSTED-HYDRATION-001.md`:
  `e8fd2b64f64a45e854ee48c4d8e22a524578aecd72b121538a335b754f91a2f0`.
- `docs/reviews/RECOVERY-TASK-0002-CLOSURE-002-QA.md`:
  `1f5c249334fd8638084da8790168f422e24ab4009351bcdd2921e90bbbebc00e`.
- `docs/handoffs/RECOVERY-TASK-0002-CLOSURE-002.md`:
  `bbc0fc4d40206bf64126aa4652dcfe53862ef33e86aa6f99434ac38104cb07df`.
- `tasks/recovery/RECOVERY-TASK-0002-CLOSURE-002.yaml`:
  `102402d3e1c989688e2809165c82ec279dc62a6d815523941a7fffeb490aa2a2`.
- `docs/governance/task-closures/TASK-0002.json`:
  `3f8bbade200bb23b3ace4011a658ca7d0933f5cf13eafa5386ec01344721dd49`.
- `scripts/fixtures/historical-provenance-v3.json`:
  `a4591e9b500b3137ca32243daafaf983c1b5f15554895f8594ff3a3cc1e9b588`.
- `scripts/fixtures/historical-provenance-v3.bundle`:
  `a518ba7ce8d513d062978f93196882d02573b2b9fa65bc3a65132aaa606708ff`.
- `scripts/ci-gate-validator.mjs`:
  `6e17cf1c50862cef5db465106e4470f3c57f5a75d26593af52e4842ab41f72a2`.
- `scripts/ci-gate-validator.test.mjs`:
  `d51f67feb1724898dde8a30eaf30a79b87982593c7f2aa45f451b21c4e91f10b`.

## Acceptance trace and immutable-object verification

- The manifest and bundle bind exactly 36 refs: 33
  `handoff-candidate`, two `erratum-source`, and one
  `qa-review-evidence`. Independent comparison with the manifest at failed
  base `9ec5b039...` proves the original 35 tuples retain identical order,
  commit, kind, object digest, derivation path, and derivation digest.
- The new closed ref is
  `refs/bundle-build/traceability-v3/qa-review-evidence/64782c157a50e02146cdad45049b8333033979c6`.
  It derives only from
  `docs/reviews/RECOVERY-TASK-0002-CLOSURE-002-QA.md`, whose exact SHA-256 is
  `1f5c249334fd8638084da8790168f422e24ab4009351bcdd2921e90bbbebc00e`.
- Independent binary `git cat-file commit` hashing reproduced exact raw Git
  commit-content SHA-256
  `89ac5e56fc43ee3ddea7c857547373bbe7f3aedc2b092f462264e342bfee22ac`.
- The manifest SHA-256 is
  `a4591e9b500b3137ca32243daafaf983c1b5f15554895f8594ff3a3cc1e9b588`;
  the bundle SHA-256 is
  `a518ba7ce8d513d062978f93196882d02573b2b9fa65bc3a65132aaa606708ff`.
- A separate `--no-local --depth=1` clone at exact candidate retained one
  history commit. `git cat-file -e` returned status 128 for the QA object
  before hydration. The committed bundle verified, fetched exactly 36 refs,
  and made the exact object resolvable with status 0. The hydrated clone then
  passed `scripts/historical-closure-validator.test.mjs` 5/5 in 152.655
  seconds, including exact TASK-0002 closure validation.
- No production validator, workflow, queue, matrix, closure record, service,
  application, contract, or specification changed. Five changed files are
  within the six-file authorization; the authorized but unchanged
  `scripts/ci-gate-validator.mjs` remains byte-identical.

## Negative and fail-closed coverage

The focused 20-test suite and explicit clone proof reject omission of the QA
object, substitution, altered object digest, wrong kind, wrong derivation path
or source digest, stale counts, duplicate/mismatched refs, unexpected extra
object/ref, corrupted bundle bytes, local-history leakage, and corruption of
the current TASK-0002 closure review path/digest/commit. They also retain all
existing handoff-candidate, erratum, topology, transport, current TASK-0123,
and semantic/provenance-bypass negatives. `qa-review-evidence` is a distinct,
closed kind and cannot satisfy `handoff-candidate` or `erratum-source`
semantics. No wildcard exception, unavailable-source bypass, current-record
exemption, older-check reuse, or replacement reviewer identity was introduced.

## Commands and results

| Command/evidence | Result |
| --- | --- |
| `npm ci --ignore-scripts` | PASS; 106 locked packages, zero vulnerabilities. |
| `node --test scripts/ci-gate-validator.test.mjs` | PASS 20/20, 0 failed, 258.688 seconds. |
| Separate depth-1 clone, pre-hydration absence, `git bundle verify`, exact v3 fetch, 36-ref count, post-hydration object check, then `node --test scripts/historical-closure-validator.test.mjs` | PASS; absent status 128, present status 0, 36 refs, closure 5/5 in 152.655 seconds. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` | PASS in 6.881 seconds: 327 Markdown, 65 JSON, 5 YAML files. |
| `npm run format:check` | PASS in 3.874 seconds: 48 pinned-Prettier files and structural closure formatting. |
| `npm run queue:check` | PASS in 6.545 seconds. |
| `npm run traceability:check` | PASS in 26.163 seconds. |
| `npm test` | PASS: 961 total, 960 passed, 0 failed, 1 pre-existing skip, 272.194 seconds. |
| `npm audit --audit-level=high` | PASS; zero vulnerabilities, 2.619 seconds. |
| `git fsck --full --strict` | PASS in 12.794 seconds; only preserved dangling local blobs/trees reported. |
| `git diff --check`; exact original-35 identity comparison; authorized-file inventory; exact HEAD and clean status | PASS at `e9ca7423...`; five changed files, all authorized, clean before this report. |

The first focused invocation failed before test discovery because this fresh QA
worktree did not yet contain `node_modules` and Node could not resolve the
locked `yaml` package. The required `npm ci --ignore-scripts` setup then passed,
and every reported gate ran afterward against the unchanged candidate. No
duplicate focused or full-suite process was launched.

## Security, tenant isolation, limitations, and rollback

This change transports immutable Git provenance only. It processes no tenant,
customer, credential, private financial, prompt, document, or production
payload. Closed kind/path/digest/object/count/ref checks and the independent
shallow-clone absence proof prevent review substitution, object smuggling,
local-object dependence, semantic confusion, and false hosted acceptance.
Tenant-isolation behavior is unaffected; the full suite retains authorization,
cross-tenant, replay/idempotency, audit, rollback/failure, leakage, and contract
coverage elsewhere in the repository.

Preserve PR #21 failure evidence and every additive candidate/review commit. If
hosted exact-head validation or security rejects this candidate, correct
forward through a new bounded task and fresh independent review; do not weaken
the gate or delete provenance. Before integration, a reviewed revert may remove
only this task's additive commits. This review does not establish durable
PostgreSQL/RLS persistence, production identity, API route wiring, managed
infrastructure, deployment, or production operation.

## Final verdict

**ACCEPTED** for exact candidate
`e9ca7423cbe1262113290e7d31e2ba28eda4b672`, subject to successful
repository-validation and repository-security checks on the exact promoted PR
head and protected integration evidence. No self-approval, push, merge, queue
or matrix change, or production capability claim is authorized by this report.
