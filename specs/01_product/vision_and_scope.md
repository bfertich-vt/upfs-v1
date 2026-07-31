# Vision and scope

UPFS provides a common, navigable financial context layer that lets institutions build reliable AI search, assistance, and workflows without rebuilding normalization, retrieval, evidence, governance, and execution infrastructure.

## Initial commercial slice

Read-only embedded semantic transaction search and cited financial chat for community and regional banks. A bank exchanges its authenticated customer session for a short-lived UPFS session. Customers search only their own authorized data. Totals are deterministic; explanations cite source records; uncertain answers fail safely or escalate.

## Platform planes

- Control: organizations, tenants, environments, regions, releases, quotas, entitlements.
- Data: connectors, ingestion, normalization, canonical graph, evidence, entity resolution, search projections.
- AI: context profiles, prompts, models, skills, tools, memory, evaluations, chat.
- Workflow: definitions, durable executions, approvals, schedules, compensation.
- Governance: policies, audit, evidence bundles, regulatory corpus, compliance, security.
- Developer: API explorer, SDKs, webhooks, events, docs, CLI.
- Operations: health, metrics, logs, incidents, feature flags, releases.

## Explicit non-goals for v1

Autonomous movement of money, replacing a bank ledger, unconstrained general-purpose agents, Redis as durable memory, OpenSearch as financial truth, or regulatory/legal conclusions without reviewed sources.
