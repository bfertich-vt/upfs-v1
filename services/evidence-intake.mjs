import crypto from 'node:crypto';

const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Raw evidence content is defined as the exact UTF-8 bytes of the content string.
// This keeps synthetic text fixtures portable while making the hash independently
// reproducible by any implementation that receives the same raw representation.
const contentHash = (content) => crypto.createHash('sha256').update(content, 'utf8').digest('hex');

function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(deepClone);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepClone(item)]));
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/** In-memory reference implementation of the API-backed raw evidence boundary. */
export class RawEvidenceIntakeService {
  #records = new Map(); #idempotency = new Map(); #audit = [];
  constructor({ authorize = () => false, classify = async () => ({ content: 'unclassified', malware: 'unclassified', prompt_injection: 'unclassified' }), now = () => new Date() } = {}) {
    this.authorize = authorize; this.classify = classify; this.now = now;
  }
  async intake({ actor, tenantId, environmentId, evidence, idempotencyKey }) {
    if (!actor?.subject || !actor.issuer) return this.#error(401, 'authentication_required');
    if (!tenantId || !environmentId || evidence?.tenant_id !== tenantId || evidence?.environment_id !== environmentId) return this.#error(403, 'scope_mismatch');
    if (!this.authorize(actor, tenantId, environmentId)) return this.#error(403, 'forbidden');
    if (!idempotencyKey || idempotencyKey.length < 16) return this.#error(400, 'idempotency_key_required');
    const key = `${actor.issuer}|${actor.subject}|${tenantId}|${environmentId}|${idempotencyKey}`;
    const payloadHash = hash(evidence);
    const prior = this.#idempotency.get(key);
    if (prior) return prior.payload_hash === payloadHash ? deepClone(prior.result) : this.#error(409, 'idempotency_conflict');
    const validation = validateEvidence(evidence);
    if (validation) return this.#error(400, validation);
    if (this.#records.has(evidence.id)) return this.#error(409, 'evidence_already_exists');
    let classification;
    try { classification = await this.classify({ content: evidence.content, media_type: evidence.media_type, source: evidence.source }); }
    catch { return this.#error(422, 'classification_failed', true); }
    const safeClassification = normalizeClassification(classification);
    const record = deepFreeze({ ...deepClone(evidence), status: 'quarantined', classification: deepClone(safeClassification), ingested_at: this.now().toISOString() });
    const result = deepFreeze({ status: 201, body: deepClone(record), headers: { etag: `"${evidence.id}:${evidence.content_hash}"` } });
    this.#records.set(evidence.id, record); this.#idempotency.set(key, { payload_hash: payloadHash, result });
    this.#audit.push({ action: 'evidence.intake', tenant_id: tenantId, environment_id: environmentId, resource_id: evidence.id, actor: `${actor.issuer}|${actor.subject}`, status: 'quarantined', content_hash: evidence.content_hash });
    return deepClone(result);
  }
  get({ actor, tenantId, environmentId, id }) { if (!actor?.subject || !actor.issuer) return this.#error(401, 'authentication_required'); if (!this.authorize(actor, tenantId, environmentId)) return this.#error(403, 'forbidden'); const r = this.#records.get(id); if (!r || r.tenant_id !== tenantId || r.environment_id !== environmentId) return this.#error(404, 'resource_not_found'); return deepClone({ status: 200, body: r }); }
  audit() { return deepClone(this.#audit); }
  #error(status, code, retryable = false) { return { status, body: { code, retryable } }; }
}

function normalizeClassification(value) {
  const allowed = new Set(['clear', 'blocked', 'suspicious', 'unclassified']);
  const result = {};
  for (const key of ['content', 'malware', 'prompt_injection']) result[key] = allowed.has(value?.[key]) ? value[key] : 'unclassified';
  return result;
}

export function validateEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return 'invalid_evidence';
  const required = ['id', 'tenant_id', 'environment_id', 'source', 'media_type', 'content', 'content_hash', 'observed_at'];
  if (required.some((key) => typeof evidence[key] !== 'string' || !evidence[key])) return 'required_evidence_field';
  if (evidence.id.length > 200 || evidence.source.length > 200 || evidence.media_type.length > 200) return 'invalid_evidence';
  if (!/^[a-f0-9]{64}$/.test(evidence.content_hash) || evidence.content_hash !== contentHash(evidence.content) || !isValidDateTime(evidence.observed_at)) return 'invalid_evidence';
  if (typeof evidence.content !== 'string' || evidence.content.length > 10_000_000) return 'invalid_evidence';
  const allowed = new Set(required); if (Object.keys(evidence).some((key) => !allowed.has(key))) return 'invalid_evidence';
  return null;
}
function isValidDateTime(value) { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value)); }
