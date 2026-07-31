import crypto from 'node:crypto';

const clone = (value) => value === null || typeof value !== 'object' ? value : Array.isArray(value) ? value.map(clone) : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
const safeActor = (actor) => actor?.issuer && actor?.subject;
const error = (status, code, details) => ({ status, body: { code, ...(details ? { details } : {}) } });

/** Rebuildable, in-memory reference for an OpenSearch transaction projection.
 * PostgreSQL/canonical state remains authoritative; production consumes a
 * transactional outbox and writes versioned aliases, never making this index
 * the source of truth.
 */
export class TransactionProjectionService {
  #documents = new Map();
  #events = new Map();
  #watermarks = new Map();
  #audit = [];
  constructor({ authorize = () => false, now = () => new Date(), requestId = () => `req-${crypto.randomUUID()}` } = {}) {
    this.authorize = authorize; this.now = now; this.requestId = requestId;
  }

  consume({ actor, eventId, transaction, sourceVersion = transaction?.version ?? 1, occurredAt = this.now().toISOString() }) {
    if (!safeActor(actor)) return error(401, 'authentication_required');
    if (!eventId || typeof eventId !== 'string' || !transaction?.id || !transaction.tenant_id) return error(400, 'invalid_projection_event');
    if (!Number.isInteger(sourceVersion) || sourceVersion < 1) return error(400, 'invalid_projection_version');
    const key = `${transaction.tenant_id}|${transaction.id}`;
    const eventHash = hash({ eventId, transaction, sourceVersion });
    const priorEvent = this.#events.get(eventId);
    if (priorEvent) return priorEvent.hash === eventHash ? clone(priorEvent.result) : error(409, 'projection_event_conflict');
    const prior = this.#documents.get(key);
    if (prior && sourceVersion < prior.source_version) {
      const result = { status: 202, body: { applied: false, reason: 'out_of_order', source_version: prior.source_version } };
      this.#events.set(eventId, { hash: eventHash, result });
      return clone(result);
    }
    if (prior && sourceVersion === prior.source_version && prior.source_hash === hash(transaction)) {
      const result = { status: 202, body: { applied: false, reason: 'duplicate_version', source_version: sourceVersion } };
      this.#events.set(eventId, { hash: eventHash, result });
      return clone(result);
    }
    const document = projectTransaction(transaction, sourceVersion);
    this.#documents.set(key, { ...document, source_hash: hash(transaction), projected_at: occurredAt });
    this.#watermarks.set(transaction.tenant_id, Math.max(this.#watermarks.get(transaction.tenant_id) ?? 0, sourceVersion));
    const result = { status: 202, body: { applied: true, id: transaction.id, tenant_id: transaction.tenant_id, source_version: sourceVersion, projection_version: '1.0.0' } };
    this.#events.set(eventId, { hash: eventHash, result });
    this.#audit.push({ action: 'projection.consume', tenant_id: transaction.tenant_id, resource_id: transaction.id, source_version: sourceVersion, actor: `${actor.issuer}|${actor.subject}`, event_id: eventId, at: occurredAt });
    return clone(result);
  }

