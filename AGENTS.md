# UPFS agent instructions

## Authority order

1. User instruction.
2. This file and the engineering constitution.
3. Normative files in `specs/`.
4. Accepted architecture decisions and contracts.
5. Task acceptance criteria.

If requirements conflict, stop and record a decision request. Never silently invent financial, security, retention, or authorization behavior.

## Required operating loop

1. Select one dependency-complete task from `tasks/queue.yaml`.
2. Read every `inputs` file named by that task.
3. Write a short implementation plan and threat/tenant-isolation notes.
4. Implement the smallest vertical slice.
5. Add negative authorization, cross-tenant, idempotency, audit, rollback, and failure tests where applicable.
6. Run `scripts/validate.ps1` plus relevant tests.
7. Produce a handoff report using `agents/HANDOFF_TEMPLATE.md`.

## Non-negotiables

- PostgreSQL is authoritative; OpenSearch is a rebuildable projection; Redis is disposable acceleration.
- Every capability is API-backed. The UI may not bypass supported APIs.
- Every write requires authenticated actor, tenant/environment scope, policy evaluation, idempotency, optimistic concurrency where relevant, and audit evidence.
- Preserve raw observations and provenance. Corrections append history; they do not erase it.
- Deny by default. Never trust tenant identifiers supplied by a client without authorization-derived scoping.
- LLMs cannot authorize actions, establish financial truth, or own durable workflow state.
- No production secrets, customer financial data, or real credentials in fixtures, logs, prompts, or commits.
- No task may weaken validation or bypass a gate to become green.

## Agent coordination

Use a supervisor for planning/integration and narrowly scoped specialists. One writer owns a file at a time. Independent QA/security review occurs after implementation. Use Git worktrees as described in `agents/WORKTREES.md`.
