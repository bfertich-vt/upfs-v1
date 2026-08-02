# RECOVERY-CI-LINUX-COMPAT-010 author handoff

## Identity and bounded scope

- Task ID: `RECOVERY-CI-LINUX-COMPAT-010` — corrective recovery of confirmed
  Linux validation failures from GitHub Actions run `30739299420`; no product,
  release, or runtime capability claim.
- Agent role: Backend.
- Role-file path and canonical committed-byte digest:
  `agents/BACKEND.md`; SHA-256
  `171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`.
- Agent thread ID: `/root/backend_ci_linux_compat_010`.
- Worktree and branch: `C:\source\upfs-backend-ci-linux-compat`;
  `recovery/ci-linux-compat-010`.
- Candidate implementation commit: `06b00c5942f094ff8b22c7b33061503bc0fef445`
  (`fix: make provenance CI tests Linux-compatible`), based on `29a8ecd`.
- This is the separate author-handoff record. Independent QA/Security review is
  `pending/unknown` until a distinct role-bound QA agent starts from the
  committed candidate state and records an immutable review report.

## Owned candidate files and exact evidence

Only the four authorized candidate files changed. No queue, CODEOWNERS,
governance documentation, package/dependency configuration, product source,
contracts, providers, persistence, or deployment configuration changed.

| Candidate path | Candidate Git blob SHA-256 |
| --- | --- |
| `.github/workflows/validate.yml` | `484983a5e9bd5922c962df02a641ad2f73c91f1aac7f410cf4ebea3c19f1a3bc` |
| `scripts/ci-gate-validator.test.mjs` | `b59b7c8e772078dc16992f1f59259ba61199a38103be59ffba5efb198fb58f6f` |
| `scripts/provenance-command.test.mjs` | `b93af2f8be5a8ba81f738da84513603a7da78708951791e033ec22ec47a090eb` |
| `tasks/recovery/RECOVERY-CI-LINUX-COMPAT-010.yaml` | `e5356af6ded86f1379998fe4b25ec33056eb51536e782822f69806669e647de1` |

## Sources, acceptance trace, and negative cases

Read before editing, at candidate Git-blob SHA-256: `AGENTS.md`
`9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`;
`agents/BACKEND.md`
`171397b8a57a3b8e561e106b277e6eeb761e4a736641d5430af4759225d8c784`;
`agents/QA_SECURITY.md`
`6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`;
`agents/WORKTREES.md`
`f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`;
`agents/HANDOFF_TEMPLATE.md`
`4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`;
the engineering constitution
`e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`;
CI/CD `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`;
security `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`;
testing `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
Also read `.github/workflows/validate.yml`, the two scoped tests,
`docs/governance/provenance-verification.md`, and failed GitHub Actions run
`30739299420` before editing.

- The validate checkout now explicitly uses `fetch-depth: 0`; the new
  regression test fails if the immutable checkout action no longer has a
  complete history configuration. This addresses the two historical-fixture
  failures caused by unavailable commits `e7c81bf...` and `4ae7e95...`.
- On every platform, the literal fenced PowerShell source is structurally
  verified for mandatory data-bound parameters, strict full-commit/path
  allowlists, `git ls-tree` tracking check, `execFileSync` argument arrays,
  and absence of invocation APIs. Linux therefore validates the source and
  injection boundary while truthfully skipping Windows PowerShell execution.
- On Windows, the exact script executes the valid committed-byte SHA-256 case
  and rejects semicolon, whitespace, quote/metacharacter, missing/malformed
  ref, absolute/traversal, untracked, and missing-path inputs without an
  `INJECTED` output marker. This candidate ran those Windows execution tests.
- The reviewer-worktree mutation now uses a platform-native absolute nonexistent
  path (`C:\not-real` on Windows, `/not-real` on Linux), ensuring it reaches
  the intended `worktree does not exist` guard instead of failing a preceding
  absolute-path parser check.

## Commands and results

- `npm ci --ignore-scripts`: passed; locked dependencies only. `npm audit`
  reported one pre-existing moderate advisory; no package files changed.
- `node --test scripts/provenance-command.test.mjs`: passed 4/4, 0 failed on
  Windows, including exact positive and injection-bearing negative execution.
- `node --test scripts/ci-gate-validator.test.mjs`: passed 16/16, 0 failed,
  including complete-history and cross-platform reviewer-worktree regressions.
- `npm test`: passed 899, failed 0, skipped 1 opt-in embedded PostgreSQL test.
- `npm run ci:gates` and `npm run validate`: passed.
- Node YAML parse of `tasks/recovery/RECOVERY-CI-LINUX-COMPAT-010.yaml`:
  passed (correct ID, Backend role, and acceptance array).
- `git diff --check`: passed.

## Security, tenant isolation, limitations, and rollback

This is repository-control-only corrective work. It processes no credentials,
customer data, financial data, tenant identities, provider payloads, or
production configuration. It preserves fail-closed immutable Git history and
PowerShell injection/path-escape controls; tenant isolation, authorization,
audit runtime, and API behavior are unchanged. Linux does not claim that the
Windows-only `powershell.exe` executable ran; it validates command source and
injection safeguards instead. A hosted Linux CI rerun remains required as
independent runtime evidence after review.

Correct forward only: preserve GitHub run `30739299420`, candidate
`06b00c5942f094ff8b22c7b33061503bc0fef445`, and all prior evidence. If QA
finds a defect, use a new isolated remediation branch and a fresh review; do
not amend, reset, force-push, delete branches, or rewrite history. No external
credentials or provider prerequisites are needed for this bounded fix.
