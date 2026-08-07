# Repository governance baseline

## Required baseline (not current enforcement evidence)

`TASK-0001` describes the minimum merge controls that must exist before any blocked implementation task is authorized. This section is a target baseline, not evidence that GitHub currently enforces it.

## Required branch protection

- Require pull requests for all changes to `main`; no direct pushes.
- Require the `validate` and `security` GitHub Actions workflows to pass before merge.
- Require dismissal of stale approvals when new commits are pushed.
- Require at least one approval from a `CODEOWNERS` reviewer when protected paths change.
- Restrict force pushes and branch deletion on `main`.
- Keep administrator bypass disabled except for documented break-glass incidents with follow-up evidence.

## CODEOWNERS expectations

`CODEOWNERS` establishes mandatory review ownership for baseline governance areas:

- `/.github/workflows/` requires platform and security review.
- `/contracts/` requires API/platform review.
- `/specs/00_constitution/`, `/specs/10_security/`, and `/specs/11_soc2/` require security and compliance review.

When GitHub branch protection is configured, enable "Require review from Code Owners" so these ownership rules are enforced by the platform rather than by convention.

## External audit status (2026-08-06)

The current GitHub REST audit of `bfertich-vt/upfs-v1` found that the public repository's default branch is `codex/task-0001-baseline`. Pull request #1 is closed. The only open pull requests are Dependabot PRs #2, #3, and #5 against the default branch; their security checks pass and their repository-validation checks fail because the proposed action versions do not match the repository's reviewed immutable pins.

The remote default-branch `CODEOWNERS` errors endpoint returns an empty error list. This proves that GitHub parses the current ownership file; it does not prove that code-owner approval is required.

The branch-protection endpoint for the actual default branch now reports strict required `repository-validation` and `repository-security` checks, administrator enforcement, linear history, conversation resolution, and disabled force pushes and deletions. It also reports zero required approving reviews and `require_code_owner_reviews: false`; no repository rulesets exist. Therefore automated gates are externally enforced, but independent approval and CODEOWNERS review are not GitHub-enforced controls. Do not claim independent-review enforcement, deployment governance, release certification, or production readiness from local checks or the partial branch protection.

The recorded local recovery evidence covers queue, provenance, traceability, repository validation, and the local full suite on the authoritative integration checkout. It remains distinct from external GitHub enforcement and does not authorize product work while the audited queue is frozen.

## Evidence expectations

Every pull request touching protected paths must retain:

- the workflow run links for `validate` and `security`
- the uploaded validation artifact from `artifacts/validation-report.json`
- reviewer approval evidence for protected files
- rollback notes when CI, contracts, or governance settings change
