# RECOVERY-CI-POSTGRES-RUNTIME-012 author handoff

## Identity and bounded scope

- Task ID: `RECOVERY-CI-POSTGRES-RUNTIME-012` — corrective recovery of the
  fail-closed migration gate from GitHub Actions run `30745469898`; no product,
  release, deployment, or production-database capability claim.
- Agent role: Backend.
- Role-file path and canonical committed-byte digest: `agents/BACKEND.md`;
  SHA-256 `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`.
- Agent thread ID: `/root/backend_ci_postgres_012`.
- Worktree and branch: `C:\source\upfs-backend-ci-postgres-012`;
  `recovery/ci-postgres-runtime-012`.
- Candidate implementation commit: `eb1fd64c4c62842cbc28c9cfc13622c0b151ee2b`
  (`fix: install CI PostgreSQL runtime on Linux`), based on `939e2cf`.
- Owned files: `package.json`, `package-lock.json`,
  `tasks/recovery/RECOVERY-CI-POSTGRES-RUNTIME-012.yaml`, and this handoff.
- This separate author handoff is not independent review evidence. Independent
  Codex QA/Security review is `pending/unknown` until a distinct role-bound
  reviewer begins from the committed candidate-and-handoff state.

## Sources, diagnosis, and immutable evidence

Read before editing: `AGENTS.md`
`9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`;
`agents/BACKEND.md`
`171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`;
`agents/HANDOFF_TEMPLATE.md`
`4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`;
`agents/WORKTREES.md`
`f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`;
the engineering constitution
`e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`;
CI/CD `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`;
security `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`;
testing `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
Also read the structured task input, package manifests, embedded PostgreSQL
gate and rehearsal runners, and failed hosted run
<https://github.com/bfertich-vt/upfs-v1/actions/runs/30745469898>.

The hosted gate reported `skipped` and correctly exited nonzero. The cause is
that `embedded-postgres` declares platform runtime packages only as nested
optional dependencies, so the GitHub Linux install did not provide its
`linux-x64` binary. The correction declares the pinned Linux binary as an
explicit root optional dependency. On Linux, `npm ci` installs the disposable
test-only binary; unsupported platforms skip that optional package rather than
requiring production PostgreSQL configuration.

| Candidate path | Candidate Git blob SHA-256 |
| --- | --- |
| `package.json` | `995f0ac8b278d92b4a111e604f00eaed9d83ffcd84e0648048a6f98e489f263f` |
| `package-lock.json` | `28cfa30bad9fc4440e5728d254519ff1584e372669ba4f54cdffcfd9df8c507e` |
| `tasks/recovery/RECOVERY-CI-POSTGRES-RUNTIME-012.yaml` | `fce82c38439e10e2676597ce9c6eabc1855a8440e5bfaf2279e6c1b0079546b1` |

## Acceptance trace, tests, and negative cases

- `package.json` and the lockfile now pin
  `@embedded-postgres/linux-x64@18.4.0-beta.17` as an optional root runtime.
  The existing `migration:check` continues to run a real pair of disposable
  PostgreSQL clusters, applies migrations, checks FORCE RLS and cross-tenant
  denial, exercises logical backup/restore and rollback injection, and exits
  nonzero unless the runner reports `passed`.
- `scripts/embedded-postgres-ci-gate.test.mjs` covers the negative `skipped`,
  `failed`, and missing-result outcomes; all are rejected.

Commands and results:

- `npm ci --ignore-scripts` — passed with the locked dependency graph; `npm
  audit` reports one pre-existing moderate advisory, with no audit fix applied.
- `npm run migration:check` — passed; the disposable runtime completed nine
  mandatory checks.
- `node --test scripts/embedded-postgres-ci-gate.test.mjs` — passed 1/1;
  skipped, failed, and missing runner results were rejected.
- `npm run ci:gates` — passed.
- Node YAML parse of the structured input — passed.
- `git diff --check` — passed.
- `npm test` — passed 900 total: 899 passed, 0 failed, and 1 documented
  opt-in embedded-PostgreSQL skip. The mandatory `migration:check` is a
  distinct CI step and passed above.
- `npm run validate` — passed.

## Security, limitations, and corrective-forward plan

This change introduces no external connection URL, production credential,
customer data, private financial data, tenant identifier, provider payload, or
deployment configuration. The test-only embedded clusters use synthetic data
and local ephemeral directories. The gate remains fail closed: unavailable,
skipped, missing, or failed execution rejects the migration check. Existing
runtime authorization and tenant behavior are unchanged; this is CI evidence,
not a production persistence claim.

Hosted Linux execution after independent QA and supervisor integration remains
required evidence. Correct forward only: preserve failed run `30745469898`,
the candidate, and this handoff. If QA or hosted CI identifies a defect, create
a new isolated remediation branch and fresh independent review; do not amend,
reset, force-push, delete branches, or rewrite history.
