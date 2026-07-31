import crypto from "node:crypto";

const clone = (value) => value === null || typeof value !== "object" ? value : Array.isArray(value) ? value.map(clone) : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)]));
const id = () => `evt_${crypto.randomUUID()}`;
const sha256 = (value) => crypto.createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
const requiredTenant = (tenantId) => { if (typeof tenantId !== "string" || tenantId.length < 1 || tenantId.length > 128) throw new Error("tenant scope is required"); return tenantId; };
const safeEvent = (event) => {
  if (!event || typeof event !== "object" || Array.isArray(event)) throw new Error("outbox event is required");
  if (typeof event.type !== "string" || !event.type || event.type.length > 200) throw new Error("outbox event type is invalid");
  if (event.payload === undefined) throw new Error("outbox payload is required");
  return event;
};

/** Durable PostgreSQL outbox. PostgreSQL transaction scope is authoritative. */
export class PostgresOutboxAdapter {
  #postgres; #now; #maxAttempts;
  constructor({ postgres, now = () => new Date(), maxAttempts = 8 } = {}) {
    if (!postgres || typeof postgres.transaction !== "function") throw new Error("postgres adapter is required; outbox fallback is disabled");
    this.#postgres = postgres; this.#now = now; this.#maxAttempts = maxAttempts;
  }
  async append({ tenantId, eventId = id(), type, payload, aggregateId = null, idempotencyKey = eventId, occurredAt = this.#now().toISOString() } = {}) {
    requiredTenant(tenantId); safeEvent({ type, payload });
    if (typeof idempotencyKey !== "string" || !idempotencyKey) throw new Error("idempotency key is required");
    return this.#postgres.transaction(async ({ query }) => {
      const fingerprint = eventFingerprint({ tenant_id: tenantId, id: eventId, aggregate_id: aggregateId, event_type: type, type, payload, idempotency_key: idempotencyKey });
      const result = await query(`INSERT INTO transactional_outbox (id, tenant_id, aggregate_id, event_type, payload, payload_fingerprint, idempotency_key, occurred_at, status, attempts) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',0) ON CONFLICT (tenant_id,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key WHERE transactional_outbox.payload_fingerprint=EXCLUDED.payload_fingerprint RETURNING id, tenant_id, aggregate_id, event_type, payload, payload_fingerprint, idempotency_key, occurred_at, event_sequence, status, attempts, available_at`, [eventId, tenantId, aggregateId, type, payload, fingerprint, idempotencyKey, occurredAt]);
      if (!result.rows.length) throw new Error("outbox idempotency conflict");
      return clone(result.rows[0]);
    }, { tenantId });
  }
  async claim({ tenantId, consumer, limit = 25, leaseMs = 60_000 } = {}) {
    requiredTenant(tenantId); if (typeof consumer !== "string" || !consumer) throw new Error("consumer is required");
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error("invalid claim limit");
    if (!Number.isInteger(leaseMs) || leaseMs < 1) throw new Error("invalid lease duration");
    const until = new Date(this.#now().getTime() + leaseMs).toISOString();
    return this.#postgres.transaction(async ({ query }) => {
      const result = await query(`WITH candidates AS (SELECT id FROM transactional_outbox WHERE tenant_id=$1 AND status IN ('pending','failed') AND attempts < $4 AND available_at <= NOW() AND (lease_until IS NULL OR lease_until < NOW()) ORDER BY event_sequence FOR UPDATE SKIP LOCKED LIMIT $2) UPDATE transactional_outbox o SET status='claimed', consumer=$3, lease_until=$5, attempts=o.attempts+1 WHERE o.id IN (SELECT id FROM candidates) RETURNING o.id, o.tenant_id, o.aggregate_id, o.event_type, o.payload, o.payload_fingerprint, o.idempotency_key, o.occurred_at, o.event_sequence, o.status, o.attempts, o.lease_until`, [tenantId, limit, consumer, this.#maxAttempts, until]);
      return result.rows.map(clone);
    }, { tenantId });
  }
  async acknowledge({ tenantId, eventId, consumer } = {}) {
    requiredTenant(tenantId); if (!eventId || !consumer) throw new Error("event and consumer are required");
    return this.#postgres.transaction(async ({ query }) => { const r = await query("UPDATE transactional_outbox SET status='acknowledged', acknowledged_at=NOW(), lease_until=NULL WHERE tenant_id=$1 AND id=$2 AND consumer=$3 AND status='claimed' RETURNING id", [tenantId, eventId, consumer]); if (!r.rows.length) throw new Error("outbox claim is not owned"); return { acknowledged: true, id: r.rows[0].id }; }, { tenantId });
  }
  async fail({ tenantId, eventId, consumer, error: failure = "consumer_failure", retryAt = null } = {}) {
    requiredTenant(tenantId); if (!eventId || !consumer) throw new Error("event and consumer are required");
    const next = retryAt ? new Date(retryAt).toISOString() : new Date(this.#now().getTime() + 1000).toISOString();
    return this.#postgres.transaction(async ({ query }) => { const r = await query("UPDATE transactional_outbox SET status=CASE WHEN attempts >= $4 THEN 'dead_letter' ELSE 'failed' END, last_error=$5, available_at=$6, lease_until=NULL WHERE tenant_id=$1 AND id=$2 AND consumer=$3 AND status='claimed' RETURNING id,status,attempts", [tenantId, eventId, consumer, this.#maxAttempts, String(failure).slice(0, 500), next]); if (!r.rows.length) throw new Error("outbox claim is not owned"); return clone(r.rows[0]); }, { tenantId });
  }
}

/** Durable monotonic consumer checkpoint stored in PostgreSQL. */
export class PostgresCheckpointAdapter {
  #postgres;
  constructor({ postgres } = {}) { if (!postgres || typeof postgres.transaction !== "function") throw new Error("postgres adapter is required; checkpoint fallback is disabled"); this.#postgres = postgres; }
  async load({ tenantId, consumer } = {}) { requiredTenant(tenantId); if (!consumer) throw new Error("consumer is required"); return this.#postgres.transaction(async ({ query }) => { const r = await query("SELECT tenant_id, consumer, sequence, updated_at FROM durable_checkpoints WHERE tenant_id=$1 AND consumer=$2", [tenantId, consumer]); return r.rows[0] ? clone(r.rows[0]) : { tenant_id: tenantId, consumer, sequence: 0 }; }, { tenantId }); }
  async save({ tenantId, consumer, sequence } = {}) { requiredTenant(tenantId); if (!consumer || !Number.isSafeInteger(sequence) || sequence < 0) throw new Error("invalid checkpoint"); return this.#postgres.transaction(async ({ query }) => { const r = await query("INSERT INTO durable_checkpoints (tenant_id,consumer,sequence) VALUES ($1,$2,$3) ON CONFLICT (tenant_id,consumer) DO UPDATE SET sequence=GREATEST(durable_checkpoints.sequence,EXCLUDED.sequence), updated_at=NOW() RETURNING tenant_id,consumer,sequence,updated_at", [tenantId, consumer, sequence]); return clone(r.rows[0]); }, { tenantId }); }
}

/** Recovery loop: claim, process idempotently, acknowledge, and advance checkpoint only after ack. */
export async function recoverOutbox({ outbox, checkpoint, tenantId, consumer, handle, limit = 25, leaseMs } = {}) {
  if (!outbox || !checkpoint || typeof handle !== "function") throw new Error("outbox, checkpoint, and handler are required");
  const claimed = await outbox.claim({ tenantId, consumer, limit, leaseMs });
  const checkpointBefore = await checkpoint.load({ tenantId, consumer });
  const results = [];
  for (const event of claimed) {
    const sequence = Number(event.event_sequence ?? event.sequence);
    if (!Number.isSafeInteger(sequence) || sequence < 1) { await outbox.fail({ tenantId, eventId: event.id, consumer, error: "invalid_event_sequence" }); results.push({ id: event.id, status: "failed" }); continue; }
    if (sequence <= Number(checkpointBefore.sequence ?? 0)) { await outbox.acknowledge({ tenantId, eventId: event.id, consumer }); results.push({ id: event.id, status: "ignored", reason: "out_of_order" }); continue; }
    try { const result = await handle(clone(event)); await outbox.acknowledge({ tenantId, eventId: event.id, consumer }); await checkpoint.save({ tenantId, consumer, sequence: Math.max(checkpointBefore.sequence, sequence) }); results.push({ id: event.id, status: "acknowledged", result: clone(result) }); }
    catch (error) { await outbox.fail({ tenantId, eventId: event.id, consumer, error: error?.message ?? "consumer_failure" }); results.push({ id: event.id, status: "failed" }); }
  }
  return { claimed: claimed.length, results, checkpoint: await checkpoint.load({ tenantId, consumer }) };
}

export const eventFingerprint = (event) => sha256({ tenant_id: event.tenant_id, id: event.id, aggregate_id: event.aggregate_id ?? null, type: event.event_type ?? event.type, payload: event.payload, idempotency_key: event.idempotency_key });