  reconcile({ actor, tenantId, canonicalTransactions = [], watermark = 0 }) {
    if (!safeActor(actor)) return error(401, 'authentication_required');
    if (!tenantId || !this.authorize(actor, tenantId)) return error(403, 'forbidden');
    if (!Array.isArray(canonicalTransactions)) return error(400, 'invalid_reconciliation_input');
    const expected = canonicalTransactions.filter((tx) => tx?.tenant_id === tenantId).map((tx) => ({ ...projectTransaction(tx, tx.version ?? 1), source_hash: hash(tx) })).sort((a, b) => a.id.localeCompare(b.id));
    const actual = [...this.#documents.values()].filter((doc) => doc.tenant_id === tenantId).map(({ projected_at, ...doc }) => doc).sort((a, b) => a.id.localeCompare(b.id));
    const drift = hash(expected) !== hash(actual);
    const result = { status: 200, body: { tenant_id: tenantId, drift, expected_count: expected.length, actual_count: actual.length, watermark: this.#watermarks.get(tenantId) ?? 0, requested_watermark: watermark } };
    this.#audit.push({ action: 'projection.reconcile', tenant_id: tenantId, actor: `${actor.issuer}|${actor.subject}`, drift, expected_count: expected.length, actual_count: actual.length, at: this.now().toISOString() });
    return result;
  }

  rebuild({ actor, tenantId, canonicalTransactions = [], watermark = 0 }) {
    if (!safeActor(actor)) return error(401, 'authentication_required');
    if (!tenantId || !this.authorize(actor, tenantId)) return error(403, 'forbidden');
    if (!Array.isArray(canonicalTransactions)) return error(400, 'invalid_rebuild_input');
    for (const key of [...this.#documents.keys()]) if (key.startsWith(`${tenantId}|`)) this.#documents.delete(key);
    for (const tx of canonicalTransactions.filter((item) => item?.tenant_id === tenantId)) {
      const version = tx.version ?? 1;
      this.#documents.set(`${tenantId}|${tx.id}`, { ...projectTransaction(tx, version), source_hash: hash(tx), projected_at: this.now().toISOString() });
    }
    this.#watermarks.set(tenantId, watermark);
    this.#audit.push({ action: 'projection.rebuild', tenant_id: tenantId, actor: `${actor.issuer}|${actor.subject}`, count: canonicalTransactions.filter((item) => item?.tenant_id === tenantId).length, watermark, at: this.now().toISOString() });
    return { status: 200, body: { tenant_id: tenantId, rebuilt: true, count: canonicalTransactions.filter((item) => item?.tenant_id === tenantId).length, watermark } };
  }

  search({ actor, tenantId, query = '', limit = 25, cursor = null }) {
    if (!safeActor(actor)) return error(401, 'authentication_required');
    if (!tenantId || !this.authorize(actor, tenantId)) return error(403, 'forbidden');
    if (typeof query !== 'string' || query.length < 1 || query.length > 500) return error(400, 'invalid_query');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return error(400, 'invalid_limit');
    const queryHash = hash(query.trim().toLowerCase());
    let offset = 0;
    if (cursor) {
      try { const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString()); if (decoded.tenantId !== tenantId || decoded.queryHash !== queryHash || !Number.isInteger(decoded.offset) || decoded.offset < 0) throw new Error(); offset = decoded.offset; } catch { return error(400, 'invalid_cursor'); }
    }
    const terms = query.trim().toLowerCase().split(/\s+/);
    const matches = [...this.#documents.values()].filter((doc) => doc.tenant_id === tenantId && terms.every((term) => [doc.id, doc.account_id, doc.amount, doc.currency, doc.posted_at, doc.description ?? ''].join(' ').toLowerCase().includes(term))).sort((a, b) => b.posted_at.localeCompare(a.posted_at) || b.id.localeCompare(a.id));
    const page = matches.slice(offset, offset + limit).map(publicDocument);
    const nextOffset = offset + page.length;
    const nextCursor = nextOffset < matches.length ? Buffer.from(JSON.stringify({ tenantId, queryHash, offset: nextOffset })).toString('base64url') : null;
    return { status: 200, body: { request_id: this.requestId(), data: page, page: { limit, next_cursor: nextCursor }, consistency: 'eventually_consistent_projection', watermark: this.#watermarks.get(tenantId) ?? 0 } };
  }

  documents() { return [...this.#documents.values()].map(clone); }
  audit() { return this.#audit.map(clone); }
}

export function projectTransaction(transaction, sourceVersion = transaction.version ?? 1) {
  return { id: transaction.id, tenant_id: transaction.tenant_id, account_id: transaction.account_id, amount: transaction.amount, currency: transaction.currency, posted_at: transaction.posted_at, schema_version: transaction.schema_version, evidence_refs: [...transaction.evidence_refs], ...(transaction.description !== undefined ? { description: transaction.description } : {}), source_version: sourceVersion, projection_version: '1.0.0' };
}

function publicDocument(document) { const { source_hash, projected_at, ...safe } = document; return clone(safe); }
