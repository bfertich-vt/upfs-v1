# Independent QA/Security review: RECOVERY-TASK-0007-CLOSURE-001

## Verdict

**REJECT.** Candidate `9a3b23f40bdd2a6bf75a8c74deba5011b6a30ab7` does not fail closed for a malformed transaction-search response. A response containing `data: [{}]` and `page.next_cursor: null` is accepted as `success` and converted to an observable empty transaction instead of producing the generic malformed-response state. The same adversarial run also proves that query and cursor strings containing control characters reach the network. No implementation file was edited by this reviewer.

TASK-0007 must remain unaccepted and unactivated. A separate Frontend corrective-forward candidate must validate the complete versioned response shape before state mutation, bound or reject unsafe control input according to the API contract, add regression tests, rerun all gates, and receive a fresh independent QA/Security review.

## Reviewer provenance and separation

- Agent role: Independent QA/Security, bound to `agents/QA_SECURITY.md`.
- Role-file SHA-256: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Agent thread: `/root/qa_task_0007_closure_r1`.
- Author/remediator separation: this reviewer did not author or remediate the candidate. The implementation author thread recorded by the handoff is `/root/frontend_task_0007_closure_r1` under the Frontend role.
- QA worktree: `C:\source\upfs-qa-task-0007-closure-r1`.
- QA branch: `qa/task-0007-closure-r1`.
- Base: `54652c309b473ec7797b36cd6e9b7099306f3bfb`.
- Reviewed candidate: `9a3b23f40bdd2a6bf75a8c74deba5011b6a30ab7`.
- Candidate parent/tree: `36fa5b52ef72c2fdec3a6d0d0d52abe52eb38bd0`; `d6f3731fc1d52835049a0dfc08823bec6e1d2abb`.
- Corrective implementation commit: `0d72d3059fc8dd3c2c6e44f35ed0b880e4805d54`.
- Preserved failed candidate: `d34257bfe16d650618bb78ea7404e63844c3a6cf`.
- Scope at review start was clean and exactly four authorized files differed from base: `apps/customer-console/transaction-search-workbench.mjs`, `apps/customer-console/transaction-search-workbench.test.mjs`, `tasks/recovery/RECOVERY-TASK-0007-CLOSURE-001.yaml`, and `docs/handoffs/RECOVERY-TASK-0007-CLOSURE-001.md`.
- Candidate file SHA-256 values: implementation `047f7e212ad5fb80e67c19871f2ea08603d80b82766312374904ad57b5464653`; implementation test `b89ff8a2a86b025a008e9bd31837e50f1981bb9875acaf61ea9310c8509a639a`; structured task `82c6b44614436956d1ef2a1646b1f155b9ba595f221194dfe48b463a20a96864`; handoff `d02770d85b4b6be9167cf39978e47aa2873c88947553f6c1d9c02c9fc36b86d8`.

## Governing inputs read before review

All listed files were read completely before testing. SHA-256 values are lowercase hexadecimal.

