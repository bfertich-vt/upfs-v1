# RECOVERY-QUEUE-VALIDATION-001 v8 handoff

- Task and scope: `RECOVERY-QUEUE-VALIDATION-001` is a clean corrective-forward repair of the repository queue and provenance validator. It creates no product capability and makes no historical completion claim.
- Agent role: Backend
- Role-file path and digest: `agents/BACKEND.md`; SHA-256 `94836c3f25375688f0e8c47b55b6997a4ba688ab819930a686b676183a980faa`.
- Agent thread ID: `/root/backend_queue_control_plane_v8`.
- Worktree and branch: worktree `C:\source\upfs-recovery-queue-validation-001-v8`; branch `recovery/queue-validation-001-v8`.
- Commit: `2ec8213fe000a0b78c68c588eb10768a39116be3`, based directly on `4630889eb8cae3e598703704125c1437058fe618`.
- Files changed: `tasks/queue.yaml`; `scripts/queue-validator.mjs`; `scripts/queue-validator.test.mjs`; `scripts/validate-repository.mjs`; `tasks/recovery/RECOVERY-QUEUE-VALIDATION-001.yaml`; `docs/handoffs/RECOVERY-QUEUE-VALIDATION-001.md`.
- Specifications and contracts read: `AGENTS.md`; `agents/BACKEND.md`; `agents/WORKTREES.md`; `agents/HANDOFF_TEMPLATE.md`; `specs/00_constitution/engineering_constitution.md`; `specs/09_cicd/delivery_pipeline.md`; `specs/12_testing/test_strategy.md`; `tasks/queue.yaml`; and the v7 candidate, task input, validator, tests, repository validator, and handoff.
- Acceptance criteria: The entire queue must structurally parse and aggregate malformed records; TASK-0035 through TASK-0040 indentation is repaired; completed tasks require correctly named, substantive, exact, non-duplicated template/provenance fields with an Independent QA/Security PASS; TASK-0021, TASK-0022, and TASK-0109 fail closed for the named evidence gaps; lexical and realpath containment protect task inputs and exact-name handoffs.
- Tests and commands run: `npm.cmd ci --ignore-scripts` completed (npm reported one moderate dependency vulnerability); `node --test scripts/queue-validator.test.mjs` completed with 10 passed/0 failed; the structured task input parsed with `yaml.parseDocument` and reported `task-input-yaml-valid`; `node scripts/validate-repository.mjs .` exited 1 as expected with valid YAML and 2,921 retained historical validation violations; `npm.cmd test` completed with 841 passed/0 failed/1 opt-in skipped; and `git diff --check` completed without output.
- Negative tests: malformed YAML; bad IDs/statuses; scalar/object/mixed dependencies; missing dependency; dependency cycles; early-ready state; missing/misnamed TASK-0021 and TASK-0022 handoffs; every template label blank; every template label duplicated with blank, placeholder, or contradictory text; TASK-0109 handoff Markdown/file-existence pseudo-test evidence; task-input traversal; external input symlink; external exact-name handoff symlink; and a regression that requires all six candidate files in this handoff inventory.
- Contracts/migrations: No API, event, schema, database, or migration contract changes.
- Security and tenant-isolation analysis: This is repository metadata validation only and changes no product or tenant runtime behavior. Inputs and exact handoffs must be repository-relative, lexical-contained, realpath-contained files; symlink or reparse resolution outside the repository fails before content is read. The validator does not invent historical provenance.
- Audit/evidence behavior: The validator aggregates every discoverable queue and completed-task violation, retains it in `artifacts/validation-report.json.errors`, and fails closed. Current historical violations remain evidence of untrusted legacy records, not new proof.
- Results: Focused and full repository tests passed. The direct repository validator correctly fails closed on legacy queue/handoff defects after confirming YAML structure. Independent QA/Security review remains required; no PASS is claimed.
- Rollback/corrective-forward plan: Revert only this candidate by a separately reviewed corrective commit. Preserve the original queue, historical handoffs, branches, and all validation artifacts; correct individual historical records in separately authorized recovery tasks.
- Documentation updated: Added the structured recovery task input and this handoff; repaired only the six malformed queue status indents.
- Known risks and follow-ups: Existing completed task records lack structured sources, inputs, acceptance criteria, correctly named handoffs, and proven independent review. They must be independently reclassified and repaired through the recovery plan before any production claim.
- Known limitations: The control exposes historical deficiencies but deliberately does not fabricate evidence, reclassify tasks, alter product behavior, or resolve descriptor-level time-of-check/time-of-use races for a hostile concurrent filesystem writer.
- External prerequisites: Independent QA/Security review from a separate clean review worktree.
- Independent reviewer and review result: Pending fresh Independent QA/Security review; no PASS is claimed.

## Git-bound provenance erratum v1 — RECOVERY-HISTORICAL-TRACEABILITY-ERRATA-PARSER-003

- Original handoff path: `docs/handoffs/RECOVERY-QUEUE-VALIDATION-001.md`.
- Original handoff source commit: `e7c81bf1a38726e0ac8ebf84c969219c21758aea`.
- Original candidate commit: `2ec8213fe000a0b78c68c588eb10768a39116be3`.
- Original provenance record: `Specifications and contracts read`.
- Reason: `Legacy record lists sources without path digest pairs`.
- Correction provenance: `Git object derivation for immutable queue handoff source`.

| Path | Source candidate | Git blob | Derived SHA-256 |
| --- | --- | --- | --- |
| `AGENTS.md` | `2ec8213fe000a0b78c68c588eb10768a39116be3` | `99e50e2f3590aac292a3608192346fe207765e1e` | `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1` |
| `agents/BACKEND.md` | `2ec8213fe000a0b78c68c588eb10768a39116be3` | `0ff4c7fec07f3e54fb361a399655f7b8981da712` | `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784` |
| `agents/WORKTREES.md` | `2ec8213fe000a0b78c68c588eb10768a39116be3` | `52dee22c57967e8efc1b7ec4b5b29387ede083c1` | `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1` |
| `agents/HANDOFF_TEMPLATE.md` | `2ec8213fe000a0b78c68c588eb10768a39116be3` | `ec9815efb847ad5ef1ac4813957b51ae44b14645` | `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4` |
| `specs/00_constitution/engineering_constitution.md` | `2ec8213fe000a0b78c68c588eb10768a39116be3` | `736626a809bd94d332d696a7b9122f7d69304316` | `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73` |
| `specs/09_cicd/delivery_pipeline.md` | `2ec8213fe000a0b78c68c588eb10768a39116be3` | `4fa6ad4c19b94bda2d5255d65240bdbf9eb246a8` | `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb` |
| `specs/12_testing/test_strategy.md` | `2ec8213fe000a0b78c68c588eb10768a39116be3` | `c3cc9bd303b720b6b6abb58b7d20edb08f9896bf` | `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172` |
| `tasks/queue.yaml` | `2ec8213fe000a0b78c68c588eb10768a39116be3` | `2400cceab2085f8a74672a52cbcb5271a5a003af` | `f832f8ed1999a93513a0f1e7f27e0875c7487ad1d8739366c35330515b60aeb5` |

- Preservation statement: This erratum changes no historical task status, acceptance claim, test result, review state, risk, limitation, production-capability classification, or Independent QA/Security review result.
