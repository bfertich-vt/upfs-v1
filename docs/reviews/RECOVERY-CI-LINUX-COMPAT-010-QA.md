# RECOVERY-CI-LINUX-COMPAT-010 independent QA/Security review

## Review identity, independence, and immutable candidate

- Task ID: `RECOVERY-CI-LINUX-COMPAT-010`.
- Agent role: Independent QA/Security.
- Role-file path and committed-byte SHA-256: `agents/QA_SECURITY.md`;
  `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Agent thread ID: `/root/qa_ci_linux_compat_010`.
- Review worktree and branch: `C:\source\upfs-qa-ci-linux-compat`;
  `qa/recovery-ci-linux-compat-010`.
- Author and role: `/root/backend_ci_linux_compat_010`, Backend. The reviewer
  did not author or remediate the candidate.
- Candidate implementation commit: `06b00c5942f094ff8b22c7b33061503bc0fef445`.
- Author-handoff commit reviewed: `a1193cf33c4fee6d9862b9e20aea34eaa8b1939a`.
- Review started from that committed candidate-and-handoff state. `git fsck
  --no-dangling` passed and the candidate is an ancestor of the reviewed
  handoff commit. No implementation files were edited by this reviewer.

## Inputs loaded before review

| Path | SHA-256 |
| --- | --- |
| `AGENTS.md` | `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1` |
| `agents/QA_SECURITY.md` | `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0` |
| `agents/BACKEND.md` | `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784` |
| `agents/WORKTREES.md` | `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1` |
| `agents/HANDOFF_TEMPLATE.md` | `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4` |
| `specs/00_constitution/engineering_constitution.md` | `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73` |
| `specs/09_cicd/delivery_pipeline.md` | `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb` |
| `specs/10_security/security_baseline.md` | `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add` |
| `specs/12_testing/test_strategy.md` | `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172` |
| `tasks/recovery/RECOVERY-CI-LINUX-COMPAT-010.yaml` | `e5356af6ded86f1379998fe4b25ec33056eb51536e782822f69806669e647de1` |
| `.github/workflows/validate.yml` | `484983a5e9bd5922c962df02a641ad2f73c91f1aac7f410cf4ebea3c19f1a3bc` |
| `scripts/ci-gate-validator.test.mjs` | `b59b7c8e772078dc16992f1f59259ba61199a38103be59ffba5efb198fb58f6f` |
| `scripts/provenance-command.test.mjs` | `b93af2f8be5a8ba81f738da84513603a7da78708951791e033ec22ec47a090eb` |
| `docs/handoffs/RECOVERY-CI-LINUX-COMPAT-010.md` | `18d26907b145c2090c41a5584bfd34a4ea92e3069ccad6bafdaa06e177503210` |
| `docs/governance/provenance-verification.md` | reviewed as the literal PowerShell command source |
| GitHub Actions run `30739299420` | completed failure at `29a8ecd`; <https://github.com/bfertich-vt/upfs-v1/actions/runs/30739299420> |

## Acceptance-criterion trace

| Acceptance criterion | Independent evidence and result |
| --- | --- |
| Complete immutable history is available to validation | The pinned `actions/checkout` step has `fetch-depth: 0`; the CI-gate regression test passed. An independent in-memory negative replacement to `fetch-depth: 1` failed the exact checkout-history matcher. PASS. |
| Linux preserves source/injection validation without falsely asserting PowerShell execution | The test always structurally checks mandatory parameters, commit/path allowlists, Git-tree tracking, `execFileSync` argument arrays, and absence of `Invoke-Expression`, `iex`, and `Start-Process`. Its Windows-only execution tests carry an explicit Linux skip reason; review on Windows also executed the real literal command. PASS. |
| Windows executes positive and injection-bearing negative cases | `node --test scripts/provenance-command.test.mjs` passed 4/4 on Windows. It executed the documented PowerShell source for the positive path and malformed/injection-bearing negative inputs. PASS. |
| Reviewer-worktree mutation reaches a real absolute-path existence guard cross-platform | The fixture derives `path.join(path.parse(fixture).root, 'not-real')`; on this Windows review host it resolved to `C:\not-real`, was absolute, and did not exist. The cross-platform traceability negative test passed. PASS. |
| Regression coverage fails closed | The CI test suite passed 16/16, including mutable/removed-gate and complete-history checks. The separate negative checks proved history removal and an injected invocation API are detected. PASS. |
| No runtime/provenance/tenant or authorization weakening | Diff from `29a8ecd` is limited to the declared workflow, two repository-control tests, structured task input, and handoff. No application, contract, queue, policy, or deployment files changed. Existing provenance, queue, traceability, tenant, authorization, and product tests remained green. PASS. |

## Commands and results

- `npm ci --ignore-scripts` — PASS.
- `node --test scripts/provenance-command.test.mjs` — PASS: 4 passed, 0 failed.
- `node --test scripts/ci-gate-validator.test.mjs` — PASS: 16 passed, 0 failed.
- `npm test` — PASS: 900 total, 899 passed, 0 failed, 1 documented opt-in embedded-PostgreSQL skip.
- `npm run ci:gates` — PASS.
- `npm run validate` — PASS.
- Node YAML parse and required ID/role/acceptance-array assertion — PASS.
- `git diff --check 29a8ecd HEAD` — PASS.
- `git fsck --no-dangling` — PASS.
- Negative checkout-history, invocation-source, and absolute-nonexistent-worktree assertions — PASS.

## Security, scope, and residual evidence

This is a repository-control correction only. It has no provider calls, tenant
identifiers, customer or financial records, credentials, runtime APIs, or
persistence changes. The change strengthens hosted-CI reproducibility by
making the required immutable commit history available. The literal
PowerShell command remains injection resistant and data-bound; this Windows
review executed it, while Linux accurately limits itself to structural and
source-level security validation.

The failed historical run is preserved as diagnosis evidence. A new hosted
Linux workflow run is still required after a supervisor integrates and pushes
the independently accepted commit; this review does not misrepresent local
Windows evidence as hosted-Linux runtime evidence. No external credential is
needed for the corrective code; GitHub CI execution is the remaining external
runtime evidence.

## Finding and decision

No defect was found. **ACCEPT** the implementation commit
`06b00c5942f094ff8b22c7b33061503bc0fef445` for supervisor integration after
this immutable QA record is committed. This is not a human review and is not
asserted to satisfy a GitHub human-approval rule.

Rollback/corrective-forward: retain the failed-run link, author candidate,
author handoff, and this review. If hosted Linux fails, create a new isolated
Backend remediation branch and obtain a fresh independent QA/Security review;
do not amend, reset, force-push, delete branches, or rewrite history.
