# Start here

1. Read `AGENTS.md`.
2. Read `specs/00_constitution/engineering_constitution.md`.
3. Read `specs/01_product/vision_and_scope.md` and `specs/03_architecture/system_architecture.md`.
4. Run `powershell -ExecutionPolicy Bypass -File scripts/validate.ps1`.
5. Open `tasks/queue.yaml`; only work on a task whose status is `ready`.
6. Start with `TASK-0001`. Do not implement product features before its acceptance gates pass.

## Definition of done

A change is done only when its specification, API/event/schema contract, authorization, audit behavior, tests, documentation, migration/rollback implications, and operational evidence are complete.
