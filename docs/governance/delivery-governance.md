# Delivery governance

## Recovery queue freeze

`recovery_freeze: true` is a narrow, fail-closed recovery control. It permits a
queue with no `ready` task only when every nonterminal task is `blocked`; tasks
already `complete` or `superseded` remain terminal evidence subjects and do not
invalidate that quiescent state.

A frozen queue must not contain `planned` or `in_progress` work. An unfrozen
nonterminal queue must retain at least one `ready` task. Existing dependency,
complete-handoff, provenance, historical-evidence, and structural validation
continue to apply in both states.

The flag does not authorize skipped work, product work, a status promotion, or
acceptance without an independently reviewed handoff. It only records that no
currently runnable recovery work exists; it never converts blocked work or
documentation into production capability evidence.

## Historical task closure

A task in the immutable `TASK-0001` through `TASK-0110` recovery range may be
promoted from `blocked` to `complete` while `recovery_freeze: true` only when a
machine-readable `docs/governance/task-closures/TASK-NNNN.json` record proves an
`ACCEPTED` current disposition. The original reclassification record and queue
`historical_evidence` remain unchanged; closure evidence is additive.

The queue validator binds the closure to existing immutable implementation,
handoff, and independent-QA Git objects; an explicit accepted verdict; the
exact hosted pull-request head; both required successful check runs; an
inspected validation artifact and content digest; the protected merge commit
and identical merged tree; every queue acceptance criterion; completed
dependencies; and the matching closure-matrix disposition. Missing, stale,
forged, duplicated, or mismatched evidence fails closed.

GitHub API facts cannot be safely or deterministically re-queried by offline
validation. The closure therefore retains an inspected immutable snapshot with
run, job, artifact, digest, head, PR, and merge identifiers and explicitly
discloses this trust boundary. Repository Git facts and retained artifact
content are revalidated offline. A future contradictory hosted observation
requires corrective-forward evidence; it never permits rewriting the original
historical record.
