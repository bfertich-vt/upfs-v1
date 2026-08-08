import crypto from 'node:crypto';

const clone = (value) => value === null || typeof value !== 'object' ? value : Array.isArray(value) ? value.map(clone) : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
const safeBoundary = (value) => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 512 && !/[\u0000-\u001f\u007f-\u009f]/u.test(value);
const safeActor = (actor) => Boolean(actor && typeof actor === 'object' && safeBoundary(actor.issuer) && safeBoundary(actor.subject));
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
  #generations = new Map();
  #audit = [];
  #cursorKey = crypto.randomBytes(32);
  constructor({ authorize = () => false, now = () => new Date(), requestId = () => `req-${crypto.randomUUID()}`, indexDocument = () => {}, promoteAlias = () => {} } = {}) {
    this.authorize = authorize; this.now = now; this.requestId = requestId; this.indexDocument = indexDocument; this.promoteAlias = promoteAlias;
  }

  consume({ actor, eventId, transaction, sourceVersion = transaction?.version ?? 1, occurredAt = this.now().toISOString() }) {
    if (!safeActor(actor)) return error(401, 'authentication_required');
    if (!eventId || typeof eventId !== 'string' || !validTransaction(transaction)) return error(400, 'invalid_projection_event');
    if (!Number.isInteger(sourceVersion) || sourceVersion < 1) return error(400, 'invalid_projection_version');
    if (!authorized(this.authorize, actor, transaction.tenant_id)) return error(403, 'forbidden');
    const key = `${transaction.tenant_id}|${transaction.id}`;
    let eventHash;
    try { eventHash = hash({ eventId, transaction, sourceVersion }); } catch { return error(400, 'invalid_projection_event'); }
    const priorEvent = this.#events.get(eventId);
    if (priorEvent) return priorEvent.hash === eventHash ? clone(priorEvent.result) : error(409, 'projection_event_conflict');
    const prior = this.#documents.get(key);
    if (prior && sourceVersion < prior.source_version) {
      const result = { status: 202, body: { applied: false, reason: 'out_of_order', source_version: prior.source_version } };
      this.#events.set(eventId, { hash: eventHash, result, tenantId: transaction.tenant_id });
      return clone(result);
    }
    if (prior && sourceVersion === prior.source_version && prior.source_hash === hash(transaction)) {
      const result = { status: 202, body: { applied: false, reason: 'duplicate_version', source_version: sourceVersion } };
      this.#events.set(eventId, { hash: eventHash, result, tenantId: transaction.tenant_id });
      return clone(result);
    }
    if (prior && sourceVersion === prior.source_version) return error(409, 'projection_version_conflict');
    const document = projectTransaction(transaction, sourceVersion);
    try { this.indexDocument(clone(document), { operation: 'consume', tenantId: transaction.tenant_id }); } catch {
      this.#audit.push({ action: 'projection.consume_failed', tenant_id: transaction.tenant_id, resource_id: transaction.id, source_version: sourceVersion, actor: `${actor.issuer}|${actor.subject}`, event_id: eventId, at: occurredAt });
      return error(503, 'projection_index_unavailable', { retryable: true });
    }
    this.#documents.set(key, { ...document, source_hash: hash(transaction), projected_at: occurredAt });
    this.#watermarks.set(transaction.tenant_id, Math.max(this.#watermarks.get(transaction.tenant_id) ?? 0, sourceVersion));
    this.#generations.set(transaction.tenant_id, (this.#generations.get(transaction.tenant_id) ?? 0) + 1);
    const result = { status: 202, body: { applied: true, id: transaction.id, tenant_id: transaction.tenant_id, source_version: sourceVersion, projection_version: '1.0.0' } };
    this.#events.set(eventId, { hash: eventHash, result, tenantId: transaction.tenant_id });
    this.#audit.push({ action: 'projection.consume', tenant_id: transaction.tenant_id, resource_id: transaction.id, source_version: sourceVersion, actor: `${actor.issuer}|${actor.subject}`, event_id: eventId, at: occurredAt });
    return clone(result);
  }

  reconcile({ actor, tenantId, canonicalTransactions = [], watermark = 0 }) {
    if (!safeActor(actor)) return error(401, 'authentication_required');
    if (!tenantId || !authorized(this.authorize, actor, tenantId)) return error(403, 'forbidden');
    if (!Array.isArray(canonicalTransactions) || !validWatermark(watermark)) return error(400, 'invalid_reconciliation_input');
    if (canonicalTransactions.some((tx) => !validTransaction(tx) || tx.tenant_id !== tenantId)) return error(400, 'invalid_reconciliation_input');
    const expected = canonicalTransactions.map((tx) => ({ ...projectTransaction(tx, tx.version ?? 1), source_hash: hash(tx) })).sort((a, b) => a.id.localeCompare(b.id));
    if (watermark > (this.#watermarks.get(tenantId) ?? 0)) return error(409, 'watermark_unavailable');
    const actual = [...this.#documents.values()].filter((doc) => doc.tenant_id === tenantId).map(({ projected_at, ...doc }) => doc).sort((a, b) => a.id.localeCompare(b.id));
    const drift = hash(expected) !== hash(actual);
    const result = { status: 200, body: { tenant_id: tenantId, drift, expected_count: expected.length, actual_count: actual.length, watermark: this.#watermarks.get(tenantId) ?? 0, requested_watermark: watermark } };
    this.#audit.push({ action: 'projection.reconcile', tenant_id: tenantId, actor: `${actor.issuer}|${actor.subject}`, drift, expected_count: expected.length, actual_count: actual.length, at: this.now().toISOString() });
    return result;
  }

  rebuild({ actor, tenantId, canonicalTransactions = [], watermark = 0 }) {
    if (!safeActor(actor)) return error(401, 'authentication_required');
    if (!tenantId || !authorized(this.authorize, actor, tenantId)) return error(403, 'forbidden');
    if (!Array.isArray(canonicalTransactions) || !validWatermark(watermark)) return error(400, 'invalid_rebuild_input');
    if (canonicalTransactions.some((tx) => !validTransaction(tx) || tx.tenant_id !== tenantId)) return error(400, 'invalid_rebuild_input');
    const records = canonicalTransactions;
    if (watermark < (this.#watermarks.get(tenantId) ?? 0) || watermark < maxVersion(records)) return error(409, 'invalid_rebuild_watermark');
    const staged = new Map();
    const nextGeneration = (this.#generations.get(tenantId) ?? 0) + 1;
    try {
      for (const tx of records) {
        const version = tx.version ?? 1;
        const document = { ...projectTransaction(tx, version), source_hash: hash(tx), projected_at: this.now().toISOString() };
        this.indexDocument(clone(document), { operation: 'rebuild', tenantId, generation: nextGeneration });
        staged.set(`${tenantId}|${tx.id}`, document);
      }
      this.promoteAlias({ tenantId, generation: nextGeneration, documentCount: staged.size });
    } catch {
      this.#audit.push({ action: 'projection.rebuild_failed', tenant_id: tenantId, actor: `${actor.issuer}|${actor.subject}`, attempted_count: records.length, watermark, at: this.now().toISOString() });
      return error(503, 'projection_rebuild_failed', { retryable: true, alias_promoted: false });
    }
    for (const key of [...this.#documents.keys()]) if (key.startsWith(`${tenantId}|`)) this.#documents.delete(key);
    for (const [key, document] of staged) this.#documents.set(key, document);
    this.#watermarks.set(tenantId, watermark);
    this.#generations.set(tenantId, nextGeneration);
    for (const [eventId, event] of this.#events) if (event.tenantId === tenantId) this.#events.delete(eventId);
    this.#audit.push({ action: 'projection.rebuild', tenant_id: tenantId, actor: `${actor.issuer}|${actor.subject}`, count: canonicalTransactions.filter((item) => item?.tenant_id === tenantId).length, watermark, at: this.now().toISOString() });
    return { status: 200, body: { tenant_id: tenantId, rebuilt: true, count: canonicalTransactions.filter((item) => item?.tenant_id === tenantId).length, watermark } };
  }

  search({ actor, tenantId, query = '', limit = 25, cursor = null }) {
    if (!safeActor(actor)) return error(401, 'authentication_required');
    if (!tenantId || !authorized(this.authorize, actor, tenantId)) return error(403, 'forbidden');
    if (typeof query !== 'string' || query.trim().length < 1 || query.length > 500) return error(400, 'invalid_query');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) return error(400, 'invalid_limit');
    const queryHash = hash(query.trim().toLowerCase());
    const generation = this.#generations.get(tenantId) ?? 0;
    let offset = 0;
    if (cursor) {
      try { const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString()); const { mac, ...payload } = decoded; if (decoded.tenantId !== tenantId || decoded.queryHash !== queryHash || decoded.generation !== generation || !Number.isInteger(decoded.offset) || decoded.offset < 0 || !mac || !safeMac(payload, mac, this.#cursorKey)) throw new Error(); offset = decoded.offset; } catch { return error(400, 'invalid_cursor'); }
    }
    const terms = query.trim().toLowerCase().split(/\s+/);
    const matches = [...this.#documents.values()].filter((doc) => doc.tenant_id === tenantId && terms.every((term) => [doc.id, doc.account_id, doc.amount, doc.currency, doc.posted_at, doc.description ?? ''].join(' ').toLowerCase().includes(term))).sort((a, b) => b.posted_at.localeCompare(a.posted_at) || b.id.localeCompare(a.id));
    const page = matches.slice(offset, offset + limit).map(publicDocument);
    const nextOffset = offset + page.length;
    const cursorPayload = { tenantId, queryHash, generation, offset: nextOffset };
    const nextCursor = nextOffset < matches.length ? Buffer.from(JSON.stringify({ ...cursorPayload, mac: signMac(cursorPayload, this.#cursorKey) })).toString('base64url') : null;
    return { status: 200, body: { request_id: this.requestId(), data: page, page: { limit, next_cursor: nextCursor }, consistency: 'eventually_consistent_projection', watermark: this.#watermarks.get(tenantId) ?? 0 } };
  }

  documents() { return [...this.#documents.values()].map(clone); }
  audit() { return this.#audit.map(clone); }
}

function validWatermark(value) { return Number.isInteger(value) && value >= 0; }
function authorized(authorize, actor, tenantId) { try { return authorize(actor, tenantId) === true; } catch { return false; } }
function validTransaction(tx) { return Boolean(tx && typeof tx === 'object' && safeBoundary(tx.id) && safeBoundary(tx.tenant_id) && safeBoundary(tx.account_id) && typeof tx.amount === 'string' && safeBoundary(tx.currency) && safeBoundary(tx.posted_at) && safeBoundary(tx.schema_version) && Array.isArray(tx.evidence_refs) && tx.evidence_refs.every(safeBoundary) && (tx.description === undefined || typeof tx.description === 'string')); }
function maxVersion(items) { return items.reduce((max, tx) => Math.max(max, tx?.source_version ?? tx?.version ?? 1), 0); }
function signMac(payload, key) { return crypto.createHmac('sha256', key).update(JSON.stringify(payload)).digest('base64url'); }
function safeMac(payload, mac, key) { const expected = signMac(payload, key); return mac.length === expected.length && crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected)); }

export function projectTransaction(transaction, sourceVersion = transaction.version ?? 1) {
  return { id: transaction.id, tenant_id: transaction.tenant_id, account_id: transaction.account_id, amount: transaction.amount, currency: transaction.currency, posted_at: transaction.posted_at, schema_version: transaction.schema_version, evidence_refs: [...transaction.evidence_refs], ...(transaction.description !== undefined ? { description: transaction.description } : {}), source_version: sourceVersion, projection_version: '1.0.0' };
}

function publicDocument(document) { const { source_hash, projected_at, ...safe } = document; return clone(safe); }
