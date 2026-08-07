# Independent Codex QA/Security Review: RECOVERY-HISTORICAL-DISPOSITIONS-001

## Verdict

**REJECT.** Candidate `de71f6f44e12f47593986a43125b8cc117ccff30` (implementation `39346b7a71ed57f29d180801fd5baddd7e3e2855`) is structurally parseable and repository-wide gates pass, but the closure matrix does not identify task-specific required tests or exact authorized/prohibited file ownership for every historical task. Passing repository-wide gates cannot replace those acceptance criteria.

## Reviewer provenance and independence

- Reviewer: independent Codex QA/Security agent; not a human reviewer.
- Assigned role: Independent QA/Security.
- Agent thread: `/root/qa_historical_dispositions_001`.
- Role file: `agents/QA_SECURITY.md`; SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Worktree: `C:\source\upfs-qa-historical-dispositions-001`.
- Branch: `codex/qa-historical-dispositions-001`.
- Protected base: `6dcd1860b874acb46a574f9a50762d2e97936770`.
- Candidate reviewed: `de71f6f44e12f47593986a43125b8cc117ccff30`.
- Implementation commit: `39346b7a71ed57f29d180801fd5baddd7e3e2855`.
- Independence: this reviewer did not author or remediate the matrix candidate and reviewed the committed candidate without editing implementation files. The only permitted reviewer change is this report.

## Governing material loaded

The reviewer read and SHA-256 verified the governing documents before review:

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`
- `agents/QA_SECURITY.md`: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`
- `docs/MASTER_PLAN.md`: `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`
- `tasks/queue.yaml`: `05ed87243f7baa6060c6d650023ce9130741f529949d338cfe2c3d30806347c3`
- Candidate matrix: `61016b5fb439422fb9bba735a617447e4bf961cc5997742fe97b55f4d2a5852b`
- Candidate task input: `167e89ec152f09efb4a9a7ba38abdfbd8c108f44284cb5c050dafcdf652ba954`
- Candidate handoff: `1f5ee53f3c1849b24b9fafc0419ef6c620207ba348496705961ddbced1596168`

All normative specifications, all TASK-0001 through TASK-0110 structured inputs, all available historical handoffs, contracts, applicable scripts/services/apps tests, and the prior integrated closure-matrix reviews were read. The deterministic read covered 476 files / 7,320,691 bytes with aggregate path-and-content digest `65bd31c18aa4465fc87408761c8cd08e01c7a55382be03fee5e78cdeea539aab`; no assigned input was missing.

## Acceptance trace and results

- Exactly 110 contiguous, unique rows `TASK-0001` through `TASK-0110`: PASS.
- Exactly 18 nonempty fields per row: PASS.
- Disposition vocabulary restricted to `ACCEPTED`, `REMEDIATION_REQUIRED`, `EXTERNAL_PREREQUISITE`, `NOT_IMPLEMENTED`: PASS.
- Counts: `ACCEPTED` 0; `REMEDIATION_REQUIRED` 57; `EXTERNAL_PREREQUISITE` 40; `NOT_IMPLEMENTED` 13.
- Queue title and dependency equality for every row: PASS.
- Referenced queue inputs and matrix source paths resolve: PASS.
- Correctly named handoff existence: PASS with the explicitly truthful exceptions `TASK-0021` and `TASK-0022`; the matrix does not claim those files exist.
- No post-`TASK-0110` row and no `TASK-0112` through `TASK-0123` advancement: PASS.
- No queue, product, specification, contract, test, validator, workflow, provenance, or ADR changes: PASS.
- No inferred `ACCEPTED` status: PASS; there are no accepted rows.
- Task-specific required test coverage: **FAIL**.
- Exact authorized/prohibited file ownership: **FAIL**.

Risk-based manual inspection included `TASK-0001`, `TASK-0017`, `TASK-0021`, `TASK-0022`, `TASK-0031`, `TASK-0070`, `TASK-0080`, `TASK-0085`, `TASK-0090`, `TASK-0099`, and `TASK-0110`, plus deterministic checks across all rows.

## Findings

### QA-001 (high): required-test fields omit tests demanded by surviving criteria

The matrix promises task-specific required tests, but many rows name a surviving criterion and omit the corresponding test category in the `Required tests` field. A deterministic criteria-to-required-tests audit found:

