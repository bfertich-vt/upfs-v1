# Internal admin control plane

The internal admin application is separate from the customer console and public API. It is protected by identity-aware access, managed devices, step-up authentication, fine-grained scopes, and preferably private/zero-trust networking.

The UI never directly edits databases, OpenSearch, Redis, Kubernetes, or tenant data. It calls documented `/admin/v1` APIs. Meaningful changes create durable administrative operations: validate → impact analysis → policy → approval → execution plan → execute → verify → evidence → notify.

Modules include platform health, organizations/tenants, support access broker, connector/ingestion fleet, canonical quality, search projections, Redis health, AI operations, workflow executions, policy simulator, security, compliance evidence, releases/flags, and incidents.

Operational metadata access does not imply access to financial data. Support sessions are case-bound, scoped, expiring, recorded, non-transferable, redacted by default, and approval/customer-consent aware.
