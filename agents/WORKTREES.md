# Worktree guidance

Use one branch and worktree per writing stream after the baseline repository exists.

```powershell
git worktree add ..\upfs-task-0001 -b task/TASK-0001
```

Open that folder as a separate Codex task. Do not let two agents edit the same files. Commit cohesive changes, run validation, have QA review the commit, then merge through a protected pull request. Remove only the specific completed worktree after confirming it is clean:

```powershell
git worktree list
git -C ..\upfs-task-0001 status
git worktree remove ..\upfs-task-0001
```
