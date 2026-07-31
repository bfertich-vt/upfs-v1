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
  if (!input?.id || !input.tenant_id || !input.amount || !input.currency || !input.posted_at) throw new Error('invalid_transaction');
  if (!Array.isArray(input.evidence_refs) || input.evidence_refs.length === 0) throw new Error('provenance_required');
  return { id: input.id, tenant_id: input.tenant_id, account_id: input.account_id, amount: input.amount, currency: input.currency, posted_at: input.posted_at, schema_version: input.schema_version ?? '1.0.0', evidence_refs: [...input.evidence_refs] };
}
