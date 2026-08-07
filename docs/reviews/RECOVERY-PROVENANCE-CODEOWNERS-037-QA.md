# RECOVERY-PROVENANCE-CODEOWNERS-037 Independent QA/Security Review

- Review result: **ACCEPT** for local promotion to exact-head protected hosted checks. This is independent Codex QA/Security review evidence, not human review and not production-capability evidence.
- Task ID: `RECOVERY-PROVENANCE-CODEOWNERS-037`.
- Reviewer role: Independent QA/Security (`agents/QA_SECURITY.md`), SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Reviewer thread ID: `/root/qa_provenance_codeowners_r3`.
- Worktree and branch: `C:\source\upfs-qa-provenance-codeowners-r3`; `codex/qa-provenance-codeowners-r3`.
- Author independence: the reviewer did not author or remediate the candidate and reviewed without modifying implementation, task, handoff, fixtures, tests, workflow, queue, or validator files.
- Base commit: `c7c0917a24f435c3963b86f439228ab00bd8506e`.
- Exact reviewed candidate: `072aad128cc4350c2e3ee183be0a527d9a10b360`.
- Implementation commit: `b4081d0309336b91c4594f36c4933aad5845ad8f`.
- Candidate provenance commits reviewed: `f9634ce361c6a544ddc98e43b04acc30fa580155`, `a8639e745229ad10ecbe15ef3cfa7c9cee24b652`, `61008f556b0cd5d2bb839fd7f2f102a801c0fad0`, and `072aad128cc4350c2e3ee183be0a527d9a10b360`.

## Role and input loading evidence

