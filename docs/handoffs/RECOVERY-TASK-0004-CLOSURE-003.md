# Handoff: RECOVERY-TASK-0004-CLOSURE-003

- Task ID: `RECOVERY-TASK-0004-CLOSURE-003`; historical capability `TASK-0004`.
- Scope and classification: corrective-forward for exact rejected finding `QA-0004-003`. The change hardens only the in-memory raw-evidence reference boundary. It is a **reference implementation**, not production persistence, managed scanning, OIDC, provider, deployment, or operational evidence.
- Agent role: Backend.
- Role file and SHA-256: `agents/BACKEND.md` (`171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`).
- Agent thread ID: `/root/backend_task_0004_closure_r3` (runtime canonical task identity; the runtime exposes no separate native custom-role field).
- Worktree and branch: `C:\source\upfs-backend-task-0004-closure-r3`; `recovery/task-0004-closure-r3`.
- Rejection base: independent QA rejection `461a06e6269fe48d6713ec2355bb1d4a97deb4f4`, whose parent is rejected R2 candidate `7db97a36bbd3f028cb4795b91f15915b723d3f22`.
- Implementation commit: `286ee507a0fd855fd37b0d768ed04033dfc64de6`.
- Handoff-binding commit: `fdec3e0b9984306dcce1e9d87bce895b28a8bf63`; this corrective handoff-byte commit is the exact candidate for independent review.
- Files changed: `services/evidence-intake.mjs`; `services/evidence-intake.test.mjs`; `tasks/recovery/RECOVERY-TASK-0004-CLOSURE-003.yaml`; this handoff.
- Prohibited files unchanged: queue, closure matrix, contracts, registry artifact, specifications, connector implementation/tests, historical handoff, later tasks, workflows, and packages.

## Inputs and provenance

- `AGENTS.md` (`9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`); `START_HERE.md` (`34f7748abb4107764bf54d669262fe289df1b9c41636868459112efadcdb43e9`).
- `agents/BACKEND.md` (`171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`); `agents/WORKTREES.md` (`f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`); `agents/HANDOFF_TEMPLATE.md` (`4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`).
- Constitution (`e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`); master plan (`2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`); canonical model (`5c874d646cae8693a48a5f42de75249c5007c1a7bd296da7fd29bd1875cf8ed0`); identity/tenant model (`c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf`); API standards (`23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`); security baseline (`53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`); threat model (`716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`); test strategy (`349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`).
- R1/R2 task and evidence: `RECOVERY-TASK-0004-CLOSURE-001.yaml` (`bae249d381da62272b3ecc8af51737648030f2362897ea9544a529ba02c9ba3a`); registry task (`38d7984bbcc017e272d58c7e04316bd5681ced63a9651cc1ee5f8d1deaa17116`); R2 task (`98b0e8dceea5e7e082d4296172dc567a9a26c8bf2076049692d4024c7723a077`); R1 handoff (`dfeb806ef483d5af1ed8d911c9ef06165b4e1593b95aa710a1f6efecbf3bb5b8`); registry handoff (`f29e530f6df70b3eb665040807485edf841344a644e00e05a89f324fc31caa1e`); R2 handoff (`54c0afd49d7de1fb6fc4c74efbaec8b4bc08895aedea8475aed0b37f4917eef7`); R1 QA (`e0edd0055a17177c5e646bafdd5bdd78e600452f212f092a2ffd326ff377d737`); R2 rejection QA (`d92c0ce9872d08073e9cf15bcc834234a7d075468e4c3b0e34d399830de5352c`).
- Historical TASK-0004 handoff (`9724c55efa0cdc992ebd4db43ba099ddef15b3d471f8fbeca080de8480b6d6e0`), queue (`c8cf67aa46114aaeaa64b649f33355c7b6179bbced0f8ae219628592c62fc237`), closure matrix (`c5af258925805933c44fb516d1e5a90f8f080fe0d5265ed82df9c9e92d7f1d9d`), raw-evidence schema (`4bbecf5f48f86434f45f138807f191e3b6e8329189fa22f44277121c0861d4e8`), rejected R2 service (`144be85ea2a31cbe315875c6bbf5a234c542e03361ac24d622e0c98d9736734d`) and tests (`17df12765693efe4eba434212d6097036ffd8f4b9a8b7a25a757822df3ad0750`) were completely read before editing.

