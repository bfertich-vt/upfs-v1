# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002

## Disposition

**REJECTED** for integration.

This verdict applies only to exact candidate `9203e1bf014e9c121e52a7dfcd3815ba8cc12446` on protected base `daeb6d9f4c04800e453ee92a91d8f69ef3138c3a`. The candidate must not be pushed, merged, or used to advance `TASK-0002`. A corrective-forward candidate requires fresh independent review.

## Review provenance and boundary

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Worktree: `C:\source\upfs-qa-task-0001-closure-r1`.
- Branch: `qa/task-0001-closure-r1`, created directly at exact candidate `9203e1b`.
- Comparison: `daeb6d9..9203e1b`; merge base is exactly `daeb6d9`.
- Preserved rejected history: `eee8ead8672980a85f4e653e2e7b4af4ad3d49b8` is an ancestor of `9203e1b`. The corrective commit restores `scripts/queue-validator.test.mjs` byte-for-byte to the protected base and reduces the net queue-validator change to four additions and two deletions. The remaining net range is ten task-scoped governance, evidence, validator, test, queue, matrix, and handoff paths. No product, runtime, contract, migration, tenant, authorization, or financial path changes.
- Inputs inspected: `AGENTS.md`; `agents/QA_SECURITY.md`; `agents/WORKTREES.md`; `agents/BACKEND.md`; `agents/HANDOFF_TEMPLATE.md`; the `TASK-0001` queue record and historical evidence; closure/revalidation tasks and handoffs; both prior TASK-0001 revalidation QA reviews; reclassification and closure-matrix governance; delivery governance; closure JSON and retained hosted validation report; the original TASK-0001 handoff; master plan; engineering constitution; delivery, security, and testing specifications; all changed validator/test/docs; and the complete commit topology and net diff.

## Blocking findings

### High: an accepted QA review can bind a different, stale candidate

`scripts/historical-closure-validator.mjs` validates that `independent_qa.reviewed_candidate` is mentioned in the immutable review body and is an ancestor of `review_commit`, but never requires it to equal `remediation.candidate_commit`. This defeats the acceptance requirement that the closure bind the independent accepted review to the exact remediation candidate.

Independent reproduction from a shared detached clone of exact `9203e1b`:

1. Leave every queue, matrix, remediation, hosted, merge, artifact, review-commit, and review-blob field unchanged.
2. Change only `independent_qa.reviewed_candidate` in `TASK-0001.json` from `a408443dc7fc866777f83de681ec7688ac35e1ff` to older ancestor `eb74aeb64aecf5289590260f929445eaf96616ea`, which happens to be mentioned in the retained review.
3. Call `validateQueueDocument` against that clone.

Observed result: `{"state":"active","tasks":123}` and `MUTATION_ACCEPTED`. The validator therefore accepts a stale review/candidate substitution. Existing tests do not cover this relationship; their review-commit mutation fails only because the selected commit lacks the review file.

Required remediation:

- Require `independent_qa.reviewed_candidate === remediation.candidate_commit`.
- Require the immutable QA review to be introduced by a distinct review commit after the reviewed candidate, not merely at any non-strict descendant that happens to contain a suitable string.
- Add positive and negative tests for equality, strict topology, stale ancestor/substitute candidate, review pre-seeding, and rejected/negated verdict text.

### High: acceptance evidence is not bound to the accepted review or candidate

Each acceptance mapping currently proves only that an arbitrary immutable artifact contains an arbitrary non-empty excerpt. There is no relationship between acceptance evidence and the accepted QA review, remediation candidate, or criterion. Independent mutation replaced the first criterion's QA evidence with the original historical `docs/handoffs/TASK-0001.md` blob at `8099cf2e` and excerpt `# Handoff report`; validation still returned success. Consequently, the mechanism can claim complete acceptance while supplying unrelated historical text as proof.

Required remediation: define and enforce an unambiguous evidence policy. At minimum, each criterion must bind the exact independently accepted QA artifact/commit and a criterion-specific excerpt, or bind another expressly allowed evidence class whose commit is proven to be in the reviewed candidate topology. Add negative tests for unrelated-but-valid Git blobs, generic excerpts, duplicate evidence reuse, and evidence outside the reviewed candidate/review chain.

### Medium: hosted and protected-merge snapshot types are too permissive

Independent mutations were accepted for all of the following:

- required check `run_id: 0`;
- required check `job_id: -1`;
- duplicate job IDs across the two required checks;
- validation `artifact_id: -1`;
- `protected_merge.merged_at: "2026-99-99Trash"`.

The validator checks integer types, uniqueness only for run IDs, and only a timestamp prefix. These values cannot identify real GitHub observations and contradict the stated exact hosted-evidence binding. The retained snapshot is necessarily offline and cannot independently prove that GitHub supplied its facts; delivery governance discloses that limitation, and the current record's repository/head/check/tree/content bindings are internally coherent. Nevertheless, basic identifier and timestamp validity must fail closed.

Required remediation: require positive safe integers for PR/run/job/artifact IDs, unique run and job IDs, and a strictly parseable canonical RFC 3339 timestamp. Strengthen the PR-subject match from substring matching to an unambiguous `#<PR>` token so `#15` cannot match `#150`. Add mutations for each condition. Preserve the disclosure that archive/API authenticity is an inspected snapshot and cannot be re-established offline merely from a syntactically valid recorded digest.

### Medium: changed-file formatting gate is incomplete and currently red

