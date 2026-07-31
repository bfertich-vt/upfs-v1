/** Generated from OpenAPI contracts. Do not edit. */
export type UpfsApiVersion = "1.0.0";

export const readPlatformHealth = { method: "GET", path: "/admin/v1/health" } as const;
export const readTenantEnvironmentStatus = { method: "GET", path: "/admin/v1/tenants/{tenant_id}" } as const;
export const createOrganization = { method: "POST", path: "/admin/v1/organizations" } as const;
export const listTenants = { method: "GET", path: "/admin/v1/tenants" } as const;
export const createTenant = { method: "POST", path: "/admin/v1/tenants" } as const;
export const createEnvironment = { method: "POST", path: "/admin/v1/environments" } as const;
export const createAdministrativeOperation = { method: "POST", path: "/admin/v1/operations" } as const;
export const readOperations = { method: "GET", path: "/admin/v1/operations" } as const;
export const approveAdministrativeOperation = { method: "POST", path: "/admin/v1/operations/{operation_id}/approve" } as const;
export const executeAdministrativeOperation = { method: "POST", path: "/admin/v1/operations/{operation_id}/execute" } as const;
export const rollbackAdministrativeOperation = { method: "POST", path: "/admin/v1/operations/{operation_id}/rollback" } as const;
export const readReleases = { method: "GET", path: "/admin/v1/releases" } as const;
export const readIncidents = { method: "GET", path: "/admin/v1/incidents" } as const;
export const readAudit = { method: "GET", path: "/admin/v1/audit" } as const;
export const readDataQuality = { method: "GET", path: "/admin/v1/data-quality" } as const;
export const readIngestion = { method: "GET", path: "/admin/v1/ingestion" } as const;
export const readWorkflows = { method: "GET", path: "/admin/v1/workflows" } as const;
export const readPolicies = { method: "GET", path: "/admin/v1/policies" } as const;
export const readCompliance = { method: "GET", path: "/admin/v1/compliance" } as const;
export const readManagedIntegrations = { method: "GET", path: "/admin/v1/managed-integrations" } as const;
export const governedReadOnlyChat = { method: "POST", path: "/chat" } as const;
export const searchTransactionsProjection = { method: "POST", path: "/transactions/search" } as const;
export const searchTransactions = { method: "POST", path: "/transactions/search" } as const;
