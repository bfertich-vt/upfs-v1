# Workflow runtime

Definitions are immutable versions composed of trigger, typed steps, policy checks, approvals, timers, retries, timeouts, action requests, postconditions, compensation, and terminal states. Executions persist checkpoints and immutable history.

Every step is classified as retryable, manually recoverable, compensatable, or irreversible. External side effects use idempotency keys and postcondition verification. Human approvals record approver, scope, decision, reason, policy version, timestamps, and evidence. Models may recommend actions but never approve them.
