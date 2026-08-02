# RECOVERY-PROVENANCE-004 author handoff

## Identity, scope, and immutable candidate

- Task ID: `RECOVERY-PROVENANCE-004` — corrective-forward repair of rejected
  finding `QA-RECOVERY-PROVENANCE-003-01`; no product capability or runtime
  claim.
- Assigned role: Backend, bound to `agents/BACKEND.md` at canonical Git-blob
  SHA-256 `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`.
- Agent thread ID: `/root/backend_recovery_provenance_004`.
- Worktree and branch: `C:\source\upfs-backend-provenance-004`,
  `recovery/provenance-command-004`.
- Candidate commit: `f80ea43178ddff20ed171a90f7e485b0a58617d5`
  (`fix: harden provenance command argument handling`), based on `ff89e9e`.
- This separate handoff-record commit must remain `QA pending/unknown`; a
  different role-bound QA/Security agent must review this committed candidate
  and handoff without editing the three implementation files.

## Ownership and candidate-byte evidence

The candidate changed only the authorized files below. This handoff is the
sole subsequent authorized file. Prohibited queue, README/START, workflow,
package/config/dependency, product, contract/schema, deployment, credential,
and other handoff/review files were not changed.

| Candidate path | SHA-256 over candidate Git blob bytes |
| --- | --- |
| `docs/governance/provenance-verification.md` | `778cff5812788355856815958d13fbd215d68cff7e24e476d15221eaa49401ba` |
| `scripts/provenance-command.test.mjs` | `387e4bac4c0ed10886802e788024e94a8b28db34cda030340223d2b6cc10d445` |
| `tasks/recovery/RECOVERY-PROVENANCE-004.yaml` | `3cf2ec08d18b8b68b023917ad135b7bb16cd7e41f9a48687c8d0d4422d2fa53d` |

## Governing sources and acceptance trace

The assigned sources were read before editing. SHA-256 values are Git-blob
bytes at the candidate: `AGENTS.md` `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`;
`agents/BACKEND.md` `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`;
`agents/WORKTREES.md` `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`;
`agents/HANDOFF_TEMPLATE.md` `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`;
the engineering constitution `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`;
CI/CD `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`;
security baseline `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`;
testing strategy `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.

The rejected structured input and author handoff were read from immutable
`6056bbdcddab25c3ea083d106c92e1867f16f827`; the QA finding was read at
`251e5b2c4a3c1b87442bb84b9d68757a88c98be1`. Their historical status remains
rejected/unsupported; this task neither rewrites nor fabricates that evidence.

- The literal fenced script has named PowerShell parameters, strict full-commit
  and repository-relative-path allowlists, a tracked-at-commit check, and only
  then passes values to Node via environment data and `execFileSync` argument
  arrays. It returns lowercase SHA-256 of exact `git show <commit>:<path>` bytes.
- The exact script is written to an external `.ps1` and successfully hashes
  `AGENTS.md` at `HEAD`; the test compares it with independently hashed Git
  blob bytes.
- The same exact external script rejects semicolon, whitespace, and
  quote/metacharacter injection, malformed and missing refs, absolute and
  traversal paths, plus untracked and missing paths. Each negative result is
  nonzero and test output contains no `INJECTED` marker.
- The structured input contains role, scope, allowed/prohibited files,
  acceptance, sources, tests, security, rollback, and handoff requirements.

## Commands and results

- `npm ci --ignore-scripts`: passed; locked dependencies only, one existing
  moderate advisory reported, no dependency files changed.
- Node/YAML parse of `tasks/recovery/RECOVERY-PROVENANCE-004.yaml`: passed
  (`RECOVERY-PROVENANCE-004`, Backend, acceptance array).
- `node --test scripts/provenance-command.test.mjs`: passed 3/3, 0 failures.
- `npm run validate`: passed.
- `git diff --check` and `git show --check f80ea431...`: passed.

## Security, tenant isolation, rollback, and review status

This is local repository-metadata documentation/test work only. It uses no
secrets, customer data, tenant identifiers, provider data, or production
credentials, and changes no authorization, API, persistence, audit runtime,
or deployment behavior. The security improvement is fail-closed prevention of
PowerShell token injection and path escape; tenant isolation is not applicable.

Correct forward only: preserve `54fa960`, `6056bbd`, QA finding `251e5b2`,
and this candidate. Do not amend, reset, force-push, rewrite history, or
discard evidence. If QA finds a defect, create another isolated candidate and
re-review it. Known limitations: this narrow control cannot prove broader queue,
CI, GitHub governance, provenance, traceability, or production readiness.
External blockers for those broader controls remain verified ownership/human
review, protected-branch support, infrastructure, and credentials. Independent
QA/Security result is `pending/unknown` until separately recorded.
