import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function generateRegistry({ schemaDir, output }) {
  const files = fs.readdirSync(schemaDir).filter((f) => f.endsWith('.json')).sort();
  const schemas = files.map((file) => {
    const raw = fs.readFileSync(path.join(schemaDir, file), 'utf8');
    const schema = JSON.parse(raw);
    return { name: path.basename(file, '.schema.json'), id: schema.$id, version: schema.properties?.schema_version?.const ?? '1.0.0', sha256: crypto.createHash('sha256').update(raw).digest('hex'), file: `contracts/schemas/${file}` };
  });
  const registry = { registry_version: '1.0.0', schemas };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(registry, null, 2)}\n`);
  return registry;
}

export class CanonicalTransactionService {
  #records = new Map(); #idempotency = new Map(); #audit = [];
  constructor({ authorize = () => false, now = () => new Date() } = {}) { this.authorize = authorize; this.now = now; }
  upsert({ actor, tenantId, transaction, idempotencyKey, ifMatch }) {
    if (!actor?.subject || !actor.issuer) return this.#error(401, 'authentication_required');
    if (!tenantId || transaction?.tenant_id !== tenantId) return this.#error(403, 'tenant_scope_mismatch');
    if (!this.authorize(actor, tenantId)) return this.#error(403, 'forbidden');
    if (!idempotencyKey || idempotencyKey.length < 16) return this.#error(400, 'idempotency_key_required');
    const idem = `${actor.issuer}|${actor.subject}|${tenantId}|${idempotencyKey}`;
    if (this.#idempotency.has(idem)) {
      const prior = this.#idempotency.get(idem);
      if (prior.payload_hash !== crypto.createHash('sha256').update(JSON.stringify(transaction)).digest('hex')) return this.#error(409, 'idempotency_conflict');
      return prior.result;
    }
    const validation = validateTransaction(transaction);
    if (validation) return this.#error(400, validation);
    const prior = this.#records.get(transaction.id);
    if (prior && ifMatch !== `"${prior.version}"`) return this.#error(412, 'precondition_failed');
    const version = prior ? prior.version + 1 : 1;
    const record = { ...transaction, version, provenance: [...(transaction.provenance ?? []), { kind: 'canonicalized', actor: `${actor.issuer}|${actor.subject}`, at: this.now().toISOString() }] };
    this.#records.set(transaction.id, record);
    const result = { status: prior ? 200 : 201, body: { ...record }, headers: { etag: `"${version}"` } };
    this.#idempotency.set(idem, { payload_hash: crypto.createHash('sha256').update(JSON.stringify(transaction)).digest('hex'), result }); this.#audit.push({ action: 'transaction.upsert', tenant_id: tenantId, resource_id: transaction.id, actor: `${actor.issuer}|${actor.subject}`, version });
    return result;
  }
  get({ actor, tenantId, id }) { if (!actor?.subject || !actor.issuer) return this.#error(401, 'authentication_required'); if (!this.authorize(actor, tenantId)) return this.#error(403, 'forbidden'); const r = this.#records.get(id); if (!r || r.tenant_id !== tenantId) return this.#error(404, 'resource_not_found'); return { status: 200, body: { ...r } }; }
  audit() { return this.#audit.map((x) => ({ ...x })); }
  #error(status, code) { return { status, body: { code } }; }
}

export function validateTransaction(t) {
  if (!t || typeof t !== 'object') return 'invalid_transaction';
  for (const key of ['id','tenant_id','account_id','amount','currency','posted_at','schema_version','evidence_refs']) if (!t[key]) return `required_${key}`;
  if (!/^-?[0-9]+(\.[0-9]+)?$/.test(t.amount) || !/^[A-Z]{3}$/.test(t.currency) || Number.isNaN(Date.parse(t.posted_at)) || !Array.isArray(t.evidence_refs) || !t.evidence_refs.length || new Set(t.evidence_refs).size !== t.evidence_refs.length) return 'invalid_transaction';
  return null;
}
