# GitHub governance audit

## Scope and status

This audit records a read-only GitHub API inspection for `bfertich-vt/upfs-v1`, performed for `RECOVERY-GITHUB-001` on 2026-08-01. It is governance evidence, not a claim that GitHub enforcement is enabled. Product work remains frozen and PR #1 must not be merged.

## API evidence

| Check | Endpoint | Observed result |
|---|---|---|
| CODEOWNERS validation before this candidate | `GET /repos/bfertich-vt/upfs-v1/codeowners/errors` | 10 `Unknown owner` errors across the six original lines: the `@upfs/platform`, `@upfs/security`, `@upfs/compliance`, and `@upfs/api` placeholders do not resolve. |
| Authorized owner | `GET /repos/bfertich-vt/upfs-v1/collaborators/bfertich-vt/permission` | `bfertich-vt` resolves as a repository user with `admin` permission. |
| PR #1 | `GET /repos/bfertich-vt/upfs-v1/pulls/1` and `GET /repos/bfertich-vt/upfs-v1/pulls/1/reviews` | Open PR #1, `TASK-0001: Establish repository baseline`, head `0df7ffcb76139a698beba1a0309498f1f7dae857`, base `main`, 324 commits, 446 changed files, zero review comments, and zero reviews. It is not an acceptable integration vehicle. |
| Branch protection | `GET /repos/bfertich-vt/upfs-v1/branches/main/protection` | HTTP 403: GitHub requires an upgrade to Pro or making this private repository public to enable this feature. |
| Repository rulesets | `GET /repos/bfertich-vt/upfs-v1/rulesets` | HTTP 403 with the same plan/public-repository requirement. |

## Corrective change and verification requirement

`CODEOWNERS` now assigns only the verified `@bfertich-vt` account. A post-commit, read-only request to the CODEOWNERS errors endpoint is required before this candidate can be accepted; zero errors is required. This local correction cannot enforce owner review while branch protection/rulesets are unavailable.

## Fail-closed position and external decision

The account owner must either upgrade the repository plan to enable protected-branch/ruleset enforcement or make a deliberate public-repository decision after assessing confidentiality and security impact. Until GitHub API evidence proves protected-branch enforcement, valid reviewer ownership, and independent human review of a small, appropriately scoped corrective PR, governance remains blocked. Do not merge PR #1, do not use it as evidence of review, and do not represent the repository as release-candidate complete.

## Safe integration proposal

Preserve PR #1 and all existing history as an audit checkpoint. Open separate, narrowly scoped corrective PRs from independently reviewed recovery branches only after the external GitHub protection decision. Each future handoff must retain PR URL, workflow-run/artifact URLs, reviewer evidence, exact commit, and rollback or corrective-forward notes.
