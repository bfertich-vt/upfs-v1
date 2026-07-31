# UPFS v1.0

UPFS is an API-first financial intelligence platform specification and implementation scaffold. It normalizes financial observations into an evidence-bearing canonical graph, publishes reproducible search projections, and supports governed AI skills, workflows, policies, approvals, and audit.

This repository is a build contract, not a claim that the full platform is implemented. Begin with [START_HERE.md](START_HERE.md). The first authorized implementation task is `TASK-0001` in `tasks/queue.yaml`.

## Repository map

- `specs/` — normative product and engineering requirements.
- `contracts/` — machine-readable API, event, and schema examples.
- `agents/` — Codex supervisor and specialist operating prompts.
- `tasks/` — dependency-controlled delivery queue.
- `apps/`, `services/`, `packages/` — implementation destinations.
- `infra/` — local and deployment scaffolding.
- `scripts/` — validation and setup helpers.
- `docs/` — public-documentation blueprint and beginner guide.

## Status

Specification baseline only. Financial correctness, tenant isolation, security, and audit controls are release blockers.
