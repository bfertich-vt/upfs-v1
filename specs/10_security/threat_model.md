# Initial threat model

## Assets

Customer financial data, identities and consent, source artifacts, canonical facts, evidence, credentials, policies, approvals, workflows/actions, prompts/context, audit records, regulatory corpus, release artifacts, and availability.

## Trust boundaries

Bank/customer to public API; connectors/providers to ingestion; raw artifacts to normalization; canonical store to projections; retrieval to model providers; customer plane to admin plane; CI to artifact registry; employee support session to tenant resources.

## Priority threats and controls

- Cross-tenant access/BOLA: server-derived scope, deny-default policy, RLS defense-in-depth, negative tests, anomaly detection.
- Connector/webhook forgery or replay: signatures, nonce/timestamp windows, idempotency, provider allowlists, schema validation.
- Prompt injection/data exfiltration: trust labels, content separation, allowlisted tools, DLP, output validation, adversarial evaluation.
- Supply-chain compromise: pinned actions/images, scans, SBOM, signing, provenance, protected promotion.
- Privileged misuse: no standing broad access, step-up, support broker, dual approval, event capture, review.
- Audit tampering: append-only design, restricted writers, integrity checks, separate retention, alerting.
- Projection inconsistency: outbox, idempotent consumers, watermarks, parity checks, rebuildable versioned indexes.

Threat models are updated for every new boundary, sensitive data class, external integration, or side effect.
