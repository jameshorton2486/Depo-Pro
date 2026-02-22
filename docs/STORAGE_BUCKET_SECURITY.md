# Storage Bucket Security (Stream B.3)

Date: 2026-02-22

## Buckets and limits

| Bucket | Max File Size | Allowed MIME Types |
|---|---:|---|
| `depo-audio` | 2 GB | `audio/*`, `video/*` |
| `depo-files` | 50 MB | `application/pdf`, `image/*`, `application/vnd.openxmlformats*` |
| `depo-exports` | 100 MB | `application/*`, `text/*` |
| `depo-chunks` | 500 MB | `audio/*` |

## Policy source

Apply SQL in `supabase/storage-bucket-policies.sql`.

## Manual rollout order

1. Apply policies in staging project.
2. Set bucket size/MIME limits in Supabase Dashboard.
3. Validate:
   - Reporter upload succeeds.
   - Different-firm user gets 403 for file access.
   - Unauthenticated requests are denied.
4. Apply to production project.

## Notes

- `depo-exports` intentionally has no `INSERT` policy for `authenticated`.
- Export writes are server-side only via service role.
