# Production backlog: FDX-first transaction slice

## Status and boundary

This is a proposed, dependency-controlled product backlog, not evidence of an
implemented capability. Historical `TASK-0001` through `TASK-0110` records stay
unchanged as blocked reclassifications with immutable evidence. This backlog
does not authorize a deployment or provide a bank, tenant, provider, or
production credential. Only the architecture decision is ready; every delivery
task below is blocked until its dependencies, external prerequisites, and
independent review are met.

The first slice is the read-only, tenant-scoped transaction path specified in
`specs/01_product/vision_and_scope.md#Initial-commercial-slice`. It excludes
money movement, ledger replacement, and autonomous agents.

## Ordered delivery map

| Task | Outcome | Requirement mapping | Current gate |
| --- | --- | --- | --- |
| TASK-0111 | FDX-first and legacy-reuse decision | master plan, constitution, security | ready: [ADR-007](decisions/ADR-007-fdx-first-legacy-reuse.md) recorded; independent review pending; no runtime capability |
| TASK-0112 | Provider sandbox credential boundary | architecture data path; security | blocked: decision, provider approval, managed credentials |
| TASK-0113 | Immutable evidence and quarantine | constitution invariants; architecture data path | blocked: sandbox boundary and content scanning |
| TASK-0114 | Canonical normalization and taxonomy | constitution correctness; architecture data path | blocked: validated raw evidence |
| TASK-0115 | Bitemporal PostgreSQL, outbox, and read API | architecture tenancy/reliability; API standards | blocked: normalized canonical contract |
| TASK-0116 | Incremental sync, signed webhooks, pagination, reconciliation | architecture reliability; security baseline | blocked: provider and canonical data path |
| TASK-0117 | Composed runtime and privacy-safe observability | constitution operational quality; CI/CD | blocked: runnable sync/API path and deployment approval |
| TASK-0118 | Governed read-only transaction skill | AI runtime; policy system | blocked: canonical API, composition, skill gate |
| TASK-0119 | Accessible customer transaction console | vision, UI page contract, API standards | blocked: canonical API, composition, accessibility gate |
| TASK-0120 | Security, compatibility, and acceptance suite | testing, security, CI/CD | blocked: completed slice capabilities |
| TASK-0121 | Independent QA/Security review | constitution; testing | blocked: acceptance suite and reviewer independence |
| TASK-0122 | Governed-skills CI capability gate | AI runtime; CI/CD | blocked: decision and named policy/evaluation owner |
| TASK-0123 | Accessibility CI capability gate | UI page contract; testing | blocked: decision and accessibility test environment |

## FDX-first and legacy-reuse gate

`TASK-0111` must make a source-bound FDX-first decision and record an
accept/adapt/reject outcome for every candidate UPFS/Vetralysis legacy asset.
Reuse is forbidden unless security threat review, license and provenance review,
API/schema compatibility review, and regression plus negative-test review have
all passed. The decision records asset/version/owner, evidence, residual risk,
migration or removal plan, and rollback. Existing samples, handoffs, fixtures,
or in-memory seams are not production-capable reuse.

`ADR-007` records this decision gate with an explicit zero-asset in-tree
inventory: no candidate legacy UPFS/Vetralysis asset was found, so no asset is
accepted or adapted. It remains ready pending independent QA/Security review;
it does not select an FDX/provider contract version, authorize provider access,
or satisfy any downstream external prerequisite.

## Inherited delivery requirements

- PostgreSQL is authoritative; OpenSearch is rebuildable and Redis disposable.
- Scope derives from verified identity and policy. API and worker paths deny by
  default, audit actions, reject cross-tenant access, are replay/idempotency
  safe, and do not leak secrets or raw financial payloads.
- Raw provider artifacts are immutable, content-addressed, access-controlled,
  scanned, and quarantined before canonicalization. Corrections append lineage.
- Canonical transactions retain provider category, taxonomy/mapping version,
  declared currency, deterministic decimal values, observed time, valid time,
  and transformation lineage.
- Provider access is sandbox-only through managed secret references or workload
  identity. Webhooks require origin/signature verification, replay protection,
  bounded retry, and durable reconciliation watermarks.
- Each delivery task requires versioned contracts/docs, migration rehearsal or a
  documented rationale, redacted runtime evidence, tested rollback or
  corrective-forward plan, and independent QA/Security review before promotion.

## Evidence, external prerequisites, and rollback

The slice eventually needs an approved provider sandbox authentication through
immutable evidence, quarantine, normalization, RLS-protected bitemporal storage,
outbox, authorized canonical read API, and composed runtime. It must prove
cursor/watermark recovery, pagination restart, webhook deduplication, bounded
backfill, source-to-canonical reconciliation, and no unexplained discrepancy.
The console uses supported APIs only and provides keyboard/assistive-technology
coverage; unavailable and unauthorized states fail closed. The skill has typed
contracts, bounded authorized context, citations, independent policy checks,
adversarial evaluation, release state, and rollback target; it owns neither
durable truth nor authorization.

Open external prerequisites include authorized FDX/provider documentation and
sandbox account, managed secret/workload identity, approved test tenant,
deployable PostgreSQL and telemetry, protected delivery governance, named skill
policy/evaluation owners, and independent QA/Security reviewers. No real
credential, customer data, or credential-derived output may enter the
repository. The skills and accessibility gates are product capability work, not
synthetic evidence, and run in parallel after the decision without displacing
the FDX data path.

Rollback of this planning change is limited to independently accepted new
roadmap/queue entries; historical reclassification and provenance stay intact.
Runtime/data rollback is task-specific corrective-forward work. Immutable raw
evidence is never deleted to correct an observation.
