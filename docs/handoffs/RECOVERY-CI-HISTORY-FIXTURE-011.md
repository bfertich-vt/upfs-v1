# RECOVERY-CI-HISTORY-FIXTURE-011 author handoff

## Identity and bounded scope

- Task ID: `RECOVERY-CI-HISTORY-FIXTURE-011` — corrective repository-control
  work for GitHub Actions run `30744306355`; no product, release, or runtime
  capability claim.
- Agent role: Backend.
- Role-file path and canonical committed-byte digest: `agents/BACKEND.md`;
  SHA-256 `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`.
- Agent thread ID: `/root/backend_ci_history_fixture_011`.
- Worktree and branch: `C:\source\upfs-backend-ci-history-fixture`;
  `recovery/ci-history-fixture-011`.
- Candidate implementation commit: `ba67ccd8274002badb47d00a0ec8b288b1595570`
  (`fix: package CI provenance history fixture`), based on `3fb6915`.
- Owned files: `scripts/ci-gate-validator.test.mjs`,
  `scripts/fixtures/historical-provenance-v1.bundle`,
  `tasks/recovery/RECOVERY-CI-HISTORY-FIXTURE-011.yaml`, and this handoff.
- This is the separate author-handoff record. Independent Codex QA/Security
  review is `pending/unknown` until a distinct role-bound reviewer begins from
  this committed candidate-and-handoff state and records immutable evidence.

## Sources, contracts, and immutable evidence

Read before editing: `AGENTS.md`
`9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`;
`agents/BACKEND.md`
`171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`;
`agents/QA_SECURITY.md`
`6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`;
`agents/WORKTREES.md`
`f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`;
`agents/HANDOFF_TEMPLATE.md`
`4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`;
engineering constitution
`e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`;
CI/CD `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`;
security `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`;
testing `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
Also read the structured task input, `scripts/ci-gate-validator.mjs`, its
scoped test file, and the failed hosted run
<https://github.com/bfertich-vt/upfs-v1/actions/runs/30744306355>.

| Candidate path | Candidate Git blob SHA-256 |
| --- | --- |
| `scripts/ci-gate-validator.test.mjs` | `d06c64a394ef2aee7fd431443b03fd3c56d97cade192cf26d2249719ee19a401` |
| `scripts/fixtures/historical-provenance-v1.bundle` | `85430ac78158117acf4484d120f414fc30087b202a033e83f12b8c20a97776c5` |
| `tasks/recovery/RECOVERY-CI-HISTORY-FIXTURE-011.yaml` | `380f1e1db2db39f4aac753bd4bb848918094d2858c0ac5974db50504a5d71861` |

## Acceptance trace and tests

- The new versioned Git bundle retains exactly the historical source and
  candidate commits needed for the two accepted erratum regression suites:
  `e7c81bf1a38726e0ac8ebf84c969219c21758aea`,
  `2ec8213fe000a0b78c68c588eb10768a39116be3`,
  `4ae7e95f0af88e21dde526be44443846a8d8d9a6`, and
  `90208c69504893c7a01cbcd51a8eb35caf21f5e3`.
- Each suite now verifies the bundle with `git bundle verify`, fetches only its
  versioned fixture refs into a temporary repository, and asserts every exact
  commit is a Git commit before exercising the unchanged append-only,
  allowlist, malformed-row, source-blob, and digest-negative cases.
- This removes dependence on branch objects that existed locally but were not
  published to the hosted checkout. It does not change the production
  validator, acceptance rules, queue, runtime behavior, or product source.

Commands and results:

- `npm ci --ignore-scripts` — passed; locked dependencies only. `npm audit`
  reported one pre-existing moderate advisory; no dependency files changed.
- Node YAML parse with ID, Backend-role, and acceptance-array assertions —
  passed.
- `node --test scripts/ci-gate-validator.test.mjs` — passed 16/16, 0 failed,
  including both self-contained historical erratum suites and their negative
  append-only, missing-commit, malformed-erratum, blob, and digest cases.
- `npm test` — passed 900 total, 899 passed, 0 failed, 1 documented opt-in
  embedded-PostgreSQL skip.
- `npm run ci:gates` — passed.
- `npm run validate` — passed.
- `git diff --check HEAD^ HEAD` — passed.

## Security, tenant isolation, limitations, and rollback

This is repository-control-only recovery. The bundle is Git-object evidence
from preserved historical commits and is verified before use; the test fails
closed if it is absent, corrupt, or lacks a required exact commit. It contains
no credentials, customer data, financial data, tenant identifiers, provider
data, runtime APIs, or production configuration. Tenant isolation,
authorization, audit runtime behavior, and provenance validation rules are
unchanged.

The remaining evidence is a hosted Linux rerun after independent QA and
supervisor integration; local results do not claim hosted execution. No
external credentials or provider access are needed. Correct forward only:
preserve the failed run, candidate commit, fixture, and this handoff. If QA
finds a defect or hosted CI fails, use a new isolated remediation branch and a
fresh independent review; do not amend, reset, force-push, delete branches, or
rewrite history.
