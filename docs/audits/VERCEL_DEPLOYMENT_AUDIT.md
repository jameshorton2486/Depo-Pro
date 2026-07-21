# Vercel Deployment Audit (Release-Engineering summary)

**Audit type:** READ-ONLY. **Generated:** 2026-07-13

> This is the release-engineering summary. The **detailed, canonical Vercel audit
> is `W0.2A_VERCEL_DEPLOYMENT_AUDIT.md`** in this folder — it holds the full
> findings, the env-var client/server classification, and the dashboard-side
> verification checklist. This file does not duplicate it; it records status and
> points there. **No Vercel configuration was modified.**

## What is knowable from the repository

| Aspect | Repo-side finding |
|--------|-------------------|
| Framework | Vite + React + TypeScript (Vercel auto-detect: "Vite") |
| Build command | `tsc --noEmit -p tsconfig.app.json && vite build` |
| Output directory | `dist/` (Vite default) |
| Node version | **Not pinned** in `package.json` (`.nvmrc` absent); CI uses 20.19.5 |
| `vercel.json` | **Absent** — deployment config lives only in the Vercel dashboard |
| `.vercel/` project link | **Absent** — project linkage not in the repo |
| Env var names | 8 `VITE_*` referenced; 3 undocumented in `.env.example`; `VITE_DEEPGRAM_API_KEY` is a client-exposed secret to resolve (see W0.2A §5) |

## What requires the Vercel console (not knowable from repo — verify)

Connected repository · production branch · preview behavior · build/output/root
settings · domains · deployment history · GitHub webhook. Full checklist in
`W0.2A_VERCEL_DEPLOYMENT_AUDIT.md` §7.

## Status

| System | Status |
|--------|--------|
| Vercel | ⚪ Unknown (dashboard-side audit pending) |
| Environment Configuration | ⚪ Unknown (drift + Deepgram-key question open) |
| Preview Deployments | ⚪ Unknown |
| Production Deployment | ⚪ Unknown |

## Release-engineering note

Because the GitHub **default branch is `feature/stage3-workspace-core`**, Vercel's
"production branch" setting must be checked: if Vercel deploys the default branch,
production is currently tracking a feature branch. Reconciling `main` (branch plan)
and confirming Vercel's production branch should happen together in Session 2.
