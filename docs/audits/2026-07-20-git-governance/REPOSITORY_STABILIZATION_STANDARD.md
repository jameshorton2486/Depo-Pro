# Repository Stabilization Standard

**Status:** Canonical DEPO-PRO engineering operating procedure
**Scope:** Repository stabilization before implementation resumes or a release candidate is created.

## Principles

- Begin with evidence, never assumptions.
- Preserve recoverability before changing repository state.
- If a focused commit is buried behind unrelated local commits, create a clean branch from the remote base and submit only the reviewed change; never push the entire branch merely to publish it.
- One commit has one purpose and one architectural responsibility.
- No implementation work may begin while the working tree cannot be partitioned into deterministic commit groups.
- Do not continue through uncertainty.
- Stabilization is checkpointed; the next phase requires explicit review and approval.

## Phase 0 — Repository Preservation

Before any stabilization action:

- [ ] Create a Git bundle backup.
- [ ] Export the current branch list, including HEAD SHA and upstream.
- [ ] Export the current tag list.
- [ ] Export all worktree information.
- [ ] Export all stash information.
- [ ] Record the current HEAD SHA of every branch.
- [ ] Record the GitHub default branch.
- [ ] Create a Repository Recovery Log with recovery-start SHA, current HEAD, branch/worktree/stash inventories, and the operator/date.

**Checkpoint 1 — Repository Preservation:** report the backup location and inventories. Do not begin classification until approved.

## Phase 1 — Classification

Review every unpushed commit, modified or untracked file, stash, and worktree. Nothing is deleted.

### Commit disposition

Every unpushed commit receives exactly one disposition:

| Disposition | Meaning |
|---|---|
| Keep | Retain unchanged in the intended history. |
| Squash | Combine with directly related commits into one reviewable purpose. |
| Split | Divide because it owns more than one purpose. |
| Archive | Preserve outside the active line as a named branch/tag/bundle reference. |
| Superseded | Preserve the SHA and record why a later change replaces it. |

### Commit category

Every commit and working-tree group receives exactly one category:

| Category | Description |
|---|---|
| Architecture | Ownership, boundaries, or contract changes. |
| Feature | Functional user-visible implementation. |
| Bug Fix | Production-behavior correction. |
| Refactor | Internal change with no intended behavior change. |
| Validation | Tests or verification only. |
| Documentation | Documentation only. |
| Release Engineering | Git, CI, PR, repository, or release process. |
| Infrastructure | Supabase, migrations, Edge Functions, deployment, or environment configuration. |

**Checkpoint 2 — Commit Classification:** publish the disposition/category matrix and obtain approval before partitioning files.

## Phase 2 — Separation

Partition the working tree into single-purpose groups, for example Documentation, Architecture, Wave 23B, Wave 23C, Repository Governance, and Infrastructure. A group may not mix architecture, documentation, feature work, migrations, or repository governance.

**Checkpoint 3 — Worktree Classification:** report the disposition of every stash and worktree, including named preservation references for unique work. Obtain approval before staging.

**Checkpoint 4 — Working Tree Partition:** show the exact proposed file list for every commit group. Obtain approval before committing.

## Phase 3 — Commit

Create focused local commits with meaningful messages, such as:

```text
docs(audit): add Git governance audit
feat(canonical): expand canonical integrity validation
feat(proceedings): eliminate duplicate procedural events
```

For each commit, record its category, purpose, test evidence, original/replaced SHAs, and whether it is preserved, archived, squashed, split, or superseded.

## Phase 4 — Push and Verify

Push only approved, focused commits. Update or create the appropriate PR, then verify:

- [ ] Branch exists at the intended remote SHA.
- [ ] PR base, head, description, and state are correct.
- [ ] GitHub Actions ran and CI status is green.
- [ ] Required branch protection/ruleset state is verified in GitHub Settings.
- [ ] Release-branch relationship is correct.
- [ ] Repository Recovery Log records recovery-finish SHA, branches affected, commits rewritten, commits preserved, and commits archived.

## Post-stabilization validation

- [ ] Re-run the Single Owner Audit. Verify Speaker Resolution, Proceedings, Dialogue, Geometry, Deterministic Corrections, Entity Registry, and AI Review each have exactly one owner.
- [ ] Re-run the Wiring Matrix. Each module must be exactly one of Operational, Tested but Unwired, Deprecated, or Retired.

## Stop Conditions

Stop immediately and produce a checkpoint report if any of the following occurs:

- An unexpected merge conflict appears.
- A history rewrite becomes necessary.
- Branch ownership becomes unclear.
- Unique work is discovered.
- An unclassified file appears.

Do not continue past a stop condition without explicit approval and a revised preservation plan.

## Completion Criteria

Repository Stabilization is complete only when:

- [ ] The intended working tree is clean.
- [ ] Every branch has a documented purpose.
- [ ] Every unpushed commit has a category and disposition.
- [ ] Every stash and worktree has a disposition.
- [ ] Every PR has a status.
- [ ] Documentation matches the repository state.
- [ ] CI passes on the intended baseline.
- [ ] The repository is safe for continued implementation.

Only after completion may work resume with Wave 23D — Examination State Machine.
