# Independent Codex QA/Security Review — RECOVERY-TRACEABILITY-BUNDLE-TOPOLOGY-031-R2

## Verdict

**ACCEPT.** The committed corrective range through `b93579cfe476f0fa4937e51c4a5928155f9fb911` satisfies the bounded repository-control acceptance criteria. It is eligible for supervisor integration and hosted CI validation. This is an independent Codex QA/Security review, not a human review and not a GitHub PR approval.

## Reviewer provenance

- Task: `RECOVERY-TRACEABILITY-BUNDLE-TOPOLOGY-031-R2`, superseding the prior rejected topology candidates.
- Role: Independent Codex QA/Security; role file `agents/QA_SECURITY.md`, SHA-256 `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Agent thread: `/root/qa_traceability_bundle_topology_031_r2`.
- Worktree / branch: `C:\source\upfs-qa-traceability-bundle-topology-031-r2` / `recovery/qa-traceability-bundle-topology-031-r2`.
- Committed candidate state: implementation `405763503fc1c9bbdd3d89ee27f70d451412f80b`; corrective fixture commit `76e86e74318e7529e58287c2c3f73be5adca36b2`; author handoff commit `b93579cfe476f0fa4937e51c4a5928155f9fb911`.
- QA owns only this review file; implementation, task input, workflow, manifest, bundle, and validator were not edited.

## Governing inputs loaded

- `AGENTS.md` — `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`.
- `agents/QA_SECURITY.md` — `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- `agents/WORKTREES.md` — `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`.
- `agents/HANDOFF_TEMPLATE.md` — `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- Constitution — `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- CI/CD specification — `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`; security baseline — `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`; test strategy — `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- Structured input `tasks/recovery/RECOVERY-TRACEABILITY-BUNDLE-TOPOLOGY-031.yaml` — `12521f61b626827ffac829bd5adc140123ed36cce4d24558d88a29fc5e76c99b`.
- Author handoff `docs/handoffs/RECOVERY-TRACEABILITY-BUNDLE-TOPOLOGY-031.md` — `9ed8f14d0d05d048ce07ef6e4a8c089e0ff8e2db3ac566b0272a948034e10f83`.
- Validator `scripts/ci-gate-validator.mjs` — `6e17cf1c50862cef5db465106e4470f3c57f5a75d26593af52e4842ab41f72a2` (unchanged by the candidate); test `scripts/ci-gate-validator.test.mjs` — `43b303719c301141d37dc9a7f173f85987eb28e96c7efe9e34b78ad6ed2fc539`.

## Acceptance and security evidence

- `historical-provenance-v2.bundle` SHA-256 is exactly `7eff5f697a06a7e163f539976d6a8f17e4dab9e2b157a4b53abc335af7c93b46`, matching manifest `scripts/fixtures/historical-provenance-v2.json` (`802b533be620d697349b77e33c9878cba941c2ef738ab1b6d2be75e5f566fbaa`). `git bundle verify` passed and advertised exactly 29 refs under `refs/bundle-build/traceability-v2/`.
- Independently derived final handoff topology from the committed state: 31 declared candidates when including this recovery candidate itself; 27 are unavailable and equal the 27 `handoff-candidate` manifest refs; three previous candidates (`25945425853b4082c3fd78acc487f64caa4f75e1`, `b1bec9e38589a93842f0078e000c03c3e9684490`, and `c3776d718da1e175c379e0ffa881e7597662bc10`) are authoritative-branch ancestors; the current implementation `4057635...` is also reachable and correctly excluded. The remaining two refs are exactly the declared erratum sources `4ae7e95f0af88e21dde526be44443846a8d8d9a6` and `e7c81bf1a38726e0ac8ebf84c969219c21758aea`.
- The committed-base/candidate fresh topology regression passed: a clean authoritative clone fails closed before hydration, then validates only after fetch of the local v2 named refs. It verifies manifest digest/identity, prohibits any reachable candidate in the historical manifest, and uses no working-tree diff.
- Post-hydration negative tests passed: corrupting current TASK-0123 provenance digest remains rejected; copying an erratum marker to that current handoff remains rejected. The authoritative-topology historical-errata hydration regression also passed with the v2 refspec.
- Diff inspection confirms no change to `scripts/ci-gate-validator.mjs`, no queue/product/runtime/tenant behavior change, no customer, financial, credential, or secret data, and no network operation after checkout beyond the standard checkout/dependency installation. Workflow hydration is a local fixture fetch only.
- `git status --porcelain=v1` and `git ls-files --others --exclude-standard` were empty after QA commands; `node_modules` is ignored and no untracked dependency artifact is relied upon.

## Commands and results

- `npm ci --ignore-scripts` — PASS; existing audit reported one moderate dependency advisory, no remediation performed in this scoped QA.
- `git bundle verify scripts/fixtures/historical-provenance-v2.bundle` and SHA-256 comparison — PASS.
- `node --test --test-name-pattern "complete immutable provenance bundle|historical errata validate on authoritative topology only after immutable fixture hydration" scripts/ci-gate-validator.test.mjs` — PASS, 2/2, 83.7 s.
- `npm test` — PASS, 930 passed / 0 failed / 1 documented opt-in embedded-PostgreSQL skip (931 total), 172.8 s.
- `npm run validate`, `npm run ci:gates`, `npm run traceability:check`, `git diff --check` — PASS.

## Limitations, rollback, and promotion conditions

- This is immutable historical Git-object transport and CI evidence repair only. It is not a production capability, release-ready claim, branch-protection verification, or GitHub approval.
- Hosted GitHub validation/security checks remain required after supervisor integration and push. Any failure requires a separate corrective-forward branch, fresh independent QA, and re-review; do not amend, reset, force-push, delete history, or weaken traceability validation.
- No tenant-isolation surface changed; tenant authorization, replay, audit, and runtime rollback tests are not applicable beyond proving that this scoped change does not alter them.
