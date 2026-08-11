# UPFS Public API Reference

> Generated from versioned contracts. Synthetic examples only.

## UPFS Administrative API (v1.0.0)

### GET /admin/v1/health

Undescribed operation.
- Operation: `readPlatformHealth`
- Permission: `admin:read`
- Responses: `200, 401, 403, 499, 503`
- Example: synthetic only

### GET /admin/v1/tenants/{tenant_id}

Undescribed operation.
- Operation: `readTenantEnvironmentStatus`
- Permission: `admin:read`
- Responses: `200, 401, 403, 404, 499, 503`
- Example: synthetic only

### POST /admin/v1/organizations

Undescribed operation.
- Operation: `createOrganization`
- Permission: `organizations.write`
- Responses: `201, 401, 403, 409`
- Example: synthetic only

### GET /admin/v1/tenants

Undescribed operation.
- Operation: `listTenants`
- Permission: `admin:read`
- Responses: `200, 400, 401, 403, 499, 503`
- Example: synthetic only

### POST /admin/v1/tenants

Undescribed operation.
- Operation: `createTenant`
- Permission: `tenants.write`
- Responses: `201, 401, 403`
- Example: synthetic only

### POST /admin/v1/environments

Undescribed operation.
- Operation: `createEnvironment`
- Permission: `environments.write`
- Responses: `201, 401, 403`
- Example: synthetic only

### POST /admin/v1/operations

Undescribed operation.
- Operation: `createAdministrativeOperation`
- Permission: `admin:write`
- Responses: `202`
- Example: synthetic only

### GET /admin/v1/operations

Undescribed operation.
- Operation: `readOperations`
- Permission: `admin:read`
- Responses: `200, 401, 403`
- Example: synthetic only

### POST /admin/v1/operations/{operation_id}/approve

Undescribed operation.
- Operation: `approveAdministrativeOperation`
- Permission: `admin:write`
- Responses: `200, 403, 404`
- Example: synthetic only

### POST /admin/v1/operations/{operation_id}/execute

Undescribed operation.
- Operation: `executeAdministrativeOperation`
- Permission: `admin:write`
- Responses: `200, 409, 503`
- Example: synthetic only

### POST /admin/v1/operations/{operation_id}/rollback

Undescribed operation.
- Operation: `rollbackAdministrativeOperation`
- Permission: `admin:write`
- Responses: `200, 403, 404`
- Example: synthetic only

### GET /admin/v1/releases

Undescribed operation.
- Operation: `readReleases`
- Permission: `admin:read`
- Responses: `200`
- Example: synthetic only

### GET /admin/v1/incidents

Undescribed operation.
- Operation: `readIncidents`
- Permission: `admin:read`
- Responses: `200`
- Example: synthetic only

### GET /admin/v1/audit

Undescribed operation.
- Operation: `readAudit`
- Permission: `admin:read`
- Responses: `200`
- Example: synthetic only

### GET /admin/v1/data-quality

Undescribed operation.
- Operation: `readDataQuality`
- Permission: `admin:read`
- Responses: `200`
- Example: synthetic only

### GET /admin/v1/ingestion

Undescribed operation.
- Operation: `readIngestion`
- Permission: `admin:read`
- Responses: `200`
- Example: synthetic only

### GET /admin/v1/support-access

Undescribed operation.
- Operation: `readSupportAccess`
- Permission: `admin:read`
- Responses: `200, 403`
- Example: synthetic only

### GET /admin/v1/canonical-quality

Undescribed operation.
- Operation: `readCanonicalQuality`
- Permission: `admin:read`
- Responses: `200, 403`
- Example: synthetic only

### GET /admin/v1/search-projections

Undescribed operation.
- Operation: `readSearchProjections`
- Permission: `admin:read`
- Responses: `200, 403`
- Example: synthetic only

### GET /admin/v1/redis

Undescribed operation.
- Operation: `readRedisHealth`
- Permission: `admin:read`
- Responses: `200, 403`
- Example: synthetic only

### GET /admin/v1/ai-ops

Undescribed operation.
- Operation: `readAiOperations`
- Permission: `admin:read`
- Responses: `200, 403`
- Example: synthetic only

### GET /admin/v1/security

Undescribed operation.
- Operation: `readSecurity`
- Permission: `admin:read`
- Responses: `200, 403`
- Example: synthetic only

### GET /admin/v1/policy-simulator

Undescribed operation.
- Operation: `readPolicySimulator`
- Permission: `admin:read`
- Responses: `200, 403`
- Example: synthetic only

### GET /admin/v1/workflows

Undescribed operation.
- Operation: `readWorkflows`
- Permission: `admin:read`
- Responses: `200`
- Example: synthetic only

### GET /admin/v1/policies

Undescribed operation.
- Operation: `readPolicies`
- Permission: `admin:read`
- Responses: `200`
- Example: synthetic only

### GET /admin/v1/compliance

Undescribed operation.
- Operation: `readCompliance`
- Permission: `admin:read`
- Responses: `200`
- Example: synthetic only

### GET /admin/v1/managed-integrations

Undescribed operation.
- Operation: `readManagedIntegrations`
- Permission: `admin:read`
- Responses: `200, 401, 403, 404, 503`
- Example: synthetic only

## UPFS Governed Read-only Chat API (v1.2.0)

### POST /v1/chat

Answer from authorized records with exact evidence citations.
- Operation: `governedReadOnlyChat`
- Permission: `chat.read`
- Responses: `200, 400, 401, 403, 409, 429, 500, 502, 503, 504`
- Example: synthetic only

## UPFS Projection Search API (v1.0.0)

### POST /transactions/search

Search tenant-authorized transaction projection.
- Operation: `searchTransactionsProjection`
- Permission: `transactions.search`
- Responses: `200, 400, 401, 403`
- Example: synthetic only

## UPFS Public API (v1.0.0)

### POST /transactions/search

Search authorized canonical transactions.
- Operation: `searchTransactions`
- Permission: `transactions.search`
- Responses: `200, 401, 403`
- Example: synthetic only

## Events

- UPFS Platform Events v1.0.0
  - `canonicalTransactionChanged` (canonical.transaction.changed.v1)

## Schemas

- `canonical-transaction.schema` (CanonicalTransaction)
- `identity-foundation.schema` (Identity and tenant foundation resources)
- `provider-transaction.schema` (ProviderTransactionObservation)
- `raw-evidence.schema` (RawEvidenceObservation)
- `transaction-search-response.schema` (Transaction search response)
- `transaction.schema` (CanonicalTransaction)
