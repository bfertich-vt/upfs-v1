# Customer-console accessibility target

`apps/customer-console` is the package-backed accessibility capability target.
Run `npm run accessibility:check` from the repository root; the CI validator
invokes its allowlisted `node scripts/accessibility.mjs` command.

The target imports the actual console shell and transaction-search workbench.
It checks HTML language, encoding, viewport, labelled navigation and search,
headings, native keyboard-operable controls, polite status announcements, and
loading, empty, and forbidden states. Its negative forbidden responses contain
only synthetic identifiers and deliberately verify that tenant, account, and
financial fields never render.

The harness is a deterministic structural/component check, not a substitute
for an assistive-technology review or a deployed customer console. Authors must
preserve supported authenticated API use, session-derived scope, safe generic
error rendering, labels, headings, and native controls. A missing package,
non-allowlisted command, failed harness, or empty assertion output fails CI
closed. TASK-0119 remains required for the authenticated deployed route and
full end-to-end accessibility evidence.
