# RECOVERY-SKILL-POLICY-024 handoff

- Task and scope: `RECOVERY-SKILL-POLICY-024` corrective-forward from the
  rejected `RECOVERY-SKILL-REGISTRY-023` candidate. It restores a bounded,
  reference-only governed-skill registry and makes the capability validator
  enforce its semantics. This is a repository control-plane contract, not a
  production AI capability, model integration, or runtime claim.
- Agent role and provenance: Schema/Search/AI; role file
  `agents/SCHEMA_SEARCH_AI.md` SHA-256
  `8b05d11c936e7d0eac9ea63cf5b34cc594b620205292054bfcd6e01046050d9d`.
  Agent thread `/root/schema_skill_policy_024`; isolated worktree
  `C:\source\upfs-schema-skill-policy-024`; branch
  `recovery/skill-policy-024`; baseline
  `b9c6e4070c12be0c4c38c4c564d238e406dbc02b`; candidate commit
  `934dd0300cdf5fd919f52f355bf7d08f4d0b2119`.
- Sources/contracts read: `AGENTS.md`
  `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`;
  `agents/SCHEMA_SEARCH_AI.md` (role digest above);
  `agents/QA_SECURITY.md`
  `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`;
  `agents/HANDOFF_TEMPLATE.md`
  `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`;
  constitution `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`;
  AI runtime `2238b3be196a9289e661dbeee579526a81c8db238d81428be2f3447d78df0384`;
  CI/CD `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`;
  security `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`;
  testing `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`;
  and the rejection evidence at
  `6807e6fc9fbbb623cf4aa69526a25d7a017b7016:docs/reviews/RECOVERY-SKILL-REGISTRY-023-QA.md`.
- Files changed: `registries/skills/**`; `scripts/ci-gate-validator.mjs`;
  `scripts/ci-gate-validator.test.mjs`; and the structured task input.
- Contracts/migrations: No database, API, event, provider, deployment, or
  production runtime contract changes. The registry now requires exact
  lower-case non-link paths, typed definition binding, matching digests,
  `contract/reference` classification, `reference` release state, object
  inputs/outputs, zero `permissions` and `tools`, and explicit deny rules for
  `tool_call`, `tenant_or_customer_data`, and
  `authorization_financial_truth_workflow_state`.
- Security and tenant-isolation analysis: The original QA replay could change
  a tool policy to `allow` and recompute digests. This candidate rejects that
  self-consistent tampering, nonempty/unrestricted tools, undeclared tool
  aliases, missing required denials, and permissive protected-subject rules.
  The registry has no credentials, customer or tenant records, private
  financial data, provider access, network access, or authorization runtime.
- Audit/evidence behavior: Validates files structurally and fail closed; it
  does not turn the reference evaluation metadata into execution or production
  model evidence.
- Tests and commands run: `npm ci --ignore-scripts` passed (106 packages; one
  pre-existing moderate `yaml` advisory); `node --test
  scripts/ci-gate-validator.test.mjs` passed 17/17; `npm run skill:check`
  passed; `npm run format:check`, `npm run lint`, and `npm run static:check`
  passed; `git diff --check` passed.
- Negative cases: The focused suite runs digest-consistent replays for an
  undocumented `tool_aliases` field, nonempty `tools:
  [unrestricted-network]`, tool-policy `deny` to `allow`, absent authoritative
  decision denial, and invalid classification/release state. Existing tests
  retain empty/missing/malformed/wrong-case/link paths, schema, evaluation,
  and artifact-digest failures.
- Results: Candidate changes satisfy the bounded acceptance criteria locally;
  independent QA/Security and then full gates are still required before any
  acceptance or integration.
- Rollback/corrective-forward plan: Preserve rejected task 023 branches and
  review. If accepted work is later defective, revert only its accepted commit
  through a separate reviewed corrective-forward commit; do not reset,
  force-push, delete branches, or rewrite evidence.
- Documentation updated: The structured task input and this handoff describe
  the reference-only limitation; no product documentation claims were added.
- Known risks and follow-ups: This validates static governed-skill registry
  metadata only. Real model, prompt, tool, evaluation, consent, and policy
  runtime integration remain unimplemented and must not be inferred. The
  pre-existing moderate dependency advisory remains outside this task.
- External prerequisites: None for the static registry gate. Independent
  Codex QA/Security review from a distinct role-bound agent is required. That
  evidence is not human review or a GitHub-native PR approval.