The package `format:check` command passes because it does not include the newly added closure validator/tests, closure task/handoff/evidence, delivery governance, or the changed closure matrix. A targeted Prettier check across every new or changed text file fails on `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md`. This contradicts the requested all-new-file formatting verification and means the ordinary formatting gate cannot detect this drift.

Required remediation: format the matrix without reintroducing whole-file mechanical churn, or explicitly establish and validate a stable formatting exclusion appropriate for its generated/pipe-table representation. Extend a committed formatting gate so newly added governance/validator files cannot silently escape checks.

## Threat-model results

- Path containment: repository-relative lexical traversal and unexpected top-level keys failed closed in independent mutations. `safePath` resolves filesystem links and requires the real target to remain under the real repository root and be a regular file. Immutable Git paths use strict commit SHAs, reject absolute/traversal paths, and invoke Git without a shell.
- SHA/commit/blob binding: current task, handoff, review, historical evidence, validation-content digest, merge tree, base parent, and reachability bindings resolve against repository Git objects. The actual `TASK-0001` record is internally consistent, but the missing cross-field candidate and evidence relationships above remain decisive.
- QA independence: the artifact records a prior independent review and accepted verdict, but the new validator does not enforce candidate equality or strict review topology and cannot by itself establish reviewer identity. It must not claim stronger independence than it can verify.
- Hosted checks: exactly two required names, distinct run IDs, success conclusions, and common exact head are enforced. Positive IDs and distinct job IDs are not.
- Protected squash merge: the current merge is a one-parent commit whose parent equals the recorded base and whose tree equals the hosted head tree. Its subject contains `#15` and the merge is reachable from this candidate. Timestamp and PR-token parsing remain weak as described above.
- Matrix/queue/dependencies: exactly 110 parseable historical rows are required; incomplete tasks must remain blocked; a complete historical task requires a closure record and `ACCEPTED` matrix disposition; closure dependencies must exactly match queue order and be complete. Attempting to mark `TASK-0002` complete without its own record fails. These controls do not cure the stale-review/evidence bypass within a record.
- Scope and rollback: runtime authorization, cross-tenant, idempotency, concurrency, financial, migration, and operational rollback behavior are unchanged and not newly applicable. Governance rollback is corrective-forward only; retain `eee8ead`, `9203e1b`, this rejection, and all pre-existing evidence.

## Independent commands and results

| Command                                                                                      |                                      Duration | Result                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------- | --------------------------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --ignore-scripts`                                                                    |                                       4.694 s | Pass; 106 packages added, 107 audited, zero vulnerabilities.                                                                                                                                                |
| `node --test scripts/queue-validator.test.mjs scripts/historical-closure-validator.test.mjs` |                                      24.005 s | Pass; 12/12. The new closure test's positive fixture and its listed mutations pass/fail as authored, but it omits the blocking substitutions above.                                                         |
| Independent detached-clone mutation runner                                                   | 5.4 s first reproduction; 13.2 s expanded run | Baseline passed; traversal and extra-key mutations rejected; stale reviewed candidate, unrelated criterion evidence, zero/negative/duplicate hosted IDs, and malformed timestamp were incorrectly accepted. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                              |                                       5.273 s | Pass; 261 Markdown files, 65 JSON contracts, 5 YAML contracts.                                                                                                                                              |
| `npm run format:check`                                                                       |                                       1.161 s | Pass, but its hard-coded manifest omits most candidate files.                                                                                                                                               |
| Targeted `npx prettier --check` over every new/changed text file                             |                                       1.994 s | **Fail**: `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md`.                                                                                                                                                         |
| `npm run validate`                                                                           |                                       5.284 s | Pass.                                                                                                                                                                                                       |
| `npm run queue:check`                                                                        |                                       5.060 s | Pass.                                                                                                                                                                                                       |
| `npm run traceability:check`                                                                 |                                      21.913 s | Pass.                                                                                                                                                                                                       |
| `npm audit --audit-level=high`                                                               |                                       1.339 s | Pass; zero vulnerabilities.                                                                                                                                                                                 |
| `npm test`                                                                                   |                                     315.020 s | Pass; 937 total, 936 passed, 0 failed, 1 documented opt-in embedded-PostgreSQL skip.                                                                                                                        |
| `git diff --check daeb6d9..9203e1b`                                                          |                                       0.143 s | Pass.                                                                                                                                                                                                       |
| `git fsck --full --strict`                                                                   |                 9.6 s combined topology check | Pass for integrity; only unreachable dangling objects were reported.                                                                                                                                        |
| Base/candidate topology and net-diff checks                                                  |                                          <1 s | Pass; exact merge base, preserved rejected commit, clean worktree, restored legacy queue test, and minimal net queue-validator diff confirmed.                                                              |

An initial full-suite invocation used a five-second command timeout and was terminated before producing a result. It made no tracked change. The suite was immediately rerun with an adequate timeout and passed as recorded above.

## Verdict and next action

**Verdict: REJECTED** for exact candidate `9203e1bf014e9c121e52a7dfcd3815ba8cc12446`.

Preserve this candidate and review. Correct forward in the implementation worktree without rewriting history: enforce exact remediation-to-reviewed-candidate binding, strict review topology, acceptance-evidence provenance, positive/unique hosted identifiers, strict timestamp and PR-token parsing, and comprehensive mutation tests; resolve the all-changed-file formatting failure without broad legacy churn. Rerun every focused and repository gate, commit a new exact candidate, and obtain a fresh independent QA/Security review before any push, hosted-check run, merge, queue advance, or `TASK-0002` work.
