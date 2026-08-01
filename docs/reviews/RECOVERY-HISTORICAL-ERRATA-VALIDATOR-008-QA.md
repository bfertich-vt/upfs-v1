# RECOVERY-HISTORICAL-ERRATA-VALIDATOR-008 — Independent QA/Security review

## Result

**PASS — accepted as a bounded recovery control-plane candidate.** This review
accepts only the clean implementation candidate
`3e112eb12605b653832be597888091833c18c652` and its separate author handoff
`0c623b5e7f530123552e6f0eba1f6d2ef192faaa`. It does not accept historical
handoffs, the queue, a traceability matrix, GitHub governance, or any product
or production-readiness capability.

## Provenance and review boundary

- Task and scope: `RECOVERY-HISTORICAL-ERRATA-VALIDATOR-008-QA`, independent
  review of the portable external-historical-evidence validation clean port.
- Agent role: Independent QA/Security; role file `agents/QA_SECURITY.md`,
  SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Agent thread ID: `/root/qa_external_evidence_cleanport_008`.
- Worktree and branch: `C:\source\upfs-qa-external-evidence-cleanport-008`;
  `qa/external-evidence-cleanport-008`.
- Candidate and author-handoff commits: implementation
  `3e112eb12605b653832be597888091833c18c652`; handoff
  `0c623b5e7f530123552e6f0eba1f6d2ef192faaa`.
- Clean ancestry: `4c13247833b5f331ac73e1f76b9c96fbda1da1bf` is the exact parent of
  `3e112eb`; `3e112` is the exact parent of `0c623b`. The range changes only
  `scripts/ci-gate-validator.mjs`, `scripts/ci-gate-validator.test.mjs`, the
  008 structured input, and the separate 008 handoff. No rejected-007 commit,
  historical artifact, queue, traceability matrix, product, workflow, release,
  or readiness file is in the implementation diff.
- Prior corrective finding read: immutable rejection
  `0048a08a2aa242f3f2a9840d7427cba7c1f34373:docs/reviews/RECOVERY-HISTORICAL-ERRATA-VALIDATOR-007-QA.md`,
  raw Git-blob SHA-256 `c312fccffad38a0c7b461a3bc466b852db80cf5e34a8930d48e7a2157e017885`.

## Inputs loaded before review

All values below are SHA-256 over the named committed blob content, except the
prior rejection whose immutable commit is stated above.

- `AGENTS.md` — `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`.
- `agents/QA_SECURITY.md` — `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- `agents/WORKTREES.md` — `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`.
- `agents/HANDOFF_TEMPLATE.md` — `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- `specs/00_constitution/engineering_constitution.md` — `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- `specs/01_product/vision_and_scope.md` — `9cf819b72b57d2f1ca8b4561eb132af811e1ea150cbd5ee4401d5b55e37f2cd7`.
- `specs/03_architecture/system_architecture.md` — `4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6`.
- `specs/05_apis/api_standards.md` — `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`.
- `specs/06_ai/ai_runtime.md` — `2238b3be196a9289e661dbeee579526a81c8db238d81428be2f3447d78df0384`.
- `specs/07_workflows/workflow_runtime.md` — `c7d4c2e4594bc7c9e33b905f845020aada740e0643bcc61215063c35980e0d8a`.
- `specs/08_policies/policy_system.md` — `ed41f87a9748089932b9a384d816148ce501f2bc810d247259ffff4fe463f8ed`.
- `specs/09_cicd/delivery_pipeline.md` — `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`.
- `specs/10_security/security_baseline.md` — `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`.
- `specs/12_testing/test_strategy.md` — `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- `docs/MASTER_PLAN.md` — `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`.
- `docs/REPOSITORY_GOVERNANCE.md` — `887bfa8b5b72e589a1b7000b5b068226c553c9efa9f5c037bbd8d2c048eaf90e`.
- `docs/governance/provenance-verification.md` — `0410af4ac9a261f79cb154e05ce55e96fadd47beeeb22faeee692e801341ff69`.
- `tasks/queue.yaml` — `f832f8ed1999a93513a0f1e7f27e0875c7487ad1d8739366c35330515b60aeb5`.
- `tasks/recovery/RECOVERY-HISTORICAL-ERRATA-VALIDATOR-008.yaml` — `b28d1b4f8338ccf821acfc0447df3bd417dd0da760c5a74c448cdf4e82ed15d9`.
- `docs/handoffs/RECOVERY-HISTORICAL-ERRATA-VALIDATOR-008.md` — `3d537cf77a3771bf6476a9cf5934d745e8fe2f9951884bc2428347d5dc266434`.
- `scripts/ci-gate-validator.mjs` — `22af6b8133ee509e08080f1ee94e2db97bac230a4416f103eaef2d27e5972264`.
- `scripts/ci-gate-validator.test.mjs` — `2942cd8005af23dd28af0ab11a5d49f78a3cec2876c6548fded82f3442f48975`.

