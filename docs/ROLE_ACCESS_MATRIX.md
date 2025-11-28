# Depo-Pro Role Access Matrix

## Dashboard Pages
| Page | ADMIN | COURT_REPORTER | SCOPIST | Notes |
|------|-------|----------------|---------|-------|
| `/dashboard` | ✅ | ✅ | ✅ | Landing view; server redirects to role-specific dashboard. |
| `/jobs` | ✅ (all jobs) | ✅ (own jobs) | ✅ (assigned jobs) | Filtering logic lives in API/DB queries. |
| `/jobs/new` | ✅ | ✅ | ❌ | Scopists redirected to `/dashboard`. |
| `/jobs/[id]` | ✅ | ✅ (if creator) | ✅ (if assigned) | Access enforced in page loader. |
| `/jobs/[id]/edit` | ✅ | ✅ (if creator) | ❌ | Edit guard via `requireRole`/manual checks. |
| `/jobs/[id]/review` | ✅ | ❌ | ✅ | Scopist review workflow. |
| `/reporter` | ✅ | ✅ | ❌ | Reporter dashboard. |
| `/scopist` | ✅ | ❌ | ✅ | Scopist dashboard. |
| `/admin` | ✅ | ❌ | ❌ | Placeholder for admin tools (UI TBD). |

## API Endpoints
| Endpoint | ADMIN | COURT_REPORTER | SCOPIST | Notes |
|----------|-------|----------------|---------|-------|
| `GET /api/jobs` | ✅ (all) | ✅ (own) | ✅ (assigned) | Role-conditional `where` filters. |
| `POST /api/jobs` | ✅ | ✅ | ❌ | Scopists receive 403 if they attempt to create. |
| `PUT/PATCH /api/jobs/[id]` | ✅ | ✅ (own job) | ❌ | Update route enforces ownership. |
| `POST /api/jobs/[id]/assign` | ✅ | ✅ (if owner) | ❌ | Only admins/reporters assign scopists. |
| `POST /api/transcribe/start` | ✅ | ✅ (if owner) | ❌ | Requires authenticated session with job ownership. |
| `GET /api/transcripts/[id]` | ✅ | ✅ (own) | ✅ (assigned) | Middleware + handler session checks. |
| `PATCH /api/transcripts/[id]/words` | ✅ | ✅ (owner) | ✅ (if editing) | For low-confidence edits (API stub). |

## Features
| Feature | ADMIN | COURT_REPORTER | SCOPIST |
|---------|-------|----------------|---------|
| Create / manage jobs | ✅ | ✅ | ❌ |
| Upload deposition audio | ✅ | ✅ | ❌ |
| Assign scopists | ✅ | ✅ | ❌ |
| Review low-confidence words | ✅ | ❌ | ✅ |
| Export transcripts | ✅ | ✅ | ✅ |
| Manage users & roles | ✅ | ❌ | ❌ |
