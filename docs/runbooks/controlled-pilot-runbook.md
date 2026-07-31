# Controlled pilot runbook

This runbook authorizes only a bounded pilot using synthetic or explicitly consented test data. It is not a production launch procedure and does not represent SOC 2 certification or an attestation.

## Entry gates

1. The release manifest, SBOM/provenance references, migration fingerprint, and security scan are present and independently reviewed.
2. A disposable PostgreSQL migration, restore/recovery, RLS, outbox/checkpoint, and load rehearsal has passed. A skipped external prerequisite is an open gate, not a pass.
3. Managed secret/configuration references and externally supplied signing material are present; values never enter source, fixtures, or logs.
4. Named incident commander, on-call owner, support-access approver, release approver, and data owner are recorded.
5. The signed go/no-go record has every decision `go`, with no open critical/high security issue and no unresolved tenant-isolation defect.

## Pilot SLOs and pause thresholds

| Signal | Objective | Pause/escalate |
| --- | --- | --- |
| API availability | >=99.0% weekly | <99.0% or two failed health windows |
| Read API p95 latency | <=750 ms | >1,500 ms for 15 minutes |
| Ingestion freshness | >=99% within 15 minutes | any tenant-wide breach >30 minutes |
| Projection reconciliation | zero unexplained drift | any unexplained drift |
| Recovery point objective | <=15 minutes | restore exceeds 30 minutes |
| Recovery time objective | <=60 minutes | recovery exceeds 90 minutes |
| Security | zero confirmed cross-tenant access; zero open critical | immediately pause on either |

## Operating procedures

- Incident: declare severity and incident commander, contain access/ingestion, preserve append-only audit and evidence, notify the named stakeholders, conduct a blameless review, and track corrective-forward actions. Never erase raw observations.
- Backup and restore: use a disposable target, verify migration fingerprint and tenant-scoped counts, test replay/checkpoint monotonicity, record duration and failures, then destroy the target through the approved infrastructure process.
- Access: review privileged access monthly and on joiner/mover/leaver events. Support sessions are case-bound, expiring, step-up authenticated, redacted by default, and recorded.
- Change: protected review, pinned dependencies, validation/security gates, immutable artifact, canary, reconciliation, and explicit rollback/corrective-forward approval are required.
- Vendor/provider: maintain owner, data categories, trust boundary, subprocessors, security review, contract status, and annual reassessment; do not connect real providers during this pilot without separate approval.

## Stop and escalation

Pause the pilot for a failed gate, suspected tenant escape, credential exposure, unresolved critical vulnerability, unexplained data loss, SLO breach at the thresholds above, or missing approval. Resume only after containment, evidence review, corrective action, and a newly signed go/no-go record.
