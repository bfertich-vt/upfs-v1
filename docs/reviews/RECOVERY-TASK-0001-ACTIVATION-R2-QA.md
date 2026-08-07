# Independent QA/Security review: RECOVERY-TASK-0001-ACTIVATION-002

## Disposition

**REJECTED** for exact final candidate
`9be06953659c1673dffd572eb1feb2d03c318ef7`.

The R2 formatting correction and all executable gates pass, but the committed
handoff records implementation commit
`2d4239245f700fbf6b2eff28650b3867b10fd3e9` as the candidate. That is not the
exact final candidate reviewed here. Exact candidate provenance is mandatory,
so this candidate must not be pushed, merged, or used to advance `TASK-0002`.

## Review provenance

- Reviewer: independent Codex QA/Security; not a human reviewer and not the
  author or remediator.
- Role: `agents/QA_SECURITY.md`.
- Agent thread: `/root/qa_task_0001_activation_r2`.
- Isolated worktree and branch:
  `C:\source\upfs-qa-task-0001-activation-r2`;
  `qa/task-0001-activation-r2`.
- Exact reviewed candidate:
  `9be06953659c1673dffd572eb1feb2d03c318ef7`.
- Exact implementation commit:
  `2d4239245f700fbf6b2eff28650b3867b10fd3e9`.
- Exact corrective base and preserved R1 rejection:
  `401d145fc7328777e40398ae1fc449def69bafa9`.
- Candidate topology: the implementation commit is the direct child of the R1
  rejection; the final handoff commit is the direct child of the implementation
  commit. The net diff contains exactly the seven R2-authorized paths.

## Governing inputs loaded

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`
- `agents/QA_SECURITY.md`: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`
- `specs/09_cicd/delivery_pipeline.md`: `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`
- `specs/10_security/security_baseline.md`: `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`
- `specs/12_testing/test_strategy.md`: `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`
- Stage A R18 task, handoff, QA review, canonical attestation; Stage B R1
  task, handoff, rejection; R2 task and handoff; activation records, queue,
  matrix, validators, tests, exact diff, and ancestry were read and inspected.

## Exact Stage A and activation evidence

- Stage A candidate: `aaafb17804586738976fd31e1a0a84dda00c2b25`.
- Stage A QA review: `0f0e6f360ec2f30d2eb94181e077801134d6c8c9`.
- Sole-file attestation: `b5065a9df57e4c915d25ae0f4ffdd097a8841e6d`.
- Attestation SHA-256:
  `cc23ceeae1e62199e17576e3d11418cd07d7e0076a38ac8af57ff30f9a98bf6c`.
- R1 rejection remains preserved at
  `401d145fc7328777e40398ae1fc449def69bafa9`.
- R2 corrects the R1 defect: both activation YAML records are pinned-Prettier
  formatted, R2 is in the production formatting set and disposable fixture,
  and the unformatted-R2 mutation fails closed.
- Canonical activation state, active closure record, queue, and matrix agree.
  `TASK-0002` remains blocked; `TASK-0112` through `TASK-0123` remain frozen.

## Blocking finding

### QA-ACTIVATION-R2-001: final-candidate provenance is inaccurate

- Severity: High for release governance.
- Exact reproduction:
  `git show 9be06953659c1673dffd572eb1feb2d03c318ef7:docs/handoffs/RECOVERY-TASK-0001-ACTIVATION-002.md`
- Actual committed statement:
  `Commit: candidate 2d4239245f700fbf6b2eff28650b3867b10fd3e9`.
- Required identity: the final candidate independently reviewed is
  `9be06953659c1673dffd572eb1feb2d03c318ef7`; `2d423924...` is the
  implementation commit and direct parent.
- Required corrective-forward action: preserve this rejection, create a new
  handoff-only corrective candidate that labels `2d423924...` solely as the
  implementation commit and truthfully distinguishes the prior submitted
  candidate and new final candidate topology, then obtain a fresh independent
  QA review of that exact committed candidate. Do not amend or rewrite history.

## Independent commands and results

| Command | Result |
| --- | --- |
| `npm ci --ignore-scripts --offline` | Pass; 106 packages installed, 107 audited, zero vulnerabilities. |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs` | Pass; 12/12 in 92.45 seconds. |
| `npm run format:check` | Pass; 48 pinned-Prettier files. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` | Pass; 299 Markdown, 65 JSON, 5 YAML. |
| `npm run queue:check` | Pass. |
| `npm run traceability:check` | Pass. |
| `npm test` | Pass; 948 total, 947 passed, 0 failed, 1 documented pre-existing opt-in embedded-PostgreSQL skip in 269.59 seconds. |
| `npm audit --audit-level=high --offline` | Pass; zero vulnerabilities. |
| `git fsck --full --strict` | Pass; disposable dangling test objects only. |
| Exact-base ancestry, seven-path authorization, `git diff --check`, exact-head, and clean-state checks | Pass before this review artifact. |

## Negative and security coverage

The targeted and full suites reject wrong candidate, review, attestation, hash,
task, role, verdict, direct-parent, and byte substitutions; missing, duplicate,
modified, deleted, renamed, copied, symlink, gitlink, extra-file, interposed, and
dirty-state forms; malformed/unformatted activation YAML; state/queue/matrix
drift; Git/index/filesystem redirection; premature TASK-0002 completion;
authorization denial, cross-tenant access, replay/idempotency conflicts, audit
leakage, rollback/failure, and contract drift where applicable. This
governance-only correction changes no runtime tenant, financial, API, database,
migration, provider, or durable-state behavior.

## Limitations and verdict

Hosted checks, pull-request promotion, and protected merge were not attempted
because independent QA rejected the local candidate. The implementation author
must correct forward; the reviewer did not edit implementation.

**Final verdict: REJECTED** for
`9be06953659c1673dffd572eb1feb2d03c318ef7`.
