# RECOVERY-WORKFLOW-NODE-PIN-002 independent QA/Security review

## Decision

**PASS — independently accepted for supervisor integration.** This review covers
candidate `37662e41e7753c7f63ee63bc21a2e109a2e98ea1`, with its post-commit
handoff `6547264b6287284d52e70cd0d0cdc8c9e5db62c3`. The candidate is a bounded
corrective-forward change for the rejected quote-style workaround
`ccbdd6d85bbebb4cabaf275d6d5c4698fc6ee6f5`; it does not change a workflow,
action SHA, package, product runtime, tenant boundary, or deployment behavior.

## Reviewer provenance

- Task ID: `RECOVERY-WORKFLOW-NODE-PIN-002-QA`.
- Agent role: Independent QA/Security.
- Role file and SHA-256: `agents/QA_SECURITY.md`,
  `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Agent thread ID: `/root/qa_workflow_node_pin_002`.
- Worktree and branch: `C:\source\upfs-qa-workflow-node-pin-002`;
  `qa/workflow-node-pin-002`.
- Candidate base / implementation / handoff: authoritative base
  `eda2d753d0f505f6bd589b86c55491d301c32690`; implementation
  `37662e41e7753c7f63ee63bc21a2e109a2e98ea1`; review base
  `6547264b6287284d52e70cd0d0cdc8c9e5db62c3`.
- Role loading: read `AGENTS.md`, `agents/QA_SECURITY.md`,
  `agents/WORKTREES.md`, `agents/HANDOFF_TEMPLATE.md`, the engineering
  constitution, task input, handoff, CI/testing/security specifications,
  candidate code/tests, canonical workflows, and the rejected-conflict commit
  before review.

## Inputs and SHA-256 evidence

| Path | SHA-256 |
| --- | --- |
| `AGENTS.md` | `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1` |
| `agents/QA_SECURITY.md` | `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0` |
| `specs/00_constitution/engineering_constitution.md` | `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73` |
| `agents/WORKTREES.md` | `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1` |
| `agents/HANDOFF_TEMPLATE.md` | `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4` |
| `tasks/recovery/RECOVERY-WORKFLOW-NODE-PIN-002.yaml` | `6453caa010191ad13c5e0597e2a0f1cb95825a9e44b3cfa7bdf7eba63c5ab080` |
| `docs/handoffs/RECOVERY-WORKFLOW-NODE-PIN-002.md` | `d896637cc21b6748718c4efe23182aade399e4972d9d4dee4d63864efebfd73b` |
| `scripts/validate-repository.mjs` | `f9950b30b663afb40fb8e562f37c5660e12cc070ff26f8ee277ba60422e36f79` |
| `scripts/validate-repository.test.mjs` | `beda09a4ff9effbe4c6abd3b3e745849831f466ccd0beab807371a9baa734083` |
| `.github/workflows/validate.yml` | `7bbb4ec079c7f1f13483c4e0a7255a2f4b86f69c330764a4ad9fd9a3529c3703` |
| `.github/workflows/security.yml` | `d182e8fecbd2c7c3c9d9692165634dc59888f590eb8640daaf16c9f3f98d420f` |
| `specs/09_cicd/delivery_pipeline.md` | `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb` |
| `specs/10_security/security_baseline.md` | `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add` |
| `specs/12_testing/test_strategy.md` | `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172` |

## Scope, provenance, and handoff review

- `eda2d753` is an ancestor of the candidate. `git diff --check` is clean.
- Candidate changes are exactly the authorized task input, validator, focused
  validator tests, and post-commit handoff. No prohibited workflow, package,
  queue, product, contract, specification, or integration files changed.
- The handoff correctly identifies its Backend role, role digest, agent thread,
  isolated worktree/branch, implementation commit, affected files, acceptance
  criteria, test evidence, known queue limitation, rollback-only scope, and
  pending independent review. Its task-input digest matches the candidate.
- The rejected `ccbdd6d` changed only YAML quote style and cannot meet both the
  previous literal validator and formatter. Candidate validation uses parsed
  YAML semantics, so quote syntax no longer controls the security decision.

## Acceptance and security evidence

| Acceptance requirement | Independent evidence | Result |
| --- | --- | --- |
| Exact semantic Node pin | `validateNodeWorkflowPin` parses YAML, requires at least one `actions/setup-node` step, requires every such step to equal `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020`, requires mapping `with`, and requires string `node-version` `24.16.0`. | Pass |
| Required rejections | Focused mutations reject absent/wrong/numeric Node version, mutable action tag, scalar `with`, missing setup-node, duplicate YAML key, and a second setup-node step with a wrong version. | Pass |
| Quote-style false conflict removed | Double-quoted canonical YAML and an independently constructed single-quoted equivalent both pass. | Pass |
| YAML aliases and malformed structures | Exact `uses`/`with` aliases resolve only to the same exact semantic values and cannot change the pin; duplicate keys fail parser validation; malformed/scalar structures fail closed. | Pass |
| Gate preservation | Canonical action SHA, Node value, install command, workflow contents, package dependencies, and security workflow were unchanged. No tenant/customer/credential/shell behavior changed. | Pass |

The review found no authorization, cross-tenant, idempotency, replay, audit,
rollback, migration, or sensitive-data path in scope. The repository validator
continues fail-closed on malformed YAML and invalid pins. No leakage or tenant
isolation regression was introduced.

## Commands and results

- `npm ci --ignore-scripts`: pass; npm reported one pre-existing moderate
  advisory, with no automatic remediation applied.
- `node --test scripts/validate-repository.test.mjs`: pass, 6/6.
- Independent adversarial inline YAML checks: pass; canonical single/double
  quote equivalents and exact aliases accepted; wrong second setup-node,
  numeric version, duplicate key, and malformed jobs rejected.
- `npx prettier --check scripts/validate-repository.mjs scripts/validate-repository.test.mjs tasks/recovery/RECOVERY-WORKFLOW-NODE-PIN-002.yaml`: pass.
- `npm run format:check`: pass.
- `npm run ci:gates`: pass.
- `npm test`: pass, 879 passed, 0 failed, 1 documented opt-in skip, 880 total.
- `npm run validate`: expected nonzero result at historical queue validation,
  reporting 2,921 existing queue violations before workflow validation. This is
  not concealed or attributed to this candidate.
- `git diff --check eda2d753..6547264`: pass.

## Limitations and corrective-forward posture

This approval is limited to semantic validation of `validate.yml`'s
`actions/setup-node` pin. It does not claim the historical queue, traceability,
handoff provenance, security-workflow Trivy discrepancy, GitHub protection, or
production readiness is resolved. If later correction is necessary, revert
only accepted candidate and QA commits; retain `ccbdd6d` and this review as
immutable evidence and use a separately reviewed corrective-forward change.

## Integration recommendation

Supervisor may integrate `37662e41` and this QA commit into the authoritative
integration branch only through the documented acceptance process. Do not merge
to `main`, merge PR #1, or treat this control-plane fix as product capability.
