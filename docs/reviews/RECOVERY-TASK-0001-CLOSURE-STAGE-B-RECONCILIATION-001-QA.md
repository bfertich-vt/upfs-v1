# Independent QA/Security review: RECOVERY-TASK-0001-CLOSURE-STAGE-B-RECONCILIATION-001

## Disposition

**REJECTED** for exact reconciled candidate
`bfb00f6432d72ee79ef634ee02871e89ed63ab2e`.

The candidate permits one independently audited incomplete-task disposition to
be substituted for another allowed label without failing validation. Do not
push, open a protected pull request, merge, or advance `TASK-0002`. Preserve
this candidate and review, correct forward, and obtain fresh independent
QA/Security review.

## Reviewer provenance

- Reviewer role: Independent QA/Security under `agents/QA_SECURITY.md`; this
  reviewer did not author or remediate the candidate and did not perform Stage
  A or Stage B QA.
- Agent thread: `/root/qa_task_0001_stage_b_reconciliation_001`.
- Isolated worktree: `C:\source\upfs-qa-task-0001-stage-b-reconciliation-001`.
- Branch: `qa/task-0001-stage-b-reconciliation-001`.
- Exact reviewed candidate: `bfb00f6432d72ee79ef634ee02871e89ed63ab2e`.
- Reconciliation merge: `65c737d59509160d8fc21a45b2550cd907dbced4`.
- Exact merge parents: accepted Stage B lineage
  `4132317dbc06cbda3984773247ce55e5d46a6d32` and protected historical
  disposition lineage `420403fc09962d35d19af0cd735b056cb2a9a1ba`.

## Governing inputs read completely

| Path | SHA-256 |
| --- | --- |
| `AGENTS.md` | `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1` |
| `agents/QA_SECURITY.md` | `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0` |
| `agents/WORKTREES.md` | `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1` |
| `agents/HANDOFF_TEMPLATE.md` | `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4` |
| `specs/00_constitution/engineering_constitution.md` | `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73` |
| `specs/09_cicd/delivery_pipeline.md` | `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb` |
| `specs/10_security/security_baseline.md` | `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add` |
| `specs/12_testing/test_strategy.md` | `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172` |
| `tasks/recovery/RECOVERY-TASK-0001-CLOSURE-STAGE-B-RECONCILIATION-001.yaml` | `6269a1dd667d6d824302adc654fc8b060a09642fc01c93f05b4bba9ea2387412` |
| `docs/handoffs/RECOVERY-TASK-0001-CLOSURE-STAGE-B-RECONCILIATION-001.md` | `7caeb6b1a440fa3028f34a72bee3a2708b7809b300a645cf1b17a6292561095b` |
| `tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R4.yaml` | `1b998600cc28ba362538e48b0c8f0f2d0c74e8a591f9cd20e59b69b056864cde` |
| `docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R4.md` | `9cf21f614eb3d6e47592eda12e8a5db7a1600c03c0966b859cf5f1c8637d33f5` |
| `docs/reviews/RECOVERY-TASK-0001-CLOSURE-002-R4-QA.md` | `ac0993b78ad9f9bd5f60d147405d95b0ffc2e40296718ce9019efb3bc613230c` |
| `tasks/recovery/RECOVERY-TASK-0001-CLOSURE-002-R5.yaml` | `3f5bbb15f81af875af74b1b11fa9c03ab16ebbf2c20856e8509082c1ee292052` |
| `docs/handoffs/RECOVERY-TASK-0001-CLOSURE-002-R5.md` | `92a67461857c6634f336b60b9cd9611fe55f2040d9c15f0035455921ebd20a33` |
| `docs/reviews/RECOVERY-TASK-0001-CLOSURE-002-R5-QA.md` | `a7bfd2cb759e5216c224b055e953ee19bc80c483fbada609685774478bfaf618` |
| `tasks/recovery/RECOVERY-TASK-0001-CLOSURE-STAGE-B-001.yaml` | `4d758aa18909d9f4114fc7d1e5ff0244fe3f29b5207f431ab4747ac9d6c985bc` |
| `docs/handoffs/RECOVERY-TASK-0001-CLOSURE-STAGE-B-001.md` | `0cba1f3c0078980713ddf848769bcc8515b9409ef5ecbccd00571f908ae6da79` |
| `docs/reviews/RECOVERY-TASK-0001-CLOSURE-STAGE-B-001-QA.md` | `caba1c86a9b5d34c674603ebb7454896531891888c074b4e3dada0f27030d61c` |

