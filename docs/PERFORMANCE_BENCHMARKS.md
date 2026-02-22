# Performance Benchmarks - 2026-02-22

## Environment
- Runtime: Next.js App Router (production build)
- Browser: Chrome (manual verification required)
- Database/Storage: Supabase

## Results
| Metric | Target | Actual | Status |
|---|---|---|---|
| Dashboard load | < 3s | Pending manual run | Pending |
| Job list API (`/api/jobs`) | < 500ms | Pending manual run | Pending |
| Flagged word navigation seek | < 100ms | Pending manual run | Pending |
| Export generation | < 10s | Pending manual run | Pending |
| Medical extraction | < 120s | Pending manual run | Pending |

## Bottlenecks Identified
1. Pending manual measurement in Chrome DevTools Network + Performance tabs.

## Recommendations
1. Capture baseline timings in staging and production and fill this table.
2. Track regressions per release using consistent test files and network profile.
