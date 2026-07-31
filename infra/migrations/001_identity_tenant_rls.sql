-- Identity/tenant foundation.  The application must set app.tenant_id (and
-- app.organization_id for organization administration) after token verification.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS environments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenants_organization_id_idx ON tenants(organization_id);
CREATE INDEX IF NOT EXISTS environments_tenant_id_idx ON environments(tenant_id);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE environments FORCE ROW LEVEL SECURITY;

-- NULL or unset settings never match, so the default is deny.
DROP POLICY IF EXISTS organizations_scope ON organizations;
CREATE POLICY organizations_scope ON organizations
  USING (id::text = current_setting('app.organization_id', true))
  WITH CHECK (id::text = current_setting('app.organization_id', true));

DROP POLICY IF EXISTS tenants_scope ON tenants;
CREATE POLICY tenants_scope ON tenants
  USING (id::text = current_setting('app.tenant_id', true)
         AND organization_id::text = current_setting('app.organization_id', true))
  WITH CHECK (organization_id::text = current_setting('app.organization_id', true));

DROP POLICY IF EXISTS environments_scope ON environments;
CREATE POLICY environments_scope ON environments
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