The protected disposition tasks, handoffs, and reviews 001 through 005; the
110-row matrix; queue; active and rejected closure records; structured
attestation; validator and tests; exact candidate diff; and Git topology were
also inspected. Their protected blobs are byte-identical to parent `420403fc...`,
and accepted Stage A/Stage B evidence is byte-identical to parent `4132317d...`.

## Blocking finding

### High: allowed-label substitution changes the audited blocker class

The task requires every incomplete historical task to retain **exactly** its
audited `REMEDIATION_REQUIRED`, `EXTERNAL_PREREQUISITE`, or `NOT_IMPLEMENTED`
disposition. `validateHistoricalClosures()` instead checks only whether the
matrix value belongs to a three-value set. It does not bind each task to its
independently accepted disposition. The authored tests reject literal
`blocked` and false `ACCEPTED`, but do not reject substitution among the three
allowed values.

Independent reproduction used a separate disposable clone at exact candidate
`bfb00f6432d72ee79ef634ee02871e89ed63ab2e`. Only TASK-0002's matrix
disposition was changed from audited `REMEDIATION_REQUIRED` to
`EXTERNAL_PREREQUISITE`; all other content was unchanged:

```text
node scripts/validate-repository.mjs
allowed_disposition_substitution_exit=0
TASK-0002 disposition: EXTERNAL_PREREQUISITE
```

This is security- and governance-material: `REMEDIATION_REQUIRED` means safe
in-repository correction remains possible, while `EXTERNAL_PREREQUISITE`
asserts an external blocker. Silent substitution can suppress actionable
remediation, falsify roadmap state, and defeat the independently reviewed
closure matrix while every gate remains green.

Required correction: bind each incomplete task to its exact protected,
independently accepted disposition using immutable, deterministic evidence.
Add negative tests that swap each allowed class to each other allowed class,
in addition to arbitrary strings, literal `blocked`, false `ACCEPTED`, queue
and matrix drift, and frozen-task promotion. Do not weaken active closure or
Stage A topology validation.

## Passing evidence and commands

| Command | Result |
| --- | --- |
| Initial focused test before dependency setup | Expected fresh-worktree dependency failure (`prettier` and `yaml` absent); no candidate defect. |
| `npm ci --ignore-scripts` | Pass in 4.71 s; 106 packages installed, 107 audited, zero vulnerabilities. |
| `node --test scripts/historical-closure-validator.test.mjs scripts/closure-format-check.test.mjs` | Pass 5/5 in 93.38 s. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` | Pass in 6.01 s; 283 Markdown, 65 JSON contracts, 5 YAML contracts. |
| `npm run format:check` | Pass in 1.89 s. |
| `npm run queue:check` | Pass in 5.99 s. |
| `npm run traceability:check` | Pass in 25.82 s. |
| `npm test` | Pass in 301.72 s; 941 total, 940 passed, 0 failed, 1 documented pre-existing opt-in skip. |
| `npm audit --audit-level=high` | Pass in 2.00 s; zero vulnerabilities. |
| `git fsck --full --strict` | Pass in 11.35 s; five dangling local tree/blob objects only, no integrity error. |
| `git diff --check 420403fc09962d35d19af0cd735b056cb2a9a1ba..HEAD` | Pass. |
| Exact parent/ancestry, blob preservation, authorized-file, matrix-row, queue-freeze, and status inspection | Pass. |
| Disposable-clone allowed-disposition substitution | **Fail closed requirement violated:** validator exited 0. |

The existing focused suite continues to protect exact Stage A candidate,
review, attestation, digest, immutable blob, canonical bytes, direct-parent and
whole-commit topology, pre-seeding, extra payloads, rename/copy/type/symlink/
gitlink attacks, hosted evidence, accepted queue/matrix drift, and frozen-task
promotion. Those protections were not weakened by the merge.

## Security, tenant, runtime, and rollback assessment

This is a governance-only candidate. It changes no runtime authorization,
tenant, financial, API, schema, migration, provider, or durable state. Runtime
authorization denial, cross-tenant, replay, idempotency, concurrency, and
migration tests are not applicable to the diff and are not claimed. Full-suite
coverage remained green, no secrets, credentials, customer data, or sensitive
financial data were identified, and no production/runtime claim was added.

Evidence integrity is the applicable security boundary, and the reproduced
disposition substitution fails it. Preserve both merge parents, all accepted
and rejected evidence, this candidate, and this rejection. Correct forward in
a new bounded Backend candidate; never rewrite history or relax validator
semantics. `TASK-0002` and `TASK-0112` through `TASK-0123` remain frozen.

## Final verdict

**Verdict: REJECTED** for exact candidate
`bfb00f6432d72ee79ef634ee02871e89ed63ab2e`.
