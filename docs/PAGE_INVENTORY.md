# Depo-Pro Page Inventory

## Public Pages
| Page | Path | File Location | Status | Notes |
|------|------|---------------|--------|-------|
| Home | `/` | `app/page.tsx` | ✅ Complete | Landing page with feature highlights and login/register CTAs; redirects logged-in users to `/dashboard`. |
| Login | `/login` | `app/(auth)/login/page.tsx` | ✅ Complete | React-hook-form + NextAuth integration; shows inline errors. |
| Register | `/register` | `app/(auth)/register/page.tsx` | ⚠️ Partial | Functional, but hashes password client-side before sending to the API. |

## Dashboard Pages
| Page | Path | File Location | Status | Notes |
|------|------|---------------|--------|-------|
| Dashboard Router | `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | ✅ Complete | Redirects users to `/admin`, `/reporter`, or `/scopist` based on role. |
| Jobs List | `/jobs` | `app/(dashboard)/jobs/page.tsx` | ⚠️ Partial | Page shell exists, but the list shows placeholder text; needs real data fetching. |
| Job Detail | `/jobs/[id]` | `app/(dashboard)/jobs/[id]/page.tsx` | ✅ Complete | Loads job, files, assignments, and enforces access checks. |
| Create Job | `/jobs/new` | `app/(dashboard)/jobs/new/page.tsx` | ⚠️ Partial | Uses the generic JobForm but lacks firm selection, attachments, and field-level validation feedback from the API. |
| Review Page | `/jobs/[id]/review` | — | ❌ Missing | Scopist low-confidence workflow page not yet created. |

## Admin Pages
| Page | Path | File Location | Status | Notes |
|------|------|---------------|--------|-------|
| Admin Dashboard | `/admin` | — | ❌ Missing | Redirect target exists, but no admin screens have been built. |
| User Management | `/admin/users` | — | ❌ Missing | Needed for managing reporters/scopists and roles. |

## Role-Specific Pages
| Page | Path | File Location | Status | Notes |
|------|------|---------------|--------|-------|
| Reporter Dashboard | `/reporter` | `app/(dashboard)/reporter/page.tsx` | ✅ Complete | Fetches stats via Prisma and shows recent jobs. |
| Scopist Dashboard | `/scopist` | `app/(dashboard)/scopist/page.tsx` | ✅ Complete | Lists assignments and counts, though progress metrics are basic. |
