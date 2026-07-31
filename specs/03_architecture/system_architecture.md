# System architecture

## Data path

Connector → immutable raw artifact → observation validation/quarantine → normalization → assertions/conflicts → canonical bitemporal graph → transactional outbox → idempotent projections → OpenSearch → governed retrieval/context → skill/model → validated cited response.

## Core services

Identity/tenant, connector, ingestion, registry, normalization, evidence, entity resolution, canonical graph, projection, search, context, prompt/model, skill/tool, durable workflow, policy, approval, audit, regulatory corpus, documentation, admin command, support access, compliance evidence.

## Multi-tenancy and scale

Start with pooled cells and explicit tenant keys/RLS defense-in-depth. Route by tenant and region. Partition high-volume facts by tenant/time. Use asynchronous backpressure, quotas, bounded fan-out, replayable consumers, reconciliation watermarks, and cell evacuation plans. Hundreds of user accounts are an initial floor, not an architectural ceiling.

## Reliability

Transactional outbox prevents dual-write loss. Consumers are idempotent. Projection versions are built beside current versions, verified, then atomically promoted. Every external action has a durable action request and postcondition check.
