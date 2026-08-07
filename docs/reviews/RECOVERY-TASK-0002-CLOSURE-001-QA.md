# Independent QA/Security review: RECOVERY-TASK-0002-CLOSURE-001

## Disposition

**REJECTED** for exact candidate
`96e7834682eb6de1f1f9605f5c8bf8a497bce46a`.

Do not promote TASK-0002, update its queue or matrix disposition, push, or merge
this candidate. Preserve this review and correct forward through a new bounded
Backend candidate followed by fresh independent QA/Security review.

## Review provenance and scope

- Reviewer: independent Codex QA/Security under `agents/QA_SECURITY.md`; thread
  `/root/qa_task_0002_closure_r1`. The reviewer did not author or remediate the
  candidate and did not edit implementation.
- Isolated worktree and branch:
  `C:\source\upfs-qa-task-0002-closure-r1`;
  `qa/task-0002-closure-r1`.
- Exact reviewed candidate:
  `96e7834682eb6de1f1f9605f5c8bf8a497bce46a`; base and merge-base
  `e84699d502d684ec1772e507379d47770f00f132`; structured task
  `34e8a077dea90136440365f65d2ff662500fe1ac`; implementation
  `d791351ca51102da289f7c3e40bf61bfa2ebd850`; initial handoff
  `113cdbcf328c0c893b7d133b157a5e25513a6e68`.
- Exact net diff contains four authorized additions only: the recovery task,
  service, service test, and recovery handoff. No queue, closure-matrix,
  historical-handoff, status, specification, TASK-0001, or TASK-0003+ path
  changed. Base is an ancestor; candidate is a linear four-commit descendant.
- Complete structural reads covered all 123 unique queue tasks and all 110
  unique 18-field matrix rows. TASK-0002 remains `blocked` /
  `REMEDIATION_REQUIRED`; historical evidence commit
  `665ef5ccddac9f25b84e1dc0aa4502c9321c289c` and handoff were inspected.

## Role and input digests

- `AGENTS.md`: `9d8465020d6f658294fba5a20462e62fdf2d67cf6e7d74fd665f7d753f86bac1`
- `agents/QA_SECURITY.md`: `6cd277c714ad66f82e46f57cefc769ae6d6fbb3b082b77a8c8b3d9a9b3d00cc0`
- `agents/WORKTREES.md`: `f96d64f56121b250069da37cf1c93eb6b05d91622f5e09e1f907629a6d7d72d1`
- `agents/HANDOFF_TEMPLATE.md`: `4768090523a85bc8528d6604c01cfc43ce4567bc361a7075551d6521e28a9de4`
- `specs/00_constitution/engineering_constitution.md`: `e2225f3b041925d19dca4370cf0a8cdfaf677f0b18793ad31199be3b2e454f73`
- `docs/MASTER_PLAN.md`: `2c04b5d43422ede9fd1900ada5005062dfe71a8a91829625ac1d9701c108fdec`
- `specs/03_architecture/system_architecture.md`: `4cf1bb34221ef40bab4410426d6e0cda9871e953fe39d0ac2f56d238af08fdc6`
- `specs/04_schema/identity_tenant_model.md`: `c47f97669c5cfb5d1ad984139b2fb85dd4f503fb750a657d4585c5b47f1b2adf`
- `specs/05_apis/api_standards.md`: `23f6694cc82942cdb59ba9f9238dc8496000855e2d8bf5c583550c24760da16b`
- `specs/10_security/security_baseline.md`: `53699772fd569cabb0b0ab31c21b59e10fdb538fde1a38952ce07b2305220add`
- `specs/10_security/threat_model.md`: `716160eddf02484faa73c778138fdbd2ac8614ed2cde63e20665a68b7e4eeb9f`
- `specs/12_testing/test_strategy.md`: `349b29981df7101760a2a63cfc5d05732e3d8afa0d47e3c3b123d1305bb04172`
- `contracts/schemas/identity-foundation.schema.json`: `4d1e9ece1ca131fea50c0b0b35761c7086a6610747cbfbd0913cb4d860c7f022`
- `tasks/queue.yaml`: `0a68c4b846e9daacd2eefc6d18bafa1ab5a1567ac848c5bf1ca6b94e5376e02b`
- `docs/HISTORICAL_TASK_CLOSURE_MATRIX.md`: `05e29ce65b83b934fa80b116bb4052e74088de9e766d4b8de703941c091b2922`
- `docs/handoffs/TASK-0002.md`: `87c46cf294e267470264b0ffe4cb941fd519a0a3ce4e73a39b9e37e09ae4818d`
- `tasks/recovery/RECOVERY-TASK-0002-CLOSURE-001.yaml`: `6b84be559a692b8e2680d93c0d7af857fc4013210a98b54567c796162ae046a7`
- `docs/handoffs/RECOVERY-TASK-0002-CLOSURE-001.md`: `bed0ba7d71701cb4d00f28d5ef7cfa1345db6276f48cfd523d31bb6dc51796fc`
- Service: `ecad2bbbc56cfc64a8fcfa8cf704e7243c15903d4018b54f71169f98aa3b6351`;
  focused test: `891a0203e536cf8add63e8064fbcae7624cf16ff4844f546f234e478b2f96781`.

