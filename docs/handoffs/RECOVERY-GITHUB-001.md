# Handoff: RECOVERY-GITHUB-001

## Provenance

- **Task ID and scope:** `RECOVERY-GITHUB-001`; replace only unresolved CODEOWNERS placeholders with the verified repository administrator and record GitHub governance evidence. No product work.
- **Agent role:** Backend (`agents/BACKEND.md`), SHA-256 `94836c3f25375688f0e8c47b55b6997a4ba688ab819930a686b676183a980faa`.
- **Agent thread ID:** `/root/backend_github_governance`.
- **Worktree and branch:** `C:\source\upfs-recovery-github-governance`, `recovery/github-governance`.
- **Immutable implementation candidate:** `cdfa8550229d72fe636154decf2d03843fe4ca99`.
- **Original handoff-record commit:** `43d98be0814e46ead4d43a30d49074b86f6de84b`, intentionally subsequent to the original candidate.
- **First corrective-forward handoff record:** `abf1c03240ea81578e78b75bb7d942b2e889a7e4` (branch/ref validation evidence; later QA rejected its two factual errors, preserved below).
- **Files changed by candidate:** `CODEOWNERS`, `docs/governance/github-governance-audit.md`, and `tasks/recovery/RECOVERY-GITHUB-001.yaml`.
- **Files changed by this record:** `docs/handoffs/RECOVERY-GITHUB-001.md` only.

## Inputs and governing material read

- `AGENTS.md` — `eb3f551dbfbf1656d29bf8dd126a8c95d4d67e3c117cc71c5f430c090f1ac47d`
- `agents/BACKEND.md` — `94836c3f25375688f0e8c47b55b6997a4ba688ab819930a686b676183a980faa`
- `agents/QA_SECURITY.md` — `c208308cd59ca962d1176d35606e560d3f4f302fcec8a054ec81036ed8e06efb`
- `agents/WORKTREES.md` — `8ac05c7826d4e29f83db86d29bc6261110e6c921c61e1d9c312820efaacb01ab`
- `agents/HANDOFF_TEMPLATE.md` — `9eee8fc9845bff968d43775a29df66e51c9738c74f685baed6d958643282abfe`
- `specs/00_constitution/engineering_constitution.md` — `66809aff93fb19d7a3e1688facc8d6dacb9e53fb10e597cac8b0026ae2a534d7`
- `specs/09_cicd/delivery_pipeline.md` — `1b1812728d6304751fb3d976fae33f2dfe2633e299b24f4634f3d304cc68de73`
- `specs/12_testing/test_strategy.md` — `21600491c4c87f1474bcd2131fa0f814bf7da6a819fd6f8bdd7d25384c8d0cff`
- `docs/REPOSITORY_GOVERNANCE.md` — `05c457b311ec8aa8873fab30c3aac150a5f9c8ddc4196665e7685e8a1851aa9d`
- `README.md` — `901e483c6738c0a358513671448c1b5707e610a9a1496fd300320c120fe9ffe1`
- `START_HERE.md` — `d9cfe90da7f20642539207d07c3c657479404175ce3eb713a2fdbbfed6dc3311`
- Root `CODEOWNERS` before candidate — `308755044b7aaff877f60f3f9c643d66729f1ae3c0afcd2f4c799325313714da`
- Task input: `tasks/recovery/RECOVERY-GITHUB-001.yaml`.

## Acceptance evidence

1. Candidate `cdfa855` replaces every original placeholder with the verified GitHub user `@bfertich-vt`.
2. Read-only API evidence recorded in `docs/governance/github-governance-audit.md` confirms the original ten unknown-owner errors; `bfertich-vt` has `admin` permission; PR #1 is open with 324 commits, 446 changed files, and zero reviews; and protection/rulesets endpoints return the documented 403 plan blocker.
3. After the local candidate commit, `gh api repos/bfertich-vt/upfs-v1/codeowners/errors` was run read-only. It still returned the ten original errors because `cdfa855` had not been pushed and GitHub evaluated the remote default branch, later verified as `codex/task-0001-baseline`. This is expected evidence of the unpushed-candidate limitation, **not** evidence that the candidate CODEOWNERS file has passed GitHub validation.
4. The original candidate stage did not modify GitHub settings, repository visibility, pull request state, default/main branch, or credentials. PR #1 was not merged. A later, explicitly user-authorized corrective-forward stage normally pushed only `recovery/github-governance`; that remote task-branch mutation is recorded below and must not be described as no remote modification.

## Tests and negative cases

- `git diff --check` passed before committing the candidate.
- `gh api repos/bfertich-vt/upfs-v1/codeowners/errors` was run before and after the local candidate commit. The post-commit response remains negative (10 errors) because the remote still references the preserved checkpoint; it must be rerun against a pushed candidate PR before acceptance.
- `gh api repos/bfertich-vt/upfs-v1/collaborators/bfertich-vt/permission` returned `admin`.
- Scope check: candidate changed exactly the three authorized candidate files.

