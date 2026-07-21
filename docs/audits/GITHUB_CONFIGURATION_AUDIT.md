# GitHub Configuration Audit

**Audit type:** READ-ONLY. **Generated:** 2026-07-13
**Repository:** jameshorton2486/Depo-Pro

---

## Summary table

| Setting | Current | Recommended | Severity |
|---------|---------|-------------|----------|
| Default branch | `feature/stage3-workspace-core` | `main` | 🔴 High |
| Visibility | **PUBLIC** | Confirm intent (likely Private) | 🔴 High |
| Branch protection (default) | **None** | Require PR + Verify check | 🔴 High |
| Branch protection (`main`) | **None** | Require PR + Verify check + linear history | 🔴 High |
| Required status checks | None | `Verify` workflow required | 🟡 Medium |
| Auto-delete merged branches | Off | On | 🟡 Medium |
| Merge strategy | Not enforced | Squash or rebase (linear) | 🟡 Medium |
| Labels | GitHub defaults only | Add wave/area labels (optional) | 🔵 Low |
| Milestones | None | Optional (waves as milestones) | 🔵 Low |
| Projects | None observed | Optional | 🔵 Low |
| Secrets | Not inspectable via API | Verify in Actions settings | ⚪ Unknown |
| CODEOWNERS / CONTRIBUTING | Absent | Add for onboarding | 🔵 Low |

## Findings

### 🔴 Default branch is a feature branch
GitHub's default is `feature/stage3-workspace-core`. Consequences: clones/forks
land on a feature branch; PRs default to it; `main` silently rots. This is the
single most important configuration issue. Fix is gated on the `main`
reconciliation (see `BRANCH_CONSOLIDATION_PLAN.md`).

### 🔴 Repository is PUBLIC
`visibility: PUBLIC`, `isPrivate: false`. DEPO-PRO is legal-deposition production
software. A prior commit (`chore(privacy): remove real PII, add synthetic
fixtures`) shows privacy awareness, and `.env`/`.env.*` are correctly gitignored
(no secrets tracked). Still — **confirm PUBLIC is intentional.** If it is meant to
be a proprietary product, switch to Private. If open-source is intended, it needs
a LICENSE (currently none — see Release Readiness).

### 🔴 No branch protection anywhere
Neither `main` nor the default branch is protected (HTTP 404 "Branch not
protected"). Anyone with write access can push directly or force-push. For a
release-ready repo, require PRs and the `Verify` check on the release branch.

### 🟢 CI exists and is good (see GitHub Actions below)
One workflow, `Verify`, running the full gate. It is simply not *required* by
protection yet.

## GitHub Actions

| Workflow | State | Triggers | Steps |
|----------|-------|----------|-------|
| `verify.yml` ("Verify") | Active | `pull_request`; `push` to `main` and `feature/stage3-workspace-core` | checkout → Node 20.19.5 → `npm ci` → typecheck → lint → test → build |

- **Coverage: complete** for CI (typecheck, lint, test, build). Node pinned to
  20.19.5, npm cache enabled, `permissions: contents: read` (least privilege). This
  is a well-formed workflow.
- **Gaps:** no deploy workflow (acceptable — Vercel deploys natively via Git
  integration; see Vercel audit), and `Verify` is **not a required check** because
  no branch protection references it. No duplicate or broken workflows.

## Recommendations (Session 2, on approval)

1. Reconcile `main`, then set it as default.
2. Confirm/adjust visibility (Private, or add LICENSE if staying public).
3. Add branch protection to `main`: require PR, require the `Verify` check,
   require linear history.
4. Enable auto-delete of merged head branches.
5. Standardize on squash- or rebase-merge.
6. Optional: wave/area labels, CODEOWNERS, CONTRIBUTING.
