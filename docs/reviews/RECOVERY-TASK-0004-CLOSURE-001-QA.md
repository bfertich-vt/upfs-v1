# Independent QA/Security review: RECOVERY-TASK-0004-CLOSURE-001

## Verdict

**REJECT.** Exact combined candidate `d7fb88a44a05baa8b37ef16e890d2114dec7bfab` is not acceptable for protected promotion. The independently rerun focused suite, full suite, registry regeneration, and repository gates are green, but direct negative testing found two fail-open runtime defects in the Backend evidence boundary:

1. `validateEvidence` accepts impossible calendar timestamps such as `2024-02-31T00:00:00Z` because `Date.parse` normalizes the date. This violates the task's strict time-validation and fail-closed contract and creates runtime/schema parity drift.
2. A malformed authorization-derived scope containing a non-string value such as `Symbol("secret")` escapes `intake` as an uncaught `TypeError: Cannot convert a Symbol value to a string`. It must return a bounded, non-disclosing denial and must not leak an adapter/runtime exception.

Both are acceptance-blocking security/correctness defects. No implementation, contract, task, queue, matrix, or handoff file was edited by this reviewer.

## Review provenance

- Task: combined independent review of `RECOVERY-TASK-0004-CLOSURE-001` and its dependency-controlled registry publication `RECOVERY-TASK-0004-REGISTRY-001` for historical `TASK-0004`.
- Agent role: Independent QA/Security under `agents/QA_SECURITY.md`.
- Role-file path and SHA-256: `agents/QA_SECURITY.md`; `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Agent thread ID: `/root/qa_task_0004_closure_r1`.
- Worktree and branch: `C:\source\upfs-qa-task-0004-closure-r1`; `qa/task-0004-closure-r1`.
- Exact candidate: `d7fb88a44a05baa8b37ef16e890d2114dec7bfab`.
- Backend structured-task commit: `99cd191c1789ddd34c6b8f2c8eeb750656fa4330`.
- Backend implementation commit: `77d98e2a2bfed307f65e2afddd8b9dfcea63c580`.
- Backend final handoff head: `cbaaa19f7f231e03a0618e4bca01635da2571435`.
- Schema/Search/AI structured-task commit: `39620a6cfc9031ffb114c174851955b92c43f60c`.
- Registry artifact commit: `ccd25c7199bc1e1fd5ca7d03feed54e73da270f3`.
- Reviewer independence: this reviewer authored and remediated none of the candidate commits. Review began from the exact committed candidate in a fresh isolated worktree. The implementation worktrees were not used for review writes.
- Candidate ancestry: both `77d98e2a...` and `ccd25c7...` are ancestors of the exact candidate. The Backend handoff preserves its initially failing concurrency/clock runs, dependency-install failure, connector compatibility failures, stale-registry failure, and traceability correction history; the registry handoff preserves its dependency-install and handoff-grammar correction history.

## Governing inputs loaded

| Path                                                  | SHA-256                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `AGENTS.md`                                           | `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1` |
| `agents/QA_SECURITY.md`                               | `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0` |
| `agents/WORKTREES.md`                                 | `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1` |
| `agents/HANDOFF_TEMPLATE.md`                          | `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4` |
| `specs/00_constitution/engineering_constitution.md`   | `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73` |
| `docs/MASTER_PLAN.md`                                 | `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec` |
| `specs/04_schema/canonical_model.md`                  | `5c874d646cae8693a48a5f42de75249c5007c1a7bd296da7fd29bd1875cf8ed0` |
| `specs/04_schema/identity_tenant_model.md`            | `c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf` |
| `specs/05_apis/api_standards.md`                      | `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b` |
| `specs/10_security/security_baseline.md`              | `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add` |
| `specs/10_security/threat_model.md`                   | `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f` |
| `specs/12_testing/test_strategy.md`                   | `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172` |
| `tasks/recovery/RECOVERY-TASK-0004-CLOSURE-001.yaml`  | `bae249d381da62272b3ecc8af51737648030f2362897ea9544a529ba02c9ba3a` |
| `tasks/recovery/RECOVERY-TASK-0004-REGISTRY-001.yaml` | `38d7984bbcc017e272d58c7e04316bd5681ced63a9651cc1ee5f8d1deaa17116` |
| `docs/handoffs/RECOVERY-TASK-0004-CLOSURE-001.md`     | `dfeb806ef483d5af1ed8d911c9ef06165b4e1593b95aa710a1f6efecbf3bb5b8` |
| `docs/handoffs/RECOVERY-TASK-0004-REGISTRY-001.md`    | `f29e530f6df70b3eb665040807485edf841344a644e00e05a89f324fc31caa1e` |
| `docs/handoffs/TASK-0004.md`                          | `9724c55efa0cdc992ebd4db43ba099ddef15b3d471f8fbeca080de8480b6d6e0` |
| `tasks/queue.yaml`                                    | `c8cf67aa46114aaeaa64b649f33355c7b6179bbced0f8ae219628592c62fc237` |
| `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md`              | `c5af258925805933c44fb516d1e5a90f8f080fe0d5265ed82df9c9e92d7f1d9d` |
| `contracts/schemas/raw-evidence.schema.json`          | `4bbecf5f48f86434f45f138807f191e3b6e8329189fa22f44277121c0861d4e8` |
| `services/evidence-intake.mjs`                        | `c868d73dbb944d0f4cb1f03f34f3bc8100e2698e96047efcb64b5b5021c72231` |
| `services/evidence-intake.test.mjs`                   | `ade5754a9b55603bbcd499c7556263df731b933186e54ec10eaefdae4e303496` |
| `services/connector-ingestion.mjs`                    | `a4161d202f31bab42ec2b6c8a890e04816d342f9f22ff10a312208d9324c3354` |
| `services/connector-ingestion.test.mjs`               | `7046505cc420f788ea3f0179cb025d281c37aaa0f411fb7520edc2181dce8687` |
| `services/transaction-registry.mjs`                   | `79c29171f8422d975be57cd05f4a8f9fbc2c934c039c5b0072ff82a5e93e886d` |
| `services/transaction-registry.test.mjs`              | `6851df781d4f69324f98c4d5298a08a5c995efc83931bd6cdb83d925d09c7a54` |
| `services/registry-generator.mjs`                     | `e0578c55452606d51f181b50789017b3d48b938bd8050b242a0372f4a69b0014` |
| `services/registry-generator.test.mjs`                | `af619d70617570b716dc587f4997e93dd3fbf3f55c50eff0f26d57e35fc29a34` |
| `scripts/generate-registry.mjs`                       | `963f26c231f7369772e8d90fbfee8277dbe43cf882e67489652c50f0be868326` |
| `artifacts/schema-registry.json`                      | `2b542b20bb76029257e2d862dfa6d6ab2bca2fc6e6e33c25f43bd45bd8db82be` |
| `package.json`                                        | `99bc305b048b739b1a2929aec1dc62c9ce1925557d0070363862ddfc7405dfa9` |

## Acceptance and security trace

| Criterion                                                                  | Evidence and result                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verified actor-derived organization/tenant/environment scope               | Existing focused tests prove verified identity derivation, forged request-scope rejection, cross-tenant/environment non-disclosure, and missing/unverified actor denial. **FAIL overall** because malformed derived scope can throw instead of returning a bounded denial.                                                                                     |
| Immutable quarantined raw evidence before downstream use                   | Focused evidence and connector tests prove status `quarantined`, defensive returned/audit copies, and no canonical write after unsafe scanning. PASS for reference boundary.                                                                                                                                                                                   |
| Strict UUID/correlation/provenance/time/media/size/hash/control validation | Existing tests cover ordinary malformed IDs, obviously malformed dates, metadata controls, media, exact UTF-8 size, and SHA-256. **FAIL** because impossible calendar dates normalize and pass runtime validation.                                                                                                                                             |
| Scanner failure, timeout, malware, suspicious content, prompt injection    | Focused tests prove exception/timeout/malformed output and unsafe classifications leave no record/idempotency/audit or canonical write and do not leak exception/content. PASS. Non-cooperative scanner cancellation remains a documented production limitation.                                                                                               |
| Idempotency/replay/changed payload/concurrency                             | Tests prove scope- and actor-bound keys, same-payload replay, changed-payload conflict, conditional create, serialized competing creates, and one atomic record/audit. PASS.                                                                                                                                                                                   |
| Atomic record/idempotency/audit and corrected retry                        | Injected `beforeCommit` failure leaves no record, idempotency entry, or audit; the same key succeeds after correction. PASS for in-memory reference boundary.                                                                                                                                                                                                  |
| Redacted append-only audit and error leakage                               | Tests prove metadata-only audit, defensive copies, no content/provenance record/scanner exception leakage, and no success audit on rejection. PASS except the uncaught malformed-scope exception violates bounded error behavior.                                                                                                                              |
| Connector compatibility                                                    | Connector suite proves signed intake, replay/signature denial, scope derivation, quarantine-before-canonical behavior, corrected retry, and no regression. PASS.                                                                                                                                                                                               |
| Registry/runtime/generated parity                                          | Generation is deterministic; six schemas remain; exact raw-evidence 1.1.0 bytes bind to digest `4bbecf...`; repeated generation leaves artifact digest `2b542...` and no diff. All non-raw-evidence entries are unchanged per committed handoff and focused tests. PASS.                                                                                       |
| Production capability claim                                                | Candidate and handoffs classify the in-memory service/synthetic connector as a proven reference implementation only. PostgreSQL/RLS, immutable blob storage, durable idempotency/audit/outbox, OIDC, API routing, managed scanners/secrets, deployment, and runtime evidence remain absent. PASS for truthful limitation; no production acceptance is granted. |

## Independent negative reproductions

### QA-0004-001: impossible UTC calendar date accepted

At exact candidate `d7fb88a...`, an inline Node reproduction imported `validateEvidence`, constructed an otherwise valid synthetic observation with `observed_at: "2024-02-31T00:00:00Z"` and `captured_at: "2024-03-02T00:00:00Z"`, and printed:

```text
IMPOSSIBLE_DATE_VALIDATION=null
```

`null` means accepted. Node normalizes the impossible date instead of rejecting it. Required remediation: replace parse-only validation with strict canonical UTC calendar validation that round-trips and rejects invalid day/month/leap-day/hour values, while retaining permitted fractional precision. Add runtime and schema-parity negatives for non-leap February 29, February 30/31, invalid month/day, and `24:00:00Z`, plus provenance `captured_at` equivalents. Preserve all existing valid timestamp behavior.

### QA-0004-002: malformed derived scope throws

At the same candidate, an inline Node reproduction injected a `deriveScope` result whose `organization_id` was `Symbol("secret")`. `intake` printed:

```text
MALFORMED_SCOPE_THROW=TypeError:Cannot convert a Symbol value to a string
```

The exception escapes because `validScope` calls `UUID.test` without first proving each scope member is a string. Required remediation: validate the shape and primitive string type of every derived identifier before regex evaluation and bound all adapter-returned malformed values to the same non-disclosing denial. Add negatives for `Symbol`, object, array, numeric, null, getter-throwing, missing, and extra/malformed scope fields through both `intake` and `get`; prove no state, idempotency, audit, scanner call, payload, scope value, or adapter exception leaks.

## Commands and results

| Command                                                                                                                                                           | Result                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node --test services/evidence-intake.test.mjs services/connector-ingestion.test.mjs services/transaction-registry.test.mjs services/registry-generator.test.mjs` | PASS: 36 passed, 0 failed, 0 skipped; 204 ms wall time.                                                                                                                                                                                              |
| Initial `npm test` before dependency installation                                                                                                                 | Environment-only failure: 881 passed, 7 module-resolution failures, 1 skipped; missing pinned `yaml`, `prettier`, and `pg` packages in the fresh worktree. Not treated as candidate evidence.                                                        |
| `npm ci --ignore-scripts`                                                                                                                                         | PASS: 106 lockfile-pinned packages installed; 0 vulnerabilities; 4.311 s.                                                                                                                                                                            |
| `npm test` after clean dependency installation                                                                                                                    | PASS: 980 total, 979 passed, 0 failed, 1 pre-existing explicit opt-in PostgreSQL skip; 294.739 s wall time.                                                                                                                                          |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                                                                                   | PASS: 342 Markdown, 65 JSON, 5 YAML; 11.323 s.                                                                                                                                                                                                       |
| `npm run format:check`                                                                                                                                            | PASS: pinned Prettier files and 48 closure files; 5.140 s.                                                                                                                                                                                           |
| `npm run queue:check`                                                                                                                                             | PASS; 11.516 s.                                                                                                                                                                                                                                      |
| `npm run traceability:check`                                                                                                                                      | PASS; 33.056 s.                                                                                                                                                                                                                                      |
| `npm run lint`                                                                                                                                                    | PASS; 7.857 s.                                                                                                                                                                                                                                       |
| `npm audit --audit-level=high`                                                                                                                                    | PASS: 0 vulnerabilities; 2.369 s.                                                                                                                                                                                                                    |
| `git fsck --full --strict`                                                                                                                                        | PASS; preserved dangling objects reported, no corruption; 18.562 s.                                                                                                                                                                                  |
| `git diff --check`                                                                                                                                                | PASS; 0.097 s.                                                                                                                                                                                                                                       |
| `node scripts/generate-registry.mjs` plus artifact digest/diff comparison                                                                                         | PASS: generated six schemas; before/after SHA-256 both `2b542b20...`; no diff.                                                                                                                                                                       |
| Authorized-diff inspection `29dd908..d7fb88a`                                                                                                                     | PASS: exactly raw-evidence service/test/schema, authorized connector service/test, registry artifact, two structured tasks, and two handoffs. No queue, matrix, historical handoff, spec, workflow, package, unrelated task, or `TASK-0111+` change. |
| Inline impossible-date and malformed-scope reproductions                                                                                                          | **FAIL as above:** impossible date accepted; malformed derived scope throws.                                                                                                                                                                         |

