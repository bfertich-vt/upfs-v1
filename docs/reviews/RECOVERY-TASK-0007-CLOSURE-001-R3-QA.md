# Independent QA/Security review: RECOVERY-TASK-0007-CLOSURE-001 R3

## Verdict

**ACCEPT.** Exact candidate `fc6cec0bb6d4b2689b6a07df7e8ccaa169d800fd` satisfies the current structured acceptance criteria for historical `TASK-0007` at the stated **Proven reference implementation** ceiling. The R2 rejection remains preserved. Independent adversarial review proves its two acceptance-blocking defects are closed: C0/C1/control-bearing query and cursor values make zero network calls, and malformed response values fail closed atomically with a generic message and no tenant, account, amount, description, server-payload, or partial-result leakage.

This acceptance does not activate TASK-0007, update the queue or closure matrix, authorize TASK-0008, or establish a deployed/production customer console claim.

## Reviewer provenance and separation

- Agent role: Independent QA/Security, bound exclusively to `agents/QA_SECURITY.md`.
- Role-file SHA-256: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Agent thread: `/root/qa_task_0007_closure_r3`.
- Author/remediator separation: this reviewer did not author or remediate the candidate. The implementation author thread is `/root/frontend_task_0007_closure_r1`, operating under the Frontend role.
- QA worktree: `C:\source\upfs-qa-task-0007-closure-r3`.
- QA branch: `qa/task-0007-closure-r3`.
- Reviewed candidate: `fc6cec0bb6d4b2689b6a07df7e8ccaa169d800fd`.
- Candidate parent/tree: `cc939f927f8e1bb8dcda8443ccded5dad5f7a32a`; `c0d89d7d81088e400a9981c52c22cc5383075f65`.
- R3 implementation commit: `5dc68c891eb2337f98b79f2f9a180663f3ef093d`.
- Preserved R2 rejection commit/artifact digest: `2b830131e8d1d0915b0ceffde118ae8137133602`; `5371687d6f88d6ebeced3a94966a8ce0423854dae2b80258cf7ad64bc732d0a0`.
- Candidate file SHA-256 values: implementation `0555025e2af8bbe0a5a1cff22a4a623029899ee44cfcf5d7d57e1875ec812cf5`; test `55803e825697d5c99159b0183d8b8d7b3a7cbed2248c66936f4b5c6dbe39e0d6`; structured task `82c6b44614436956d1ef2a1646b1f155b9ba595f221194dfe48b463a20a96864`; handoff `709735ea5890ba9058afce5190dbb51ef1fe6f8c06a187230bc739bf14b0ea19`; preserved R2 review `5371687d6f88d6ebeced3a94966a8ce0423854dae2b80258cf7ad64bc732d0a0`.
- Review began at a clean exact candidate. Before this sole-file artifact, the candidate differed from base `54652c309b473ec7797b36cd6e9b7099306f3bfb` in exactly the authorized implementation, test, structured task, handoff, and preserved R2 review files.

## Governing inputs read before review

Every structured input and applicable implementation/contract artifact was read completely before acceptance testing. SHA-256 values are lowercase hexadecimal.

