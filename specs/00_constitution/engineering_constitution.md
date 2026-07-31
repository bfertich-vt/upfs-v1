# Engineering constitution

## Product invariants

UPFS is additive infrastructure for banks and financial builders. It must coexist with existing systems, preserve evidence, and produce explainable results. The authoritative state is a tenant-scoped, bitemporal PostgreSQL model. Raw artifacts are immutable. Search and cache layers are disposable.

## API and change discipline

Every visible action maps to a versioned API. Contracts use stable identifiers, UTC timestamps, explicit pagination, structured errors, idempotency keys for writes, and correlation IDs. Breaking changes require a new major version, migration guide, compatibility window, and measured deprecation.

## Secure-by-default delivery

Least privilege, separation of duties, encryption, secret management, dependency pinning, signed artifacts, SBOMs, provenance, protected branches, independent review, and evidence retention are baseline requirements. Tenant-isolation failures are severity-one defects.

## Correctness

Financial totals use deterministic decimal arithmetic and declared currency. AI output never substitutes for deterministic aggregation. Every claim must expose evidence, confidence, observed time, valid time, and transformation lineage when applicable.

## Operational quality

All services emit structured logs, metrics, traces, and audit events without sensitive payload leakage. Migrations are rehearsed. Backfills are bounded, resumable, observable, and reconcilable. Rollback or corrective-forward strategy is documented before promotion.

## Documentation

Specifications, OpenAPI, AsyncAPI, schemas, permissions, errors, examples, runbooks, and release notes are versioned with code. Documentation drift blocks release.
