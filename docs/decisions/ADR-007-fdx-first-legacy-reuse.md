# ADR-007: FDX-first architecture and legacy UPFS/Vetralysis reuse

- Status: Decision recorded; independent QA/Security review pending; implementation remains blocked.
- Date: 2026-08-01
- Decision owner: Schema/Search/AI task owner for TASK-0111.
- Approval owner for implementation: unassigned; an authorized integration
  architecture owner and independent QA/Security reviewer are required before
  any downstream promotion.
- Decision version: `ADR-007 v1`.
- Approval: no implementation approval. This record requires independent
  QA/Security review before TASK-0111 may be marked complete.
- FDX/provider contract version: unselected and unverified. It must be named,
  source-bound to authorized provider/FDX documentation, compatibility-tested,
  and approved before any connector, schema, or credential work starts.

## Role and scope boundary

This record was prepared under the Schema/Search/AI role limitation: it decides
schema/search/AI architectural direction and reuse gates only. It creates no
runtime, provider binding, credential, API contract, migration, deployment, or
production capability. No external documentation, credentials, customer data,
or secrets were inspected or recorded.

## Context and sources

`docs/MASTER_PLAN.md#Delivery-stages` sequences connector and canonical work
after the engineering and trust foundations. The constitution requires
evidence-bearing bitemporal PostgreSQL authority, stable versioned APIs,
compatibility discipline, provenance, and a documented rollback or
corrective-forward strategy. `specs/03_architecture/system_architecture.md`
requires the path from connector through immutable raw artifacts, quarantine,
normalization, canonical storage, outbox, projections, and governed context.
`specs/10_security/security_baseline.md` requires least privilege, managed
secrets, dependency pinning, provenance, and testing for cross-tenant access,
replay, webhook forgery, injection, SSRF, and prompt injection.
`specs/12_testing/test_strategy.md` requires compatible contracts and broad
negative, cross-tenant, security, contract, integration, and failure testing.

## Decision

The first integration architecture is **FDX-first**. A future provider adapter
must be isolated behind a versioned provider contract and the compatibility
boundary must preserve immutable raw evidence before normalization. The future
canonical transaction contract remains the UPFS authority described by the
constitution and architecture; an FDX/provider payload cannot establish
financial truth, tenant scope, or authorization.

No FDX/provider version is selected by this decision because authorized FDX
and provider documentation was not supplied or inspected. TASK-0112 remains
blocked on the managed sandbox credential boundary, and TASK-0113 through
TASK-0123 remain blocked on their declared dependencies and prerequisites.

## Legacy asset inventory and dispositions

The candidate definition is an identifiable, present UPFS/Vetralysis legacy
code, contract, schema, connector, fixture, or package proposed for runtime or
contract reuse. The following concrete, read-only searches were performed in
this worktree at base `dae9eef`:

- `rg --files --hidden --no-ignore -g '!**/.git/**' | rg -i 'vetralysis|legacy|fdx|upfs'`
- `rg -l -i --hidden --no-ignore -g '!**/.git/**' 'vetralysis|legacy UPFS|legacy asset|FDX' .`
- `Get-ChildItem -Recurse -Force -File` filtered for
  `vetralysis|fdx|legacy|license|notice|copying`
- `git grep -l -i 'vetralysis'` across reachable local and remote refs, plus
  `git ls-files` filtered for license/notice/copying/Vetralysis/FDX names.

Result: **zero candidate legacy UPFS/Vetralysis assets are present**. The only
matches were planning/queue/backlog references to the decision itself and
historical provenance text, not reusable legacy assets. No license, NOTICE, or
COPYING metadata for a candidate asset exists in the tree. Therefore the asset
table is intentionally empty: there is no asset for which an accept or adapt
outcome could truthfully be recorded.

Any later discovered candidate is **REJECT/DEFER by default** until all four
reviews below pass. It must then receive its own inventory row with immutable
source path/revision/digest, license and provenance evidence, named owner,
version, compatibility boundary, disposition, residual risk, and rollback.

## Reuse admission checklist

An asset may be changed from REJECT/DEFER to ACCEPT or ADAPT only when the
named integration architecture owner and independent QA/Security reviewer have
recorded all of the following against the exact asset revision:

| Gate | Required evidence | Negative coverage that must pass |
| --- | --- | --- |
| Security | Threat review covering tenant derivation, egress, secret handling, raw-payload redaction, injection, SSRF, replay, and webhook origin/signature behavior | Cross-tenant/BOLA or IDOR request; missing/misbinding/expired credential; forged or replayed webhook; unsafe payload; prompt-injection propagation; logging of raw payload or secret |
| License and provenance | SPDX-compatible license decision, copyright/NOTICE obligations, origin/revision/digest, supplier/owner approval, dependency/SBOM review | Missing or conflicting license; unknown origin; altered digest; unsupported dependency; absent attribution or approval |
| Contract compatibility | Named FDX/provider contract version, versioned adapter contract, canonical mapping/lineage, error/pagination/time/currency semantics, migration and deprecation review | Unsupported provider version/field; breaking change; unknown enum/category; invalid decimal/currency/time; schema drift; incompatible pagination or error shape |
| Regression and negative tests | Deterministic synthetic fixtures and contract/integration regression evidence, including quarantine, idempotency, reconciliation, audit, and rollback behavior | Malformed/oversized artifact; scanner failure; duplicate/reordered event; cursor restart; reconciliation discrepancy; authorization denial; rollback/corrective-forward failure |

Failure, missing evidence, unavailable owner, or unavailable authorized source
is a REJECT/DEFER outcome. Samples, historical handoffs, fixtures, in-memory
seams, and planning text are not reusable runtime assets and cannot be used to
claim a passed review.

## Consequences, residual risk, and rollback

The decision keeps the repository from coupling a future FDX connector to
unverified legacy material or treating a provider payload as canonical truth.
Residual risk remains high for future implementation because provider terms,
FDX version, schema, sandbox access, named owners, license/provenance evidence,
and compatibility/regression evidence are all absent. The mitigation is to
keep all dependent tasks blocked and fail closed at the admission checklist.

Rollback is limited to reverting this decision record, its queue reference,
and backlog statement if an independently reviewed correction is required. It
does not alter historic reclassifications, delete immutable evidence, revoke a
nonexistent credential, or roll back production because this decision produces
no production runtime capability.

## Required independent review

Independent QA/Security review must verify the source bindings, zero-asset
inventory searches, explicit no-runtime claim, scope-limited diff, queue and
backlog consistency, checklist completeness, and the commands `npm run
traceability:check`, `npm run validate`, `npm test`, and `git diff --check`.
This ADR is not approval to merge, deploy, connect to a provider, or reuse an
asset.
