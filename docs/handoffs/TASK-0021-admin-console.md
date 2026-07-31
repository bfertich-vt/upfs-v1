# TASK-0021 Admin console vertical slice

Implemented `apps/admin-console/admin-console.mjs` with API-backed Dashboard, tenant explorer, and platform-health views. The adapter is bound to `contracts/openapi/admin-api.yaml`, sends credentials and optional case-bound support-session header, bounds tenant pagination, and preserves fail-closed permission/error states. No direct database, OpenSearch, Redis, Kubernetes, or financial-data access exists. Tests use synthetic fixtures only.

The console now also exposes read-only operational module views for operations, releases, incidents, audit, data quality, ingestion, workflows, policies, and compliance. These use a generic API seam and redact secret-like fields in rendering. Tenant detail can load redacted managed observability/deployment/backup status through the `managedIntegrations` seam; unavailable providers remain non-fatal and visibly unavailable.

Validation: `node --test apps/admin-console/admin-console.test.mjs` (4 passing).
