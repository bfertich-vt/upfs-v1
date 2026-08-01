# Start here

1. Read `AGENTS.md` and the role prompt that applies to your work.
2. Read `specs/00_constitution/engineering_constitution.md` before interpreting any recovery evidence.
3. Read `README.md` and `docs/REPOSITORY_GOVERNANCE.md` for the current recovery and external-governance status.
4. On the current candidate branch (`recovery/documentation-status-002`), run the recorded local checks:

   ```powershell
   npm run traceability:check
   npm run validate
   npm test
   git diff --check
   ```

5. Open `tasks/queue.yaml` to confirm that the audited queue is frozen/reclassified. Do not select `TASK-0001`, or any product task, from this state.
6. Treat passing local control-plane checks as local evidence only. Product work stays gated pending an authorized queue, external GitHub branch/reviewer governance, and independent QA/Security review.

## Definition of done

A change is done only when its specification, API/event/schema contract, authorization, audit behavior, tests, documentation, migration/rollback implications, operational evidence, required independent review, and applicable external governance are complete. This recovery document correction is not a product completion or release claim.
