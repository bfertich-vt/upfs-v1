/** PostgreSQL production adapter. Requires an injected pg-compatible Pool;
 * there is deliberately no driver fallback or implicit local configuration. */
export class PostgresPersistenceAdapter {
  #pool;
  constructor({ pool, databaseUrl = process.env.UPFS_DATABASE_URL } = {}) {
    if (!pool || typeof pool.connect !== 'function' || typeof pool.query !== 'function') throw new Error('postgres pool is required; reference fallback is disabled');
    if (!databaseUrl && process.env.NODE_ENV === 'production') throw new Error('UPFS_DATABASE_URL is required in production');
    this.#pool = pool;
  }
  async health() { const result = await this.#pool.query('SELECT 1 AS ok'); return { status: result.rows?.[0]?.ok === 1 ? 'healthy' : 'unhealthy' }; }
  async transaction(work, { tenantId, organizationId } = {}) {
    if (typeof work !== 'function') throw new TypeError('transaction callback is required');
    if (typeof tenantId !== 'string' || !tenantId) throw new Error('tenant scope is required');
    const client = await this.#pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
      if (organizationId) await client.query('SELECT set_config($1, $2, true)', ['app.organization_id', organizationId]);
      const result = await work({ query: (text, values) => client.query(text, values) });
      await client.query('COMMIT');
      return result;
    } catch (error) { try { await client.query('ROLLBACK'); } finally { throw error; } } finally { client.release(); }
  }
  async insertAudit({ actor, action, tenantId, resourceId = null, metadata = {} }) {
    if (!actor || !action || !tenantId) throw new Error('audit actor, action, and tenant scope are required');
    const allowed = new Set(['request_id', 'status', 'version', 'content_hash', 'schema_version', 'environment_id']);
    const sensitive = /content|prompt|credential|secret|token|password|financial|amount|account|raw/i;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('audit metadata must be an object');
    for (const [key, value] of Object.entries(metadata)) {
      if (!allowed.has(key) || sensitive.test(key) || (typeof value === 'string' && sensitive.test(value))) throw new Error('audit metadata contains prohibited content');
      if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) throw new Error('audit metadata values must be scalar');
    }
    return this.transaction(({ query }) => query('INSERT INTO audit_events (tenant_id, actor, action, resource_id, metadata) VALUES ($1,$2,$3,$4,$5) RETURNING id', [tenantId, actor, action, resourceId, metadata]).then((r) => r.rows[0]), { tenantId });
  }
}

export function createPostgresAdapter(options = {}) { return new PostgresPersistenceAdapter(options); }
