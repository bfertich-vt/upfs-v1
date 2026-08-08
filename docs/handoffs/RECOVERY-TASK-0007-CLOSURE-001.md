# Handoff: RECOVERY-TASK-0007-CLOSURE-001

- Task/scope: revalidate historical `TASK-0007`, customer-console transaction-search workbench, as a **Proven reference implementation** at most.
- Agent role: Frontend; role file `agents/FRONTEND.md`, SHA-256 `1ea29543c0fec1471ef2875e56aca7cd3b2919cee2899105f1b8670e10322ce8`.
- Agent thread: `/root/frontend_task_0007_closure_r1`; runtime has no native UPFS role field, so the initial prompt bound the role and pre-edit digest proof was reported.
- Worktree/branch/base: `C:\source\upfs-frontend-task-0007-closure-r1`; `recovery/task-0007-closure-r1`; `54652c309b473ec7797b36cd6e9b7099306f3bfb`.
- Implementation/task commit: `1c09799b49f5aae9fa67525685c44b96e23830fb`; final candidate is the separate commit containing this handoff.
- Files changed: `apps/customer-console/transaction-search-workbench.mjs`, its test, `tasks/recovery/RECOVERY-TASK-0007-CLOSURE-001.yaml`, and this handoff only.
- Contracts/migrations: no contract or migration changed. The existing transaction-search response schema remains the read-only API contract.

## Inputs and provenance

- `AGENTS.md` `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`; Frontend role (above); constitution `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`; worktrees `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`; handoff template `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- Master plan `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`; queue `220e9f2a09724ce203a6fc1ee4813f774f600b6fe6a4090296b587e4c52f5b3a`; closure matrix TASK-0007 row inspected at base.
- Console experience `453b21160bc0f0b79b9654435f1053a24f9fb473dd80f5aba16d588030b3afbf`; page template `42fb427b09d50e915004ee900c6b07d8321f460a96fa7a3d359635e6bd0b1f08`; canonical model `5c874d646cae8693a48a5f42de75249c5007c1a7bd296da7fd29bd1875cf8ed0`; identity/tenant `c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf`; API standards `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`.
- Security baseline `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`; threat model `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`; testing `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`; admin boundary `d3fb8765668fc12d9939b6a715c0c1b790d0d6f5c6e949f37afd7c854e4279e9`; accessibility target `9274439cb8175ff7d41465a42d19617c3c6dbf65e9b51955cd2b366f29d12baa`.
- Starting implementation `54a6dc1f66eecc20609df71957e9eae7922079aeeea9c4fa307c893c4d319ecc`; test `05ede7f1ccfa383f5f30086eff64a900335134f83c936b06c5b39e02c4da993a`; HTML `470944e61ec6fd5cf2dd3f21b4eaf178311f384e5f08cc882aac0fbb73df37b3`; response schema `b3098605e8809aa5757282d65ffedc7f80031644e61a132d23f5510bf55589dd`; historical handoff `d5eede8f8112545a5b7b650a0893269963ae846288d4754c8889341decac6fce`.

## Acceptance, security, tenant isolation, accessibility

- The adapter calls only `/v1/transactions/search` with authenticated-session cookies. It rejects empty/non-string/overlong queries, limits outside 1-100, and empty/non-string/overlong cursors before network access; it never sends tenant/environment identifiers.
- Workbench state retains only ID, date, currency, and bounded evidence references. Tenant, account, amount, description, and raw server payload fields are stripped from observable state and rendering. Forbidden/unavailable/malformed responses use generic non-disclosing messages.
- New requests abort older requests; cancellation aborts in-flight work; serial suppression prevents late results from overwriting fresh authorized state. Load-more retry preserves the exact cursor and prior rows.
- Projection reconciliation/staleness is explicitly surfaced as temporary projection state and says source records are unchanged. The UI never accesses or mutates PostgreSQL, OpenSearch, Redis, provider, or model state.
- Existing semantic heading, labelled search form, native keyboard buttons/input, labelled redacted-results table, polite live status, loading/empty/forbidden states, and focus-visible stylesheet integration remain compatible.
- Negative tests cover malformed bounds before fetch, forbidden and server-payload leakage, financial/tenant field stripping, malformed response, stale/reconciliation failure, cursor-stable retry, cancellation, late response, and API-only request shape.

## Tests and evidence

- Focused before implementation commit: `node --test --test-concurrency=1 apps/customer-console/transaction-search-workbench.test.mjs` PASS, 13/13, 0 fail/skip, 107.8 ms.
- Accessibility capability: `npm run accessibility:check` PASS after attaching an ignored dependency junction to `C:\source\upfs-v1\node_modules`; the junction is removed before clean-head proof.
- Pinned Prettier was run only on the three allowed implementation/task files.

### Exact candidate gate result

- `npm test -- --test-concurrency=1` did not complete within the execution ceiling: the first run was terminated after 904 seconds with exit 124 and no auditable TAP summary. The one authorized rerun was terminated after 1,204 seconds with exit 124 and no auditable TAP summary. Both runs were inspected while active and had a single npm launcher/test runner/worker chain; no overlapping duplicate existed. This is a **required-gate failure**, not a pass or assertion failure. The candidate is not independently acceptable until a bounded corrective path obtains the complete full-suite result.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` PASS: 360 Markdown, 65 JSON, 5 YAML.
- `npm run format:check` PASS: 48 pinned-Prettier files plus structural closure checks. `npm run lint`, `npm run queue:check`, and `npm run traceability:check` PASS.
- `npm audit --audit-level=high` PASS: zero vulnerabilities. `git fsck --full --strict` PASS with only preserved pre-existing dangling objects and no corruption. `git diff --check` PASS.

