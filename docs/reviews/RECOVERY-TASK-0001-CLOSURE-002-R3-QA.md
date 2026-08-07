# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R3

## Disposition

**REJECTED** for exact candidate
`b8caf79fcd45be092b5453a5fa74eab97f3a2d9f`.

The candidate must not be pushed, merged, used as accepted closure evidence, or
used to advance `TASK-0002`. Preserve this review and all prior rejected history,
then correct forward and obtain a fresh independent review.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Worktree: `C:\source\upfs-qa-task-0001-closure-r3`.
- Branch: `qa/task-0001-closure-r3`, created directly at exact candidate
  `b8caf79fcd45be092b5453a5fa74eab97f3a2d9f`.
- Corrective base: preserved r2 rejection
  `38e1a192d4509a30fffe950e82f02f9f05de057c`; the merge base is exactly that
  commit. Both earlier implementation candidates and both earlier rejection
  commits remain ancestors.
- Reviewed implementation: `6b2834b1d4cda57fdc75be5d766b5b11ae063bf1`;
  reviewed handoff candidate: `b8caf79fcd45be092b5453a5fa74eab97f3a2d9f`.
- Inputs read completely: `AGENTS.md`; Backend and QA/Security role files;
  worktree and handoff guidance; the full r1 and r2 rejection reviews; r3 task
  and handoff; closure validator, formatting validator, queue integration and all
  focused tests; queue, matrix, closure/evidence and delivery-governance
  artifacts; engineering constitution; delivery, security, and testing
  specifications; exact topology and net diff.

## Blocking finding

### High: the alleged closed verdict grammar remains fail-open

`acceptedVerdict()` recognizes an exact canonical line anywhere in the review
body, including inside a fenced example, and then relies on a small
natural-language blacklist to infer that the line was not contradicted. The
blacklist cannot define a closed grammar. Explicit rejection, denial, and
conflicting structured-marker variants outside its enumerated regular
expressions are accepted.

Independent calls to the exported parser used candidate
`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` and the canonical line
`**Verdict: ACCEPTED** for exact candidate \`<candidate>\`.`. The following
mutations incorrectly returned `true`:

| Mutation after or around the canonical line                                      | Observed |
| -------------------------------------------------------------------------------- | -------- |
| Put the canonical line inside a fenced `markdown` example labeled `Example only` | Accepted |
| Add `**Verdict — REJECTED**`                                                     | Accepted |
| Add lowercase plain text `verdict: rejected`                                     | Accepted |
| Add `We reject the candidate.`                                                   | Accepted |
| Add `This candidate is unacceptable.`                                            | Accepted |
| Add `The exact candidate is not approved.`                                       | Accepted |
| Add `Acceptance is refused.`                                                     | Accepted |
| Add `Approval is withheld.`                                                      | Accepted |
| Add `We deny approval for this candidate.`                                       | Accepted |

These are not obscure semantic guesses: the fenced case proves that the parser
does not establish that the canonical text is a verdict at all, while the
structured-marker variants prove that it does not reject all additional verdict
markers. The prose cases directly contradict acceptance. This violates every r3
criterion requiring exactly one unambiguous accepted verdict and rejection of
denial, rejection, mixed markers, and examples.

Required corrective design:

1. Parse one required machine-readable verdict field from a dedicated,
   structurally identified Disposition/Result section, or use exact frontmatter
   or a separately validated schema. Bind that field to the exact 40-character
   candidate.
2. Tokenize Markdown structure sufficiently to exclude fields found in fenced
   code, block quotes, inline examples, and ordinary prose. Require exactly one
   structured verdict field and reject every additional or conflicting
   structured verdict field regardless of case, punctuation variant, or
   whitespace.
3. Do not use an open-ended natural-language blacklist as the primary acceptance
   boundary. If prose contradiction detection is retained as defense in depth,
   it cannot substitute for the structural rule.
