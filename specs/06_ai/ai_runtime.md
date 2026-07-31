# Governed AI runtime

Context assembly is a versioned deterministic service independent of prompts and models. It applies identity, consent, authorization, data minimization, trust classification, temporal filters, evidence thresholds, token budgets, and citation requirements before a model call.

Skills have typed inputs/outputs, owner, permissions, tools, prompt/context dependencies, cost and latency budgets, evaluation suites, release state, and rollback target. Tool calls are policy checked and schema validated. Memory is tenant/user/purpose scoped, consented, expiring, inspectable, and never a substitute for canonical facts.

Prompt-injection defenses include untrusted-content separation, allowlisted tools, instruction hierarchy, content scanning, secret/DLP controls, output schemas, citation verification, adversarial evaluations, and human approval for risky actions. LangGraph may coordinate bounded reasoning; durable workflow state belongs to the workflow engine.