## Implementation, security, and acceptance evidence

- `normalizeScope` now uses trap-safe `Reflect.getPrototypeOf`, `Reflect.ownKeys`, and `Reflect.getOwnPropertyDescriptor`. It accepts only plain or null-prototype objects whose complete own-key set is exactly the three required string keys and whose required properties are enumerable string-valued data descriptors containing UUIDs.
- Local, global, and well-known symbols; enumerable and non-enumerable unexpected keys; Unicode-confusable keys; accessors; custom prototypes; duplicate/incomplete proxy key reports; throwing `ownKeys`, `getOwnPropertyDescriptor`, or invariant traps all converge on bounded denial.
- Intake denial occurs before scanner, record, idempotency, and audit mutation. Get denial occurs before scoped lookup. Responses contain no attacker value or tenant detail. Corrected retries with valid plain and null-prototype objects succeed, proving no retained denial state.
- Existing authentication, cross-tenant non-disclosure, payload-bound idempotency/replay, conditional create, concurrency, audit redaction, scanner failure, commit rollback, timestamp, connector, and registry coverage remains green.
- Threat/tenant analysis: authorization scope remains exclusively adapter-derived. Complete own-key inspection prevents hidden metadata from crossing the authorization boundary. Reflection and proxy failures are caught and normalized to the same non-disclosing denial. No client tenant identifier becomes authoritative and no secret/customer data is introduced.

## Tests executed at implementation commit

- Focused: `node --test services/evidence-intake.test.mjs services/connector-ingestion.test.mjs services/transaction-registry.test.mjs services/registry-generator.test.mjs` — PASS, 42/42, 0 failed, 0 skipped, about 164 ms.
- Full suite: `npm test` — PASS, 986 total; 985 passed; 0 failed; 1 pre-existing opt-in PostgreSQL skip; 292.3 seconds.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` — PASS, 345 Markdown, 65 JSON contracts, 5 YAML contracts.
- `npm run format:check` — PASS, 48 pinned-Prettier files plus structural closure formatting.
- `npm run queue:check`; `npm run traceability:check`; `npm run lint`; `npm audit --audit-level=high` — PASS; audit reports 0 vulnerabilities.
- Deterministic `node scripts/generate-registry.mjs` plus `git diff --exit-code -- artifacts/schema-registry.json` — PASS, 6 schemas and no drift.
- `git diff --check`; `git fsck --full --strict` — PASS. Existing unreachable objects were reported but no corruption.
- An earlier 120-second and then 300-second full-suite invocation were killed by the command timeout before a result; they are not counted as evidence. The single completed 600-second-budget rerun above is the auditable result.

## Limitations, rollback, and review

- Known limitations/external prerequisites: this remains local in-memory reference composition. Durable PostgreSQL/RLS and immutable blob storage, managed scanners, production OIDC/policy, transactional outbox, deployed API routing, real provider/runtime credentials, and protected operational evidence remain absent. No production-complete claim is made.
- Rollback/corrective-forward: preserve R1 rejection `73e35437c5cad0224106fbe623aad5ea8c4d3641`, R2 rejection `461a06e6269fe48d6713ec2355bb1d4a97deb4f4`, and this branch. If rejected, use a new bounded corrective-forward task and fresh review. After integration, use a reviewed revert of these exact commits or another independently reviewed corrective-forward change; never weaken exact-shape validation.
- Independent reviewer/result: pending a fresh QA/Security agent distinct from the R1/R2/R3 authors, operating under `agents/QA_SECURITY.md` in an isolated worktree from the exact final candidate. No push, PR, merge, activation, TASK-0005 work, or self-approval is authorized by this handoff.
