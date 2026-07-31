import { createHash } from 'node:crypto';

export function generateRegistry({ version, entities }) {
  if (!version || !Array.isArray(entities) || entities.length === 0) throw new Error('invalid_registry');
  const normalized = entities.map((entity) => {
    if (!entity?.name || !entity?.schema) throw new Error('invalid_entity');
    return { name: entity.name, schema: entity.schema, provenance: entity.provenance ?? null };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const digest = createHash('sha256').update(JSON.stringify({ version, entities: normalized })).digest('hex');
  return { version, entities: normalized, digest };
}

export function canonicalTransaction(input) {
  if (!input || typeof input !== 'object' || ['id','tenant_id','amount','currency','posted_at'].some((k) => typeof input[k] !== 'string' || input[k].length === 0)) throw new Error('invalid_transaction');
  if (!Array.isArray(input.evidence_refs) || input.evidence_refs.length === 0) throw new Error('provenance_required');
  if (typeof input.account_id !== 'string' || input.account_id.length === 0) throw new Error('invalid_transaction');
  if (input.evidence_refs.some((ref) => typeof ref !== 'string' || ref.length === 0) || new Set(input.evidence_refs).size !== input.evidence_refs.length) throw new Error('invalid_transaction');
  if (!/^-?[0-9]+(?:\.[0-9]{1,4})?$/.test(input.amount)) throw new Error('invalid_transaction');
  return { id: input.id, tenant_id: input.tenant_id, account_id: input.account_id, amount: input.amount, currency: input.currency, posted_at: input.posted_at, schema_version: input.schema_version ?? '1.0.0', evidence_refs: [...input.evidence_refs] };
}
