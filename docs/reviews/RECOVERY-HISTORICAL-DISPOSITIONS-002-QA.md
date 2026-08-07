# Independent Codex QA/Security Review: RECOVERY-HISTORICAL-DISPOSITIONS-002

## Verdict

**REJECT.** Candidate `9c914d04bcf91b606cb5199eb9f7e32233c56034` (implementation `4ed892af7f6d7869ed388b5efc58fbe300d0a6c1`) preserves the structural matrix and disposition counts, but it does not provide task-specific required tests or concrete bounded file ownership for every row. The correction replaces the prior omissions with broad repeated boilerplate and placeholder task-ID globs. Repository-wide gates passing does not satisfy these matrix acceptance criteria.

## Reviewer provenance and independence

- Reviewer: independent Codex QA/Security agent; not a human reviewer.
- Assigned role: Independent QA/Security.
- Agent thread: `/root/qa_historical_dispositions_002`.
- Role file: `agents/QA_SECURITY.md`; SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Worktree: `C:\source\upfs-qa-historical-dispositions-002`.
- Branch: `codex/qa-historical-dispositions-002`.
- Candidate reviewed: `9c914d04bcf91b606cb5199eb9f7e32233c56034`.
- Implementation commit: `4ed892af7f6d7869ed388b5efc58fbe300d0a6c1`.
- Preserved prior rejection: `f62b9350bfb2b5459994be0c6e9ad4b3056ceb8b` and `docs/reviews/RECOVERY-HISTORICAL-DISPOSITIONS-001-QA.md`.
- Independence: this reviewer did not author or remediate the candidate. Review began from the exact committed candidate, and the only reviewer-authored file is this report.

## Governing material loaded

The reviewer read and SHA-256 verified the governing documents before review:

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`
- `agents/QA_SECURITY.md`: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`
- `docs/MASTER_PLAN.md`: `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`
- `tasks/queue.yaml`: `05ed87243f7baa6060c6d650023ce9130741f529949d338cfe2c3d30806347c3`
- Candidate matrix: `be9e60e43c616f6132d72d79262acf0410eefaa41d87dbba1f7c7fdd9ad0e23a`
- Candidate task input: `1a7df2356dd87556d88348b76e01958230473e455ff46b50126d2888ea0bc94e`

All 19 normative specification files, structured task inputs, available historical handoffs/reviews, contracts, and applicable application/service/script tests were consumed. The deterministic read covered 605 files / 7,812,962 bytes with path-and-content aggregate SHA-256 `fb36b4570660f6e9aa363e5271e21699a790b2527cdf693f8d68e599e6b72216`.

## Acceptance trace

- Exactly 110 unique contiguous rows `TASK-0001` through `TASK-0110`: PASS.
- Exactly 18 nonempty fields per row: PASS.
- Exact disposition vocabulary and counts: PASS — `ACCEPTED` 0, `REMEDIATION_REQUIRED` 57, `EXTERNAL_PREREQUISITE` 40, `NOT_IMPLEMENTED` 13.
- Queue title and dependency equality: PASS for all 110 rows.
- Referenced sources exist: PASS.
- Correctly named historical handoffs exist except the truthfully documented `TASK-0021` and `TASK-0022` gaps: PASS.
- `TASK-0001` has no dependency and is named as earliest dependency-complete: PASS.
- No post-`TASK-0110` work, prohibited implementation change, or disposition promotion: PASS.
- Task-specific, non-generic required-test definitions: **FAIL (QA-001)**.
- Concrete, bounded, one-writer-compatible ownership: **FAIL (QA-002)**.
- Prior rejection preserved: PASS.

## Findings

### QA-001 (high): required-test fields are generic templates, not criterion-specific test plans

After replacing each row's task ID with `TASK-NNNN`, the 110 `Required tests` fields collapse to only 13 distinct strings; 106 rows belong to duplicated groups. The largest identical normalized groups contain 35, 30, 18, and 9 tasks. For example, the 35-row group applies the same authorization, tenant, leakage, replay, concurrency, audit, drift, accessibility, AI/search, and recovery sentence to tasks as different as `TASK-0013`, `TASK-0023`, `TASK-0070`, `TASK-0099`, and `TASK-0110`.

This does not trace each surviving criterion to an exact test, command, expected result, contract, or runtime evidence. It also indiscriminately requires unrelated categories (for example accessibility and bounded AI/search controls) rather than identifying why they apply to a particular capability. A task identifier prefixed to boilerplate does not make the plan task-specific.

