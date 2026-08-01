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

## External audit status (2026-08-01)

The current GitHub REST audit of `bfertich-vt/upfs-v1` found the default branch is `codex/task-0001-baseline`. Pull request [#1](https://github.com/bfertich-vt/upfs-v1/pull/1) remains open against `main`, is unmerged, and has no submitted reviews. This is not evidence that `main` is protected or that any review requirement is enforced.

The remote `CODEOWNERS` errors endpoint reports unknown `@upfs` owners (`@upfs/platform`, `@upfs/security`, `@upfs/compliance`, and `@upfs/api`) until a corrective branch is published and the remote file is accepted. Local ownership text therefore does not establish remote CODEOWNERS enforcement.

The branch-protection endpoint for `main` and the repository-rulesets endpoint both returned HTTP 403 with GitHub's private-plan eligibility message. Consequently, branch protection, rulesets, required status checks, required CODEOWNERS review, administrator-bypass posture, force-push restriction, and branch-deletion restriction are external governance blockers, not verified controls. Do not claim protected `main`, CODEOWNERS enforcement, deployment governance, release certification, or production readiness from local checks.

The recorded local recovery evidence covers queue, provenance, traceability, repository validation, and the local full suite on the authoritative integration checkout. It remains distinct from external GitHub enforcement and does not authorize product work while the audited queue is frozen.

## Evidence expectations

Every pull request touching protected paths must retain:

- the workflow run links for `validate` and `security`
- the uploaded validation artifact from `artifacts/validation-report.json`
- reviewer approval evidence for protected files
- rollback notes when CI, contracts, or governance settings change
