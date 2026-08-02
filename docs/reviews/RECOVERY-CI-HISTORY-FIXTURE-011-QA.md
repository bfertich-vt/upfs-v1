# Independent Codex QA/Security review: RECOVERY-CI-HISTORY-FIXTURE-011

## Disposition

**ACCEPT for supervisor integration into the authoritative integration branch only.** This independent Codex QA/Security review accepts Backend candidate `ba67ccd8274002badb47d00a0ec8b288b1595570` and its separate author handoff `f02610624b9f1662bc52357ff234657170b2787a`. It does not authorize a merge to `main`, a deployment, a product-capability claim, or a relaxation of GitHub protection requirements.

## Review provenance and separation

- Task: `RECOVERY-CI-HISTORY-FIXTURE-011` — bounded repository-control recovery for hosted run `30744306355`.
- Candidate implementation: `ba67ccd8274002badb47d00a0ec8b288b1595570` (`fix: package CI provenance history fixture`).
- Author handoff: `f02610624b9f1662bc52357ff234657170b2787a`.
- Candidate author: Backend, role file `agents/BACKEND.md`, thread `/root/backend_ci_history_fixture_011`.
- Reviewer: distinct Independent Codex QA/Security role, `agents/QA_SECURITY.md`, SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`, thread `/root/qa_ci_history_fixture_011`.
- Review worktree and branch: `C:\source\upfs-qa-ci-history-fixture`; `qa/recovery-ci-history-fixture-011`.
- Review start point: committed author-handoff state `f02610624b9f1662bc52357ff234657170b2787a`; the reviewer neither authored nor remediated the candidate. This QA record is the only reviewer-owned file.

## Required material loaded

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
| `tasks/recovery/RECOVERY-CI-HISTORY-FIXTURE-011.yaml` | `380f1e1db2db39f4aac753bd4bb848918094d2858c0ac5974db50504a5d71861` |
| `scripts/ci-gate-validator.test.mjs` | `d06c64a394ef2aee7fd431443b03fd3c56d97cade192cf26d2249719ee19a401` |
| `scripts/fixtures/historical-provenance-v1.bundle` | `85430ac78158117acf4484d120f414fc30087b202a033e83f12b8c20a97776c5` |
| `docs/handoffs/RECOVERY-CI-HISTORY-FIXTURE-011.md` | reviewed at `f02610624b9f1662bc52357ff234657170b2787a` |

The reviewer also inspected the validator, exact candidate diff, bundle refs and verification output, and the failed hosted run `30744306355` cited by the task input.

## Acceptance trace

| Criterion | Independent evidence | Result |
| --- | --- | --- |
| Hosted CI obtains exact historical commits from repository-contained evidence | The committed 619,473-byte fixture exposes exactly four declared refs. A temporary fresh repository fetched those refs and `git cat-file -t` resolved each required SHA (`e7c81bf`, `2ec8213`, `4ae7e95`, `90208c6`) to `commit`. The test no longer clones the working checkout. | Pass |
| Fixture is Git-verified and fails closed | `git bundle verify` accepts the restored fixture. Removing the fixture makes the focused suite fail (2 failures, required-fixture assertion). A payload-byte mutation makes it fail (2 failures, `pack is corrupted (SHA1 mismatch)`). Restoration followed each negative test. | Pass |
| Historical append-only negatives remain active | Focused suite passed 16/16, including the legacy-unpaired and partially-paired erratum suites plus malformed-row, blob, digest, allowlist, and missing-commit coverage. | Pass |
| No validation or product behavior is weakened | Diff scope is test, binary fixture, and structured recovery input only; `scripts/ci-gate-validator.mjs`, queue, contracts, runtime services, and workflow files are unchanged. Existing structural test still requires checkout `fetch-depth: 0`. | Pass |

## Commands and results

- `npm ci --ignore-scripts` — PASS; lockfile unchanged. One pre-existing moderate dependency advisory reported; no candidate dependency change.
- `node --test scripts/ci-gate-validator.test.mjs` — PASS: 16 passed, 0 failed.
- `npm test` — PASS: 900 total, 899 passed, 0 failed, 1 documented opt-in embedded-PostgreSQL skip.
- `npm run ci:gates` — PASS.
- `npm run validate` — PASS.
- Node YAML parse with ID, Backend role, and acceptance-array assertions — PASS.
- `git diff --check fa3eb30..HEAD` and final worktree diff check — PASS.
- `git bundle verify scripts/fixtures/historical-provenance-v1.bundle` — PASS; four expected refs and complete history reported.
- Fresh bare-repository fixture fetch and `git fsck --no-reflogs --full` — PASS; 349 reachable historical commits are the ancestry required to reconstruct the four preserved immutable ref tips.
- Missing-fixture negative — FAIL-CLOSED as required; then restored.
- Corrupt-payload negative — FAIL-CLOSED during fixture fetch with pack SHA-1 mismatch; then restored.

## Security and tenant-isolation analysis

This is repository-control-only test evidence. The bundle contains historical Git objects needed by the four immutable provenance commits, not runtime configuration, provider traffic, customer records, or credentials. A bounded secret/financial-pattern scan of the fetched object graph yielded only pre-existing synthetic test literals and redaction fixtures (including known test card values and `*-test-only` strings); no private-key, cloud-token, GitHub-token, or credential-shaped material was accepted as a secret. No production code, API, authorization, tenant scope, persistence, audit runtime, or migration changed, so BOLA/cross-tenant/replay runtime tests are not applicable beyond preservation of the existing full suite.

The fixture is deliberately complete ancestry, rather than a shallow history dependent on checkout state. Its declared ref tips are exact and the tests assert each is a commit before historical validator cases run. Missing or corrupt evidence prevents the historical suites from passing; it does not skip them.

## Limitations, rollback, and recommendation

The remaining required evidence is a hosted Linux rerun after supervisor integration and push. Local Windows execution, including deterministic fresh-repository fixture tests, does not claim a hosted result. Correct forward only: preserve the failed hosted run, candidate, fixture, author handoff, and this QA record; use a fresh isolated remediation branch and fresh independent Codex QA/Security review if hosted validation fails. Do not amend, reset, force-push, delete branches, or rewrite history.

The supervisor may integrate the accepted candidate, author handoff, and this committed QA record into the authoritative integration branch, then push the accepted range and wait for hosted validation. This review is independent Codex QA/Security evidence, not a human review or a native GitHub PR approval.
