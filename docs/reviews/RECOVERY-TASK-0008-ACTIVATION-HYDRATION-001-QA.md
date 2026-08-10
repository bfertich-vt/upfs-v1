# Independent QA/Security review: RECOVERY-TASK-0008-ACTIVATION-HYDRATION-001

- Verdict: **ACCEPT**.
- Candidate reviewed: `7cb6772ffd74879c28b94784b1d75a1de9d07131` (implementation `56404611e70ee532330f5acea7e2a13ab5adb467`).
- Reviewer role: Independent QA/Security, exclusively bound to `agents/QA_SECURITY.md`; SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Reviewer thread: `/root/qa_task_0008_activation_hydration_r1`. The runtime exposes no native UPFS custom-role field; the assignment exclusively bound this documented role. I did not author or remediate the candidate.
- Worktree and branch: `C:\source\upfs-qa-task-0008-activation-hydration-r1`; `qa/task-0008-activation-hydration-r1`; created directly at the committed candidate and clean before review.
- Review boundary: read-only implementation review. This commit adds only this review artifact; no implementation, manifest, bundle, test, task, queue, workflow, validator, product, contract, or specification file was edited.

## Role and governing-input proof

- `AGENTS.md` SHA-256 `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`; `agents/QA_SECURITY.md` `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`; `agents/WORKTREES.md` `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`; `agents/HANDOFF_TEMPLATE.md` `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- Constitution `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`; CI/CD `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`; security baseline `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`; testing strategy `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- Recovery task `3a9a84e9e98062392337bccbc8739178ba5055c1f6f8b8120aa8a1f7b92416e0`; candidate handoff `0b17f8961cb6c0774106a504a690ae5f215e44db2e536d8871984f419f034698`; validation workflow `caa1b8a53f5f66621537eccbe9543dd10bb55af68b5126bd5cc85b01f0e3bfc9`.
- Candidate manifest `dd27644b877d37ab0d31bce560a6d8351e4b7e2f4246640129663cb68f2bbd10`; candidate CI-gate tests `94ee18a5535dceebf498591f247d3424588471104c795dbe8dac8b60e8a14d60`; unchanged historical validator `e01ddcba59026b2232d2a384d652b84a38b2d69b1df85fc1b47d0398d68e6509`; unchanged historical tests `f756117ed73ea218d6b21654fe377d90fe47adf39cca921a244d818b81babe04`.
- TASK-0008 closure record `df391e82762bf2b436980314368e04cf67ba1cf1400c09684b101459b625105c`; activation task `170c23286541abe0a03ed8147b4c1e31488a1b2cc4de6764e7eeb145d89e4464`; activation handoff `30c2966fd790507e39987c566558ad1da357af3002e3ba8e99cb6dfe33191718`; activation QA `128784e71eb4c05223a8a6e88a466b19d20512b622a6ea560288cb9785d508e1`.

## Scope, derivation, and object identity

- The candidate differs from activation base `8999e7d6ac32747697f56c03e2860eea6f896e9e` in exactly five authorized files: the v3 manifest, generated v3 bundle, CI-gate test, structured recovery task, and handoff. The prohibited validators and workflow are byte-unchanged.
- Hosted run `31384789499`, job `93442681091`, was independently read. Its nine errors reproduce the pre-hydration condition and collapse exactly to unavailable accepted-review commit `0c66fa7006f9cc44053ef3eb8f8d06a941360c43` and rejected-review source commit `44d7f5c769477b78be582831cb4bca0cb757a64c`; no different hosted failure was concealed.
- Accepted object: tree `487cb28e88cbe92c78d7d0f658580da20401cb58`, sole parent `facbafdf422033bd2dfbd9b2086fdd9bba12eb0c`, raw commit SHA-256 `564d91b62a25a3237f410ce7b882e11995e0c672fb23f3a3366cc90875e9b990`, derived from `docs/reviews/RECOVERY-TASK-0008-CLOSURE-002-QA.md` digest `6d6722220170e7679dec03fa6c4a9b67c523bd4069035a6edff078d5e02ab3ca` and the exact current closure binding.
- Rejected object: tree `b8a689419a54abb70c4e75f1d17109cc780f1ba7`, sole parent `a296fe5fed7114566e9e5c6419d03828ece10dba`, raw commit SHA-256 `612aa58105396ab1f5e824b9296d9c58f5f9984ec42dc8d06f62998a1ec7d38e`, derived from `docs/reviews/RECOVERY-TASK-0008-CLOSURE-001-QA.md` digest `a98133b334518dd637c5aa8bc1a151c6461bd5598eb87de81440324ef9486722` and the exact rejected-review closure binding.
- Manifest and bundle form a closed set of 40 refs: 34 handoff candidates, two erratum sources, and four QA-review-evidence objects. `git bundle verify` reports complete history. Bundle SHA-256 is exactly `8751dbbf6ebe7708acd6eb6e385fb948e2b91777b0efa625d4ad23cd7ea924e9`.

