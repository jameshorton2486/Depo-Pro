# GitHub Cleanup Plan

Date: 2026-06-08

## Current Sync Status

- Working tree clean: yes
- Current branch: `feature/stage3-workspace-core`
- Remote: `origin` -> `https://github.com/jameshorton2486/Depo-Pro.git`
- Local HEAD at audit time: `e4fa8ef27b9c227dfd748c2e8a5e629468a15c6c`
- Current branch push status: pushed successfully
  - remote branch advanced from `bb85a46` to `e4fa8ef`
- Local branch == remote branch after push: yes
  - verified with `git log origin/feature/stage3-workspace-core --oneline -5`
- Backup tag on origin: yes
  - `stage3-pre-merge-backup` -> `bb85a46c02bef305d550a7ecccebf56c44984fd3`
- Tags push status: `Everything up-to-date`

## Merged Branch Audit

Method:
- `git branch --merged feature/stage3-workspace-core`
- `git branch -r --merged feature/stage3-workspace-core`
- `git rev-list --left-right --count <branch>...feature/stage3-workspace-core`

Interpretation:
- left count = commits unique to the candidate branch
- right count = commits unique to `feature/stage3-workspace-core`
- a candidate is safe later only if left count is `0`

| Branch | Local merged? | Remote merged? | Unique commits on branch? | Evidence | Verdict |
| --- | --- | --- | --- | --- | --- |
| `feature/stage3-adapter-layer` | yes | yes | no | `git rev-list --left-right --count feature/stage3-adapter-layer...feature/stage3-workspace-core` -> `0 151` | SAFE-TO-DELETE-AFTER-RC |
| `feature/stage3-mount-contract` | yes | yes | no | `git rev-list --left-right --count feature/stage3-mount-contract...feature/stage3-workspace-core` -> `0 151` | SAFE-TO-DELETE-AFTER-RC |
| `feature/stage3-provider-migration` | yes | yes | no | `git rev-list --left-right --count feature/stage3-provider-migration...feature/stage3-workspace-core` -> `0 150` | SAFE-TO-DELETE-AFTER-RC |
| `main` | yes | yes | no relevant cleanup action | merged listing only; not a cleanup candidate | KEEP |

## Do Later, Manually

Precondition:
- only after `release/stage3-rc` exists or after a merge to `main`
- and **not during the active freeze**

Manual local deletes:

```powershell
git branch -d feature/stage3-adapter-layer
git branch -d feature/stage3-mount-contract
git branch -d feature/stage3-provider-migration
```

Manual remote deletes:

```powershell
git push origin --delete feature/stage3-adapter-layer
git push origin --delete feature/stage3-mount-contract
git push origin --delete feature/stage3-provider-migration
```

## Retention Note

Retain the `stage3-pre-merge-backup` tag until after a successful release merge and post-release verification.

## Safety Note

This run did **not**:
- delete any branch
- force-push
- rebase
- rewrite history
- change remotes

## Required PII Purge Before Any External Sharing

- `etminan_response.json` and `scripts/fixtures/garza-home-depot.txt` contained real deposition data and must be purged from git history before this repository is shared outside the current controlled environment.
- Working-tree deletion is not sufficient. Use `git filter-repo` or BFG Repo-Cleaner to remove those paths from all reachable history, then force-push the rewritten branch set only after explicit sign-off.
- Replacement fixtures must remain synthetic only.