### Corrective-forward R2

- Supervisor full-suite execution at exact `d34257bfe16d650618bb78ea7404e63844c3a6cf` completed in 1,170,654.2 ms: 1,012 total, 1,010 passed, 1 failed, and 1 pre-existing opt-in PostgreSQL skip. The exact failure was `scripts/task-0066-console-acceptance.test.mjs`, “versioned console contract passes”: expected `passed`, actual `failed`.
- Root cause: Prettier normalized the literal versioned redacted-column source binding from `['Date', 'Currency', 'Evidence']` to double quotes. TASK-0066 deliberately binds the accepted console contract to that exact source marker. Corrective implementation `0d72d3059fc8dd3c2c6e44f35ed0b880e4805d54` restores the stable marker as the actual `RESULT_COLUMNS` constant under a narrow Prettier ignore and uses that constant for rendering; it does not weaken or modify TASK-0066, validators, or contracts.
- Focused R2: `node --test --test-concurrency=1 apps/customer-console/transaction-search-workbench.test.mjs scripts/task-0066-console-acceptance.test.mjs` PASS, 24/24, 0 fail/skip, 161.3 ms. The added workbench regression evaluates the real versioned TASK-0066 contract and asserts its implementation binding passes. All prior 13 workbench cases also pass. `npm run accessibility:check` PASS.
- Exact-final R2 full suite and repository gates remain required after the separate handoff commit.
- Exact R2 handoff candidate `36fa5b52ef72c2fdec3a6d0d0d52abe52eb38bd0`: `npm test -- --test-concurrency=1` PASS, 1,013 total, 1,012 passed, 0 failed, 1 pre-existing opt-in PostgreSQL skip, 1,174,516.5 ms test duration and 1,175.4 seconds wall time. The previously failing versioned TASK-0066 case passed.
- At the same candidate, validation PASS (360 Markdown, 65 JSON, 5 YAML); format PASS (48 pinned-Prettier files plus structural closure checks); lint, queue, traceability, and audit (zero vulnerabilities) PASS; strict fsck PASS with preserved dangling objects only; diff check PASS.
- The final result-binding handoff-only commit is the QA candidate. Focused, TASK-0066, accessibility, validation, format, diff/scope, and clean-head checks are rerun at that exact final SHA; the complete full-suite result remains bound to its immediate handoff-containing parent, with this sole-file descendant recording the result and changing no executable behavior.

## Limitations, rollback, independent review

- This is a dependency-free synthetic-DOM/reference UI and contract adapter. It is not a deployed console, real API host, OpenSearch/PostgreSQL integration, production OIDC/session, browser E2E, assistive-technology certification, load/SLO evidence, or production operation.
- Preserve historical evidence and this candidate. Before integration, rollback is a reviewed revert of the two task commits; afterward use a separate corrective-forward change and review. Never weaken API-only, tenant, leakage, accessibility, or validation controls.
- Independent reviewer/result: pending a fresh QA/Security agent who did not author or remediate this candidate, operating under `agents/QA_SECURITY.md` from the exact committed candidate in an isolated worktree. The reviewer may add only a review artifact and must not edit implementation. No push, PR, merge, activation, queue/matrix change, TASK-0008 work, or self-approval is authorized here.
