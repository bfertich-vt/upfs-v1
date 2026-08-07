# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R4

## Disposition

**REJECTED** for exact candidate
`77dd5b9305889956538eb2ca46ea281c39225e89`.

Do not create the structured acceptance attestation, activate the closure record,
push or merge this candidate, or advance `TASK-0002`. Preserve this review and
all earlier rejection history, then correct forward and obtain fresh independent
QA/Security review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated worktree: `C:\source\upfs-qa-task-0001-closure-r4`.
- Branch: `qa/task-0001-closure-r4`, created directly at exact candidate
  `77dd5b9305889956538eb2ca46ea281c39225e89`.
- Declared corrective base and exact merge base:
  `5c63996d5e303ece1995671e57d25305a728c27f`.
- Reviewed implementation:
  `263a006aac0a49961d2698e9280c6817c5f20a65`; reviewed handoff candidate:
  `77dd5b9305889956538eb2ca46ea281c39225e89`.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree and handoff guidance; TASK-0001 queue inputs; the r3 rejection;
  r4 task and handoff; closure, formatting, queue, matrix, governance, and test
  changes; engineering constitution; delivery and testing specifications; exact
  Git topology and net diff.
- Threat model: an implementation or activation author may try to substitute an
  older accepted review, introduce unrelated content in a purported QA-only
  commit, interpose an author-controlled commit, pre-seed or redirect an
  attestation, or exploit permissive parsing or repository topology to activate
  an unsupported historical completion claim. Runtime tenant, financial, API,
  migration, and durable-state boundaries are unchanged by this governance-only
  candidate.

## Blocking findings

### High: the required Stage A attestation cannot authorize the reviewed R4 candidate

The mandated attestation for this review must bind
`reviewed_candidate` to exact Stage A candidate `77dd5b9305889956538eb2ca46ea281c39225e89`.
However, `strictReviewTopology()` requires
`independent_qa.reviewed_candidate === remediation.candidate_commit`, and the
TASK-0001 closure record's remediation candidate is the older implementation
candidate `a408443dc7fc866777f83de681ec7688ac35e1ff`.
`validateAccepted()` then validates the attestation against that same old value.

An independent call using the exact canonical JSON produced these results:

```text
{
  "r4_against_r4": true,
  "r4_against_validator_bound_remediation": false
}
```

Thus the exact attestation this review is authorized to create would be rejected
by activation, while an attestation for a candidate this review did not review
would satisfy the content binding. This defeats the two-stage circularity break
and makes the documented activation sequence internally inconsistent.

Required correction: model Stage A closure-mechanism review independently from
the older TASK-0001 implementation/remediation review. The attestation must bind
the exact Stage A handoff candidate reviewed by its narrative review. The active
closure schema and validator must retain the older remediation evidence while
separately and unambiguously binding the Stage A candidate, Stage A review, and
Stage A attestation. Add a positive end-to-end fixture using the real stage
relationships and negative substitutions between those candidate classes.

### High: purported QA-only attestation commits can carry unrelated changes

Delivery governance requires the attestation to be the sole new file in its
commit. `strictAttestationTopology()` instead runs `git diff-tree` with a path
filter and checks only that the attestation appears as `A`. It never validates
the complete commit diff.

An independent temporary-repository reproduction created one single-parent
commit containing both the canonical attestation path and
`unauthorized-change.txt`. Every authored predicate passed while the complete
diff exposed the extra payload:

```text
{
  "sole_parent_predicate": true,
  "no_preseed_predicate": true,
  "targeted_introduction_predicate": true,
  "actual_whole_commit": [
    "A\tdocs/reviews/attestations/TASK-0001-closure-verdict.json",
    "A\tunauthorized-change.txt"
  ]
}
```

This permits an alleged Independent QA attestation commit to smuggle arbitrary
repository changes into the activation ancestry. Required correction: inspect
the whole commit with rename/copy-safe status parsing and require exactly one
entry, exactly `A`, at the canonical attestation path. Add failures for an extra
file, modification, deletion, rename, copy, submodule, and symlink entry.

### High: author-controlled commits may be interposed before attestation