Required remediation: derive each row's tests from its cited requirements and contracts. Name the exact test target/command and expected positive and fail-closed behavior for every applicable authorization/tenant/leakage, idempotency/replay, concurrency, audit/tamper, contract/schema/API/SDK drift, accessibility, failure, rollback, and recovery criterion. Omit categories only when the row records why they are not applicable. Add a deterministic semantic/repetition check that rejects task-ID-only variation.

### QA-002 (high): ownership fields use placeholder globs and do not establish exact ownership

After task-ID normalization, 25 rows (`TASK-0002`, `TASK-0021`, `TASK-0022`, `TASK-0024`, `TASK-0034` through `TASK-0040`, `TASK-0042` through `TASK-0047`, `TASK-0052` through `TASK-0055`, and `TASK-0057` through `TASK-0060`) have the identical assignment:

`services/task-NNNN*.mjs`, `scripts/task-NNNN*.mjs`, `contracts/task-NNNN*/**`, `apps/**/task-NNNN*/**`, and `docs/task-NNNN*.md`.

Most are intended paths rather than current concrete files. Two more rows (`TASK-0031`, `TASK-0032`) share the same normalized placeholder contract pattern. The fields themselves defer collision review until a future assignment, so they cannot currently prove one writer per file or a bounded task-specific ownership decision. Wildcards such as `apps/**/task-NNNN*/**` are broader than exact file ownership, and invented task-number naming is not derived from the cited implementation.

Required remediation: identify existing exact files from current implementation/contracts/tests where possible. For missing implementation, record ownership as unresolved and require a bounded pre-implementation decision rather than inventing broad globs. Any permitted glob must resolve to an enumerated, collision-checked set before assignment. Add a deterministic check for normalized placeholder duplication and overly broad recursive paths.

## Commands and results

- Deterministic corpus read: PASS; 605 files, 7,812,962 bytes, aggregate above.
- Structural/vocabulary/count parser: PASS; 110 rows, 110 unique IDs, 18 fields, exact counts 0/57/40/13.
- Queue title/dependency/source/handoff comparator: PASS; zero dependency, title, source, or unexpected handoff defects.
- Normalized ownership/test repetition audit: FAIL with QA-001 and QA-002; required tests 13 normalized patterns and 106 duplicated rows; ownership 85 normalized patterns, including the 25-row and 2-row placeholder groups.
- `npm ci`: PASS in 4.9 seconds; 106 packages installed, one existing moderate advisory.
- `npm run format:check`: PASS in 1.1 seconds.
- `npm run validate`: PASS in 4.3 seconds.
- `npm run queue:check`: PASS in 4.7 seconds.
- `npm run traceability:check`: PASS in 21.8 seconds.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate.ps1`: PASS in 4.5 seconds; 260 Markdown, 65 JSON, 5 YAML files.
- `npm test`: PASS in 267.4 seconds; 932 total, 931 passed, 0 failed, 1 documented opt-in embedded-PostgreSQL skip.
- `git diff --check f62b9350bfb2b5459994be0c6e9ad4b3056ceb8b..9c914d04bcf91b606cb5199eb9f7e32233c56034`: PASS.
- `git fsck --strict --no-reflogs`: PASS in 1.7 seconds; 35 lines of preserved dangling historical-object notices and no integrity error.
- Exact-signature sensitive-data scan of 567,294 diff bytes (AWS, GitHub, OpenAI, private-key headers): PASS, zero hits.

## Security, tenant isolation, rollback, and limitations

The candidate does not promote any task to `ACCEPTED` and makes no production-runtime or tenant-isolation claim. No credential, secret, customer/provider data, private financial data, or private-key material was found. Nevertheless, QA-001 would under-specify or misdirect future authorization, cross-tenant, replay, concurrency, audit, leakage, and recovery verification, while QA-002 cannot enforce separation of writers. These are governance/security defects in a matrix intended to authorize later remediation.

No implementation file was edited by QA. Preserve this rejection and correct forward on a separate author pass, followed by a fresh independent review of the exact committed candidate. Rollback remains a reviewed revert of only a future accepted correction. Existing limitations are one moderate dependency advisory, one documented opt-in embedded-PostgreSQL skip, and preserved dangling historical objects; none changes the rejection.

Independent review result: **REJECT**.
