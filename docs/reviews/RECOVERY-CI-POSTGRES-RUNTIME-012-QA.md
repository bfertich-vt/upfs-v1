# RECOVERY-CI-POSTGRES-RUNTIME-012 independent Codex QA/Security review

## Verdict

**ACCEPT.** The candidate makes the hosted Linux migration gate reproducible by
declaring the locked, Linux/x64-only disposable PostgreSQL runtime as a root
optional dependency. It does not turn a skipped, failed, missing, or unavailable
runtime into a passing result. This is CI recovery evidence only; it is not a
production PostgreSQL deployment or a production-persistence claim.

## Reviewer provenance and independence

- Task: `RECOVERY-CI-POSTGRES-RUNTIME-012`.
- Reviewer role: Independent Codex QA/Security (`agents/QA_SECURITY.md`).
- Role-file digest: SHA-256
  `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Reviewer thread: `/root/qa_ci_postgres_012`.
- Reviewer worktree and branch: `C:\source\upfs-qa-ci-postgres-012`;
  `qa/recovery-ci-postgres-012`.
- Candidate implementation: `eb1fd64c4c62842cbc28c9cfc13622c0b151ee2b`
  (`fix: install CI PostgreSQL runtime on Linux`).
- Author handoff: `11266036856a13b476b95c26d7580502bfdcea75`.
- Candidate evidence handoff state reviewed: `475ca4e799fdac74e176fb453421acffdf137a9e`.
- The reviewer did not author or remediate the candidate and began from the
  committed candidate-and-handoff state. This review is independent Codex
  QA/Security evidence, not a human or native GitHub PR approval.
- QA-owned file: this review only. No implementation or GitHub setting was
  edited.

## Sources loaded before review

| Source | SHA-256 |
| --- | --- |
| `AGENTS.md` | `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1` |
| `agents/QA_SECURITY.md` | `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0` |
| `agents/HANDOFF_TEMPLATE.md` | `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4` |
| `agents/WORKTREES.md` | `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1` |
| `specs/00_constitution/engineering_constitution.md` | `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73` |
| `specs/09_cicd/delivery_pipeline.md` | `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb` |
| `specs/10_security/security_baseline.md` | `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add` |
| `specs/12_testing/test_strategy.md` | `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172` |
| `tasks/queue.yaml` | `05ed87243f7baa6060c6d650023ce9130741f529949d338cfe2c3d30806347c3` |
| `tasks/recovery/RECOVERY-CI-POSTGRES-RUNTIME-012.yaml` | `fce82c38439e10e2676597ce9c6eabc1855a8440e5bfaf2279e6c1b0079546b1` |
| `docs/handoffs/RECOVERY-CI-POSTGRES-RUNTIME-012.md` | `a84f958ca5fef2c39ccb3a6fe4a37c5c68769946228028c3409ed7b896264d07` |

The reviewer also inspected `package.json`, `package-lock.json`,
`scripts/embedded-postgres-ci-gate.mjs`,
`scripts/embedded-postgres-ci-gate.test.mjs`,
`scripts/task-0014-embedded-postgres.mjs`, and the unchanged hosted workflow.

## Acceptance, tests, and negative evidence

| Requirement | Independent evidence | Result |
| --- | --- | --- |
| Linux CI gets a deterministic disposable runtime | `package.json` declares `@embedded-postgres/linux-x64` as optional; lockfile fixes version `18.4.0-beta.17`, OS `linux`, CPU `x64`, registry URL, and SHA-512 integrity. The unchanged Ubuntu workflow runs `npm ci --ignore-scripts` before mandatory `migration:check`. | Pass |
| Mandatory migration and RLS checks execute | On the reviewer host, `npm run migration:check` started two disposable clusters and passed all nine checks, including migrations, restore, rollback injection, and tenant isolation. | Pass |
| No soft skip | The unit test rejects `skipped`, `failed`, and missing result. The reviewer temporarily hid `node_modules/embedded-postgres`; the real gate exited 1 with `...did not pass: skipped`, then the module was restored. | Pass |
| Non-Linux remains optional | Windows `npm ci --ignore-scripts` succeeded without installing the Linux-only package. The existing Windows disposable runtime ran the same mandatory gate successfully. | Pass |
| Locked provenance | The optional package has exact lockfile version, registry tarball, SHA-512 integrity, Linux/x64 restrictions, and MIT metadata. No unpinned workflow action or workflow change is in the candidate range. | Pass |
| No secret/data/deployment expansion | Candidate diff is limited to `package.json`, `package-lock.json`, task input, and handoff. Review found no database URI, provider credential, customer data, private financial data, or deployment configuration. Synthetic test passwords remain local test fixtures in pre-existing rehearsal code. | Pass |

Commands executed from the clean assigned worktree at `475ca4e`:

- `npm ci --ignore-scripts` — passed.
- `npm run migration:check` — passed; 9 checks.
- `node --test scripts/embedded-postgres-ci-gate.test.mjs` — passed 1/1.
- missing-runtime negative execution after temporarily hiding only the local
  dependency directory — exited 1 as required; dependency restored.
- `npm run ci:gates` — passed.
- `npm run validate` — passed.
- `npm test` — 900 total; 899 passed, 0 failed, 1 documented opt-in skip.
- `git diff --check 939e2cf..475ca4e` — passed.
- Structured-input YAML parse — passed.
- `npm audit --audit-level=high` — passed; it reported one existing moderate
  `yaml` advisory, below the configured high threshold. No forced dependency
  change was made during this recovery review.

## Security, tenant isolation, audit, and limitations

The gate sets the embedded-run flag itself and accepts no external database URL
or credential. The candidate makes a test-only package optional and platform
restricted; it does not add product persistence, an external service, provider
connectivity, customer data, or production secrets. The real rehearsal retains
its FORCE-RLS tenant-bound read checks, cross-tenant denial, transactional
rollback injection, and synthetic-only data. No authorization or tenant runtime
behavior was changed.

The reviewer cannot directly prove GitHub-hosted Linux execution from this
Windows worktree. Hosted CI after supervisor integration and push is therefore
required before branch protection is configured. The existing moderate `yaml`
advisory is a documented follow-up; it is not introduced by this candidate and
does not meet the repository's configured high/critical blocking threshold.

## Corrective-forward and review outcome

If hosted Ubuntu CI fails, preserve the failed run and use a new isolated
Backend correction followed by a fresh independent QA/Security review. Do not
amend, reset, force-push, delete branches, rewrite history, or treat this local
review as a GitHub approval. The independently reviewed candidate is accepted
for supervisor integration and hosted validation.
