# RECOVERY-SKILL-POLICY-SHAPE-025 independent Codex QA/Security review

## Verdict

**PASS — accept the committed candidate for integration.** Candidate
`ff19541dc079347b86a34883d8468adcfa87e342`, with author handoff
`6ca6d024dcf87630ed703c3defe0bb6edd5580c2`, closes the previously
reproduced digest-consistent policy-extension bypass. The validator now
requires a closed-world policy document containing only `schema_version` and
the exactly ordered three canonical deny rules. This is static
contract/reference validation only, not production AI-runtime evidence.

## Independent reviewer and provenance

- QA task: `RECOVERY-SKILL-POLICY-SHAPE-025-QA`.
- Role: Independent QA/Security, bound by `agents/QA_SECURITY.md` SHA-256
  `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
  The runtime has no native custom-role field; role loading was required
  before review. This is independent Codex QA/Security evidence, not human
  review and not a GitHub-native approval.
- Reviewer thread: `/root/qa_skill_policy_shape_025`; isolated worktree
  `C:\\source\\upfs-qa-skill-policy-shape-025`; branch
  `qa/recovery-skill-policy-shape-025`; candidate HEAD
  `6ca6d024dcf87630ed703c3defe0bb6edd5580c2`; implementation commit
  `ff19541dc079347b86a34883d8468adcfa87e342`.
- The reviewer neither authored nor remediated the candidate. This review
  changes only this evidence file. Preserve rejected evidence and use only
  separately reviewed corrective-forward work for any later defect.

## Sources and inputs loaded

| Path | SHA-256 |
| --- | --- |
| `AGENTS.md` | `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1` |
| `agents/QA_SECURITY.md` | `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0` |
| `specs/00_constitution/engineering_constitution.md` | `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73` |
| `specs/06_ai/ai_runtime.md` | `2238b3be196a9289e661dbeee579526a81c8db238d81428be2f3447d78df0384` |
| `specs/09_cicd/delivery_pipeline.md` | `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb` |
| `specs/10_security/security_baseline.md` | `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add` |
| `specs/12_testing/test_strategy.md` | `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172` |
| `tasks/recovery/RECOVERY-SKILL-POLICY-SHAPE-025.yaml` | `cf84d53392849eb55d78734b6864148ff5d58a4e975c822de338d9a97b7681e6` |
| `docs/handoffs/RECOVERY-SKILL-POLICY-SHAPE-025.md` | `22961e793ce3327a0b1c3ef0e504e0a36e25d1f4143708e7fc175e82ea1cd363` |
| prior rejection `1365bb1:docs/reviews/RECOVERY-SKILL-POLICY-024-QA.md` | `4f64f5d3c3b71b4960195e63ce1269d375182d7d0eb8b1549d2fa4cb92ce2515` |
| policy artifact | `19624181b67bae5f3dc7ef2223443c5bd3e91a7658fd94f0a30d523b82aef843` |
| validator | `6e17cf1c50862cef5db465106e4470f3c57f5a75d26593af52e4842ab41f72a2` |
| validator tests | `16607f550b74d04ae8a09ee1755977f27009bf44e6a840a910230e276ef7eb54` |

## Acceptance and security trace

1. **PASS — exact policy shape.** The actual policy has only the two allowed
   top-level fields, exactly three canonical records in required order, only
   `id`, `effect`, `subject`, and substantive `reason` fields, and `deny` for
   all effects. The validator parses YAML and rejects any deviation.
2. **PASS — independent digest-consistent adversarial replay.** In a fresh
   temporary copy outside repository worktrees, I mutated the policy and
   recomputed the referenced policy SHA-256 in the registry for each case:
   default allow, unknown top-level key, nested exception, top-level tool
   alias, added allow rule, reordered rules, `permit` effect, and omitted
   canonical rule. Every mutation returned `failed` with the closed-world
   policy error. I also changed the definition to a nonempty
   `tools: [unrestricted-network]` list and recomputed both definition digest
   bindings; it failed with the zero-permissions/tools error.
3. **PASS — scope and truthfulness.** Diff inspection finds only static
   registry/control-plane validation, tests, structured task, and handoff.
   It adds no model/provider, network/tool execution, tenant API, customer
   data, credentials, authorization runtime, or deployment behavior. The
   definition remains `contract/reference`, `reference`, zero-permission,
   and zero-tool. It must not be promoted as governed AI production capability.
4. **PASS — no tenant or sensitive-data escape introduced.** The sole policy
   semantics explicitly deny tool calls, tenant/customer data, and
   authoritative financial/authorization/workflow decisions. The adversarial
   mutations prove the static validator fails closed even with attacker-updated
   artifact digests. No replay/idempotency/migration surface applies because
   no runtime or write path exists.

## Commands and evidence

- `npm ci --ignore-scripts`: passed (106 packages; existing moderate `yaml`
  advisory, no high/critical result).
- `node --test scripts/ci-gate-validator.test.mjs`: passed, 17/17.
- `npm run skill:check`, `npm run ci:gates`, `npm run validate`, and
  `git diff --check`: passed.
- `npm test`: passed, 926 passed, 0 failed, 1 documented opt-in skip
  (927 total).
- Independent temporary-copy replays above: 9/9 malicious digest-consistent
  mutations rejected.

## Limitations and required next step

This acceptance proves only a static reference-policy repository gate. It
does not prove a real model, prompt/tool execution, policy runtime, consent,
provider integration, tenant capability, or production readiness. No external
prerequisite is required for integration. The supervisor may integrate the
candidate range plus this evidence; hosted CI remains a separate required
gate, and this review is not a GitHub approval.