The validator requires only that `review_commit` be an ancestor of
`attestation_parent`; it does not require equality. A review, followed by an
unrelated author-controlled commit, followed by the attestation satisfies both
the ancestry check and the attestation commit's sole-parent check:

```text
{
  "ancestry_predicate": true,
  "sole_parent_predicate": true,
  "direct_parent_of_review": false
}
```

That contradicts the documented sequence in which fresh QA first commits the
narrative review and then adds only the attestation in its distinct commit.
Required correction: require `attestation_parent === review_commit`, as well as
the whole-commit single-file invariant above, and test interposed ordinary and
merge commits fail closed.

### Medium: the candidate modifies a file outside its authorized write set

The exact net diff modifies `scripts/closure-format-check.test.mjs`, but that
path is absent from `authorized_files` in the r4 task. The test is named under
`tests`, which does not grant write authority. Required correction: add the
missing path to a new corrective task's authorized set before modifying it, or
revert that file in the corrective candidate. Do not retroactively alter this
candidate's committed task declaration.

## Acceptance and regression results

- The structural byte grammar itself rejects examples, fences, quotations,
  duplicate objects, malformed/extra/missing keys, wrong task/candidate/role or
  verdict, BOM, invalid UTF-8, prose suffixes, and noncanonical serialization.
- Existing fixtures reject stale digests, old rejected-review substitution,
  malformed hosted IDs and timestamps, queue/matrix mismatches, unsafe paths and
  symlinks, pre-seeding, wrong parent counts, unrelated historical evidence,
  incomplete dependencies, and unauthorized later-task completion.
- `TASK-0001` and its matrix row truthfully remain blocked. `TASK-0002` through
  `TASK-0110` remain blocked. `TASK-0112` through `TASK-0123` remain blocked.
- The rejected active closure record was moved byte-for-byte: old and new Git
  blob IDs are both `8143b8ec00fa3a6ea8f869d785067f8885370f86`.
- Authored green tests do not cover or cure the three reproduced topology and
  candidate-binding failures above.

## Independent commands and results

| Command                                                                                           | Result                                                                                                            |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm ci --ignore-scripts`                                                                         | Pass; 106 packages added, 107 audited, zero vulnerabilities.                                                      |
| `node --test scripts/historical-closure-validator.test.mjs scripts/closure-format-check.test.mjs` | Pass; 3/3 in 58.3 seconds.                                                                                        |
| Exact canonical R4-versus-remediation attestation runner                                          | **Fail**; R4 binding accepted directly but rejected under the activation validator's old-remediation expectation. |
| Whole-commit topology adversarial runner                                                          | **Fail**; attestation plus an unrelated file satisfied every authored topology predicate.                         |
| Interposed-parent topology adversarial runner                                                     | **Fail**; an unrelated commit between review and attestation satisfied ancestry and sole-parent predicates.       |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                   | Pass; 267 Markdown, 65 JSON contracts, 5 YAML contracts.                                                          |
| `npm run format:check`                                                                            | Pass; pinned Prettier and closure-format gate.                                                                    |
| `npm run validate`                                                                                | Pass.                                                                                                             |
| `npm run queue:check`                                                                             | Pass.                                                                                                             |
| `npm run traceability:check`                                                                      | Pass.                                                                                                             |
| `npm test`                                                                                        | Pass; 939 total, 938 passed, 0 failed, 1 documented opt-in skip, 282.6 seconds.                                   |
| `npm audit --audit-level=high`                                                                    | Pass; zero vulnerabilities.                                                                                       |
| `git fsck --full --strict`                                                                        | Pass; only four dangling local objects, no integrity failure.                                                     |
| `git diff --check 5c63996d..77dd5b9`                                                              | Pass.                                                                                                             |
| Exact base, ancestry, freeze/status, relocation, and net-diff inspection                          | Pass except the unauthorized test-file modification reported above.                                               |

## Final verdict

**Verdict: REJECTED** for exact candidate
`77dd5b9305889956538eb2ca46ea281c39225e89`.

No structured attestation was created. Preserve this narrative rejection and
correct forward with explicit Stage A evidence fields, exact direct-parent
binding, whole-commit sole-file validation, and corrected file authorization
before any activation, hosted integration, merge, or work on `TASK-0002`.