## Security assessment and required corrective-forward action

Tenant separation, redaction, quarantine, scanning, idempotency, concurrency, atomicity, rollback, and deterministic artifact tests are otherwise strong for an explicitly in-memory reference boundary. However, fail-closed validation and bounded non-disclosing authorization behavior are non-negotiable. The two defects therefore block acceptance even though all pre-existing suites and repository gates pass.

Preserve this rejection and all Backend/Schema history. Create a separate, narrowly scoped Backend corrective-forward task and branch that fixes only strict timestamp validation and malformed derived-scope bounding, updates focused negative tests, and records a provenance-complete handoff. Do not weaken schema/runtime checks, swallow unrelated implementation errors, edit the registry unless the contract bytes genuinely change, change queue/matrix status, or claim production capability. A fresh QA/Security agent who authored neither this candidate nor the remediation must review the exact corrected committed candidate before any push, PR, activation, or protected integration.

## Rollback and limitations

- No rollback is required because this candidate is rejected before integration.
- If corrected before integration, correct forward in a new Backend commit and retain this review.
- The accepted future classification can be no stronger than **Proven reference implementation** absent durable PostgreSQL/RLS, immutable blob storage, durable audit/idempotency/outbox, production OIDC/API host, managed scanning, secrets, deployment, and real runtime evidence.
- Existing opt-in embedded PostgreSQL skip is unrelated and was not promoted as runtime proof.
- This reviewer did not push, merge, alter status, or remediate implementation.
