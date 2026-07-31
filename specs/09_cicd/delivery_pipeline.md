# CI/CD and SDLC

Pull requests run formatting, linting, type/static analysis, unit/integration tests, contract and generated-drift checks, secret/dependency/container/IaC scans, migration rehearsal, tenant-isolation tests, documentation builds, examples, and policy/prompt/skill evaluations.

Build once; promote immutable signed artifacts. Each release manifest records commits, container digests, SBOM, provenance, OpenAPI/AsyncAPI/schema versions, migrations, index mappings, policies, prompts, skills, workflows, docs, scans, approvals, deployment, verification, and rollback.

Production uses protected environments, separation of duties, canary/cell rollout, automatic health gates, post-deploy reconciliation, evidence retention, and tested rollback/corrective-forward plans.
