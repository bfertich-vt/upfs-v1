# RECOVERY-PROVENANCE-004 independent QA/Security review

## Disposition

**Accepted for supervisor integration.** This is a bounded, documentation and
local-test-only recovery control. It is not evidence of product capability,
release readiness, queue validity, CI completeness, GitHub protection, or
historical-task acceptance.

## Reviewer provenance and review target

- Task: `RECOVERY-PROVENANCE-004` — Clean provenance validation and
  non-self-referential review chain.
- Reviewer role: Independent QA/Security; role file:
  `agents/QA_SECURITY.md`; canonical committed-byte SHA-256 at the review
  target: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Reviewer thread: `/root/qa_provenance_clean_package`.
- Review worktree and branch:
  `C:\source\upfs-review-provenance-clean-004`;
  `review/recovery-provenance-clean-004`.
- Author role and role file: Backend; `agents/BACKEND.md`; canonical
  candidate-byte SHA-256:
  `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`.
- Candidate reviewed: `6c9b295773c679d35520535161e89b7bf0969368`
  (`docs: add clean provenance recovery control`).
- Author handoff reviewed: `1bfb7703ba218fd7651e24b1dbfac787b7bbce67`
  (`docs: record provenance recovery handoff`).
- Baseline: `0df7ffcb76139a698beba1a0309498f1f7dae857`
  (`codex/task-0001-baseline`). The candidate's sole parent is that baseline;
  the handoff's sole parent is the candidate. Therefore this package is
  self-contained and does not import unaccepted predecessor implementation
  files.

## Governing inputs read

The reviewer read `AGENTS.md`, `agents/QA_SECURITY.md`,
`agents/HANDOFF_TEMPLATE.md`, `agents/BACKEND.md`, `agents/WORKTREES.md`, the
engineering constitution, CI/CD and test-strategy specifications, the task
input and author handoff, and the three candidate files. The canonical Git-byte
digests at the candidate for the principal governing artifacts are:

| Path | SHA-256 |
| --- | --- |
| `AGENTS.md` | `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1` |
| `agents/QA_SECURITY.md` | `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0` |
| `agents/HANDOFF_TEMPLATE.md` | `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4` |
| `specs/00_constitution/engineering_constitution.md` | `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73` |
| `specs/09_cicd/delivery_pipeline.md` | `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb` |
| `specs/12_testing/test_strategy.md` | `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172` |
| `tasks/recovery/RECOVERY-PROVENANCE-004.yaml` | `01b5b6259d53400f742d5fc179b6f0313e2c81a43123801d232e52eb3d9eb91e` |

The prior immutable provenance artifacts identified by the task were inspected
only as historical context. Their absent evidence remains unknown/unsupported;
this review does not repair, accept, or infer it.

## Acceptance-criterion traceability

| Criterion | Independent evidence | Result |
| --- | --- | --- |
| Literal PowerShell command executes without interpolation/parsing failure and emits a lowercase Git-blob SHA-256 | `node --test scripts/provenance-command.test.mjs` extracts the exact Markdown code block, writes an external temporary `.ps1`, invokes noninteractive PowerShell, and compares output to `git show <commit>:AGENTS.md` bytes | Pass (test 1 of 2) |
| Regression test covers the documented command | Same command; 2 passing, 0 failing tests | Pass |
| Candidate, pending author handoff, and independent immutable QA-report model is non-self-referential | Manual review of `docs/governance/provenance-verification.md`, task input, and author handoff. The author handoff is explicitly `QA pending`; the control says the QA report is evidence about the handoff and must not require review of itself. | Pass |
| Historical absence fails closed | Manual review plus test 2, which requires the control to state that unknown evidence is not inferred | Pass |
| Structured task input parses and candidate precedes handoff | Node/YAML parse printed `valid YAML: RECOVERY-PROVENANCE-004`; commit-parent and changed-path inspection found candidate parent = baseline and handoff parent = candidate | Pass |

## Commands and outcomes

```powershell
npm ci --ignore-scripts
node --test scripts/provenance-command.test.mjs
node -e "const fs=require('fs'); const YAML=require('yaml'); const task=YAML.parse(fs.readFileSync('tasks/recovery/RECOVERY-PROVENANCE-004.yaml','utf8')); if(task.id!=='RECOVERY-PROVENANCE-004') throw new Error('wrong id'); console.log('valid YAML:', task.id)"
git diff --check 0df7ffcb76139a698beba1a0309498f1f7dae857 HEAD
git show --check 6c9b295773c679d35520535161e89b7bf0969368
git show --check 1bfb7703ba218fd7651e24b1dbfac787b7bbce67
```

- Locked dependency installation completed with lifecycle scripts disabled. npm
  reported one existing moderate dependency advisory; no manifest, lockfile, or
  generated output is part of this candidate or review.
- Provenance regression: 2 pass, 0 fail, 0 skipped.
- YAML input parsed with the exact required task ID.
- Whitespace and commit checks passed; the review worktree was clean before
  this QA record.
- The candidate diff has exactly three authorized implementation files and the
  author handoff adds only its authorized handoff file.

## Independent negative, security, and operational review

- **Replay/idempotency/concurrency:** N/A. This task has no write API, service,
  persistence, provider flow, or durable state. The negative evidence case is
  the test requiring absence to remain `unknown`, rather than being inferred.
