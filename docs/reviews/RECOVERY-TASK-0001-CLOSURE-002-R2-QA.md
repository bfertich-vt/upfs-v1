# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R2

## Disposition

**REJECTED** for exact candidate `f87ded3f58d935d6d8f829992772effb98c70e7d`.

The candidate must not be pushed, merged, used as accepted closure evidence, or
used to advance `TASK-0002`. Preserve this review and correct forward from this
exact candidate with a fresh independent review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Worktree: `C:\source\upfs-qa-task-0001-closure-r2`.
- Branch: `qa/task-0001-closure-r2`, created directly at exact candidate
  `f87ded3f58d935d6d8f829992772effb98c70e7d`.
- Corrective base: preserved rejection
  `42186a5aa562ba2af872c625e42210b8b3926808`; merge base is exactly that
  commit. Rejected implementation `eee8ead8672980a85f4e653e2e7b4af4ad3d49b8`
  and candidate `9203e1bf014e9c121e52a7dfcd3815ba8cc12446` remain ancestors.
- Reviewed implementation: `1cd6c3da04a1b4f3dbdd9b8a702608cf9377afb1`;
  reviewed r2 handoff commit: `f87ded3f58d935d6d8f829992772effb98c70e7d`.
- Inputs read completely: the r2 task and every named input, the complete prior
  rejection, implementation commit and diff, r2 handoff, validator and tests,
  governance, constitution, CI/CD, security, and test-strategy requirements.

## Blocking finding

### High: explicit negation and rejection prose still passes as ACCEPTED

`acceptedVerdict()` recognizes one bold `Verdict: ACCEPTED` marker and only
rejects a narrow set of separately bold rejection markers. It does not establish
that the accepted sentence is unnegated, and it ignores ordinary-language denial
or rejection on the same or following line. This violates the r2 acceptance
criterion requiring exactly one **unnegated** accepted verdict and leaves the
prior ambiguous/negated-verdict substitution open.

Independent reproduction against the exported parser at exact candidate
`f87ded3` used candidate `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`:

| Review body mutation                                                                       | Observed result |
| ------------------------------------------------------------------------------------------ | --------------- |
| `**Verdict: ACCEPTED** for exact candidate \`<sha>\`, but this candidate is not accepted.` | `true`          |
| `**Verdict: ACCEPTED** for exact candidate \`<sha>\`; approval is denied.`                 | `true`          |
| Accepted marker followed by `This review rejects the candidate.`                           | `true`          |

All three must return `false`. Because the closure record relies on this parser,
an immutable review blob can explicitly deny acceptance while satisfying the
machine gate. The authored parser test checks a separately bold `**REJECTED**`
line and duplicate accepted markers, but does not cover these negated or
ordinary-language rejection forms.

Required remediation:

1. Replace the permissive prose scan with a canonical, closed-form verdict line
   whose complete syntax binds the exact 40-character candidate and permits no
   trailing qualification.
2. Reject any additional acceptance/rejection/disposition marker or conflicting
   verdict language in the review artifact; document the exact accepted grammar.
3. Add negative tests for same-line negation, denial, ordinary-language rejection,
   ambiguous qualification, extra verdict text, wrong candidate, and duplicate
   verdicts, plus one positive canonical form.
4. Rerun every required gate and obtain a fresh isolated review of the new exact
   candidate. Do not weaken topology, evidence, hosted-ID, timestamp, PR-token,
   path-containment, or formatting checks.

## Adversarial and invariant results

- The focused mutation suite passed 14/14 and independently exercised stale
  reviewed-candidate substitution, candidate/review equality, non-direct review
  topology, pre-seeded review, separately marked rejected/ambiguous verdicts,
  unrelated/generic/duplicate/outside-chain acceptance evidence, invalid or
  duplicate hosted IDs, malformed/noncanonical timestamps, and PR `#15` versus
  `#150`. Those authored controls fail closed, but the additional verdict prose
  mutations above do not.
- Traversal, symlink escape, extra keys, cross-task mismatch, incomplete
  dependencies, unsupported completion of another task, and formatting-gate
  mutations fail closed in the focused suites.
- `tasks/queue.yaml`, the historical matrix, and `TASK-0001.json` are byte-for-byte
  unchanged across `42186a5..f87ded3`. `recovery_freeze: true`; every
  `TASK-0002` through `TASK-0110` row remains `blocked`; `TASK-0112` through
  `TASK-0123` remain untouched and blocked.
- The net diff is limited to eight authorized governance/validator/test/task/
  handoff files. No queue, matrix, closure evidence, product, runtime, contract,
  migration, tenant, authorization, or financial behavior changed. No validation
  gate was weakened.

## Independent commands and results

| Command                                                                                                                            | Result                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm ci --ignore-scripts`                                                                                                          | Pass; 106 packages added, 107 audited, zero vulnerabilities.                          |
| `node --test scripts/queue-validator.test.mjs scripts/historical-closure-validator.test.mjs scripts/closure-format-check.test.mjs` | Pass; 14/14.                                                                          |
| Independent `acceptedVerdict()` adversarial runner                                                                                 | **Fail**; all three explicitly negated/denied/rejected review bodies returned `true`. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                                                    | Pass; 263 Markdown, 65 JSON contracts, 5 YAML contracts.                              |
| `npm run format:check`                                                                                                             | Pass; pinned Prettier set plus closure structural gate.                               |
| `npm run validate`                                                                                                                 | Pass.                                                                                 |
| `npm run queue:check`                                                                                                              | Pass.                                                                                 |
| `npm run traceability:check`                                                                                                       | Pass.                                                                                 |
| `npm test`                                                                                                                         | Pass; 939 total, 938 passed, 0 failed, 1 documented opt-in skip, 290.3 seconds.       |
| `npm audit --audit-level=high`                                                                                                     | Pass; zero vulnerabilities.                                                           |
| `git fsck --full --strict`                                                                                                         | Pass; only dangling unreachable objects reported.                                     |
| `git diff --check 42186a5..f87ded3`                                                                                                | Pass.                                                                                 |
| Topology, protected-file, freeze/status, and exact net-diff checks                                                                 | Pass.                                                                                 |

An initial full-suite invocation was given an inadequate five-second command
timeout and was terminated without a result or tracked change. It was immediately
rerun with an adequate timeout and passed as recorded above.

## Final verdict

**Verdict: REJECTED** for exact candidate
`f87ded3f58d935d6d8f829992772effb98c70e7d`.

The green repository gates do not override the independently reproduced
fail-open acceptance-verdict bypass. Preserve all rejected history and correct
forward before any hosted validation, integration, or work on `TASK-0002`.