- `AGENTS.md` `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`
- `agents/QA_SECURITY.md` `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`
- `agents/FRONTEND.md` `1ea29543c0fec1471ef2875e56aca7cd3b2919cee2899105f1b8670e10322ce8`
- `agents/WORKTREES.md` `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`
- `agents/HANDOFF_TEMPLATE.md` `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`
- `specs/00_constitution/engineering_constitution.md` `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`
- `tasks/recovery/RECOVERY-TASK-0007-CLOSURE-001.yaml` `82c6b44614436956d1ef2a1646b1f155b9ba595f221194dfe48b463a20a96864`
- `docs/handoffs/RECOVERY-TASK-0007-CLOSURE-001.md` `709735ea5890ba9058afce5190dbb51ef1fe6f8c06a187230bc739bf14b0ea19`
- `docs/handoffs/TASK-0007.md` `d5eede8f8112545a5b7b650a0893269963ae846288d4754c8889341decac6fce`
- `docs/reviews/RECOVERY-TASK-0007-CLOSURE-001-QA.md` `5371687d6f88d6ebeced3a94966a8ce0423854dae2b80258cf7ad64bc732d0a0`
- `docs/MASTER_PLAN.md` `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`
- `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md` `259aec3d8ac2fbc4b5fae302fc244b5b4adf465e2ee0fa0ef5e87767451cd3df`
- `tasks/queue.yaml` `220e9f2a09724ce203a6fc1ee4813f774f600b6fe6a4090296b587e4c52f5b3a`
- `specs/02_ui/console_experience.md` `453b21160bc0f0b79b9654435f1053a24f9fb473dd80f5aba16d588030b3afbf`
- `specs/02_ui/page_template.md` `42fb427b09d50e915004ee900c6b07d8321f460a96fa7a3d359635e6bd0b1f08`
- `specs/04_schema/canonical_model.md` `5c874d646cae8693a48a5f42de75249c5007c1a7bd296da7fd29bd1875cf8ed0`
- `specs/04_schema/identity_tenant_model.md` `c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf`
- `specs/05_apis/api_standards.md` `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`
- `specs/10_security/security_baseline.md` `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`
- `specs/10_security/threat_model.md` `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`
- `specs/12_testing/test_strategy.md` `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`
- `specs/14_admin_control_plane/admin_control_plane.md` `d3fb8765668fc12d9939b6a715c0c1b790d0d6f5c6e949f37afd7c854e4279e9`
- `contracts/schemas/transaction-search-response.schema.json` `b3098605e8809aa5757282d65ffedc7f80031644e61a132d23f5510bf55589dd`
- `contracts/openapi/projection-search-api.yaml` `a72153d9ab4956288f07693d27e6d2ee9ba31eb8897742db67b80fb5518603f7`
- `contracts/task-0066-console-acceptance.json` `76838cb1a408dcc68a7d4d595c714abb8776922cfac5672398e18771d1d5b79e`
- `apps/customer-console/transaction-search-workbench.mjs` `0555025e2af8bbe0a5a1cff22a4a623029899ee44cfcf5d7d57e1875ec812cf5`
- `apps/customer-console/transaction-search-workbench.test.mjs` `55803e825697d5c99159b0183d8b8d7b3a7cbed2248c66936f4b5c6dbe39e0d6`
- `apps/customer-console/transaction-search-workbench.html` `470944e61ec6fd5cf2dd3f21b4eaf178311f384e5f08cc882aac0fbb73df37b3`
- `apps/customer-console/console.css` `ac79d1040b7568109799f32737469142ea24968d2e5de585caae342c3a177f85`
- `docs/customer-console-accessibility.md` `9274439cb8175ff7d41465a42d19617c3c6dbf65e9b51955cd2b366f29d12baa`
- `scripts/task-0066-console-acceptance.mjs` `3500fc808e0d2705ee018cc733c5007edfbf781ca962a73d99890ff73df156b7`
- `scripts/task-0066-console-acceptance.test.mjs` `14c98f3e530034975fbb61d93035d8291bbe65cb2fde66208dfa354306182103`

## Acceptance trace and security assessment

- API boundary: `createSearchApi` calls only authenticated-session `POST /v1/transactions/search`; the request contains query, bounded limit, and optional opaque cursor, never client-supplied tenant/environment scope. No storage, provider, model, PostgreSQL, OpenSearch, Redis, or privileged API is accessed.
- Request bounds: query and cursor strings reject C0/C1 controls, bidi controls, lone surrogates, invalid cursor alphabet, empty values, and overlength before fetch. The independent adversarial run observed zero fetches for all three attempted unsafe values.
- Response contract and atomicity: descriptor-based closed-shape parsing rejects missing/wrong/extra fields, accessors, proxies, symbols, sparse arrays, circular/extra values, BigInt, invalid dates/currencies/decimals/versions, invalid cursors, and oversized values or pages. Every item is validated before replacement/append. A malformed continuation retains prior data/cursor and the exact retry cursor.
- Tenant/security/leakage: server-provided tenant, account, amount, description, and error payload values never enter observable workbench state. Snapshots contain copied ID/date/currency/evidence presentation values only. Forbidden, unavailable, stale, and malformed states use stable generic UI messages. Cross-tenant scope remains derived server-side.
- Concurrency/replay: request serials plus AbortController prevent superseded/cancelled responses from overwriting current state. Exact continuation cursor retry is preserved. This read-only reference UI has no write idempotency, optimistic-concurrency, durable audit, or migration behavior; those controls are not applicable to this slice and are not claimed.
- Projection truth: reconciliation/staleness is surfaced as temporary projection state with explicit source-record neutrality; the UI cannot claim or perform a PostgreSQL truth mutation.
- Accessibility: native input/buttons, labelled form/table, semantic heading/column headers, polite live status, keyboard activation, loading disablement, and focus-visible stylesheet compatibility remain intact. Static capability validation passed. No assistive-technology certification is claimed.
- Contract drift: exact response fields are closed against the current response schema and versioned TASK-0066 binding; malformed/extra response shape fails closed rather than being coerced.
- Failure/rollback: forbidden, unavailable, malformed, stale, retry, cancellation, late response, and corrected continuation behavior are covered. Before integration, rollback is a reviewed revert of the candidate commits; after integration, use a separate corrective-forward commit and independent re-review.

