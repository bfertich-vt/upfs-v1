/** Bounded seams for managed observability, deployment, and backup systems. */
export class ManagedIntegrationError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const fail = (code, message) => { throw new ManagedIntegrationError(code, message); };
const tenant = (value) => typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value);
const redacted = (value) => ({ status: value?.status ?? 'unknown', observed_at: value?.observed_at ?? null, data_classification: 'operational_metadata', tenant_id: value?.tenant_id });

export class ManagedObservabilityAdapter { async status() { fail('provider_not_configured', 'managed observability provider is not configured'); } }
export class ManagedDeploymentAdapter { async status() { fail('provider_not_configured', 'managed deployment provider is not configured'); } }
export class ManagedBackupAdapter { async status() { fail('provider_not_configured', 'managed backup provider is not configured'); } }

/** Synthetic adapters are deterministic fixtures and must never be used for production credentials. */
export class SyntheticManagedAdapter {
  constructor(kind, entries = {}) { this.kind = kind; this.entries = new Map(Object.entries(entries)); }
  async status({ tenantId, environmentId } = {}) {
    if (!tenant(tenantId) || !tenant(environmentId)) fail('tenant_scope_required', 'tenant and environment scope are required');
    const value = this.entries.get(`${tenantId}|${environmentId}`) ?? this.entries.get(tenantId);
    if (!value) fail('status_not_found', `${this.kind} status was not found`);
    return { ...value, tenant_id: tenantId, environment_id: environmentId, synthetic_only: true };
  }
}

export const syntheticObservability = (entries) => new SyntheticManagedAdapter('observability', entries);
export const syntheticDeployment = (entries) => new SyntheticManagedAdapter('deployment', entries);
export const syntheticBackup = (entries) => new SyntheticManagedAdapter('backup', entries);

export class ManagedIntegrationReadService {
  constructor({ observability, deployment, backup } = {}) {
    if (!observability || !deployment || !backup) fail('provider_not_configured', 'all managed integration providers are required');
    this.providers = { observability, deployment, backup };
  }
  async status({ actor, tenantId, environmentId }) {
    if (!actor?.issuer || !actor?.subject) return { status: 401, body: { code: 'authentication_required' } };
    if (!Array.isArray(actor.admin_scopes) || !actor.admin_scopes.includes('admin:read')) return { status: 403, body: { code: 'admin_scope_required' } };
    if (!tenant(tenantId) || !tenant(environmentId)) return { status: 400, body: { code: 'invalid_scope' } };
    const result = {};
    try {
      for (const [name, provider] of Object.entries(this.providers)) result[name] = redacted(await provider.status({ tenantId, environmentId }));
    } catch (error) {
      return { status: error.code === 'status_not_found' ? 404 : 503, body: { code: error.code ?? 'provider_unavailable', retryable: true } };
    }
    return { status: 200, body: { tenant_id: tenantId, environment_id: environmentId, data_classification: 'operational_metadata', ...result } };
  }
}
