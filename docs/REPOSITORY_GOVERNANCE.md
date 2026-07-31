# Repository governance baseline

`TASK-0001` establishes the minimum merge controls for this repository. These controls are mandatory for the default branch before any blocked implementation task is authorized.

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

## Evidence expectations

Every pull request touching protected paths must retain:

- the workflow run links for `validate` and `security`
- the uploaded validation artifact from `artifacts/validation-report.json`
- reviewer approval evidence for protected files
- rollback notes when CI, contracts, or governance settings change
