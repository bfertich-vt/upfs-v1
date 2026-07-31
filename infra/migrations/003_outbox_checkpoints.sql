-- TASK-0013: durable transactional outbox and monotonic consumer checkpoints.
CREATE TABLE IF NOT EXISTS transactional_outbox (
  id text PRIMARY KEY, tenant_id text NOT NULL REFERENCES tenants(id), aggregate_id text,
  event_type text NOT NULL, payload jsonb NOT NULL, payload_fingerprint text NOT NULL,
  idempotency_key text NOT NULL, event_sequence bigint GENERATED ALWAYS AS IDENTITY,
  occurred_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','claimed','failed','acknowledged','dead_letter')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0), available_at timestamptz NOT NULL DEFAULT now(),
  consumer text, lease_until timestamptz, acknowledged_at timestamptz, last_error text,
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS transactional_outbox_claim_idx ON transactional_outbox (tenant_id,status,available_at,occurred_at);
ALTER TABLE transactional_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactional_outbox FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transactional_outbox_tenant ON transactional_outbox;
CREATE POLICY transactional_outbox_tenant ON transactional_outbox USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
CREATE TABLE IF NOT EXISTS durable_checkpoints (
  tenant_id text NOT NULL REFERENCES tenants(id), consumer text NOT NULL, sequence bigint NOT NULL DEFAULT 0 CHECK (sequence >= 0), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tenant_id,consumer)
);
ALTER TABLE durable_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE durable_checkpoints FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS durable_checkpoints_tenant ON durable_checkpoints;
CREATE POLICY durable_checkpoints_tenant ON durable_checkpoints USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
