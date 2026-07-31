# API standards

REST JSON under `/v1`; internal administration under `/admin/v1`. OAuth/OIDC for users, client credentials or workload identity for services. Authorization derives tenant/environment scope from verified identity.

Writes require `Idempotency-Key`; state-sensitive writes require `If-Match`. Responses include `request_id`, stable resource identifiers, and version. List endpoints use cursor pagination and bounded limits. Errors follow one structured envelope with stable codes, field details, retryability, and documentation link.

Every endpoint documents authentication, permissions, classifications, rate limits, request/response schemas, errors, audit events, idempotency, consistency, examples, and SDK behavior. The UI uses these contracts without privileged shortcuts.