The reviewer completely read the following before beginning review. Digests are SHA-256:

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`.
- `agents/QA_SECURITY.md`: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`.
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- `specs/09_cicd/delivery_pipeline.md`: `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`.
- `specs/10_security/security_baseline.md`: `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`.
- `specs/12_testing/test_strategy.md`: `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- `tasks/recovery/RECOVERY-PROVENANCE-CODEOWNERS-037.yaml`: `54d4c964ff37697ec4f09c7505964a3f04bf3ecc4a2715d36235650c3cd444d2`.
- `docs/handoffs/RECOVERY-PROVENANCE-CODEOWNERS-037.md`: `9cc9b14fa0aa657721051df670548f95065d2006116197bf6539458c348183c6`.
- Historical bundle inputs `RECOVERY-HISTORICAL-BUNDLE-EXPANSION-034.yaml` and `-034-R2.yaml`: `5a09dca73d4f3eb26746a38c783b529c4b5ad3fe3c4dd265d5fce5c83b7f4260` and `d782f353a8ce854173b445025553fb1f7e132247d71e1d7a1e7c4e7086f62bff`.
- Historical bundle handoffs `RECOVERY-HISTORICAL-BUNDLE-EXPANSION-034.md` and `-034-R2.md`: `ab1ff12075a569fcf9098db0b7efd00fb6feca7f85600ee76efa6f1ede0024d4` and `7cc1505558b1551e3d3b2c1c6f602f4b0b5160498ddf833da743b64a791dc33a`.
- Accepted prior review `RECOVERY-HISTORICAL-BUNDLE-EXPANSION-034-R2-QA.md`: `c386708715451cd19fd95dcd4afb64367732997cac10021cb0b15f393519f1a3`.
- `scripts/fixtures/historical-provenance-v3.json`: `c7939871e914ef8e67942541da5eca9dfd8c36ce0cf0059e1bbfe1a332d89ebf`.
- `scripts/fixtures/historical-provenance-v3.bundle`: `b43326c26b59b89ccae4a46a0dc2f1a47851a10f331b9823f15c11f5ac9c9c02`.
- `.github/workflows/validate.yml`: `95e99b27af915498833b4e41634d88a611d34f245e0a90753eb1eb2a7eb03fc6`.
- `scripts/ci-gate-validator.test.mjs`: `e6f5b5581f58d54dfa53b7a21cb34046cd72b21f8e4f8206d2009da8b541dc7f`.
- `docs/governance/provenance-verification.md`: `778cff5812788355856815958d13fbd215d68cff7e24e476d15221eaa49401ba`.

## Acceptance-criteria trace

1. **Exact CODEOWNERS object transported:** accepted handoff `docs/handoffs/RECOVERY-CODEOWNERS-ROUTING-035.md` names `287b3894147080cb067ad2254869a2cabf998fce`. The manifest binds that exact commit to the handoff digest `4c0d7e8d51a43e70e9eccb46b09af18841bd19af67b1143871f4536dec4afd90`; the bundle advertises the exact handoff-candidate ref. Independent raw commit-byte hashing reproduced `40b096a66004211ef00bb0bd95e85255cc186818051fc034b7868b510ccf8bd5`.
2. **Exact topology:** manifest counts and `git bundle verify` prove 33 handoff candidates plus two erratum sources, 35 refs total. No duplicate manifest commit exists and advertised refs match the manifest exactly.
3. **Deterministic identity:** bundle SHA-256 independently matches `b43326c26b59b89ccae4a46a0dc2f1a47851a10f331b9823f15c11f5ac9c9c02`; every manifest entry remains bound to a Git object identity, raw-object SHA-256, derivation path, and derivation-file SHA-256.
4. **Fresh isolated hydration:** the focused test uses a `--no-local`, depth-one clone through a separate bare repository, proves the CODEOWNERS object is absent before bundle fetch, hydrates only the declared namespace, and validates all handoffs afterward. This prevents reliance on the reviewer's local object database.
5. **Fail-closed negatives:** the independently executed focused adversarial test rejects missing CODEOWNERS object, ref substitution, altered CODEOWNERS digest, stale required counts, corrupt bundle bytes, unexpected extra object, duplicate/mismatched commits, partial hydration, derivation mismatch, local-history leakage, corrupted current `TASK-0123` provenance, and copied historical-erratum semantic bypass. Current and resolvable records remain mandatory.
6. **Frozen history and scope:** v2 manifest and bundle are byte-unchanged from base and its regression checks the exact pre-v3 snapshot. The production validator implementation is unchanged. The bounded diff contains no queue, product, closure-matrix, ADR, or TASK-0112 through TASK-0123 changes; references to `TASK-0123` are adversarial current-record validation only.

## Independent commands and results

- `npm ci --ignore-scripts`: PASS, 106 packages installed, 4.7 seconds. One existing moderate `yaml` advisory was reported.
- `node --test --test-name-pattern "v3 provenance bundle" scripts/ci-gate-validator.test.mjs`: PASS, 1/1, 82.6 seconds.
- `npm test`: PASS, 931 passed, 0 failed, 1 documented opt-in embedded-PostgreSQL skip, 932 total, 252.9 seconds.
- `npm run validate`: PASS, 4.4 seconds.
- `npm run queue:check`: PASS, 4.9 seconds.
- `npm run traceability:check`: PASS, 22.4 seconds.
- `npm run ci:gates`: PASS, 0.7 seconds.
- `npm audit --audit-level=high`: PASS, 1.8 seconds; the existing moderate `yaml` advisory remains below the configured high-severity failure threshold.
- `git bundle verify scripts/fixtures/historical-provenance-v3.bundle`: PASS, 35 refs and complete history, 0.1 seconds.
- `git fsck --strict --no-reflogs`: PASS, 1.3 seconds; preserved dangling historical audit objects were reported, with no corruption.
- `git diff --check c7c0917a24f435c3963b86f439228ab00bd8506e..072aad128cc4350c2e3ee183be0a527d9a10b360`: PASS, 0.1 seconds.
- `git diff --exit-code c7c0917a24f435c3963b86f439228ab00bd8506e -- scripts/fixtures/historical-provenance-v2.json scripts/fixtures/historical-provenance-v2.bundle`: PASS; frozen v2 artifacts are unchanged.

The first focused-test invocation failed before review execution because the new isolated QA worktree did not yet contain dependencies (`ERR_MODULE_NOT_FOUND: yaml`). It is preserved as environment-bootstrap evidence; after the declared `npm ci --ignore-scripts`, the exact command passed. No candidate failure was repaired or hidden by QA.

## Security, tenancy, and failure analysis

The candidate strengthens immutable transport without adding a wildcard, unavailable-source exception, allowlist expansion, current-record waiver, semantic suppression, or validator bypass. Exact identities and digests fail closed. Full authorization, cross-tenant, idempotency, replay, audit, rollback, failure, leakage, policy, prompt, accessibility, and contract coverage remained green in the repository suite. Tenant isolation is not directly applicable to repository-local immutable Git metadata, because no tenant-controlled runtime data path exists; unchanged tenant-isolation tests nevertheless passed. Review found no added secret, credential, customer data, private financial data, provider traffic, or production configuration.

Rollback must be corrective-forward: revert this bounded candidate only through a separately reviewed branch while preserving previous bundles, failures, commits, handoffs, branches, and hosted-run evidence. No history rewrite, force push, evidence deletion, or validation weakening is acceptable.

## Findings, limitations, and promotion decision

No acceptance-blocking finding was identified. Local independent review accepts exact candidate `072aad128cc4350c2e3ee183be0a527d9a10b360`. Exact-head hosted `repository-validation` and `repository-security` checks remain external prerequisites before protected integration. This review does not assert human approval, production capability, release readiness, deployment, provider connectivity, or certification.
