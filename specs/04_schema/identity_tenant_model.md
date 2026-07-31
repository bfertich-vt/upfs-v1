# Identity and tenant foundation

UPFS identities are authenticated through an external OAuth/OIDC issuer. UPFS stores the issuer subject and immutable identity id, but never passwords or bearer tokens. Organizations own tenants; tenants own isolated environments. An environment is the authorization and data-routing boundary for all product resources.

## Invariants

- Organization, tenant, and environment identifiers are opaque UUIDs.
- A tenant belongs to exactly one organization; an environment belongs to exactly one tenant.
- The server derives organization, tenant, and environment scope from the verified identity and membership, never from an untrusted request field.
- Memberships are deny-by-default and carry explicit roles/scopes, status, and timestamps.
- Creation and membership changes require an authenticated actor, policy evaluation, `Idempotency-Key`, a transaction, and an append-only audit event.
- State-sensitive updates require `If-Match` and reject stale versions with `412`.
- Soft deactivation preserves history and never erases audit or identity provenance.

## Threat and tenant-isolation notes

The primary threat is broken object-level authorization. Every lookup is constrained by the verified actor's environment scope and database row-level policies. Cross-tenant identifiers must return the same not-found/forbidden envelope without disclosing existence. Support access, if added later, must be separately brokered and time-bound; it is not part of this foundation.

Rollback is corrective-forward: deactivate the created resource or membership and retain its audit trail. No destructive deletion is required for this task.