- `AGENTS.md` `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`
- `agents/QA_SECURITY.md` `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`
- `agents/FRONTEND.md` `1ea29543c0fec1471ef2875e56aca7cd3b2919cee2899105f1b8670e10322ce8`
- `agents/WORKTREES.md` `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`
- `agents/HANDOFF_TEMPLATE.md` `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`
- `specs/00_constitution/engineering_constitution.md` `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`
- `tasks/recovery/RECOVERY-TASK-0007-CLOSURE-001.yaml` `82c6b44614436956d1ef2a1646b1f155b9ba595f221194dfe48b463a20a96864`
- `docs/handoffs/RECOVERY-TASK-0007-CLOSURE-001.md` `d02770d85b4b6be9167cf39978e47aa2873c88947553f6c1d9c02c9fc36b86d8`
- `docs/handoffs/TASK-0007.md` `d5eede8f8112545a5b7b650a0893269963ae846288d4754c8889341decac6fce`
- `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md` `259aec3d8ac2fbc4b5fae302fc244b5b4adf465e2ee0fa0ef5e87767451cd3df`
- `docs/MASTER_PLAN.md` `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`
- `tasks/queue.yaml` `220e9f2a09724ce203a6fc1ee4813f774f600b6fe6a4090296b587e4c52f5b3a`
- `specs/02_ui/console_experience.md` `453b21160bc0f0b79b9654435f1053a24f9fb473dd80f5aba16d588030b3afbf`
- `specs/02_ui/page_template.md` `42fb427b09d50e915004ee900c6b07d8321f460a96fa7a3d359635e6bd0b1f08`
- `specs/04_schema/canonical_model.md` `5c874d646cae8693a48a5f42de75249c5007c1a7bd296da7fd29bd1875cf8ed0`
- `specs/04_schema/identity_tenant_model.md` `c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf`
- `specs/05_apis/api_standards.md` `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`
- `specs/10_security/security_baseline.md` `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`
- `specs/10_security/threat_model.md` `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`
- `specs/12_testing/test_strategy.md` `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`
- `specs/13_docs/documentation_platform.md` `79097cb4fb008f43a58eda063a5cee2536a87b31d52cf7626283fda698e9921d`
- `specs/14_admin_control_plane/admin_control_plane.md` `d3fb8765668fc12d9939b6a715c0c1b790d0d6f5c6e949f37afd7c854e4279e9`
- `docs/customer-console-accessibility.md` `9274439cb8175ff7d41465a42d19617c3c6dbf65e9b51955cd2b366f29d12baa`
- `apps/customer-console/transaction-search-workbench.mjs` `047f7e212ad5fb80e67c19871f2ea08603d80b82766312374904ad57b5464653`
- `apps/customer-console/transaction-search-workbench.test.mjs` `b89ff8a2a86b025a008e9bd31837e50f1981bb9875acaf61ea9310c8509a639a`
- `apps/customer-console/transaction-search-workbench.html` `470944e61ec6fd5cf2dd3f21b4eaf178311f384e5f08cc882aac0fbb73df37b3`
- `apps/customer-console/console.css` `ac79d1040b7568109799f32737469142ea24968d2e5de585caae342c3a177f85`
- `apps/customer-console/scripts/accessibility.mjs` `09068c46e3670ba719f894b992d178946c8cc601bc8cd59882d8e1f3ed8d33cc`
- `contracts/task-0066-console-acceptance.json` `76838cb1a408dcc68a7d4d595c714abb8776922cfac5672398e18771d1d5b79e`
- `scripts/task-0066-console-acceptance.mjs` `3500fc808e0d2705ee018cc733c5007edfbf781ca962a73d99890ff73df156b7`
- `scripts/task-0066-console-acceptance.test.mjs` `14c98f3e530034975fbb61d93035d8291bbe65cb2fde66208dfa354306182103`
- `contracts/schemas/transaction-search-response.schema.json` `b3098605e8809aa5757282d65ffedc7f80031644e61a132d23f5510bf55589dd`
- `contracts/openapi/projection-search-api.yaml` `a72153d9ab4956288f07693d27e6d2ee9ba31eb8897742db67b80fb5518603f7`
- `services/transaction-projection.mjs` `40ee63d6439b799fa4d3916a74b0e114161743ae8cb713e5dc69df60dc7f5491`
- `services/transaction-projection.test.mjs` `63e6ee36099b6e9aad790cec7ed7eaa37a54ea4ab78ecaba669c37e79d311d4c`

## Tests and exact results

