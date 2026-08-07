# Independent Codex QA/Security Review: RECOVERY-HISTORICAL-DISPOSITIONS-003

## Verdict

**REJECT.** Candidate `fd9ab051e6e4968efb8854716477a8698d9e4a78` (implementation `bd881f0f138cb01928123a3b05bf80df1ee8f302`) corrects the prior generic ownership and test-plan defects, but ten exact structured task inputs are absent from the matrix source bindings for `TASK-0026` through `TASK-0030`. The assignment requires source accuracy. Passing repository-wide gates cannot cure incomplete requirement provenance.

## Reviewer provenance and independence

- Reviewer: independent Codex QA/Security agent; not a human reviewer.
- Assigned role: Independent QA/Security under `agents/QA_SECURITY.md`.
- Agent thread: `/root/qa_historical_dispositions_003`.
- Worktree and branch: `C:\source\upfs-qa-historical-dispositions-003`; `codex/qa-historical-dispositions-003`.
- Candidate reviewed: `fd9ab051e6e4968efb8854716477a8698d9e4a78`.
- Implementation commit: `bd881f0f138cb01928123a3b05bf80df1ee8f302`.
- Preserved rejections: `f62b9350bfb2b5459994be0c6e9ad4b3056ceb8b` and `5bd8f385020fd9cf4e568ddebb45cfb191c866fc`, with their committed QA reports.
- Independence: this reviewer did not author or remediate the candidate. Review began from the exact committed candidate. The only reviewer-authored file is this report.

## Governing material loaded

The reviewer completely read and SHA-256 verified the governing material before review:

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`
- `agents/QA_SECURITY.md`: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`
- `docs/MASTER_PLAN.md`: `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`
- `tasks/queue.yaml`: `05ed87243f7baa6060c6d650023ce9130741f529949d338cfe2c3d30806347c3`
- Candidate matrix: `85d22f8eaba699801ffffaf4ee788636d475e82a7c69466547364a50f2eb7d96`
- Candidate task: `b39c94cd322f90bcef1bff9ca3fb1d7e4d051ed7b4c481b2b2bf5ee3b9549d56`
- Candidate handoff: `426609657f76fe3c8a5d630ac380c8ae3c0edeb6a095e946b4fdb35dd911f3cc`
- Prior QA reports: `a653286f242e828ca3e4bd11f67fcd3c41a2a077660cee3c07bfeb765cf7f808` and `2d6fcf22512638307e3dc89288d8cbb616089b2b1c9af238437e1fbfdca2d7e2`.

All 19 normative specifications, all queue records and available handoffs for `TASK-0001` through `TASK-0110`, and applicable contracts, services, applications, packages, examples, infrastructure, registries, scripts, and tests were consumed. The independently selected corpus covered 269 files / 959,428 bytes with aggregate path-and-content SHA-256 `55696750f92e00f09e87fff407053e414164cbbeff396ff48679265bef17ca00`.

## Acceptance trace

- Exactly 110 contiguous unique rows, `TASK-0001` through `TASK-0110`: PASS.
- Exactly 18 nonempty fields per row: PASS.
- Dispositions: `ACCEPTED` 0, `REMEDIATION_REQUIRED` 57, `EXTERNAL_PREREQUISITE` 40, `NOT_IMPLEMENTED` 13: PASS.
- Task-number-normalized ownership fields: 110 unique, maximum group 1: PASS.
- Task-number-normalized required-test fields: 110 unique, maximum group 1: PASS.
- Current capability ownership references: 204 unique paths, all existing: PASS.
- Intended capability ownership references: 5 unique architecture-aligned paths, all absent and explicitly unauthorized: PASS.
- No traversal, absolute-path assignment, task-number wildcard assignment, or post-`TASK-0110` change: PASS.
- Required-test command/positive assertion/applicable negative/fail-closed structure: PASS by deterministic parsing and manual risk review at `TASK-0001` and every decade through `TASK-0110`.
- Queue titles and dependencies: PASS for all 110 rows; only `TASK-0001` is dependency-free and is correctly identified as earliest dependency-complete.
- `TASK-0021` and `TASK-0022` handoff gaps: PASS as truthful absence disclosures, not fabricated handoffs.
- Exact structured-input/source bindings: **FAIL (QA-001)**.
- Prior rejections preserved and authorized diff limited to the matrix/task/handoff: PASS.