## Security, tenant isolation, and audit analysis

This task does not process tenant data or change application authorization. It preserves separation of duties by retaining independent QA as required and fail-closes governance: valid local ownership does not substitute for protected-branch enforcement, human review, or the GitHub-side zero-error check. No sensitive data or tokens are recorded.

## Independent review

- **Reviewer:** unknown; independent QA/Security review has not yet occurred.
- **Review result:** pending; candidate is not accepted or eligible for integration.

## Corrective-forward verification record

- **Original implementation candidate:** `cdfa8550229d72fe636154decf2d03843fe4ca99`.
- **Original rejection/limitation:** the default-ref request `GET /repos/bfertich-vt/upfs-v1/codeowners/errors` was run after the local candidate commit and correctly returned the preserved remote default-branch result of ten unknown-owner errors. It could not validate an unpushed local branch; this evidence is retained above.
- **Final corrective-forward candidate:** `fa2d764f3efa43e0408ba48ae5b5d1f73174047d` on `recovery/github-governance`.
- **Authorized branch publication:** normal, non-force push only: `git push -u origin recovery/github-governance`, followed by `git push origin recovery/github-governance`. No other branch, default branch, PR, rule, protection, or visibility state was changed.
- **Branch/ref validation command:** `gh api -X GET 'repos/bfertich-vt/upfs-v1/codeowners/errors?ref=recovery%2Fgithub-governance'`.
- **API URL:** `https://api.github.com/repos/bfertich-vt/upfs-v1/codeowners/errors?ref=recovery%2Fgithub-governance`.
- **Result:** `{"errors":[]}` after the branch was pushed at `43d98be`, and again after `fa2d764` was pushed. GitHub therefore accepts the candidate CODEOWNERS content at this branch ref.
- **Remaining reviewer state:** a fresh independent QA/Security agent must review `fa2d764` from a separate worktree and then separately review this subsequent handoff record. This validation does not resolve the 403 branch-protection/ruleset plan blocker, provide a human PR review, or authorize a merge.

## Second corrective-forward record: QA factual corrections

- **Preserved QA rejection:** QA rejected `abf1c03` because it inaccurately characterized the later authorized task-branch push as no remote modification, and because the governance audit assessed `main` without identifying the actual default branch.
- **Final corrective-forward candidate:** `2cd713072de8d06b533d3d7c003f97e6dd3b34a2`.
- **Final candidate scope:** `docs/governance/github-governance-audit.md` and `tasks/recovery/RECOVERY-GITHUB-001.yaml` only; `CODEOWNERS` was not altered.
- **Actual default branch:** `GET https://api.github.com/repos/bfertich-vt/upfs-v1` returned `default_branch: codex/task-0001-baseline`.
- **Protection evidence:** both `GET https://api.github.com/repos/bfertich-vt/upfs-v1/branches/codex/task-0001-baseline/protection` and `GET https://api.github.com/repos/bfertich-vt/upfs-v1/branches/main/protection` returned HTTP 403 with the GitHub plan/public-repository prerequisite. The default-branch 403 is the controlling governance exposure; `main` remains relevant because it is PR #1's base.
- **Task-branch publication:** normal non-force pushes updated only `origin/recovery/github-governance` to permit GitHub ref validation. No default branch, `main`, rule, protection, setting, visibility, or PR state was written.
- **Ref validation:** after pushing `2cd7130`, `gh api -X GET 'repos/bfertich-vt/upfs-v1/codeowners/errors?ref=recovery%2Fgithub-governance'` returned `{"errors":[]}`.
- **Handoff record sequence:** original `43d98be`, first corrective-forward `abf1c03`, and this new correction is intentionally subsequent to final candidate `2cd7130`; its exact commit SHA is reported to the supervisor after commit and requires a separate fresh QA review.
- **Reviewer status:** pending. No success, protection compliance, release readiness, PR approval, or merge authorization is claimed.

## Known limitations, external prerequisites, and corrective-forward plan

- GitHub protection and rulesets endpoints return 403 for this private repository under the current plan. Account owner decision: upgrade to a plan supporting protection/rulesets or make an explicit, security-reviewed repository visibility decision.
- A reviewer must independently inspect final candidate `2cd7130` from a separate worktree, including the preserved `cdfa855`/`abf1c03` history and the ref-scoped API evidence. No further push beyond the explicitly authorized normal task-branch pushes is authorized by this task.
- Only after GitHub reports zero CODEOWNERS errors and protected-branch controls are available may a separately authorized, reviewed PR be considered. Do not merge PR #1.
- Roll back through a new reviewed revert/corrective-forward commit only; never rewrite or discard audit history.