## Acceptance and security evidence

1. Clean-port provenance is proven by the exact two-parent chain and confined
   range above. The previously rejected 007 candidate is not an ancestor.
2. `validateExternalHistoricalEvidence` requires exactly `purpose`, `commit`,
   `path`, `sha256`, and `availability`; rejects non-lowercase 40-hex commits
   and 64-hex digests; requires the exact availability label; resolves the
   source; and compares SHA-256 against `git show <commit>:<path>` raw bytes.
3. Portable containment is explicit, not host-default: the predicate evaluates
   both `path.posix.isAbsolute` and `path.win32.isAbsolute`, then rejects
   colon/NUL values and every empty, dot, or parent component after splitting
   on both slash styles. Direct observations were `/abs` → POSIX and Win32
   absolute/failed; `C:\drive`, `\\server\share\file`, and `\root` → Win32
   absolute/failed; and both `a\..\b` and `a/../b` → failed even though neither
   absolute predicate is true.
4. Git is invoked only through `spawnSync("git", ["-C", directory, ...args])`
   with fixed arrays, `encoding: null`, timeout, and no shell. A semicolon
   payload was treated as a nonexistent Git path, not executed.
5. No tenant, customer, financial, provider, credential, or raw payload is
   introduced. This validator handles recovery provenance only; it cannot
   disclose or authorize tenant data, and no runtime tenant behavior changed.

## Commands and results

- `npm ci --ignore-scripts` — passed; npm reported one pre-existing moderate
  dependency advisory, with no lifecycle scripts executed.
- `node --test scripts/ci-gate-validator.test.mjs` — passed: 11 passed, 0
  failed. Includes valid evidence, source, digest, schema, availability,
  injection, POSIX/Windows absolute, UNC, rooted-backslash, traversal, dot,
  empty, repeated/mixed separator, colon, and uppercase-commit cases.
- Independent direct Node adversarial harness — passed. It exercised valid raw
  blob hashing plus `/abs`, drive, UNC, rooted backslash, both/mixed traversal,
  dot, empty/repeated components, colon, NUL, malformed schema, source,
  uppercase/mismatched digest, availability, uppercase commit, and shell
  metacharacter path. It recorded explicit `path.posix` and `path.win32`
  observations rather than relying on Windows host defaults.
- `npm test` — passed: 873 passed, 0 failed, 1 documented opt-in skip (874
  total).
- `git diff --check 4c13247..0c623b5` — passed.
- Literal governed raw-blob command — passed for
  `0e820b7edaf6e7550e3957126315b7e24d1192a7:docs/reviews/RECOVERY-HISTORICAL-ERRATA-VALIDATOR-003-QA.md`:
  `7777e620199e75c71491d152a5fecb98356cd7739a8b5402e9763867dd568e4b`.
- `npm run traceability:check` — expected exit 1 from unrelated recovery
  baseline defects only: eight `RECOVERY-CI-GATES-001` source-digest
  mismatches, malformed `RECOVERY-QUEUE-VALIDATION-001` provenance, and absent
  `docs/MASTER_PLAN_TRACEABILITY.md`. The candidate did not conceal or alter
  those failures.

## Findings, limits, and disposition

No candidate-specific defect was found. This corrects the prior high-severity
host-default UNC/rooted-backslash bypass with portable semantics and a direct
cross-platform test observation. Replay/idempotency, migration, rollback, and
tenant-isolation behavior are not applicable to this non-product, read-only
validation function; negative authorization/cross-tenant testing has no
runtime surface here. The pre-existing traceability and queue/governance
failures remain blocking recovery work and must not be inferred resolved.

Rollback/corrective-forward: the supervisor may integrate only the accepted
implementation and this distinct QA evidence after range/provenance review. If
a defect is later found, revert that integrated clean-port change or create a
new role-bound corrective-forward candidate and fresh independent QA review;
do not rewrite, amend, delete, or force-push historical evidence.