- Preserved-failure reproduction: detached isolated worktree at exact `d34257bfe16d650618bb78ea7404e63844c3a6cf`; `node --test --test-concurrency=1 scripts/task-0066-console-acceptance.test.mjs` **FAIL**, 10 total, 9 pass, 1 fail, 0 skip, 91.0944 ms. Exact failure: `versioned console contract passes`, expected `passed`, actual `failed`. The detached reproduction worktree was removed afterward.
- Corrected focused/related run at exact candidate: `node --test --test-concurrency=1 apps/customer-console/transaction-search-workbench.test.mjs scripts/task-0066-console-acceptance.test.mjs apps/customer-console/console-shell.test.mjs` **PASS**, 29/29, 0 fail/skip, 224.619 ms. This proves the formatting-independent `RESULT_COLUMNS` corrective binding and existing workbench/console regressions.
- `npm run accessibility:check` **PASS**. A verified ignored junction to the authoritative dependency directory was used and removed before clean-head evidence.
- Adversarial inline module at exact candidate: **FAIL as designed by QA assertion**. `createSearchApi` performed one fetch for `query: "safe\\u0000query"` and `cursor: "opaque\\u0000cursor"`. More importantly, `createSearchWorkbench` accepted `{data:[{}],page:{next_cursor:null}}` as `status: "success"` with one record containing empty `id`, `posted_at`, and `currency`; QA expected `status: "error"`. Node exited 1 on `AssertionError: malformed item must fail closed`, actual `success`, expected `error`.
- `npm test -- --test-concurrency=1` was started as a single runner chain, then intentionally terminated on supervisor instruction after the deterministic acceptance blocker was established. It is not recorded as pass or fail evidence and produced no auditable final TAP summary. A future candidate still requires a complete full-suite result.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` **PASS**: 360 Markdown, 65 JSON, 5 YAML.
- `npm run format:check` **PASS**: 48 pinned-Prettier files and structural closure checks.
- `npm run lint`, `npm run queue:check`, `npm run traceability:check` **PASS**.
- `npm audit --audit-level=high` **PASS**: zero vulnerabilities.
- `git fsck --full --strict` **PASS**: preserved dangling objects reported, no corruption.
- `git diff --check 54652c309b473ec7797b36cd6e9b7099306f3bfb..9a3b23f40bdd2a6bf75a8c74deba5011b6a30ab7` **PASS**.
- Exact authorized-scope comparison **PASS** before this review artifact: exactly the four task-authorized candidate files and no prohibited file.

## Acceptance, security, tenant isolation, accessibility, and failures

- Positive evidence confirms authenticated-session API-only access to `POST /v1/transactions/search`, no client-supplied tenant/environment scope, forbidden/unavailable generic messages, result redaction of tenant/account/amount/description/provider fields, load-more cursor preservation, AbortController cancellation, stale-response serial suppression, projection-stale/source-unchanged messaging, native controls, labelled form/table, and polite live status.
- The observable snapshot uses copies for the accepted safe fields, and the UI does not access storage, providers, models, PostgreSQL, OpenSearch, Redis, or privileged admin APIs directly.
- **High, acceptance-blocking — malformed server item accepted.** Reproduction is the adversarial command above. `validResult` checks only that `data` is an array and that a few page/consistency/watermark fields are shaped; `safeTransaction` converts missing required fields to empty strings. This diverges from `transaction-search-response.schema.json`, permits corrupted or contract-drifted projection data to appear as a successful authorized result, and violates the explicit malformed-response fail-closed criterion. Required remediation: validate required response and item fields, including non-empty identifiers, date/currency/evidence shape and page contract, before any append or replacement; render only the stable generic malformed/unavailable message; preserve existing rows on failed continuation; add direct regressions for missing/wrong/accessor/proxy fields and oversize collections/strings.
- **Medium — control characters reach the API.** The adapter bounds string length but accepts C0 control characters in query and cursor. This is not a tenant leak by itself, but it leaves input-control coverage incomplete and could create ambiguous query/log/cursor handling downstream. Required remediation: make the normative policy explicit and either reject disallowed control characters before fetch or prove the versioned API explicitly permits and safely canonicalizes them; add negative tests.
- The malformed-response defect is enough to reject independently of the control-character policy. No cross-tenant disclosure was observed in existing happy/error tests, but successful acceptance of malformed results means tenant/security confidence is incomplete until corrected and re-reviewed.
- Accessibility static/capability checks passed, but this remains a synthetic DOM/reference workbench: no browser E2E, assistive-technology certification, deployed customer console, real API host, production identity/session, managed data plane, load/SLO evidence, or production operation is proven.

## Corrective-forward and rollback

- Preserve this candidate, the `d34257b` failure, and this rejection. Do not rewrite or delete them.
- A distinct Frontend remediation agent should create a new isolated branch/worktree, own only the authorized implementation/test plus new handoff/task records, correct response validation and input control without weakening TASK-0066 or repository gates, and commit implementation and provenance separately.
- A different fresh QA/Security reviewer must review the exact corrected committed candidate. Required reruns include malformed item/page/required-field/accessor/proxy/control/oversize cases, continuation rollback, cross-tenant and raw-payload leakage, stale/cancel races, immutable snapshots, TASK-0066, accessibility, a complete full suite, validation, format, lint, queue, traceability, audit, strict fsck, scope, and clean-head proof.
- Before integration, rollback is a reviewed revert of only the candidate commits. After any future protected integration, use a separate corrective-forward commit and independent re-review. No push, PR, merge, activation, queue/matrix change, TASK-0008 work, or self-approval is authorized by this rejected review.