- **Authorization/cross-tenant/leakage:** N/A to runtime behavior. Diff scope
  inspection confirms no authentication, authorization, tenant-scoping,
  financial-data, API, schema, provider, logging, or deployment files changed.
  The reviewed text and test use only repository metadata and temporary local
  files; no credential or customer-data assignment was present in the changed
  paths.
- **Failure/rollback/audit:** The control fails closed for missing evidence and
  records corrective-forward only. It preserves baseline and predecessor
  evidence and prohibits amend, reset, force-push, history rewrite, or deletion.
  The immutable candidate → handoff → QA-report chain supplies the audit trail.
- **Contract/generated drift/migration/policy/prompt/skill/accessibility:** N/A;
  no affected contract, generated artifact, migration, policy, prompt, skill,
  UI, or deployment artifact is in scope.

## Limitations and integration recommendation

The package satisfies only the bounded recovery task. GitHub ownership and
branch protection, queue structural validation, full CI gates, documentation
truthfulness, traceability, and all product capabilities require separate
evidence and must not be promoted from this PASS.

The supervisor may integrate the candidate, author handoff, and this distinct
QA report together into the authoritative integration branch using a
non-destructive merge. No main merge, historical-PR merge, force-push, reset,
or deletion is authorized by this review. Any defect discovered after
integration requires a new corrective-forward candidate and independent review.

---

## Current corrective-forward review — superseding assessment

The preceding record is retained verbatim as historical evidence. It addressed
an earlier candidate (`6c9b295`) and is not evidence for the committed repair
below. It was temporarily replaced by QA commit `4de887d`, then restored in
corrective-forward commit `abd8a23`; neither history nor prior evidence was
rewritten or discarded.

- Task: `RECOVERY-PROVENANCE-004`, corrective-forward repair of
  `QA-RECOVERY-PROVENANCE-003-01`; no product or production-readiness claim.
- Current reviewer: Independent QA/Security, bound to
  `agents/QA_SECURITY.md`
  `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
  QA thread `/root/qa_recovery_provenance_004`, worktree
  `C:\source\upfs-qa-provenance-004`, branch
  `qa/recovery-provenance-004`.
- Other mandatory role-source digests: `AGENTS.md`
  `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`;
  `agents/BACKEND.md`
  `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`;
  `agents/WORKTREES.md`
  `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`;
  `agents/HANDOFF_TEMPLATE.md`
  `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`;
  constitution `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`;
  CI/CD `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`;
  security baseline `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`;
  testing strategy `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- Candidate: `f80ea43178ddff20ed171a90f7e485b0a58617d5`; author handoff:
  `fb33679162b7f907415f02231cabb028cfa2fed2`. Candidate files/digests:
  provenance document `778cff5812788355856815958d13fbd215d68cff7e24e476d15221eaa49401ba`,
  literal-command test `387e4bac4c0ed10886802e788024e94a8b28db34cda030340223d2b6cc10d445`,
  structured task input `3cf2ec08d18b8b68b023917ad135b7bb16cd7e41f9a48687c8d0d4422d2fa53d`.
  The candidate author and current QA reviewer are distinct; QA changed no
  implementation file.

### Independent evidence and security result

I extracted the exact fenced documentation block into a temporary external
`.ps1`, then executed it with named `-Commit` and `-Path` arguments. For
`HEAD`/`AGENTS.md`, exit was zero and its lowercase digest exactly matched an
independent Node hash of `git show <HEAD>:AGENTS.md` bytes:
`9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`.

The same literal external script was attacked with semicolon, whitespace, and
quote/command-substitution inputs; absolute, traversal, untracked, and missing
paths; and all-zero, malformed, and uppercase refs. Every case failed nonzero,
produced no `INJECTED` output, and did not create an asserted side-effect
sentinel. The typed parameters, commit/path allowlists, tracked-at-commit check,
environment data transfer, and Node `execFileSync` argument arrays prevent the
predecessor's PowerShell injection and path-escape flaw.

`node --test scripts/provenance-command.test.mjs` passed 3/3; it executes the
literal external file and covers the required negative classes. YAML parsing of
the current input passed (`RECOVERY-PROVENANCE-004`, Backend, seven criteria).
`git diff --check ff89e9e..f80ea43`, `git show --check f80ea43`, and
`npm run validate` passed. `npm ci --ignore-scripts` passed with one existing
moderate advisory and no manifest mutation. `npm test` passed 897/898 with one
declared opt-in skip and no failure. Candidate-to-handoff separation is proven
by `git diff --name-status f80ea43..fb33679` (only the handoff) and successful
ancestor check.

This local documentation/test-only change has no tenant, API, persistence,
provider, workflow, credential, customer-data, authorization, audit-runtime,
migration, or product behavior. Tenant isolation, idempotency/replay, and
runtime rollback tests are therefore not applicable. It does not prove broader
CI/GitHub governance, protected branches, infrastructure, or production
readiness. Preserve the rejection, candidate, handoff, and all QA commits;
later defects require new corrective-forward work and QA, never rewrite.

**Current decision: ACCEPT.** The bounded candidate meets the current
RECOVERY-PROVENANCE-004 criteria and is eligible for supervisor integration;
this is not a product promotion.
