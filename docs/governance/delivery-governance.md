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