- Security/authorization/privacy/redaction omissions (17): `TASK-0013`, `TASK-0014`, `TASK-0019`, `TASK-0028`, `TASK-0029`, `TASK-0035`, `TASK-0039`, `TASK-0045`, `TASK-0052`, `TASK-0061`, `TASK-0075`, `TASK-0077`, `TASK-0085`, `TASK-0089`, `TASK-0091`, `TASK-0096`, `TASK-0099`.
- Idempotency/replay omissions (5): `TASK-0013`, `TASK-0044`, `TASK-0050`, `TASK-0088`, `TASK-0098`.
- Concurrency omission (1): `TASK-0096`.
- Audit/immutable-evidence/tamper omissions (12): `TASK-0022`, `TASK-0025`, `TASK-0027`, `TASK-0037`, `TASK-0047`, `TASK-0050`, `TASK-0053`, `TASK-0067`, `TASK-0073`, `TASK-0088`, `TASK-0090`, `TASK-0104`.
- Contract/schema/API/SDK drift omissions (15): `TASK-0001`, `TASK-0014`, `TASK-0022`, `TASK-0023`, `TASK-0024`, `TASK-0027`, `TASK-0028`, `TASK-0030`, `TASK-0066`, `TASK-0067`, `TASK-0083`, `TASK-0087`, `TASK-0105`, `TASK-0106`, `TASK-0107`.

Examples: `TASK-0001` requires dependency, secret, contract, and documentation gates but lists only failure/rollback testing. `TASK-0099` requires citations, authorization, redaction, prompt bounds, and model-failure behavior but lists only failure/rollback. These omissions would produce under-scoped remediation assignments and violate the matrix acceptance requirement to identify required tests and security coverage for each task.

Required remediation: derive each row's required tests from its surviving criteria and current normative inputs. Name all applicable authorization denial, cross-tenant, idempotency/replay, concurrency, audit/tamper, rollback/failure/recovery, leakage/redaction, contract/generated drift, accessibility, and other task-specific gates. Re-run deterministic coverage checks and manually review the high-risk rows.

### QA-002 (high): file ownership is not exact or task-specific

All 110 rows contain the identical `Authorized/prohibited files` value: `Specialist task-owned implementation/contracts/tests/docs only; prohibit queue, specifications, unrelated history, shared matrix, and TASK-0111+ unless separately authorized.` This is a policy category, not an exact file assignment. It does not establish one-writer-per-file ownership, cannot be mechanically checked, and does not tell a specialist which current implementation, contract, test, or documentation files may be changed.

Required remediation: provide task-specific allowed paths and explicit prohibited paths for every row, based on the cited current implementation/contracts/tests and collision analysis. Where exact files cannot yet be safely selected, state that a bounded pre-implementation file-ownership decision is required rather than presenting generic text as completed ownership mapping.

## Commands and evidence

- `npm ci`: PASS, 106 packages installed/audited in 5.2 seconds; one existing moderate dependency advisory remains a limitation.
- Deterministic matrix parser: PASS structural checks; 110 rows, 18 fields, unique/contiguous IDs, exact vocabulary/counts, no duplicate normalized whole rows. Initial handoff-existence probe correctly surfaced `TASK-0021`/`TASK-0022`; manual review confirmed the rows explicitly say the files are missing, so this is truthful evidence rather than a defect.
- Queue/title/dependency/source/handoff comparator: PASS in 0.6 seconds.
- Criteria-to-required-tests and repeated-column audit: FAIL with QA-001 and QA-002 above.
- `npm run format:check`: PASS in 1.4 seconds.
- `npm run validate`: PASS in 4.7 seconds.
- `npm run queue:check`: PASS in 4.9 seconds.
- `npm run traceability:check`: PASS in 24.1 seconds.
- `git diff --check 6dcd1860b874acb46a574f9a50762d2e97936770..de71f6f44e12f47593986a43125b8cc117ccff30`: PASS in 0.2 seconds.
- `git fsck --strict --no-reflogs`: PASS in 2.0 seconds; preserved dangling historical objects were reported, with no integrity error.
- First `npm test` invocation: infrastructure timeout after 5.2 seconds; not used as evidence.
- Fresh `npm test`: PASS in 297.3 seconds; 932 total, 931 passed, 0 failed, 1 documented opt-in embedded-PostgreSQL skip.
- Exact-signature secrets scan of the authorized diff (AWS, GitHub, OpenAI, private-key headers, and assigned credential literals): PASS; 439,837 diff bytes scanned, 0 hits.

## Security and tenant-isolation assessment

The candidate makes no production-capability claim, contains no accepted disposition, and distinguishes absent runtime/tenant evidence from static or synthetic artifacts. No secret, credential, customer data, provider data, private financial data, or private-key material was found in the authorized diff. However, omitted security test categories in QA-001 make future remediation scopes unsafe or incomplete if consumed as written. This is a planning/provenance defect, not evidence that current runtime isolation passed.

## Rollback, limitations, and disposition

No implementation file was edited by QA. Preserve this rejection and correct forward on a separate author branch; do not integrate the candidate as accepted. A reviewed revert of the eventual corrective commit remains the rollback mechanism. Current limitations include one moderate dependency advisory, one documented opt-in embedded-PostgreSQL skip, and preserved dangling historical Git objects. None changes this rejection.

Independent review result: **REJECT** pending correction of QA-001 and QA-002 followed by fresh review of the exact corrected committed candidate.
