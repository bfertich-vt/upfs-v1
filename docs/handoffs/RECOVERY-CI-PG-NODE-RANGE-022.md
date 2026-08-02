# RECOVERY-CI-PG-NODE-RANGE-022 Backend handoff

## Task and scope

- Task ID: `RECOVERY-CI-PG-NODE-RANGE-022`.
- Assigned role: Backend; role file `agents/BACKEND.md`, SHA-256
  `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`.
- Agent thread: `/root/backend_ci_pg_node_range_022`. The runtime has no
  native custom-role field; this documented role was bound in the supervisor's
  assignment before source loading or edits.
- Worktree / branch: `C:\\source\\upfs-backend-ci-pg-node-range-022`,
  `recovery/ci-pg-node-range-022`.
- Candidate implementation commit: `25945425853b4082c3fd78acc487f64caa4f75e1`
  (base `ab80cc323cb1caa411d7b11bacfe7f8a45ae8761`; retained prerequisite
  service commit `71597b010bca15ed94edc167d6de45c7dc7a070b`).

## Files changed and contracts

- `.github/workflows/validate.yml`, `package.json`, `package-lock.json`: the
  retained precursor supplies a digest-pinned `postgres:16.10-bookworm` GitHub
  Actions service and fixed disposable loopback migration URL; this task does
  not weaken either boundary.
- `scripts/postgres-service-ci-gate.mjs`: validates the parsed
  `jobs.repository-validation.services.postgres.ports` scalar and derives its
  complete raw source line only from that exact AST node's bounded source
  range. There is no global raw workflow regex.
- `scripts/postgres-service-ci-gate.test.mjs`: adds the independent-QA decoy
  regression and preserves raw, tag, collection, URL, client-construction,
  migration, unscoped-denial, and tenant-RLS checks.
- `tasks/recovery/RECOVERY-CI-PG-NODE-RANGE-022.yaml`: structured task input;
  the superseded unaccepted TASK-020 input is removed.
- `docs/handoffs/RECOVERY-CI-PG-NODE-RANGE-022.md`: this provenance record.

The CI service contract is one ordinary, untagged, plain `5432:5432` scalar
whose full source line is exactly `          - 5432:5432\n`, and the migration
URL contract is the fixed loopback-only test URL. No public API/event/schema
contract changes.

## Sources and predecessor evidence

| Path                                                                                                     | SHA-256                                                            |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `AGENTS.md`                                                                                              | `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1` |
| `agents/BACKEND.md`                                                                                      | `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784` |
| `agents/WORKTREES.md`                                                                                    | `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1` |
| `agents/HANDOFF_TEMPLATE.md`                                                                             | `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4` |
| `specs/00_constitution/engineering_constitution.md`                                                      | `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73` |
| `specs/03_architecture/system_architecture.md`                                                           | `4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6` |
| `specs/09_cicd/delivery_pipeline.md`                                                                     | `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb` |
| `specs/10_security/security_baseline.md`                                                                 | `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add` |
| `specs/12_testing/test_strategy.md`                                                                      | `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172` |
| Rejection `docs/reviews/RECOVERY-CI-PG-RAW-PORT-021-QA.md` at `d2914018abe614d585f95e38757eaf719b035aef` | `f7ff87edb8ccc040695506a8ec3d75cde417c2dbb77bd8261805ec059d5856e2` |

The predecessor review demonstrated that a global `ports` source regex could
find a canonical `services.decoy.ports` line while an alternate-indented
actual PostgreSQL service still parsed and passed. This correction forward
preserves that immutable reject record and binds lexical checking to the
actual parsed node range.

## Acceptance and test evidence

- AST source ranges are checked for shape, monotonicity, and file bounds before
  extracting the one complete raw line. The raw text is accepted only for the
  actual `services.postgres.ports` node.
- A valid YAML fixture with a canonical decoy port and an alternate-indented
  parsed PostgreSQL service rejects, proving the decoy cannot satisfy actual
  service validation.
- Direct malformed/extra mappings, tags, quotes, anchors/aliases, collections,
  CRLF, raw whitespace/comment variants, URL host/port/credential/query/
  fragment overrides, and missing URL all reject.
- `npm ci --ignore-scripts`: passed (106 packages; existing moderate `yaml`
  advisory reported, no dependency change introduced by this task).
- `node --test scripts/postgres-service-ci-gate.test.mjs`: passed, 26/26.
- `npm run migration:check` without `UPFS_TEST_DATABASE_URL`: expected
  nonzero fail-closed exit; only the generic disposable-boundary failure was
  emitted and no URL was disclosed.
- `npm test`: passed, 925 passed, 0 failed, 1 documented opt-in skip.
- `npm run format:check`, `npm run lint`, `npm run static:check`,
  `npm run ci:gates`, `npm run validate`, structured-input YAML parse, and
  `git diff --check`: passed.

## Security, tenant isolation, audit, and rollback

The host is fixed to `127.0.0.1`; URL parsing rejects alternate network hosts,
ports, credentials, databases, query/fragment and encoded override syntax
before a PostgreSQL client is constructed. The service image is digest pinned
and test values are disposable CI-only values. No production credential,
customer data, financial data, provider credential, or deployment target is
introduced. The runner still applies numbered migrations, requires a
`NOSUPERUSER` application principal to see zero unscoped rows, then requires
one tenant-A row only after transaction-local tenant scope.

Correct forward only: preserve candidate/rejection history. If QA or hosted CI
finds another defect, use a fresh isolated Backend branch plus fresh independent
QA; do not amend, reset, force-push, delete branches, or rewrite history.

## Limitations and required independent review

Docker is unavailable in this Windows worktree, so no local container execution
is claimed. Hosted Ubuntu must prove migrations and RLS against the disposable
service after independent acceptance and integration. Independent QA/Security
is **pending** and must be performed by a different role-bound Codex agent in
an isolated worktree from committed candidate state; it is not a human review
or a GitHub approval.
