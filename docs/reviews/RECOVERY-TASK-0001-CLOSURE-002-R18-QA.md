# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-002-R18

## Disposition

**ACCEPTED** for exact candidate
`aaafb17804586738976fd31e1a0a84dda00c2b25`.

This acceptance is limited to the R18 Stage A corrective control. `TASK-0001`
remains blocked, its structured closure attestation remains absent at the reviewed
candidate, and `TASK-0002` must not advance until a separately reviewed Stage B
activation completes.

## Review provenance and scope

- Reviewer role: fresh independent QA/Security under `agents/QA_SECURITY.md`.
- Isolated detached worktree:
  `C:\source\upfs-task-0001-closure-r18-qa`.
- Exact reviewed candidate:
  `aaafb17804586738976fd31e1a0a84dda00c2b25`.
- Declared corrective base and exact merge base:
  `30cbddf3013f3fc7059bdd9c6dc167bf18fe441f`, the immutable R17 rejection.
- Reviewed implementation commit:
  `a471311875305cbccb3d070794462875ee5b7bd0`, followed by the exact R18 handoff
  commit.
- The candidate is a clean two-commit, single-parent corrective chain and its
  net diff contains exactly the six R18-authorized paths. `TASK-0001` and
  `TASK-0002` remain blocked, and no attestation or activation exists.
- Threat model: a test seam could replace production Git execution, fail to
  capture the exact object-path invocation, or permit malformed, redirected, or
  filesystem-incompatible object-store identities. Inherited Git metadata,
  environment, index, ADS, clean-head, state, matrix, evidence, and attestation
  controls were also re-exercised.

## Acceptance evidence

- With no injected callback, checked Git uses the real sanitized `spawnSync`
  path unchanged. The optional test callback receives the command, logical
  arguments, and complete spawn arguments; returning `undefined` delegates every
  non-target call to real Git.
- The object-parity test captures exactly one `git` invocation with logical
  arguments `rev-parse --path-format=absolute --git-path objects` and verifies
  those exact arguments in the complete spawn argument list.
- The canonical object directory succeeds. A wrong existing directory,
  nonexistent path, regular file, blank output, leading/trailing blank line,
  extra line, CR, NUL, and leading/trailing whitespace all fail closed.
- Two disposable mutation probes proved control sensitivity. Removing only the
  object tuple failed because zero calls were captured. Preserving the call but
  bypassing only its parity comparison failed because a wrong existing directory
  escaped validation. The exact candidate was restored byte-for-byte afterward;
  the worktree blob matched the committed blob and the worktree was clean.
- Inherited Git administrative identity, linked-worktree, filesystem path
  identity, environment sanitization, index, ADS inventory, portable-path,
  matrix, canonical Stage A state, attestation absence, evidence substitution,
  and clean committed-head controls remained fail closed.
- Runtime tenant, authorization, financial, API, migration, and durable-state
  behavior is unchanged by this governance-only test seam.

## Independent commands and results

| Command                                                                                                | Result                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --ignore-scripts --offline`                                                                    | Pass; 106 packages added, 107 audited, zero vulnerabilities.                                                                                                                                                      |
| `node --test scripts/closure-format-check.test.mjs scripts/historical-closure-validator.test.mjs`      | Pass; 12/12.                                                                                                                                                                                                      |
| Remove only the object-directory tuple, then run the R18 named test                                    | Expected fail: exact call count was 0 rather than 1.                                                                                                                                                              |
| Bypass only the object-directory comparison, then run the R18 named test                               | Expected fail: wrong existing directory bypass detected.                                                                                                                                                          |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`                                        | Pass; 295 Markdown, 65 JSON, and 5 YAML files.                                                                                                                                                                    |
| `npm test`                                                                                             | Pass on bounded rerun; 948 total, 947 passed, 0 failed, 1 documented skip. The first invocation exceeded a 180-second command wrapper without reporting a test failure; the clean rerun completed in 272 seconds. |
| `npm run format:check`                                                                                 | Pass; Prettier and closure formatting, matrix, and queue exclusions validated.                                                                                                                                    |
| `npm audit --audit-level=high --offline`                                                               | Pass; zero vulnerabilities.                                                                                                                                                                                       |
| `git fsck --full --strict`                                                                             | Pass; dangling disposable test objects only, no integrity failure.                                                                                                                                                |
| Exact-base `git diff --check`, authorized-path inventory, topology, clean-state, and exact-head checks | Pass.                                                                                                                                                                                                             |

## Final verdict

**Verdict: ACCEPTED** for exact candidate
`aaafb17804586738976fd31e1a0a84dda00c2b25`.

The next commit may add only the canonical structured attestation for this exact
candidate. It must not activate closure, push, merge, or advance `TASK-0002`.
