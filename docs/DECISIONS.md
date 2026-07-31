# Architecture decisions

- ADR-001: PostgreSQL is authoritative; OpenSearch and Redis are non-authoritative.
- ADR-002: Canonical records are evidence-bearing and bitemporal.
- ADR-003: Every UI capability is exposed through a supported versioned API.
- ADR-004: Durable workflows own action state; LangGraph is bounded reasoning only.
- ADR-005: Customer console and internal admin control plane are separate applications and API namespaces.
- ADR-006: Start with one governed vertical slice and a small supervised agent team.

New decisions require context, options, consequences, security/privacy impact, migration, rollback, owner, and approval date.
