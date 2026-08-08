# Independent QA/Security review: RECOVERY-TASK-0004-CLOSURE-003

- Verdict: **ACCEPT** the exact candidate `5781d099adc515e4cd8618b79588379fe4d3dcae` as a **reference implementation only**. This is not production persistence, managed scanning, OIDC, provider, deployment, or operational evidence.
- Task: `RECOVERY-TASK-0004-CLOSURE-003`; historical capability `TASK-0004`.
- Reviewer role: Independent QA/Security under `agents/QA_SECURITY.md`.
- Reviewer role-file digest: `agents/QA_SECURITY.md` SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Reviewer thread: `/root/qa_task_0004_closure_r3`.
- Worktree and branch: `C:\source\upfs-qa-task-0004-closure-r3`; `qa/task-0004-closure-r3`.
- Candidate chain: R3 implementation `286ee507a0fd855fd37b0d768ed04033dfc64de6`; handoff binding `fdec3e0b9984306dcce1e9d87bce895b28a8bf63`; exact independently reviewed candidate `5781d099adc515e4cd8618b79588379fe4d3dcae`.
- Preserved rejection evidence: R1 rejection `73e35437c5cad0224106fbe623aad5ea8c4d3641`; R2 rejection `461a06e6269fe48d6713ec2355bb1d4a97deb4f4`.
- Independence: this reviewer did not author or remediate R1, R2, or R3, began from the exact committed candidate in a fresh isolated worktree, and made no implementation edit. This attestation is the sole repository file added by the reviewer.

## Loaded inputs and digests

- `AGENTS.md` `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`; `START_HERE.md` `34f7748abb4107764bf54d669262fe289df1b9c41636868459112efadcdb43e9`.
- `agents/QA_SECURITY.md` `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`; `agents/WORKTREES.md` `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`; `agents/HANDOFF_TEMPLATE.md` `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- Constitution `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`; master plan `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`.
- Canonical model `5c874d646cae8693a48a5f42de75249c5007c1a7bd296da7fd29bd1875cf8ed0`; identity/tenant model `c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf`; API standards `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`; security baseline `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`; threat model `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`; testing strategy `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- R1 task `bae249d381da62272b3ecc8af51737648030f2362897ea9544a529ba02c9ba3a`; R2 task `98b0e8dceea5e7e082d4296172dc567a9a26c8bf2076049692d4024c7723a077`; R3 task `c07f9469af9950f52cb1eb23d3645285a90e7ef39b71312ca1404813efd87656`; registry task `38d7984bbcc017e272d58c7e04316bd5681ced63a9651cc1ee5f8d1deaa17116`.
- R1/R2/R3 handoffs: `dfeb806ef483d5af1ed8d911c9ef06165b4e1593b95aa710a1f6efecbf3bb5b8`, `54c0afd49d7de1fb6fc4c74efbaec8b4bc08895aedea8475aed0b37f4917eef7`, `e560b7871ca403e9e79d12e92f6b4aeceb483eaa5224f877f86a8ce290700fcf`; registry handoff `f29e530f6df70b3eb665040807485edf841344a644e00e05a89f324fc31caa1e`.
- Prior QA: R1 `e0edd0055a17177c5e646bafdd5bdd78e600452f212f092a2ffd326ff377d737`; R2 `d92c0ce9872d08073e9cf15bcc834234a7d075468e4c3b0e34d399830de5352c`.
- Raw-evidence contract `4bbecf5f48f86434f45f138807f191e3b6e8329189fa22f44277121c0861d4e8`; service `685cc5d944c359f37d9b6c4a31985942d535693ba4200a463dd634040acb01dc`; service tests `5f19fcf0b95b426dcd4f52d0cfdfc9ef10d6d1e83fdde20574f82bf3e52bded5`.
- Historical TASK-0004 handoff `9724c55efa0cdc992ebd4db43ba099ddef15b3d471f8fbeca080de8480b6d6e0`; queue `c8cf67aa46114aaeaa64b649f33355c7b6179bbced0f8ae219628592c62fc237`; closure matrix `c5af258925805933c44fb516d1e5a90f8f080fe0d5265ed82df9c9e92d7f1d9d`.

## Acceptance and adversarial findings

