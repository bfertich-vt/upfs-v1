# RECOVERY-PROVENANCE-004 independent QA/Security review

## Identity and review boundary

- Task: `RECOVERY-PROVENANCE-004` — corrective-forward repair of
  `QA-RECOVERY-PROVENANCE-003-01`; it is not a product capability or a
  production-readiness claim.
- Reviewer role: Independent QA/Security, bound to `agents/QA_SECURITY.md`.
- Role binding: `AGENTS.md`
  `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`;
  `agents/QA_SECURITY.md`
  `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`;
  `agents/BACKEND.md`
  `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`;
  `agents/WORKTREES.md`
  `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`;
  `agents/HANDOFF_TEMPLATE.md`
  `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`.
- QA thread: `/root/qa_recovery_provenance_004`; worktree
  `C:\source\upfs-qa-provenance-004`; branch
  `qa/recovery-provenance-004`.
- Reviewed immutable candidate: `f80ea43178ddff20ed171a90f7e485b0a58617d5`
  (`fix: harden provenance command argument handling`).
- Reviewed subsequent author handoff:
  `fb33679162b7f907415f02231cabb028cfa2fed2`
  (`docs: hand off hardened provenance command recovery`).
- The candidate author and this independent QA/Security reviewer are distinct.
  QA did not alter any candidate file. This report is the only QA-owned file.

## Governing sources and candidate provenance

The reviewer read the assigned sources before review. SHA-256 values below are
canonical Git-blob bytes at the candidate, except the handoff, which is read
from its later immutable commit.

| Path | SHA-256 |
| --- | --- |
| `specs/00_constitution/engineering_constitution.md` | `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73` |
| `specs/09_cicd/delivery_pipeline.md` | `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb` |
| `specs/10_security/security_baseline.md` | `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add` |
| `specs/12_testing/test_strategy.md` | `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172` |
| `tasks/recovery/RECOVERY-PROVENANCE-004.yaml` | `3cf2ec08d18b8b68b023917ad135b7bb16cd7e41f9a48687c8d0d4422d2fa53d` |
| `docs/governance/provenance-verification.md` | `778cff5812788355856815958d13fbd215d68cff7e24e476d15221eaa49401ba` |
| `scripts/provenance-command.test.mjs` | `387e4bac4c0ed10886802e788024e94a8b28db34cda030340223d2b6cc10d445` |
| `docs/handoffs/RECOVERY-PROVENANCE-004.md` at `fb33679` | `6a4d8e5880d144a6ebcedb1c1727fa1bfc965c9996a899b334971ad478769c40` |

The prior rejected evidence was inspected, including immutable commit
`251e5b2c4a3c1b87442bb84b9d68757a88c98be1`. Its high-severity finding was
valid: the predecessor's unquoted substituted positional input could execute a
semicolon injection. This candidate preserves that rejection and corrects
forward; it neither rewrites nor relabels the historical evidence.

`git diff --name-status f80ea43..fb33679` reports only the author handoff, and
`git merge-base --is-ancestor f80ea43 fb33679` succeeds. The candidate modifies
only its three task-authorized files; the later handoff is separate.

## Acceptance and test evidence

| Acceptance criterion | Independent evidence and result |
| --- | --- |
| Exact documented external command is usable | Extracted the literal fenced PowerShell block to a temporary external `.ps1` and invoked it with `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File ... -Commit <HEAD> -Path AGENTS.md`. It returned exit 0 and a lowercase 64-hex digest. |
| Canonical committed-byte hash | Independently calculated `crypto.createHash('sha256')` over `execFileSync('git', ['show', '<HEAD>:AGENTS.md'])`. Both values were `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`. |
| Input is data, not PowerShell syntax | The documented script uses typed named parameters, strict full-lowercase-commit and safe repository-relative path allowlists, then supplies values to Node via environment variables. Node uses `execFileSync` argument arrays; there is no string shell evaluation of either argument. |
| Injection and path escape fail closed | Independently executed the literal external script with semicolon, whitespace, quote/command-substitution text, absolute path, traversal, untracked path, missing path, all-zero missing ref, malformed ref, and uppercase ref. Every case exited nonzero; no output contained `INJECTED`, and a separately asserted temporary side-effect sentinel was never created. |
| Regression test is literal and covers negatives | `node --test scripts/provenance-command.test.mjs` passed 3/3. Its test writes the extracted documentation fence externally, uses named `-Commit`/`-Path` arguments, verifies the expected bytes, and covers every required negative class. |
| Structured input and candidate/handoff model | Node/YAML parse passed: `RECOVERY-PROVENANCE-004`, Backend role, seven acceptance criteria. The candidate precedes the separate QA-pending author handoff. The documentation requires a distinct QA-authored result and records missing evidence as unknown/unsupported. |

Commands run in this independent review:

- `npm ci --ignore-scripts` — passed; one pre-existing moderate dependency
  advisory was reported and no manifests were changed.
- `node --test scripts/provenance-command.test.mjs` — 3 pass, 0 fail.
- Node `yaml.parse` of the structured task input — passed.
- `git diff --check ff89e9e..f80ea43` and `git show --check f80ea43` — passed.
- `npm run validate` — passed.
- `npm test` — 898 total, 897 pass, 0 fail, 1 declared opt-in skip.

## Security, tenant isolation, and limitations

The repaired control rejects shell metacharacters before any Git invocation;
the variables supplied to Git and Node are validated data rather than parsed
PowerShell source. The tracked-at-commit check and final `git cat-file` commit
check prevent path escape and non-commit references. No secrets, credentials,
customer data, raw financial payload, tenant identifier, API, persistence,
provider, workflow, deployment, or authorization behavior is touched. Tenant
isolation, idempotency, replay, audit-runtime, migration, and rollback-runtime
tests are not applicable to this documentation/local-test-only recovery change.

This result is limited to the provenance-command control. It does not prove
repository governance, CI execution on GitHub, human branch review,
protected-branch enforcement, external infrastructure, or any UPFS production
capability. The moderate dependency advisory remains an external-to-candidate
follow-up. Corrective-forward only: preserve the predecessor rejection,
candidate, handoff, and this report; a later defect requires a fresh isolated
candidate and a new independent review, never history rewrite or evidence
deletion.

## Decision

**ACCEPT.** The candidate satisfies the bounded RECOVERY-PROVENANCE-004
acceptance criteria. It is eligible for supervisor integration only under the
documented recovery process; this acceptance is not a production promotion or
a claim that broader release blockers are resolved.
