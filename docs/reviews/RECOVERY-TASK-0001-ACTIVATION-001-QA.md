# Independent QA/Security review: RECOVERY-TASK-0001-ACTIVATION-001

## Disposition

**REJECTED** for exact Stage B candidate
`dd304db0242b4352893b7580596b5907d0569433`.

The activation bindings and adversarial controls passed, but the exact candidate
fails the mandatory pinned-format gate. TASK-0001 must not be merged or treated
as authoritatively closed from this candidate, and TASK-0002 must remain blocked.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated worktree: `C:\source\upfs-qa-task-0001-activation-r1`.
- Exact reviewed candidate: `dd304db0242b4352893b7580596b5907d0569433`.
- Exact accepted Stage A base: `b5065a9df57e4c915d25ae0f4ffdd097a8841e6d`.
- Implementation commit: `150164b16bacf3a0c4761473a721a869b58ee31f`,
  with sole parent equal to the Stage A base; the handoff-only candidate has the
  implementation commit as its sole parent.
- Net candidate diff: exactly the seven declared activation implementation paths
  plus the activation handoff.

## Blocking finding

### QA-ACTIVATION-001: the exact candidate fails pinned formatting and its targeted fixture misses the changed task

- Severity: High for release governance (mandatory gate failure).
- Exact reproduction:
  `npm run format:check`
- Actual result:
  `tasks/recovery/RECOVERY-TASK-0001-ACTIVATION-001.yaml is not formatted by pinned Prettier.`
- Independent confirmation:
  `npx prettier --check tasks/recovery/RECOVERY-TASK-0001-ACTIVATION-001.yaml`
  reports code-style issues. The formatter expands the long inline `inputs` list
  into the repository's canonical multiline YAML form.
- Coverage gap: `scripts/closure-format-check.mjs` lists the activation task as a
  formatting candidate, but `fixture()` in
  `scripts/closure-format-check.test.mjs` does not copy that task into its
  disposable repository. Consequently, the targeted 12/12 suite passed while
  the production formatting command rejected the exact candidate.
- Required corrective-forward remediation: format the activation task with the
  pinned Prettier version; add it to the closure-format fixture; add a
  mutation-sensitive test proving unformatted activation-task YAML fails; keep
  all Stage A evidence bindings, activation state, queue, and matrix semantics
  unchanged; then rerun every mandatory gate and obtain a fresh independent
  review of the new exact candidate.

## Verified controls

- The immutable chain is exact: R18 candidate
  `aaafb17804586738976fd31e1a0a84dda00c2b25`, review
  `0f0e6f360ec2f30d2eb94181e077801134d6c8c9`, and attestation
  `b5065a9df57e4c915d25ae0f4ffdd097a8841e6d` are successive direct-parent
  commits. The attestation commit adds only
  `docs/reviews/attestations/TASK-0001-closure-verdict.json`.
- Attestation SHA-256 is
  `cc23ceeae1e62199e17576e3d11418cd07d7e0076a38ac8af57ff30f9a98bf6c`;
  its exact canonical record binds TASK-0001, the R18 candidate, ACCEPTED, and
  Independent QA/Security.
- Active closure, canonical activation state, TASK-0001 queue completion, and
  the exact ACCEPTED matrix row agree. TASK-0002 remains blocked.
- Targeted adversarial coverage rejected stale/wrong/replayed candidate, review,
  parent, blob, hash, role, verdict, and task substitutions; extra/preseeded,
  modified, deleted, renamed, copied, symlink, gitlink, and interposed-attestation
  forms; rejected-evidence substitution; state/queue/matrix disagreement; dirty
  authority state; filesystem/Git redirection; and premature TASK-0002 completion.
- This governance-only candidate does not change runtime tenant, authorization,
  financial, API, migration, or durable-state behavior.

## Commands and results

| Command                                                                                           | Result                                                                     |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `npm ci --ignore-scripts --offline`                                                               | Pass; 106 packages installed, zero vulnerabilities.                        |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs` | Pass; 12/12 in 89.2 seconds.                                               |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                   | Pass; 297 Markdown, 65 JSON, and 5 YAML files.                             |
| `npm test`                                                                                        | Pass; 948 total, 947 passed, 0 failed, 1 documented skip in 258.5 seconds. |
| `npm audit --audit-level=high --offline`                                                          | Pass; zero vulnerabilities.                                                |
| `git fsck --full --strict`                                                                        | Pass; dangling disposable test objects only.                               |
| Exact-base topology, authorization inventory, `git diff --check`, and clean-state checks          | Pass.                                                                      |
| `npm run format:check`                                                                            | **Fail**; activation task YAML is not pinned-Prettier formatted.           |

## Final verdict

**Verdict: REJECTED** for exact candidate
`dd304db0242b4352893b7580596b5907d0569433`.

Preserve this rejection and correct forward. Do not push, merge, activate
TASK-0002, or create a Stage B acceptance attestation from this review.
