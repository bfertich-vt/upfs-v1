# Independent QA/Security review: RECOVERY-GITHUB-001

## Disposition

**PASS for local recovery integration.** This review accepts the GitHub-governance corrective range for supervisor integration into `codex/task-0001-baseline`. It does **not** authorize deployment, a release claim, or a merge of PR #1.

GitHub protected-branch/ruleset enforcement and an independent human PR review remain external production-deployment blockers. Those blockers are distinct from this task's locally accepted corrective evidence.

## Review provenance

- **Task:** `RECOVERY-GITHUB-001` — governance control-plane documentation and `CODEOWNERS` only.
- **Reviewed implementation candidates:** `cdfa8550229d72fe636154decf2d03843fe4ca99`, `fa2d764f3efa43e0408ba48ae5b5d1f73174047d`, and final corrective candidate `2cd713072de8d06b533d3d7c003f97e6dd3b34a2`.
- **Reviewed handoff record:** `604a007f0de656490fef46ab7c04e894ea9cf044`.
- **Reviewed range:** `0df7ffcb76139a698beba1a0309498f1f7dae857..604a007f0de656490fef46ab7c04e894ea9cf044`.
- **Reviewer role:** Independent QA/Security, [`agents/QA_SECURITY.md`](../../agents/QA_SECURITY.md), SHA-256 `c208308cd59ca962d1176d35606e560d3f4f302fcec8a054ec81036ed8e06efb`.
- **Reviewer thread:** `/root/qa_github_governance`.
- **Review worktree and branch:** `C:\source\upfs-review-github-governance`, `review/recovery-github-001`.
- **Review authority:** read-only through disposition; this record is the only QA-authored change.

## Required material read

| Path | SHA-256 |
|---|---|
| `AGENTS.md` | `eb3f551dbfbf1656d29bf8dd126a8c95d4d67e3c117cc71c5f430c090f1ac47d` |
| `agents/QA_SECURITY.md` | `c208308cd59ca962d1176d35606e560d3f4f302fcec8a054ec81036ed8e06efb` |
| `specs/00_constitution/engineering_constitution.md` | `66809aff93fb19d7a3e1688facc8d6dacb9e53fb10e597cac8b0026ae2a534d7` |
| `tasks/recovery/RECOVERY-GITHUB-001.yaml` | `87c27e4e8e7e82ff57b859d5ba86f0099cdeaa693c208d6b41d727e7c85fd39f` |
| `docs/governance/github-governance-audit.md` | `85fea07195a7bc4f753d2c53007d06faec7d26b1e78912f2772fcb13f1822824` |
| `CODEOWNERS` | `5974c7878500f8947df40b3ccab4abbe4aff9bcbe1093d42f2735fce8223c14a` |
| `docs/handoffs/RECOVERY-GITHUB-001.md` | `046c377e7dc112027a30899731448a6b9e829496f639fe2c00605f4272615b6f` |

## Acceptance-criteria trace

| Acceptance criterion | Evidence | Result |
|---|---|---|
| CODEOWNERS contains only verified owners | `GET /repos/bfertich-vt/upfs-v1/collaborators/bfertich-vt/permission` returned login `bfertich-vt`, permission `admin`; candidate `CODEOWNERS` names only `@bfertich-vt`. | Pass |
| Ref-scoped CODEOWNERS API has no errors | `gh api -X GET 'repos/bfertich-vt/upfs-v1/codeowners/errors?ref=recovery%2Fgithub-governance' --jq '.errors | length'` returned `0`. | Pass |
| Audit includes historical errors, owner, PR #1, default branch, and protection/ruleset results | [`docs/governance/github-governance-audit.md`](../governance/github-governance-audit.md) records 10 historic errors, admin owner, PR #1 state, actual default `codex/task-0001-baseline`, `main`, and 403 results for both protection endpoints plus rulesets. | Pass |
| Fail-closed no-merge/external-plan position is retained | Audit and handoff preserve PR #1 no-merge posture and require plan upgrade or a security-reviewed visibility decision. | Pass |
| Independent QA from committed state | This review fast-forwarded the dedicated QA worktree to `604a007` and records the disposition after inspecting the final range. | Pass |

## Commands and results

- `git merge --ff-only origin/recovery/github-governance` — passed; review checkout reached `604a007f0de656490fef46ab7c04e894ea9cf044`.
- `git diff --check 0df7ffc..HEAD` — passed with no whitespace errors.
- `git diff --name-status 0df7ffc..HEAD` — exactly `CODEOWNERS`, governance audit, task input, and task handoff; all authorized. No prohibited product, CI, workflow, contract, queue, or specification file changed.
- Ref-scoped CODEOWNERS query — `0` errors.
- Owner permission query — `bfertich-vt` is `admin`.
- Repository query — private, unarchived, default branch remains `codex/task-0001-baseline`.
- PR #1 query — open, unmerged, base `main`, 324 commits, 446 changed files; reviews query returned `0`.
- Protection queries for `codex/task-0001-baseline` and `main`, plus rulesets query — all returned HTTP 403, `Upgrade to GitHub Pro or make this repository public to enable this feature.`

## Negative, security, and tenant-isolation review

- The original unpushed/default-ref rejection is preserved in the handoff; the later successful result is explicitly ref-scoped, avoiding a false default-branch validation claim.
- The prior handoff contradiction about remote mutation is corrected: the authorized normal task-branch push is stated, while default branch, `main`, PR, settings, visibility, rulesets, and protection remain unchanged.
- This task handles no tenant data and changes no application authorization, policy, audit, or persistence behavior. No tenant-isolation test is applicable.
- No GitHub settings, visibility, default-branch, `main`, PR, merge, token, or credential mutation was performed by QA. The documented normal non-force push is limited to the recovery task branch.

## Limitations, rollback, and integration recommendation

- **Deployment blockers:** branch protection and rulesets cannot be enabled or verified while the private repository remains on its current GitHub plan; an independent human PR review is also absent. Do not deploy, claim release readiness, or merge PR #1.
- **Rollback:** use a separately reviewed revert or corrective-forward commit; do not rewrite history.
- **Recommendation:** the supervisor may integrate this accepted recovery range into the authoritative integration branch `codex/task-0001-baseline` only. Keep it out of `main` pending the external governance conditions above.