## Finding

### QA-001 (high): ten authoritative structured inputs are omitted from matrix source bindings

The matrix's `Sources` field must map each historical task to its exact normative specifications and contracts. Comparing all 110 rows to `tasks/queue.yaml` found the following existing, authoritative task inputs absent from the corresponding source bindings:

- `TASK-0026`: `contracts/openapi/public-api.yaml`; `contracts/asyncapi/platform-events.yaml`.
- `TASK-0027`: `specs/05_apis/api_standards.md`.
- `TASK-0028`: `specs/03_architecture/system_architecture.md`; `specs/09_cicd/delivery_pipeline.md`; `infra/README.md`.
- `TASK-0029`: `specs/09_cicd/delivery_pipeline.md`; `docs/runbooks/controlled-pilot-runbook.md`.
- `TASK-0030`: `specs/09_cicd/delivery_pipeline.md`; `docs/compliance/pilot-go-no-go.md`.

These are not nonexistent or generic global inputs: every listed path exists and is explicitly assigned by the task's structured queue record. Omitting them makes later remediation scopes incomplete and can hide API/event, architecture, delivery, infrastructure, runbook, or go/no-go obligations. `AGENTS.md`, the constitution, and the testing strategy remain globally governing and were not counted as this finding.

Required remediation: add every exact queue-assigned normative, contract, infrastructure, runbook, and decision input to the corresponding matrix source binding; re-run the 110-row input-to-source comparator; preserve the corrected ownership/test detail and both prior rejections; then obtain a fresh independent review of the new exact committed candidate.

## Commands and results

- `npm ci`: PASS in 4.7 seconds; 106 packages installed/audited; one existing moderate advisory remains disclosed.
- Independent structural/vocabulary/count/dependency/source/handoff/path/test parser: FAIL only the ten source bindings in QA-001; all other acceptance checks above passed.
- `npm run format:check`: PASS in 3.8 seconds.
- `npm run validate`: PASS in 9.2 seconds.
- `npm run queue:check`: PASS in 9.7 seconds.
- `npm run traceability:check`: PASS in 34.2 seconds.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/validate.ps1`: PASS in 8.2 seconds; 262 Markdown, 65 JSON, and 5 YAML files.
- `npm test`: PASS in 304.4 seconds; 932 total, 931 passed, 0 failed, 1 documented opt-in embedded-PostgreSQL skip.
- `git diff --check 5bd8f385020fd9cf4e568ddebb45cfb191c866fc..fd9ab051e6e4968efb8854716477a8698d9e4a78`: PASS.
- `git fsck --strict --no-reflogs`: PASS; preserved dangling historical objects were reported with exit zero and no integrity error.
- Exact-signature sensitive-data scan of 710,713 authorized-diff characters: PASS; zero AWS, GitHub, OpenAI, private-key, or credential-assignment signatures.

## Security, tenant isolation, rollback, and limitations

The candidate changes planning/governance artifacts only, promotes no task to `ACCEPTED`, and makes no production-runtime or tenant-isolation claim. Ownership and capability-specific negative-test planning materially improve the prior rejected candidates. No secret, credential, customer/provider data, private financial data, or private-key material was found. Nevertheless, incomplete source binding is security-relevant because it can omit governing API, architecture, delivery, infrastructure, runbook, and decision controls from future implementation assignments.

QA did not edit implementation. Preserve this rejection and correct forward on a separate author pass, followed by fresh QA of the exact corrected commit. Rollback remains a reviewed revert of a future accepted correction; do not erase any candidate or review. Limitations remain one moderate dependency advisory, one documented opt-in embedded-PostgreSQL skip, and preserved dangling Git objects. None changes this rejection.

Independent review result: **REJECT**.
