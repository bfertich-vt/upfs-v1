# UPFS + Codex: the complete beginner walkthrough

You are going to give Codex one folder containing the rules, plans, contracts, and task list. Codex will work inside that folder.

## Part 1 — Put the project somewhere safe

1. Download `UPFS-v1.0-Codex-Repository.zip`.
2. Open Downloads and right-click the ZIP.
3. Choose **Extract All**.
4. Put the extracted `upfs-v1` folder at `C:\source\upfs-v1` (create `C:\source` if needed). Avoid OneDrive-synced Desktop folders for the live repository because sync can interfere with development files. A Desktop shortcut is fine.

## Part 2 — Install the two basics

1. Install **Git for Windows** from the official Git website.
2. Install/open the **Codex desktop app** and sign in.
3. You do not need Docker for the first task. Docker Desktop is needed later when services begin running locally.

## Part 3 — Prepare the folder

1. Open the extracted `upfs-v1` folder.
2. Double-click `scripts\setup-windows.cmd`.
3. A window should say `UPFS validation passed` and show the folder to open.
4. If Windows blocks the script, right-click `setup-windows.ps1`, choose **Run with PowerShell**, and approve only if the path is your extracted UPFS folder.

## Part 4 — Open it in Codex

1. In Codex, choose **Open folder** (or start a new task and select a folder).
2. Select `C:\source\upfs-v1`.
3. Codex automatically sees `AGENTS.md`. That file is the rulebook.
4. Paste this exact first message:

> Read AGENTS.md and START_HERE.md completely. Validate the repository. Then inspect TASK-0001 and its listed inputs. Give me a short implementation plan for TASK-0001 only. Do not begin TASK-0002 or any product feature. Ask before changing the task queue.

## Part 5 — What “good” looks like

Codex should read the rules, run validation, discuss only TASK-0001, and show which files it expects to change. It should not start building chat, connectors, or the full UI yet. The first job is the safety rails that make later work reviewable.

When Codex finishes a change, ask:

> Run every required check, compare the result to TASK-0001 acceptance criteria, and produce the handoff report from agents/HANDOFF_TEMPLATE.md. Tell me plainly what remains incomplete.

## Part 6 — Save work with Git

After you have reviewed the result and checks pass:

1. Ask Codex to show a concise change summary and Git status.
2. Ask it to create a commit for TASK-0001. Do not ask it to publish anywhere yet.
3. Git now preserves that checkpoint locally.

## Part 7 — Add specialists later

Do not begin with a swarm. Once TASK-0001 passes, the supervisor may delegate bounded, non-overlapping pieces. Use the prompts in `agents/`. A builder writes; QA/security independently reviews. For simultaneous writing, use the worktree procedure in `agents/WORKTREES.md`.

## Part 8 — Starting local services later

After Docker Desktop is installed, run `docker compose up -d` from the repository folder. This starts development-only PostgreSQL, Redis, and OpenSearch. The included passwords and disabled OpenSearch security are local-only and must never be used in a shared or production environment.

## Part 9 — The three rules to remember

1. One ready task at a time.
2. Tests and evidence decide whether work is done.
3. Never put real bank/customer data or secrets in Codex, fixtures, logs, or Git.

## If something goes wrong

- “Git not found”: install Git for Windows, close/reopen the window, and run setup again.
- Validation fails: give Codex the exact error; do not ask it to bypass the check.
- Docker fails: ignore Docker until a task actually requires services.
- Codex tries to build everything: remind it that only `ready` tasks are authorized.
- You are unsure about a security/compliance decision: stop and obtain qualified review; the repository is a blueprint, not legal advice or an audit.
