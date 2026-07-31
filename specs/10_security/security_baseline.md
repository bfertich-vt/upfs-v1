# Security baseline

Threat-model trust boundaries and abuse cases. Use phishing-resistant MFA for privileged access, short-lived credentials, workload identity, managed secrets, encryption in transit/at rest, key rotation, network segmentation, egress control, dependency pinning, hardened images, malware scanning, DLP, and centralized detection.

Logs and traces exclude account numbers, credentials, raw prompts, documents, and unnecessary financial descriptions. Sensitive access requires reason, scoped support session, step-up authentication, expiration, and audit. No standing unrestricted production access. Security tests include BOLA/IDOR, cross-tenant access, mass assignment, injection, SSRF, replay, webhook forgery, rate abuse, prompt injection, and export abuse.