## Independent tests and exact results

- `node --test --test-concurrency=1 apps/customer-console/transaction-search-workbench.test.mjs scripts/task-0066-console-acceptance.test.mjs apps/customer-console/console-shell.test.mjs` **PASS**: 33/33, 0 fail/skip, TAP 251.3767 ms; 310 ms wall.
- Independent inline adversarial module against exported APIs **PASS**: 14 cases; zero fetches for unsafe query/cursors; `{}`, missing/wrong/extra fields, throwing accessor/proxy, symbol key, sparse evidence, BigInt, circular/extra object, oversized ID, and 101-item page all produced generic atomic failure with zero result or secret leakage; 200 ms wall.
- `npm test -- --test-concurrency=1` **PASS**: 1,017 total, 1,016 passed, 0 failed, 1 pre-existing opt-in PostgreSQL skip; TAP 1,199,732.2339 ms; 1,200,216 ms wall. Exactly one runner chain was used. An earlier setup attempt could not resolve the repository's `yaml` dependency because the isolated worktree had no dependency directory; it was not candidate failure evidence. The clean rerun used a verified ignored junction to `C:\source\upfs-v1\node_modules`, removed before clean-head proof.
- `npm run accessibility:check` **PASS**, 722 ms.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` **PASS**: 361 Markdown, 65 JSON, 5 YAML; 12,051 ms.
- `npm run format:check` **PASS**: 48 pinned-Prettier files plus structural closure checks; 3,164 ms.
- `npm run lint` **PASS**, 2,084 ms.
- `npm run queue:check` **PASS**, 11,058 ms.
- `npm run traceability:check` **PASS**, 30,625 ms.
- `npm audit --audit-level=high` **PASS**: zero vulnerabilities; 1,514 ms.
- `git fsck --full --strict` **PASS**: preserved dangling objects only, no corruption; 13,990 ms.
- `git diff --check 54652c309b473ec7797b36cd6e9b7099306f3bfb..fc6cec0bb6d4b2689b6a07df7e8ccaa169d800fd` **PASS**.
- Exact authorized-scope comparison **PASS** before this artifact: only the two implementation files, structured recovery task, recovery handoff, and preserved R2 review differed from base. Prohibited queue, matrix, historical handoff, specs, contracts, workflows, package files, accepted TASK-0001–0006 evidence, TASK-0008+, and TASK-0112–0123 were unchanged.
- Clean-head proof **PASS** at exact reviewed candidate after removal of the verified dependency junction and all transient in-worktree state.

## Findings, limitations, and promotion boundary

- No open severity-one, high, medium, or low candidate defect was found in the authorized R3 scope.
- Classification ceiling remains **Proven reference implementation**. This is a dependency-free synthetic-DOM/reference adapter, not a deployed customer console, browser E2E result, assistive-technology certification, real API host, production OIDC/session, PostgreSQL/OpenSearch integration, load/SLO result, or production operation.
- Hosted protected checks, retained artifact inspection, supervisor integration, activation evidence, queue/matrix disposition update, and post-merge checks remain outside this QA assignment and are required before TASK-0007 may be marked accepted in the historical program.
- Preserve the R1/R2 candidates, full-suite failure/timeout evidence, R2 rejection, R3 candidate, and this review. Do not rewrite or delete rejection history. No push, PR, merge, activation, TASK-0008 work, or TASK-0112–0123 work is authorized by this attestation.