- Exact complete-own-key validation is enforced with trap-safe prototype, own-key, and descriptor reflection. Only plain or null-prototype objects with exactly the three enumerable own primitive-string UUID data properties are accepted.
- The committed tests and an independent 22-variant harness reproduced the former Symbol-key bypass and proved denial for local, global, and well-known Symbols; enumerable/non-enumerable string and Symbol extras; non-enumerable required properties; getter and setter accessors; Unicode confusables; custom and inherited prototypes; throwing `getPrototypeOf`, `ownKeys`, and descriptor traps; omitted invariant keys; and duplicate proxy keys.
- All malformed variants returned the identical bounded intake denial `{status:403, body:{code:"forbidden", retryable:false}}` without attacker values, scanner calls, records, idempotency effects, or audit events. Get returned the same non-disclosing not-found envelope before record access. A corrected plain or null-prototype retry with the same idempotency key succeeded, proving rejected input retained no state.
- Prior R1 impossible-calendar defects remain closed: canonical UTC validation covers Gregorian leap rules, valid date/time ranges, exact syntax, one-to-nine fractional digits, and nanosecond provenance ordering.
- Existing authentication, authorization-derived scope, cross-tenant/environment non-disclosure, conditional create, payload-bound replay, serialized concurrency, scanner failure/quarantine, commit rollback, immutable copies, redacted audit, connector boundary, deterministic registry, and registry rollback coverage remained green.
- No high-severity vulnerability, tenant escape, sensitive-data leakage, validation weakening, contract drift, generated drift, or unauthorized file change was found.

## Commands and results

- `node --test services/evidence-intake.test.mjs services/connector-ingestion.test.mjs services/transaction-registry.test.mjs services/registry-generator.test.mjs`: PASS, 42/42, 0 failed, 0 skipped, 195 ms wall time.
- Independent temporary adversarial harness outside the repository: PASS, 22/22 malformed-shape families, 67 ms; removed immediately after execution.
- Initial `npm test` before dependency installation: infrastructure-only FAIL, 887 passed, 7 module-resolution failures, 1 skip, 7.67 s. Exact causes were absent lockfile dependencies `yaml`, `prettier`, and `pg`; this is not counted as candidate evidence.
- `npm ci --ignore-scripts`: PASS, 106 packages installed, 0 vulnerabilities, 4.60 s.
- Final `npm test`: PASS, 986 total, 985 passed, 0 failed, 1 pre-existing opt-in PostgreSQL skip, 292.46 s wall time.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`: PASS, 346 Markdown, 65 JSON contracts, 5 YAML contracts, 8.18 s.
- `npm run format:check`: PASS, 48 pinned-Prettier files and structural exclusions, 3.60 s.
- `npm run queue:check`: PASS, 7.83 s. `npm run traceability:check`: PASS, 30.98 s. `npm run lint`: PASS, 5.32 s.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilities, 1.41 s.
- `node scripts/generate-registry.mjs` and `git diff --exit-code -- artifacts/schema-registry.json`: PASS, 6 schemas and no generated drift.
- `git diff --check`: PASS. `git fsck --full --strict`: PASS; preserved dangling objects only, no corruption.
- Candidate worktree was clean before this sole-file attestation. The candidate ancestry contains only the documented R1/R2/R3, registry, and preserved review streams relative to the authoritative task base.

## Security conclusion, limitations, and corrective-forward

- Security conclusion: the R3 correction closes `QA-0004-003` without weakening prior controls. Malformed authorization-derived objects cannot smuggle hidden own keys or trigger adapter exception disclosure, and denial precedes all mutable or sensitive boundaries observable by this reference service.
- Limitations/external prerequisites: the implementation remains in-memory and reference-only. It does not prove PostgreSQL/RLS, immutable blob storage, durable idempotency/audit/outbox, managed scanners, production OIDC/policy, API-host wiring, managed secrets, provider operation, deployment, performance, restore, or production runtime behavior. The single PostgreSQL skip is not production evidence.
- Rollback/corrective-forward: preserve both rejection commits and this review. Before integration, a reviewed revert may remove the bounded R3 commits. After integration, use a separately assigned corrective-forward change and fresh independent review; never weaken exact-shape validation or erase rejection evidence.
- Final review result: **ACCEPT** exact candidate `5781d099adc515e4cd8618b79588379fe4d3dcae` for protected-flow promotion as a proven reference implementation only.
