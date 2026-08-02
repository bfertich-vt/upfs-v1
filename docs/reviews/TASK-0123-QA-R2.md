# TASK-0123-QA-R2 independent Codex QA/Security review

## Result

**ACCEPT.** This is an independent Codex QA/Security review, not a human or
native GitHub pull-request approval. It accepts the committed candidate for
supervisor integration and hosted revalidation only. The capability is a
package-backed structural/component accessibility gate; it is not a deployed
customer console, an assistive-technology certification, or a production
capability claim.

## Reviewer provenance and role loading

- Task: `TASK-0123-ACCESSIBILITY-CONSOLE`, review `TASK-0123-QA-R2`.
- Agent role: Independent QA/Security.
- Role-file path and SHA-256: `agents/QA_SECURITY.md`
  `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
- Agent thread: `/root/qa_accessibility_console_0123_r2`. The runtime has no
  native custom-role field; this review was role-bound in its initial prompt
  before source loading or review.
- Review worktree and branch:
  `C:\source\upfs-qa-accessibility-console-0123-r2`,
  `qa/task-0123-accessibility-console-r2`.
- Candidate reviewed: `c71dda9a396797ef226bc49b9d99530701ffb006`, whose
  material implementation is parent `b1bec9e38589a93842f0078e000c03c3e9684490`.
  Candidate base: `0670c1d`. The reviewer neither authored nor remediated the
  candidate and began from that committed state.
- Review commit: this review commit, created after review only; no candidate
  source was edited.
- Governing files loaded with SHA-256: `AGENTS.md`
  `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`;
  `agents/QA_SECURITY.md`
  `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`;
  `specs/00_constitution/engineering_constitution.md`
  `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`;
  `agents/WORKTREES.md`
  `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`;
  `agents/HANDOFF_TEMPLATE.md`
  `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`;
  `tasks/queue.yaml`
  `05ed87243f7baa6060c6d650023ce9130741f529949d338cfe2c3d30806347c3`;
  `docs/MASTER_PLAN.md`
  `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`;
  `specs/01_product/vision_and_scope.md`
  `9cf819b72b57d2f1ca8b4561eb132af811e1ea150cbd5ee4401d5b55e37f2cd7`;
  `specs/03_architecture/system_architecture.md`
  `4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6`;
  `specs/05_apis/api_standards.md`
  `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`;
  `specs/10_security/security_baseline.md`
  `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`;
  `specs/12_testing/test_strategy.md`
  `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`.
- Task input and applicable contracts loaded: `tasks/recovery/TASK-0123-ACCESSIBILITY-CONSOLE.yaml`
  (SHA-256 `7318e36eede65c81699e6bbd20355980c1ea8adee8005d15b0e43aa6d0949b9f`),
  `specs/02_ui/console_experience.md` (SHA-256
  `453b21160bc0f0b79b9654435f1053a24f9fb473dd80f5aba16d588030b3afbf`),
  `specs/09_cicd/delivery_pipeline.md` (SHA-256
  `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb`),
  `docs/PRODUCTION_BACKLOG.md` (SHA-256
  `ffcc1f2ada3e0ffbc67d4905509aa3c94f8ab4a09854b775bcf9745684d3568f`),
  and author handoff `docs/handoffs/TASK-0123.md`.

## Acceptance trace and evidence

| Acceptance criterion | Independent evidence | Result |
| --- | --- | --- |
| Package-backed runnable target exercises real modules | `apps/customer-console/package.json` is an `UNLICENSED`, private package; its allowlisted command loads `scripts/accessibility.mjs`, which imports `console-shell.mjs` and `transaction-search-workbench.mjs`. `npm run accessibility:check` passed with `26 accessibility assertions passed against runnable customer-console modules`. | Pass |
| Semantic and keyboard coverage is real | Direct review and the executed harness verify HTML doctype/language/charset/viewport, stylesheet linkage, labelled nav/form, headings, native button/input controls, polite live loading/empty/forbidden states, and no positive tabindex. | Pass |
| Contrast and focus visibility | Both actual HTML pages load `console.css`; its #101828/#ffffff normal text ratio and #175cd3/#ffffff focus ratio meet the 4.5 and 3 thresholds respectively. The harness computes both ratios and requires the visible `:focus-visible` 3px outline. | Pass |
| Forbidden-state non-leak | Harness renders a synthetic 403 with tenant, account, and financial/server-message fields and asserts none render. Independent inline adversarial testing injected tenant/account/amount/message payload into console and search 403/503 responses: all four adapters rejected without that payload. | Pass |
| Fail closed if target absent/broken | The existing capability-validator test `runtime capability gates reject empty, unbound, and unsafe placeholder artifacts` passed and explicitly exercises absent package/non-allowlisted/broken assertion outcomes. Direct `node scripts/accessibility.mjs` passed only from the declared package target. | Pass |

## Commands, results, and negative cases

- `npm ci --ignore-scripts`: pass. The lockfile has one pre-existing moderate
  advisory; no dependency was added or changed by this candidate.
- `npm run accessibility:check`: pass.
- `npm test`: pass, 928 passed, 0 failed, 1 documented opt-in skip (929 total).
- `npm run lint`, `npm run format:check`, `npm run static:check`, `npm run
  ci:gates`, `npm run validate`, and `git diff --check 0670c1d..c71dda9a`: pass.
- `node apps/customer-console/scripts/accessibility.mjs`: pass, 26 assertions.
- `node --test --test-name-pattern="runtime capability gates reject"
  scripts/ci-gate-validator.test.mjs`: pass; exercised absent/unbound/unsafe
  target rejection.
- Independent 403/503 adversarial inline module test: pass, four payload
  non-leak assertions. It injected synthetic `tenant_id`, `account_number`,
  `amount`, and `message` values into console and transaction-search adapter
  responses and verified values were absent from errors.

## Security and limitations

The reviewed adapter uses `credentials: include`, supported API paths, and no
client-supplied tenant identifier. It preserves only status and stable code
metadata after a failed response, rendering generic forbidden/unavailable
messages. No write, audit event, provider call, credential, customer record,
or deployment was used. The test data is synthetic.

This review does not establish screen-reader compatibility, a deployed
authenticated route, full TASK-0119 customer-console capability, a real API
contract implementation, production accessibility compliance, or GitHub
review approval. Hosted CI must still execute after integration. Any failure
requires a separate Frontend corrective-forward branch and a new independent
QA review; do not weaken the accessibility gate, reset, force-push, or discard
this evidence.
