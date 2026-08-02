# RECOVERY-CI-PG-NODE-RANGE-022 independent Codex QA/Security review

## Verdict

**ACCEPT, conditional on hosted Ubuntu evidence.** The committed candidate binds
the raw-port check to the parsed `jobs.repository-validation.services.postgres.ports`
AST node range. Independent adversarial replay confirms a canonical unrelated
`services.decoy.ports` mapping cannot satisfy validation when the actual
PostgreSQL service is valid YAML but has alternate indentation. No local Docker
runtime is available, so this acceptance does not claim that migrations or RLS
executed locally; the required GitHub-hosted migration and tenant-isolation gate
must pass after integration before this recovery item can be promoted.

## Independent reviewer and provenance

- QA task: `RECOVERY-CI-PG-NODE-RANGE-022-QA`.
- Assigned role: Independent QA/Security; role file
  `agents/QA_SECURITY.md`, SHA-256
  `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`.
  The runtime has no native custom-role field. The supervisor bound this role in
  the initial assignment before review. This is independent Codex QA/Security
  evidence, not human review and not a GitHub PR approval.
- Reviewer thread: `/root/qa_ci_pg_node_range_022`; isolated worktree and
  branch: `C:\\source\\upfs-qa-ci-pg-node-range-022`,
  `qa/recovery-ci-pg-node-range-022`.
- Candidate reviewed from committed state: handoff commit
  `36c66738218bce3ddd0d263bbf82d03a345ce276`; implementation commit
  `25945425853b4082c3fd78acc487f64caa4f75e1`; retained prerequisite
  `71597b010bca15ed94edc167d6de45c7dc7a070b`; baseline
  `ab80cc323cb1caa411d7b11bacfe7f8a45ae8761`.
- This reviewer did not author or remediate the candidate and changed only this
  review artifact. Corrective-forward remains required if hosted validation
  fails; do not amend, reset, force-push, delete branches, or rewrite history.
- Predecessor rejection reviewed at immutable commit
  `d2914018abe614d585f95e38757eaf719b035aef`:
  `docs/reviews/RECOVERY-CI-PG-RAW-PORT-021-QA.md`, SHA-256
  `f7ff87edb8ccc040695506a8ec3d75cde417c2dbb77bd8261805ec059d5856e2`.
  It demonstrated the prior global-raw-regex decoy bypass; this candidate
  corrects that exact failure using the AST source range.

## Sources loaded before review

| Path | SHA-256 |
| --- | --- |
| `AGENTS.md` | `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1` |
| `agents/QA_SECURITY.md` | `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0` |
| `specs/00_constitution/engineering_constitution.md` | `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73` |
| `agents/WORKTREES.md` | `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1` |
| `agents/HANDOFF_TEMPLATE.md` | `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4` |
| `specs/09_cicd/delivery_pipeline.md` | `f2e59231f95785d2990cabc64d1030f7d312bf86ae96917eb81d86c663501cfb` |
| `specs/10_security/security_baseline.md` | `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add` |
| `specs/12_testing/test_strategy.md` | `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172` |
| `tasks/recovery/RECOVERY-CI-PG-NODE-RANGE-022.yaml` | `70ae8daef5f045a3a49f18daa5bfc6053705c1faef3216af74838325e11f85f8` |
| `docs/handoffs/RECOVERY-CI-PG-NODE-RANGE-022.md` | `13eb1561d5308f1c0ef4ab735491666dd46eb168fe82f23658403b43b0235c96` |
| `.github/workflows/validate.yml` | `7f46b41d668c02b860fd8fe7046a294aa10edc66cffb6a12b5da9629e9c7cfac` |
| `scripts/postgres-service-ci-gate.mjs` | `ee9e39557ea5ef0649a33f3f483b7b749d59c4722441098729fbe97179cbc541` |
| `scripts/postgres-service-ci-gate.test.mjs` | `ce95cbdb46a26e3aae7e50303a0ad296b8c27ba79e38bb156574db9e3f1fd91a` |
| `package.json` | `0ef1255691144c4ab4cd39433f963e832fd55e8352742cb45a928169d95f51eb` |

## Acceptance trace and security evidence

1. **PASS — exact AST association.** `document.getIn()` obtains only the
   PostgreSQL `ports` sequence. The code validates its bounded three-part range
   before extending backwards only to that same source line. The independent
   decoy replay inserts a canonical decoy port and shifts the real `postgres`
   subtree to alternate valid indentation; validation rejects the actual range,
   rather than accepting the decoy. This reproduces the predecessor bypass and
   proves the correction forward.
2. **PASS — lexical and YAML negative cases.** Independent replay rejects the
   quoted, tagged, anchored, aliased, collection, comment, and CRLF variants;
   focused tests additionally cover malformed, extra, whitespace, and alternate
   raw forms. The canonical mapping passes. The raw check is exact LF source
   spelling, with one plain, untagged scalar and one mapping only.
3. **PASS — immutable service and SSRF boundary.** The Actions service image is
   digest pinned. The migration step supplies the one fixed loopback URL. URL
   validation rejects absent, remote, `localhost`, alternate-port/database/user/
   password, protocol, query/fragment, encoded override, and multi-host forms
   before `pg` client construction; the client receives fixed components only.
4. **PASS, static only — migration and tenant isolation design.** The runner
   loads numbered migrations, creates synthetic tenant-A/B records, requires a
   `NOSUPERUSER` application principal to see no unscoped rows, then requires
   exactly tenant-A after transaction-local scope. No production URL, provider
   credential, customer data, financial data, or deployment configuration was
   introduced. The portable sensitive-token scan found no key/token patterns;
   all URI occurrences are fixed CI-only loopback values or negative test data.
5. **PASS — failure and identity behavior.** Both an absent database URL and a
   fixed loopback URL with no local service return a nonzero result without
   emitting a connection URI. Every runner result uses only
   `RECOVERY-CI-PG-NODE-RANGE-022`; predecessor task identities do not remain.

## Commands and results

- `npm ci --ignore-scripts`: passed; 106 packages. `npm audit` reports one
  pre-existing moderate `yaml` advisory and no high/critical finding.
- `node --test scripts/postgres-service-ci-gate.test.mjs`: passed, 26/26.
- Independent adversarial node replay: canonical decoy plus alternate real
  PostgreSQL indentation, quoted, tagged, anchored, alias, collection, comment,
  and CRLF forms all rejected; canonical workflow passed.
- `npm run migration:check` without the URL: expected nonzero fail-closed exit.
  The same command with the fixed loopback URL and no local service also failed
  nonzero with only a generic execution result, not a disclosed URL.
- `npm run format:check`, `npm run lint`, `npm run static:check`,
  `npm run ci:gates`, `npm run validate`, and `git diff --check`: passed.
- `npm test`: 925 passed, 0 failed, 1 documented opt-in skip (926 total).
- Structured task YAML parsed with Node `yaml`: passed.
- Docker is unavailable in this reviewer worktree, so no local container,
  migration, RLS, cross-tenant, or rollback runtime result is claimed.

## Required follow-up and limitations

The supervisor must integrate only this accepted candidate range and wait for a
new GitHub Ubuntu `repository-validation` result. That result must show the
disposable service starts and `migration:check` executes the actual migrations,
unscoped denial, and tenant-A-only RLS assertion. If it fails, use a fresh
Backend corrective worktree followed by a new independent Codex QA/Security
review. This review is repository evidence only and cannot be represented as a
human or native GitHub approval.
