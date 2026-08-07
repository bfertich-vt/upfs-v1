# Independent QA/Security review

- Task and disposition: `RECOVERY-TASK-0002-HOSTED-COUNT-001`; **ACCEPT**. The exact committed candidate `614e8ee326c61158a37b88e4663717b5f7d1e0f0` (implementation `9b749e356bcefbb3d88e2de2d46a737a14c262ec`) satisfies every bounded acceptance criterion. No implementation file was edited during this review.
- Reviewer role: Independent QA/Security under `agents/QA_SECURITY.md`; this is an independent Codex QA review, not a human review.
- Reviewer identity: thread `/root/qa_task_0002_hosted_count_r1`; worktree `C:\source\upfs-qa-task-0002-hosted-count-r1`; branch `qa/task-0002-hosted-count-r1`.
- Independence: The reviewer did not author or remediate the candidate. Author evidence identifies Backend thread `/root/backend_task_0002_hosted_count_r1`, worktree `C:\source\upfs-backend-task-0002-hosted-count-r1`, and branch `recovery/task-0002-hosted-count-r1`.

## Governing inputs loaded before review

- `AGENTS.md`: SHA-256 `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`.
- `agents/QA_SECURITY.md`: SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- `specs/00_constitution/engineering_constitution.md`: SHA-256 `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- `agents/WORKTREES.md`: SHA-256 `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`.
- `agents/HANDOFF_TEMPLATE.md`: SHA-256 `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- `specs/09_cicd/delivery_pipeline.md`: SHA-256 `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`.
- `specs/10_security/security_baseline.md`: SHA-256 `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`.
- `specs/12_testing/test_strategy.md`: SHA-256 `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- `tasks/recovery/RECOVERY-TASK-0002-HOSTED-COUNT-001.yaml`: SHA-256 `cb38ca5b2161fc04237b38f0830519683c256685cc2b25af11fb7ce11b7db93a`.
- `docs/handoffs/RECOVERY-TASK-0002-HOSTED-COUNT-001.md`: SHA-256 `8f6eb6676adb408d03005c507bc84b7e3bb0d86fa1f9e75397ca1994be1c5453`.
- `.github/workflows/validate.yml`: SHA-256 `caa1b8a53f5f66621537eccbe9543dd10bb55af68b5126bd5cc85b01f0e3bfc9`.
- `scripts/ci-gate-validator.test.mjs`: SHA-256 `17fb99baadd0351edb6ce59f37e0ac6720ca44a52bffd1615002e7b5118e1932`.

## Acceptance-criterion trace

- The rejected hosted run `31206824523` remains named in the structured task and handoff; no history or evidence was removed.
- Workflow validation requires schema version `2`, an object-valued `required_counts`, and exactly `handoff-candidate`, `erratum-source`, `qa-review-evidence`, and `total`. Every count must be a non-negative safe integer.
- Total and each supported per-kind count are derived from and compared with the manifest refs. Unknown kinds fail closed, and at least one `qa-review-evidence` ref is mandatory.
- The prior hardcoded `refs.length!==35` predicate is absent. The immutable manifest and bundle are unchanged from the accepted input.
- Bundle SHA-256 and the exact hydrated ref/object mapping remain checked. Fresh isolated hydration recovered exactly 36 commits: 33 handoff candidates, 2 erratum sources, and 1 QA-review-evidence object.
- The changed-file inventory is exactly `.github/workflows/validate.yml`, `scripts/ci-gate-validator.test.mjs`, `tasks/recovery/RECOVERY-TASK-0002-HOSTED-COUNT-001.yaml`, and `docs/handoffs/RECOVERY-TASK-0002-HOSTED-COUNT-001.md`; prohibited-file count is zero.

## Commands and results

- Initial focused test before dependency installation failed closed in 0.127 seconds with `ERR_MODULE_NOT_FOUND` for lockfile dependency `yaml`. `npm ci --ignore-scripts` then installed 106 packages in 4.432 seconds with 0 vulnerabilities; this setup failure is not represented as a candidate defect.
- `node --test --test-name-pattern="hosted provenance hydration derives" scripts/ci-gate-validator.test.mjs`: PASS, 1/1, 0 failures, 0.590 seconds.
- Independent in-memory mutation harness applying the workflow's exact count predicate: PASS; all 11 malformed variants rejected (stale total, stale per-kind, missing key, extra key, fractional count, string count, unknown kind, missing QA evidence, QA-as-handoff semantic substitution, duplicate ref, omitted ref).
- `npm test`: PASS, 961 passed, 0 failed, 1 pre-existing skip, 962 total, 272.403 seconds. This includes immutable-bundle omission, substitution, wrong-kind, stale-count, extra-ref, digest/object tamper, corruption, local-history leakage, and semantic/current-record bypass coverage.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`: PASS, 329 Markdown, 65 JSON, and 5 YAML files, 6.970 seconds.
- `npm run format:check`: PASS, all Prettier targets plus 48 pinned closure files, 3.705 seconds.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilities, 1.416 seconds.
- `git fsck --full --strict`: PASS, 12.094 seconds; only preserved dangling local objects were reported.
- `git diff --check`: PASS. Authorized-file inventory: PASS, 4 allowed files and 0 prohibited files. Review head before attestation: exact candidate `614e8ee326c61158a37b88e4663717b5f7d1e0f0`; worktree clean aside from this sole review artifact after creation.
- `git bundle verify scripts/fixtures/historical-provenance-v3.bundle`: PASS, complete history and exactly 36 advertised refs.
- Fresh isolated Git repository fetch from the immutable bundle followed by exact manifest/ref and commit-type comparison: PASS, 36/36 refs; bundle SHA-256 actual and expected `a518ba7ce8d513d062978f93196882d02573b2b9fa65bc3a65132aaa606708ff`.

## Security, tenant isolation, and leakage assessment

- No validation expectation was removed, renamed, bypassed, or made optional. Closed allowed-kind and exact-key checks prevent wildcard or unavailable-source classes; exact count comparison prevents stale, omitted, or extra records; exact ref/object comparison and bundle hashing still prevent substitution, tampering, and local-history leakage.
- `qa-review-evidence` cannot satisfy handoff or erratum counts because kinds are counted separately and compared independently. A semantic substitution therefore fails unless multiple manifest fields are maliciously rewritten, after which immutable digest/object and repository tests remain enforcement layers.
- This is CI-only governance logic. It changes no product runtime, tenant-scoped data path, authorization policy, customer/financial data, credential handling, persistence, migration, or API contract. Tenant-isolation behavior is therefore unaffected; the full suite's authorization and tenant tests remained green.
- No sensitive payload, credential, secret, customer data, or financial data was introduced in the reviewed diff.

## Findings, limitations, and corrective-forward

- Findings: no acceptance, security, provenance, or scope defects found.
- Limitation: GitHub-hosted execution is not proven by local QA; promotion must still require repository-validation and repository-security on the exact integrated PR head and retained hosted artifacts.
- Limitation: the supported provenance-kind vocabulary is deliberately closed. A future kind requires a reviewed schema/workflow/test change rather than a data-only addition.
- Corrective-forward: preserve this review, candidate, rejected run `31206824523`, and all prior evidence. If an exact-head hosted gate rejects the candidate, do not bypass it; create a separate bounded remediation and obtain fresh independent QA.

## Verdict

**ACCEPT** `614e8ee326c61158a37b88e4663717b5f7d1e0f0` for supervisor integration of this sole-file QA evidence and protected-PR promotion. This verdict does not authorize direct push, merge, deployment, production use, or a production-capability claim.
