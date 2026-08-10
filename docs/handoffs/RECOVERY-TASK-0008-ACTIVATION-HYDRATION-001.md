# Handoff: RECOVERY-TASK-0008-ACTIVATION-HYDRATION-001

- Task and scope: correct the exact hosted Git-object hydration failure from validation run `31384789499`, job `93442681091`, at PR #36 head `8999e7d6ac32747697f56c03e2860eea6f896e9e`; preserve the failure and add only the two exact TASK-0008 QA review commit objects absent from protected activation ancestry.
- Agent role: Backend, exclusively bound to `agents/BACKEND.md`; SHA-256 `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`.
- Agent thread: `/root/backend_task_0008_activation_hydration_r1`. The runtime exposes no native UPFS custom-role field; the initial assignment exclusively bound the documented Backend role and required pre-edit digest proof.
- Worktree and branch: `C:\source\upfs-backend-task-0008-activation-hydration-r1`; `recovery/task-0008-activation-hydration-r1`; exact base `8999e7d6ac32747697f56c03e2860eea6f896e9e`.
- Implementation/task commit: `56404611e70ee532330f5acea7e2a13ab5adb467`. The separate descendant containing this handoff is the QA candidate.
- Files changed: `scripts/fixtures/historical-provenance-v3.json`; generated deterministic `scripts/fixtures/historical-provenance-v3.bundle`; `scripts/ci-gate-validator.test.mjs`; `tasks/recovery/RECOVERY-TASK-0008-ACTIVATION-HYDRATION-001.yaml`; and this handoff only.
- Contracts/migrations: no API, event, schema, persistence, index, deployment, workflow, or product contract changes.

## Governing inputs and provenance

