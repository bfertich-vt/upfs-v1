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
  if (!input?.transaction_id || !input.tenant_id || !input.amount || !input.currency || !input.occurred_at) throw new Error('invalid_transaction');
  if (!input.provenance?.source || !input.provenance?.evidence_ref) throw new Error('provenance_required');
  return { transaction_id: input.transaction_id, tenant_id: input.tenant_id, amount: input.amount, currency: input.currency, occurred_at: input.occurred_at, provenance: { ...input.provenance } };
}
