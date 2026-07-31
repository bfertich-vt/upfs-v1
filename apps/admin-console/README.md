# UPFS Admin Console vertical slice

This bounded internal-console slice provides accessible Dashboard, Tenants, and Platform health views. It uses only the documented `/admin/v1` API contract and redacted operational metadata; it never accesses databases or financial data directly. `createAdminApi` is the production seam, while tests use synthetic fixtures only. Mutating administrative operations are intentionally not exposed here and remain governed by the service workflow.