4. Add positive and negative tests for the cases above plus canonical LF/CRLF,
   quotes, code fences, Unicode line separators, wrong case/spacing/candidate,
   duplicate fields, mixed results, and all earlier r1/r2 mutations. Obtain a
   fresh independent review of the new exact candidate.

## Regression, security, and scope results

- The focused 14-test run passed. Its closure fixture continued to reject stale
  candidates, candidate inequality, non-strict review topology, pre-seeding,
  unrelated/generic/duplicate/outside-chain evidence, invalid/duplicate hosted
  IDs, timestamp and PR-token substitutions, path/symlink escapes, extra keys,
  cross-task mismatches, incomplete dependencies, other-task completion, and
  formatting bypasses. The newly reproduced verdict variants are absent from
  that suite and therefore remain decisive.
- Exact case, spacing, trailing whitespace/qualification, wrong candidate,
  duplicate canonical lines, the authored same-line/following-line negation
  cases, and CRLF canonical input behave as authored. Quote and inline-code
  wrappers fail, but a fenced canonical line passes because its line text remains
  exact. Lone-CR and Unicode-line-separator suffix forms tested in this review
  fail; this does not cure the fenced and conflict bypasses.
- `tasks/queue.yaml`, the historical matrix, closure record/evidence, product,
  runtime, contract, migration, specification, tenant, authorization, and
  financial paths are unchanged from the r2 rejection. The exact net range is
  five authorized r3 governance files. `TASK-0002` through `TASK-0110` remain
  blocked; `TASK-0112` through `TASK-0123` remain untouched and blocked.
- This parser-only change introduces no runtime trust boundary. The security
  defect is governance integrity: ambiguous or explicitly rejected evidence can
  be misclassified as independent acceptance and unlock dependency progression.

## Independent commands and results

| Command                                                                                                                            | Result                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm ci --ignore-scripts`                                                                                                          | Pass; 106 packages added, 107 audited, zero vulnerabilities.                             |
| `node --test scripts/queue-validator.test.mjs scripts/historical-closure-validator.test.mjs scripts/closure-format-check.test.mjs` | Pass; 14/14 in 52.2 seconds.                                                             |
| Independent `acceptedVerdict()` adversarial runner                                                                                 | **Fail**; nine fenced/conflicting rejection or denial forms incorrectly returned `true`. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                                                    | Pass; 265 Markdown, 65 JSON contracts, 5 YAML contracts.                                 |
| `npm run format:check`                                                                                                             | Pass; pinned Prettier set plus closure structural formatting gate.                       |
| `npm run validate`                                                                                                                 | Pass.                                                                                    |
| `npm run queue:check`                                                                                                              | Pass.                                                                                    |
| `npm run traceability:check`                                                                                                       | Pass.                                                                                    |
| `npm test`                                                                                                                         | Pass; 939 total, 938 passed, 0 failed, 1 documented opt-in skip, 276.0 seconds.          |
| `npm audit --audit-level=high`                                                                                                     | Pass; zero vulnerabilities.                                                              |
| `git fsck --full --strict`                                                                                                         | Pass; only dangling unreachable objects reported.                                        |
| `git diff --check 38e1a19..b8caf79`                                                                                                | Pass.                                                                                    |
| Exact base, ancestry, protected-path, freeze/status, and net-diff checks                                                           | Pass.                                                                                    |

The first focused invocation occurred before dependencies were installed and
failed only with `ERR_MODULE_NOT_FOUND` for pinned `prettier` and `yaml`; it made
no tracked change. After `npm ci --ignore-scripts`, the exact command passed as
recorded above.

## Final verdict

**Verdict: REJECTED** for exact candidate
`b8caf79fcd45be092b5453a5fa74eab97f3a2d9f`.

Green authored gates do not override the independently reproduced fail-open
acceptance parser. Preserve all history and correct forward before any push,
hosted validation, integration, or work on `TASK-0002`.
