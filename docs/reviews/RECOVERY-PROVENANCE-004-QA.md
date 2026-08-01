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
