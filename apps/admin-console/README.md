# UPFS Admin Console

The internal console provides accessible Dashboard, Tenants, Platform health, and normative operations views (support access, ingestion, canonical quality, search projections, Redis, AI operations, workflows, policy simulation, security, compliance, releases, incidents, audit, and operations). It uses only documented `/admin/v1` APIs and redacted operational metadata; it never accesses databases or financial data directly. Missing managed providers render an explicit unavailable state.

Administrative changes are exposed only through the durable operation lifecycle: synthetic dry-run creation, independent approval with dual control, execution only when managed credentials and external approval are present, and evidence-backed rollback. The UI does not bypass policy, scope, audit, or production fail-closed boundaries. Tests use synthetic fixtures only.