## Blocking findings

### High: idempotency keys are global across tenants

The repository indexes idempotency by the raw caller key only. After tenant A
uses `same`, an independently authorized tenant B using its own scope and the
same key receives `IDEMPOTENCY_CONFLICT`. This is a cross-tenant collision
oracle and availability failure. Namespace replay state by the verified
organization/tenant/environment, operation, and key, and add same-key
cross-tenant success plus changed-payload tests inside each scope.

### High: the injected repository boundary can commit state without audit

The constructor accepts an incomplete repository and later leaks a raw
`TypeError`. More critically, mutation state is committed before audit append.
An independent repository whose `appendAudit` fails left one organization
committed while throwing `Error: audit store unavailable`. State, idempotency,
and audit must share one transactional repository operation; validate the
adapter contract at composition and fail closed. Test commit, audit, and retry
failures independently.

### High: normative identity/schema and lifecycle constraints are not enforced

The service accepts non-UUID organization, tenant, and environment IDs although
the identity model requires opaque UUIDs and the supplied schema declares UUID
formats. It emits `decommissioned`, while the contract status enum uses
`deactivated`, and returned resources do not conform to the supplied resource
schema. Independently, after decommissioning a tenant the service still reads
and transitions its active child environment. Reconcile the contract and
implementation without weakening either, validate resource shape/UUIDs, and
enforce parent/child lifecycle invariants and corrective-forward behavior.

### High: replay attempts are omitted from append-only audit evidence

A successful idempotent replay returns before `#audit`; audit count remains
unchanged. This contradicts the acceptance and handoff claims that attempted
mutations are appended. Record a redacted replay outcome while preserving a
single durable domain effect.

### High: malformed verified actor identity is accepted

`actorMembership()` checks only `typeof actor.actorId === "string"`. An empty
actor ID with an otherwise matching membership creates the foundation instead
of failing `UNAUTHENTICATED`. Require a non-empty validated immutable actor
identifier and add empty/whitespace/wrong-type cases.

### High: final-candidate provenance is materially ambiguous

The exact reviewed candidate is `96e7834`, but the handoff labels
`d791351...` as `Commit: candidate` and describes later commits only as
provenance. `d791351...` excludes the handoff and both later handoff commits.
This does not truthfully identify the exact promotion candidate required by the
current independent-review contract. A corrective handoff must unambiguously
separate implementation commit from exact final candidate/topology using the
repository's accepted non-self-referential provenance mechanism.

### Medium: structured task names two nonexistent gate scripts

The task requires `npm run queue:validate` and
`npm run traceability:validate`, but `package.json` defines `queue:check` and
`traceability:check`. QA ran the real current gates successfully; correct the
future structured task so every mandated command is executable as written.

## Independent commands and results

| Command | Result |
| --- | --- |
| `node --test services/identity-organization-tenant-and-environment-foundation.test.mjs` | Pass: 8/8, 0 fail; Node duration 99 ms, wall 168 ms. |
| Independent actor/idempotency/replay harness | **Fail:** empty actor accepted; cross-tenant same key returns `IDEMPOTENCY_CONFLICT`; replay audit count unchanged. |
| Independent UUID/schema/parent-lifecycle harness | **Fail:** non-UUID scope accepted; `decommissioned` emitted; child read and transition succeed after tenant decommission. |
| Independent repository-adapter/audit-failure harness | **Fail:** incomplete adapter accepted then raw `TypeError`; audit failure leaves organization committed. |
| `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1` | Pass: 321 Markdown, 65 JSON, 5 YAML; 8.437 s. |
| `npm run format:check` | Pass: 48 pinned-Prettier files and closure structure; 4.285 s. |
| `npm run queue:check` | Pass; 8.321 s. |
| `npm run traceability:check` | Pass; 40.109 s. |
| `npm test` | Pass: 957 total, 956 pass, 0 fail, 1 pre-existing skip; Node 304.556 s, wall 305.168 s. |
| `npm audit --audit-level=high` | Pass: zero vulnerabilities; 3.474 s. |
| `git fsck --full --strict` | Pass: only preserved dangling local objects; 13.184 s. |
| Exact ancestry, four-path authorization, `git diff --check`, and clean-head inspection | Pass at `96e7834`; no unauthorized/status diff. |

## Security, classification, and required correction

The opaque permission and cross-tenant resource denials in the authored suite
work, changed-payload replay and stale versions fail, injected pre-commit
failure leaves the in-memory maps unchanged, and returned audit copies resist
caller mutation without exposing tested names/tokens. Those positives do not
cure the independent failures above.

`InMemoryFoundationRepository` is truthfully only a **reference composition**.
This review accepts no claim of durable PostgreSQL/RLS persistence, production
OIDC/workload identity, API route wiring, deployment, managed infrastructure, or
production runtime evidence. Correct forward all blocking findings, preserve
the rejected commits and review, rerun the negative cases and complete gates on
the new exact candidate, and assign a different fresh QA/Security reviewer.

## Final verdict

**REJECTED** for exact candidate
`96e7834682eb6de1f1f9605f5c8bf8a497bce46a`. No queue, matrix, task-status,
push, merge, or historical acceptance action is authorized by this review.
