import crypto from 'node:crypto';
import { types as utilTypes } from 'node:util';

const clone = (value) => value === null || typeof value !== 'object' ? value : Array.isArray(value) ? value.map(clone) : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
const safeBoundary = (value) => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 512 && !/[\u0000-\u001f\u007f-\u009f]/u.test(value);
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

  consume(input = {}) {
    const parsed = safeInput(input, ['actor', 'eventId', 'transaction', 'sourceVersion', 'occurredAt']);
    if (!parsed) return error(400, 'invalid_projection_event');
    const { actor, eventId, transaction, occurredAt: suppliedOccurredAt } = parsed;
    const verifiedActor = safeActor(actor);
    if (!verifiedActor) return error(401, 'authentication_required');
    if (!safeBoundary(eventId) || !validTransaction(transaction)) return error(400, 'invalid_projection_event');
    const sourceVersion = parsed.sourceVersion ?? transaction.version ?? 1;
    if (!Number.isInteger(sourceVersion) || sourceVersion < 1) return error(400, 'invalid_projection_version');
    const occurredAt = suppliedOccurredAt === undefined ? safeNow(this.now) : safeTimestamp(suppliedOccurredAt);
    if (!occurredAt) return suppliedOccurredAt === undefined ? error(503, 'projection_clock_unavailable', { retryable: true }) : error(400, 'invalid_projection_event');
    if (!authorized(this.authorize, verifiedActor, transaction.tenant_id)) return error(403, 'forbidden');
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
      this.#audit.push({ action: 'projection.consume_failed', tenant_id: transaction.tenant_id, resource_id: transaction.id, source_version: sourceVersion, actor: `${verifiedActor.issuer}|${verifiedActor.subject}`, event_id: eventId, at: occurredAt });
      return error(503, 'projection_index_unavailable', { retryable: true });
    }
    this.#documents.set(key, { ...document, source_hash: hash(transaction), projected_at: occurredAt });
    this.#watermarks.set(transaction.tenant_id, Math.max(this.#watermarks.get(transaction.tenant_id) ?? 0, sourceVersion));
    this.#generations.set(transaction.tenant_id, (this.#generations.get(transaction.tenant_id) ?? 0) + 1);
    const result = { status: 202, body: { applied: true, id: transaction.id, tenant_id: transaction.tenant_id, source_version: sourceVersion, projection_version: '1.0.0' } };
    this.#events.set(eventId, { hash: eventHash, result, tenantId: transaction.tenant_id });
    this.#audit.push({ action: 'projection.consume', tenant_id: transaction.tenant_id, resource_id: transaction.id, source_version: sourceVersion, actor: `${verifiedActor.issuer}|${verifiedActor.subject}`, event_id: eventId, at: occurredAt });
    return clone(result);
  }

  reconcile(input = {}) {
    const parsed = safeInput(input, ['actor', 'tenantId', 'canonicalTransactions', 'watermark']);
    if (!parsed) return error(400, 'invalid_reconciliation_input');
    const { actor, tenantId, canonicalTransactions = [], watermark = 0 } = parsed;
    const verifiedActor = safeActor(actor);
    if (!verifiedActor) return error(401, 'authentication_required');
    if (!safeBoundary(tenantId) || !authorized(this.authorize, verifiedActor, tenantId)) return error(403, 'forbidden');
    if (!validCanonicalList(canonicalTransactions, tenantId) || !validWatermark(watermark)) return error(400, 'invalid_reconciliation_input');
    const auditedAt = safeNow(this.now);
    if (!auditedAt) return error(503, 'projection_clock_unavailable', { retryable: true });
    const expected = canonicalTransactions.map((tx) => ({ ...projectTransaction(tx, tx.version ?? 1), source_hash: hash(tx) })).sort((a, b) => a.id.localeCompare(b.id));
    if (watermark > (this.#watermarks.get(tenantId) ?? 0)) return error(409, 'watermark_unavailable');
    const actual = [...this.#documents.values()].filter((doc) => doc.tenant_id === tenantId).map(({ projected_at, ...doc }) => doc).sort((a, b) => a.id.localeCompare(b.id));
    const drift = hash(expected) !== hash(actual);
    const result = { status: 200, body: { tenant_id: tenantId, drift, expected_count: expected.length, actual_count: actual.length, watermark: this.#watermarks.get(tenantId) ?? 0, requested_watermark: watermark } };
    this.#audit.push({ action: 'projection.reconcile', tenant_id: tenantId, actor: `${verifiedActor.issuer}|${verifiedActor.subject}`, drift, expected_count: expected.length, actual_count: actual.length, at: auditedAt });
    return result;
  }

  rebuild(input = {}) {
    const parsed = safeInput(input, ['actor', 'tenantId', 'canonicalTransactions', 'watermark']);
    if (!parsed) return error(400, 'invalid_rebuild_input');
    const { actor, tenantId, canonicalTransactions = [], watermark = 0 } = parsed;
    const verifiedActor = safeActor(actor);
    if (!verifiedActor) return error(401, 'authentication_required');
    if (!safeBoundary(tenantId) || !authorized(this.authorize, verifiedActor, tenantId)) return error(403, 'forbidden');
    if (!validCanonicalList(canonicalTransactions, tenantId) || !validWatermark(watermark)) return error(400, 'invalid_rebuild_input');
    const records = canonicalTransactions;
    if (watermark < (this.#watermarks.get(tenantId) ?? 0) || watermark < maxVersion(records)) return error(409, 'invalid_rebuild_watermark');
    const rebuiltAt = safeNow(this.now);
    if (!rebuiltAt) return error(503, 'projection_clock_unavailable', { retryable: true });
    const staged = new Map();
    const nextGeneration = (this.#generations.get(tenantId) ?? 0) + 1;
    try {
      for (const tx of records) {
        const version = tx.version ?? 1;
        const document = { ...projectTransaction(tx, version), source_hash: hash(tx), projected_at: rebuiltAt };
        this.indexDocument(clone(document), { operation: 'rebuild', tenantId, generation: nextGeneration });
        staged.set(`${tenantId}|${tx.id}`, document);
      }
      this.promoteAlias({ tenantId, generation: nextGeneration, documentCount: staged.size });
    } catch {
      this.#audit.push({ action: 'projection.rebuild_failed', tenant_id: tenantId, actor: `${verifiedActor.issuer}|${verifiedActor.subject}`, attempted_count: records.length, watermark, at: rebuiltAt });
      return error(503, 'projection_rebuild_failed', { retryable: true, alias_promoted: false });
    }
    for (const key of [...this.#documents.keys()]) if (key.startsWith(`${tenantId}|`)) this.#documents.delete(key);
    for (const [key, document] of staged) this.#documents.set(key, document);
    this.#watermarks.set(tenantId, watermark);
    this.#generations.set(tenantId, nextGeneration);
    for (const [eventId, event] of this.#events) if (event.tenantId === tenantId) this.#events.delete(eventId);
    this.#audit.push({ action: 'projection.rebuild', tenant_id: tenantId, actor: `${verifiedActor.issuer}|${verifiedActor.subject}`, count: canonicalTransactions.length, watermark, at: rebuiltAt });
    return { status: 200, body: { tenant_id: tenantId, rebuilt: true, count: canonicalTransactions.filter((item) => item?.tenant_id === tenantId).length, watermark } };
  }

  search(input = {}) {
    const parsed = safeInput(input, ['actor', 'tenantId', 'query', 'limit', 'cursor']);
    if (!parsed) return error(400, 'invalid_query');
    const { actor, tenantId, query = '', limit = 25, cursor = null } = parsed;
    const verifiedActor = safeActor(actor);
    if (!verifiedActor) return error(401, 'authentication_required');
    if (!safeBoundary(tenantId) || !authorized(this.authorize, verifiedActor, tenantId)) return error(403, 'forbidden');
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
    const requestId = safeRequestId(this.requestId);
    if (!requestId) return error(503, 'projection_search_unavailable', { retryable: true });
    return { status: 200, body: { request_id: requestId, data: page, page: { limit, next_cursor: nextCursor }, consistency: 'eventually_consistent_projection', watermark: this.#watermarks.get(tenantId) ?? 0 } };
  }

  documents() { return [...this.#documents.values()].map(clone); }
  audit() { return this.#audit.map(clone); }
}

function validWatermark(value) { return Number.isInteger(value) && value >= 0; }
function validCanonicalList(value, tenantId) { return serializationSafe(value) && Array.isArray(value) && value.every((tx) => validTransaction(tx) && tx.tenant_id === tenantId); }
function authorized(authorize, actor, tenantId) { try { return authorize(actor, tenantId) === true; } catch { return false; } }
function safeActor(actor) {
  try {
    if (utilTypes.isProxy(actor) || !plainRecord(actor)) return null;
    const descriptors = Object.getOwnPropertyDescriptors(actor);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== 2 || keys.some((key) => typeof key !== 'string' || !['issuer', 'subject'].includes(key))) return null;
    const issuer = descriptors.issuer; const subject = descriptors.subject;
    if (!issuer || !subject || !('value' in issuer) || !('value' in subject) || !issuer.enumerable || !subject.enumerable || !safeBoundary(issuer.value) || !safeBoundary(subject.value)) return null;
    return Object.freeze({ issuer: issuer.value, subject: subject.value });
  } catch { return null; }
}
function safeNow(now) { try { const value = now(); return value instanceof Date && Number.isFinite(value.valueOf()) ? value.toISOString() : null; } catch { return null; } }
function safeTimestamp(value) { if (!safeBoundary(value)) return null; const date = new Date(value); return Number.isFinite(date.valueOf()) && date.toISOString() === value ? value : null; }
function safeRequestId(requestId) { try { const value = requestId(); return safeBoundary(value) ? value : null; } catch { return null; } }
function safeInput(input, allowed) {
  try {
    if (!plainRecord(input)) return null;
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string' || !allowed.includes(key) || !('value' in descriptors[key]))) return null;
    return Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]));
  } catch { return null; }
}
function plainRecord(value) { if (!value || typeof value !== 'object' || Array.isArray(value)) return false; const prototype = Object.getPrototypeOf(value); return prototype === Object.prototype || prototype === null; }
function serializationSafe(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object' || seen.has(value)) return false;
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.every((item) => serializationSafe(item, seen));
    if (!plainRecord(value)) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    return Reflect.ownKeys(descriptors).every((key) => typeof key === 'string' && 'value' in descriptors[key] && descriptors[key].enumerable && serializationSafe(descriptors[key].value, seen));
  } catch { return false; } finally { seen.delete(value); }
}
function validTransaction(tx) {
  if (!serializationSafe(tx) || !plainRecord(tx)) return false;
  return Boolean(safeBoundary(tx.id) && safeBoundary(tx.tenant_id) && safeBoundary(tx.account_id) && typeof tx.amount === 'string' && safeBoundary(tx.currency) && safeBoundary(tx.posted_at) && safeBoundary(tx.schema_version) && Array.isArray(tx.evidence_refs) && tx.evidence_refs.every(safeBoundary) && (tx.description === undefined || typeof tx.description === 'string') && (tx.version === undefined || (Number.isInteger(tx.version) && tx.version >= 1)) && (tx.source_version === undefined || (Number.isInteger(tx.source_version) && tx.source_version >= 1)));
}
function maxVersion(items) { return items.reduce((max, tx) => Math.max(max, tx?.source_version ?? tx?.version ?? 1), 0); }
function signMac(payload, key) { return crypto.createHmac('sha256', key).update(JSON.stringify(payload)).digest('base64url'); }
function safeMac(payload, mac, key) { const expected = signMac(payload, key); return mac.length === expected.length && crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected)); }

export function projectTransaction(transaction, sourceVersion = transaction.version ?? 1) {
  return { id: transaction.id, tenant_id: transaction.tenant_id, account_id: transaction.account_id, amount: transaction.amount, currency: transaction.currency, posted_at: transaction.posted_at, schema_version: transaction.schema_version, evidence_refs: [...transaction.evidence_refs], ...(transaction.description !== undefined ? { description: transaction.description } : {}), source_version: sourceVersion, projection_version: '1.0.0' };
}

function publicDocument(document) { const { source_hash, projected_at, ...safe } = document; return clone(safe); }
