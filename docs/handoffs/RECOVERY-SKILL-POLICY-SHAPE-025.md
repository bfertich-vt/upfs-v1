# RECOVERY-SKILL-POLICY-SHAPE-025 handoff

- Task and scope: `RECOVERY-SKILL-POLICY-SHAPE-025` is corrective-forward
  from the rejected policy candidate whose independent QA evidence is
  Git-bound at `1365bb1:docs/reviews/RECOVERY-SKILL-POLICY-024-QA.md`. It
  closes the static, reference-only governed-skill policy shape. It does not
  implement a production AI runtime, model, provider, tenant capability, or
  authorization service.
- Agent role and provenance: Schema/Search/AI; role file
  `agents/SCHEMA_SEARCH_AI.md` SHA-256
  `8b05d11c936e7d0eac9ea63cf5b34cc594b620205292054bfcd6e01046050d9d`.
  The runtime has no native role field; the initial assignment bound this
  specialist to that role and required source/digest evidence before edits.
  Agent thread `/root/schema_skill_policy_shape_025`; isolated worktree
  `C:\source\upfs-schema-skill-policy-shape-025`; branch
  `recovery/skill-policy-shape-025`; baseline
  `b9c6e4070c12be0c4c38c4c564d238e406dbc02b`; implementation candidate
  `ff19541dc079347b86a34883d8468adcfa87e342`. This handoff is committed
  separately after the candidate. Owned files are `registries/skills/**`,
  `scripts/ci-gate-validator.mjs`, `scripts/ci-gate-validator.test.mjs`,
  `tasks/recovery/RECOVERY-SKILL-POLICY-SHAPE-025.yaml`, and this report.
- Sources/contracts read: `AGENTS.md` SHA-256
  `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`;
  `agents/SCHEMA_SEARCH_AI.md` (role digest above);
  `agents/HANDOFF_TEMPLATE.md`
  `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`;
  constitution `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`;
  AI runtime `2238b3be196a9289e661dbeee579526a81c8db238d81428be2f3447d78df0384`;
  CI/CD `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`;
  security `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`;
  testing `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`;
  structured task `tasks/recovery/RECOVERY-SKILL-POLICY-SHAPE-025.yaml`; and
  the prior QA rejection above (file SHA-256
  `4f64f5d3c3b71b4960195e63ce1269d375182d7d0eb8b1549d2fa4cb92ce2515`).
- Files changed: The reference registry, typed zero-tool definition,
  evaluation, and deny-only policy; CI validator; adversarial validator tests;
  the current structured task; and this handoff. The superseded local task-024
  handoff/task copy is removed from this corrective branch; the rejected
  candidate and independent rejection remain preserved on their original,
  Git-bound branches.
- Contracts/migrations: No database, API, event, provider, schema, or runtime
  contract changes. The static policy contract is closed-world: top-level keys
  are exactly `schema_version` and `rules`; the rules are exactly three,
  ordered canonical records with only `id`, `effect`, `subject`, and a
  substantive `reason`; every effect is `deny`.
- Security and tenant-isolation analysis: This removes the QA-demonstrated
  digest-consistent bypass class. Unknown top-level/default fields,
  exceptions, aliases, unknown nested keys, added rules, missing rules, and
  allow/permit effects now fail closed even if the attacker recomputes the
  registry policy digest. The reference definition remains zero permissions
  and zero tools, and policy denies tool calls, tenant/customer data, and
  authoritative authorization/financial-truth/workflow-state decisions. No
  tenant runtime, credentials, private financial data, network, or provider
  access is added.
- Audit/evidence behavior: Validation checks static metadata only. A passing
  result proves neither execution nor a governed AI runtime; it must not be
  promoted as production capability.
- Tests and commands run: `npm ci --ignore-scripts` passed (106 packages; one
  pre-existing moderate `yaml` advisory, no high/critical result); `node --test
  scripts/ci-gate-validator.test.mjs` passed 17/17; `npm run skill:check`,
  `npm run format:check`, `npm run lint`, `npm run static:check`, `npm run
  ci:gates`, `npm test` (926 passed, 0 failed, 1 documented opt-in skip),
  `npm run validate`, and `git diff --check` all passed.
- Negative cases: The focused suite uses a fresh fixture for every
  digest-consistent attack and recomputes the changed artifact digest. It
  rejects `default_effect: allow`, a top-level alias, a nested exception, an
  added allow rule, an unknown nested override, an allow effect on a protected
  rule, and omission of a required rule. It retains definition tool-alias and
  nonempty-tool rejection, alongside existing malformed/path/link/schema/
  identity/evaluation/digest/reference-state coverage.
- Results: Candidate meets its local acceptance criteria. Independent
  QA/Security must begin from this committed candidate in a different isolated
  worktree, replay all listed adversarial mutations, and report PASS before
  integration. This document is author evidence, not QA approval.
- Rollback/corrective-forward plan: Preserve all rejected candidate and QA
  evidence. If a later accepted correction is defective, revert its accepted
  commit only through a distinct, independently reviewed corrective-forward
  commit; do not reset, force-push, delete branches, or rewrite history.
- Documentation updated: The structured task and this handoff truthfully mark
  the result as a static contract/reference repository control, with no
  production claim.
- Known limitations and external prerequisites: This cannot demonstrate real
  model integration, prompt/tool execution, consent, policy runtime,
  evaluation runtime, provider credentials, or production readiness. No
  external prerequisite is needed for this static validation; independent
  Codex QA/Security is still required and is not human review or a GitHub
  native PR approval.