## Independent tests and results

- `npm ci --ignore-scripts`: PASS; 106 packages installed, 107 audited, zero vulnerabilities; 4.1 seconds.
- `node --test --test-concurrency=1 --test-name-pattern="v3 provenance bundle" scripts/ci-gate-validator.test.mjs`: PASS 1/1, zero failures/skips; 83.161 seconds.
- `node --test --test-concurrency=1 scripts/ci-gate-validator.test.mjs`: PASS 21/21, zero failures/skips; 241.552 seconds.
- `npm test -- --test-concurrency=1`: PASS 1,027 total; 1,026 pass; 0 fail; one pre-existing opt-in PostgreSQL skip; 2,456.197 seconds.
- `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`: PASS, 375 Markdown/65 JSON/5 YAML; 12.426 seconds.
- `npm run format:check`: PASS, 48 pinned-Prettier files and structural closure; 3.433 seconds. `npm run lint`: PASS; 4.204 seconds.
- `npm run queue:check`: PASS; 12.358 seconds. `npm run traceability:check`: PASS; 28.639 seconds.
- `npm audit --audit-level=high`: PASS, zero vulnerabilities; 1.130 seconds. `git bundle verify scripts/fixtures/historical-provenance-v3.bundle`: PASS; 40 exact refs; 0.150 seconds.
- `git fsck --full --strict`: PASS; only preserved dangling audit objects reported; 13.102 seconds. `git diff --check`, authorized-diff inspection, exact-head check, and clean-worktree check: PASS.

## Negative, security, and tenant-isolation assessment

- The focused test independently executes absence-before-hydration and presence-only-after-digest-verified bundle fetch in an isolated Git fixture with no local-history inheritance. It verifies exact refs, per-kind/total counts, object bytes, derivation artifact digests, closure bindings, and bundle integrity.
- Fail-closed mutations cover omission and substitution of both TASK-0008 objects, altered object digest, wrong derivation, duplicate identity, stale counts, corrupted bundle bytes, unexpected extra/unknown object, ref substitution, local-history leakage, wildcard/unavailable-source behavior, copied historical exception misuse, semantic/provenance bypass, and current TASK-0123/current-handoff corruption. Every mutation was rejected.
- No wildcard, unavailable-source bypass, current-record exemption, or validator weakening was found. Historic exceptions remain exact allowlisted pairs and cannot suppress current or resolvable validation.
- This object-transport-only change introduces no tenant/customer/financial/provider payload, credential, secret, runtime data, authorization behavior, API behavior, or persistence behavior. Existing deny-by-default, tenant-isolation, audit, leakage, and review-independence semantics are unchanged.

## Findings, limitations, and corrective-forward

- Findings: none. All acceptance criteria are traced to independently executed evidence and pass.
- Limitations: acceptance proves deterministic immutable-object hydration and fail-closed validation only. It is not proof of product capability, production operation, deployment, certification, customer use, external infrastructure, or human review. The single PostgreSQL skip is the repository's pre-existing opt-in integration test and is not claimed as executed coverage here.
- Promotion requirement: the supervisor must attach this sole-file attestation to the accepted candidate, rerun integrated-head gates, push through a protected pull request, require validation and security on that exact head, inspect retained artifacts, and merge only if both succeed.
- Rollback/corrective-forward: preserve hosted failure `31384789499`, all candidate/review commits, and this attestation. Before integration, revert only the bounded candidate lineage; after integration, correct forward through a separate implementation and fresh independent QA. TASK-0009 and TASK-0112 through TASK-0123 remain frozen.
