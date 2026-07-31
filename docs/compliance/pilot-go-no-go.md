# Controlled pilot go/no-go record

Template for the named approvers. This record must be completed and signed outside source control before any pilot deployment. An incomplete record is **NO-GO**.

| Gate | Decision (`go`/`no-go`) | Evidence reference | Approver/date |
| --- | --- | --- | --- |
| Scope, synthetic data, and tenant inventory confirmed |  |  |  |
| TASK-0014 disposable PostgreSQL/recovery/RLS/load evidence passed |  |  |  |
| TASK-0015 immutable release/configuration/rollback evidence passed |  |  |  |
| Critical/high vulnerabilities resolved or explicitly accepted |  |  |  |
| Access review, support broker, incident owner, and on-call coverage complete |  |  |  |
| Backup/restore and RPO/RTO evidence complete |  |  |  |
| SLO dashboards and pause thresholds tested |  |  |  |
| External deployment approval and credentials supplied through managed systems |  |  |  |

## Decision

- Decision: `NO-GO` until every row is `go`.
- Pilot scope and expiry: ____________________
- Open risks and compensating controls: ____________________
- Incident commander: ____________________
- Release approver: ____________________
- Data owner: ____________________
- Security approver: ____________________
- Signatures/date: ____________________

This record authorizes neither general production launch nor SOC 2 certification/attestation. An independent auditor and qualified legal/security/privacy professionals determine any attestation.
