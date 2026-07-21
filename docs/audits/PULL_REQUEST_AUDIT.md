# Pull Request Audit

**Audit type:** READ-ONLY. **Generated:** 2026-07-13
All PRs target base `feature/stage3-workspace-core` (the default branch).

---

| # | Title | Head | State | Base | Verdict |
|---|-------|------|-------|------|---------|
| 4 | Protect certified transcripts from mutation | `agent/certification-mutation-locks` | **OPEN (draft)** | trunk | **Still needed** — resolve |
| 3 | Upgrade development toolchain and clear npm advisories | `agent/dev-toolchain-security` | MERGED | trunk | Done — branch deletable |
| 2 | Update ws to patched security release | `agent/dependency-security-audit` | MERGED | trunk | Done — branch deletable |
| 1 | Fix workspace transcript integrity and add repository verification | `agent/repository-integrity-remediation` | MERGED | trunk | Done — branch deletable |

## Detail

### PR #4 — OPEN (draft) — certification-mutation-locks
- 1 commit ahead of trunk, 0 behind. Concerns protecting certified transcripts
  from mutation — aligns with the README integrity rule ("Certified or
  export-locked transcripts must not be silently changed").
- **Action:** decide whether to finish and merge, or close if superseded by work
  already on the trunk. This is the only PR requiring a decision. Its head branch
  should not be deleted until the PR is resolved.

### PR #1–#3 — MERGED
- All three squash-merged into the trunk; their head branches were **not
  auto-deleted** (auto-delete-on-merge is off). Safe to delete in Session 2.
- Because they were squash-merged, the branch tips are not ancestors of the trunk
  by commit graph (they appear "unmerged" to `git branch --merged`) — this is
  expected and not a cause for concern; the changes are in the trunk.

## Findings

- **No obsolete or abandoned open PRs.** Only #4 is open and it is relevant.
- **No draft PRs other than #4.**
- **Recommendation:** enable "Automatically delete head branches" in repo settings
  so merged PR branches stop accumulating.
