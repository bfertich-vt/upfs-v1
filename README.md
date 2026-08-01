# UPFS v1.0

UPFS is an API-first financial intelligence platform specification and implementation scaffold. It normalizes financial observations into an evidence-bearing canonical graph, publishes reproducible search projections, and supports governed AI skills, workflows, policies, approvals, and audit.

This repository is a build contract, not a claim that the full platform is implemented. See [START_HERE.md](START_HERE.md) for the recovery-aware onboarding instructions. Do not begin product implementation from this checkout: the audited delivery queue is reclassified and frozen, including `TASK-0001`.

## Repository map

- `specs/` - normative product and engineering requirements.
- `contracts/` - machine-readable API, event, and schema examples.
- `agents/` - Codex supervisor and specialist operating prompts.
- `tasks/` - dependency-controlled delivery queue.
- `apps/`, `services/`, `packages/` - implementation destinations.
- `infra/` - local and deployment scaffolding.
- `scripts/` - validation and setup helpers.
- `docs/` - public-documentation blueprint, beginner guide, and repository governance baseline.

## Recovery status

On the authoritative integration checkout, the recovered control-plane evidence records passing queue, provenance, traceability, repository-validation, and local full-suite checks. The current documentation candidate is on `recovery/documentation-status-002`; verify its local state with:

```powershell
npm run traceability:check
npm run validate
npm test
git diff --check
```

Those local results do not establish a product capability, release certification, production readiness, protected-branch enforcement, or deployment governance. Product work remains gated while the audited queue is frozen and external GitHub controls are unresolved. Financial correctness, tenant isolation, security, audit, provenance, and independent QA/Security evidence remain release blockers.
