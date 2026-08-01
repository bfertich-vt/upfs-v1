# RECOVERY-PROVENANCE-004 author handoff

## Task, role, and immutable candidate

- Task ID and scope: `RECOVERY-PROVENANCE-004`; bounded Backend-owned recovery
  documentation and local-test-only control. It neither changes product behavior
  nor accepts historical or production work.
- Assigned role: Backend; role file `agents/BACKEND.md`; canonical candidate-byte
  SHA-256: `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`.
- Agent thread ID: `/root/backend_provenance_clean_package`.
- Worktree and branch: `C:\source\upfs-recovery-provenance-clean-004`;
  `recovery/provenance-clean-004`.
- Immutable implementation candidate: `6c9b295773c679d35520535161e89b7bf0969368`
  (`docs: add clean provenance recovery control`), based on authoritative
  `codex/task-0001-baseline` commit `0df7ffc`.
- This handoff is a separate author-record commit. It is not a QA result and
  must remain `QA pending` until a distinct QA/Security agent writes an immutable
  review report in its own review stream.

## Owned files and candidate-byte evidence

The candidate changed only the three implementation files below. This handoff
is the sole additional authorized record. No product, queue, README,
START_HERE, CI, workflow, CODEOWNERS, specification, API, schema, deployment,
or application file changed.

| Candidate path | SHA-256 over `6c9b295` Git bytes |
| --- | --- |
| `docs/governance/provenance-verification.md` | `0410af4ac9a261f79cb154e05ce55e96fadd47beeeb22faeee692e801341ff69` |
| `scripts/provenance-command.test.mjs` | `bba20ac0082478986bb0397d24ad1f8a7fa69daff128482646cbfe279872655d` |
| `tasks/recovery/RECOVERY-PROVENANCE-004.yaml` | `01b5b6259d53400f742d5fc179b6f0313e2c81a43123801d232e52eb3d9eb91e` |

## Sources, requirements, and historical boundary

The following were read before editing; all hashes are SHA-256 over canonical
Git bytes at the candidate unless otherwise labeled:

| Path | SHA-256 |
| --- | --- |
| `AGENTS.md` | `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1` |
| `agents/BACKEND.md` | `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784` |
| `agents/HANDOFF_TEMPLATE.md` | `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4` |
| `agents/WORKTREES.md` | `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1` |
| `specs/00_constitution/engineering_constitution.md` | `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73` |
| `specs/09_cicd/delivery_pipeline.md` | `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb` |
| `specs/12_testing/test_strategy.md` | `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172` |

Historical predecessor artifacts were read only from their immutable commits:
`RECOVERY-PROVENANCE-001` at `46a7db4`, `RECOVERY-PROVENANCE-003` at
`54fa960`, and its author handoff at `6056bbd`. They are preserved as
unaccepted/rejected evidence; this task does not assert that their missing QA
provenance is repaired. Any historical field absent from those records remains
`unknown` or an unsupported completion claim.

## Acceptance criteria and executed evidence

| Acceptance criterion / command | Result |
| --- | --- |
| `npm ci --ignore-scripts` | Passed; installed locked dependencies without lifecycle scripts. npm reported one moderate dependency advisory; no manifest, lockfile, or generated output was committed. |
| `node --test scripts/provenance-command.test.mjs` | Passed: 2/2 tests. The first extracts the exact documented command, writes an external temporary `.ps1`, executes it with noninteractive PowerShell, and compares lowercase SHA-256 against `git show <commit>:AGENTS.md` bytes. The second rejects a control missing the distinct candidate, author-handoff, QA-report, non-self-review, and unknown-evidence rules. |
| Node YAML parse of `tasks/recovery/RECOVERY-PROVENANCE-004.yaml` | Passed; parsed task ID exactly `RECOVERY-PROVENANCE-004`. |
| `git diff --check` and `git show --check 6c9b295` | Passed; no whitespace errors. |

The candidate documents the required immutable chain: candidate, separate author
handoff marked pending, then a different QA/Security agent's immutable report.
It deliberately never treats handoff file existence or a passing local test as
proof of broader delivery acceptance.

## Security, tenant isolation, audit, and rollback

This change is documentation and a local repository-metadata regression test
only. It changes no authentication, authorization, tenant scoping, financial
data, provider, persistence, API, runtime, logging, secrets, deployment, or
customer-data behavior. The test uses no secret or customer input and removes
its temporary directory. It fails closed for absent provenance evidence by
requiring it be reported as `unknown` rather than inferred.

Corrective-forward only: preserve baseline, candidate, predecessor commits, and
all review outcomes. A later defect requires a new candidate and review chain;
do not amend, reset, force-push, rewrite history, or discard evidence.

## Limitations, external prerequisites, and QA status

- Independent QA/Security reviewer and result: `pending/unknown`. A distinct
  role-bound QA agent must start from this committed candidate/handoff state,
  read `agents/QA_SECURITY.md`, and create the immutable review report without
  editing the implementation files.
- This package does not prove queue validity, CI completeness, branch
  protection, GitHub ownership, traceability, product capability, or release
  readiness.
- External prerequisites remain verified GitHub ownership and human review,
  repository-plan support for protected branches, and later product credentials
  and managed infrastructure. No external action was performed.