- `AGENTS.md` `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`; Backend role above; `agents/WORKTREES.md` `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`; `agents/HANDOFF_TEMPLATE.md` `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`; constitution `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`.
- Delivery pipeline `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`; security baseline `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`; testing strategy `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- Validation workflow `caa1b8a53f5f66621537eccbe9543dd10bb55af68b5126bd5cc85b01f0e3bfc9`; starting v3 manifest `478fc713f5abfcb53c59975f4be91eb6da60701903447535ce11c17e1f88ecbd`; starting CI-gate tests `51115064241f85f1936573eb2f435d373edcbdcb43bbaf92135f7573e50683eb`; provenance guide `778cff5812788355856815958d13fbd215d68cff7e24e476d15221eaa49401ba`.
- TASK-0008 closure record `df391e82762bf2b436980314368e04cf67ba1cf1400c09684b101459b625105c`; activation task `170c23286541abe0a03ed8147b4c1e31488a1b2cc4de6764e7eeb145d89e4464`; activation handoff `30c2966fd790507e39987c566558ad1da357af3002e3ba8e99cb6dfe33191718`; activation QA `128784e71eb4c05223a8a6e88a466b19d20512b622a6ea560288cb9785d508e1`.
- Accepted R2 QA artifact `docs/reviews/RECOVERY-TASK-0008-CLOSURE-002-QA.md` SHA-256 `6d6722220170e7679dec03fa6c4a9b67c523bd4069035a6edff078d5e02ab3ca`; preserved rejected R1 QA artifact `docs/reviews/RECOVERY-TASK-0008-CLOSURE-001-QA.md` SHA-256 `a98133b334518dd637c5aa8bc1a151c6461bd5598eb87de81440324ef9486722`.

## Exact derivation and implementation

- Hosted run `31384789499` failed nine assertions. They collapse to two unavailable commit objects: accepted review `0c66fa7006f9cc44053ef3eb8f8d06a941360c43` caused the independent-review, protected-review, parent/tree, and acceptance-evidence failures; rejected review source `44d7f5c769477b78be582831cb4bca0cb757a64c` caused the rejected-review blob/topology failures. Their required candidate and preservation ancestors were already reachable from the activation head.
- Accepted review object derivation is exact: TASK-0008 closure `independent_qa.review_commit` equals `0c66fa7006f9cc44053ef3eb8f8d06a941360c43`; derivation artifact/digest are the accepted R2 QA path and digest above; raw `git cat-file commit` byte SHA-256 is `564d91b62a25a3237f410ce7b882e11995e0c672fb23f3a3366cc90875e9b990`; its sole parent is accepted candidate `facbafdf422033bd2dfbd9b2086fdd9bba12eb0c`.
- Rejected review object derivation is exact: TASK-0008 closure `rejected_reviews[0].review_commit` equals `44d7f5c769477b78be582831cb4bca0cb757a64c`; derivation artifact/digest are the preserved rejected R1 QA path and digest above; raw commit-byte SHA-256 is `612aa58105396ab1f5e824b9296d9c58f5f9984ec42dc8d06f62998a1ec7d38e`; its sole parent is rejected candidate `a296fe5fed7114566e9e5c6419d03828ece10dba`.
- The original 38 advertised refs remain unchanged. Counts are now exactly 34 handoff candidates, two erratum sources, four QA review-evidence commits, and 40 total. The rebuilt bundle advertises exactly those 40 closed refs and has SHA-256 `8751dbbf6ebe7708acd6eb6e385fb948e2b91777b0efa625d4ad23cd7ea924e9`.
- No validator or workflow was edited. The test helper now derives accepted and rejected QA objects from their distinct exact closure fields; an unknown/substituted object returns a validation error instead of attempting an `UNKNOWN.json` path.

## Security, tenant isolation, and negative evidence

- This is immutable Git-object transport only. It adds no source-availability exception, wildcard, semantic bypass, current-record exemption, production claim, tenant/customer/financial data, credential, provider data, or runtime behavior.
- Fresh no-local clones proved both TASK-0008 review objects absent before hydration and present only after digest-verified bundle fetch. The focused transport suite validates exact ref equality, raw object SHA-256, derivation artifact digest and closure binding, bundle digest and integrity, and no local-history leakage.
- Negative cases cover omission and substitution of each new object, altered raw-object digest, wrong derivation, duplicate commit, stale per-kind/total counts, unexpected extra/unknown QA object, corrupt bundle bytes, ref substitution, current TASK-0123 provenance corruption, copied historical erratum misuse, and semantic/provenance bypass.
- Existing current-record, erratum allowlist, exact historic-pair, authorization, tenant-isolation, and leakage semantics are unchanged. No application behavior was modified, so tenant scope is unaffected.

## Tests, results, and preserved failures

- `npm ci --ignore-scripts`: PASS, 106 packages installed, 107 audited, zero vulnerabilities. The first focused run before installation failed with expected `ERR_MODULE_NOT_FOUND: yaml`; no source was changed to conceal it.
- Focused v3 transport: PASS 1/1, zero failure/skip, `86,693.686 ms`. Whole `scripts/ci-gate-validator.test.mjs`: PASS 21/21, zero failure/skip, `251,898.600 ms`.
- Fresh shallow clone at exact implementation commit: both new objects absent before hydration; bundle digest exact; verify PASS; 40 refs hydrated; both new objects present afterward. Running the historical validator in that intentionally shallow clone failed on 391 unrelated historical ancestry objects, demonstrating the shallow environment is stricter than the versioned `fetch-depth: 0` hosted workflow and is not claimed as a candidate failure.
- Fresh full-history, single-branch no-local clone: both new review objects absent before hydration and present after exact bundle fetch. Its historical TASK-0008 invocation then failed on 15 unrelated TASK-0001 side-branch objects because single-branch clone topology is narrower than GitHub Actions `fetch-depth: 0`; the exact hosted failure proves those unrelated objects were available on the runner. Both environmental results are preserved and are not called passes.
- Initial focused fixture run failed because the isolated test fixture did not copy the newly referenced TASK-0008 closure/review derivation files. The fixture was corrected to copy those exact committed inputs. The next run reached the existing unexpected-object mutation and failed by trying to read `UNKNOWN.json`; the helper was corrected to fail closed on an unknown binding without filesystem lookup. Neither correction weakens production validation.
- Remaining exact-candidate gates and their results are recorded below before QA promotion.

## Rollback, limitations, and independent review

- Rollback before integration is a reviewed revert of the bounded implementation/task and handoff commits. After integration, correct forward through a separately assigned and independently reviewed provenance change. Preserve hosted failure run `31384789499`, every fixture/environmental failure above, rejected evidence, and all exact objects.
- This change proves deterministic hosted hydration only. It does not add or prove product capability, production operation, deployment, customer use, external infrastructure, certification, or human review.
- Independent reviewer/result: pending. A distinct QA/Security agent who did not author or remediate this candidate must load `agents/QA_SECURITY.md`, review the exact committed candidate read-only in an isolated worktree, and author only its provenance-complete review artifact with ACCEPT or exact rejection. No push, PR update, merge, TASK-0009 work, or TASK-0112 through TASK-0123 work is authorized by this handoff.
