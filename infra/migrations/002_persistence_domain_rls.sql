-- Durable domain tables. PostgreSQL is authoritative; all tenant-scoped
-- tables carry tenant_id and are protected by FORCE RLS. The application must
-- set app.tenant_id only after token/membership authorization.
CREATE TABLE IF NOT EXISTS raw_evidence (
  id text PRIMARY KEY, tenant_id uuid NOT NULL REFERENCES tenants(id), environment_id uuid NOT NULL REFERENCES environments(id),
  source text NOT NULL, media_type text NOT NULL, content bytea NOT NULL, content_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('quarantined','validated','rejected')), observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS canonical_transactions (
  id text NOT NULL, tenant_id uuid NOT NULL REFERENCES tenants(id), account_id text NOT NULL, amount numeric(28,4) NOT NULL,
  currency text NOT NULL, posted_at timestamptz NOT NULL, schema_version text NOT NULL, evidence_refs jsonb NOT NULL DEFAULT '[]',
  description text, provenance jsonb NOT NULL DEFAULT '[]', version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tenant_id, id)
);
CREATE TABLE IF NOT EXISTS projection_metadata (
  tenant_id uuid NOT NULL REFERENCES tenants(id), projection_name text NOT NULL, watermark bigint NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tenant_id, projection_name)
);
CREATE TABLE IF NOT EXISTS policies (
  tenant_id uuid NOT NULL REFERENCES tenants(id), environment_id uuid NOT NULL REFERENCES environments(id), id text NOT NULL,
  version text NOT NULL, document jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tenant_id, environment_id, id, version)
);
CREATE TABLE IF NOT EXISTS workflows (
  tenant_id uuid NOT NULL REFERENCES tenants(id), environment_id uuid NOT NULL REFERENCES environments(id), id text NOT NULL,
  status text NOT NULL, version integer NOT NULL DEFAULT 1, document jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tenant_id, environment_id, id)
);
CREATE TABLE IF NOT EXISTS audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, tenant_id uuid REFERENCES tenants(id), actor text NOT NULL,
  action text NOT NULL, resource_id text, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS raw_evidence_tenant_idx ON raw_evidence(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS canonical_transactions_tenant_idx ON canonical_transactions(tenant_id, posted_at);
CREATE INDEX IF NOT EXISTS audit_events_tenant_idx ON audit_events(tenant_id, created_at);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['raw_evidence','canonical_transactions','projection_metadata','policies','workflows','audit_events'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_scope ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_scope ON %I USING (tenant_id::text = current_setting(''app.tenant_id'', true)) WITH CHECK (tenant_id::text = current_setting(''app.tenant_id'', true))', t, t);
  END LOOP;
END $$;
