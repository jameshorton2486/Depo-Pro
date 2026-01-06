# ✅ Broken Imports Fixed

## Files Fixed

### 1. `app/api/calendar/events/route.ts`
- **Before:** `import { logger, withRequestLogging } from '@/lib/observability';`
- **After:** `import { logger } from '@/lib/logger';` + inline `withRequestLogging` wrapper
- **Status:** ✅ Fixed

### 2. `lib/workers/transcription-worker.ts`
- **Before:** `import { Logger } from '@/lib/observability'; const logger = new Logger('TranscriptionWorker');`
- **After:** `import { logger } from '@/lib/logger';`
- **Status:** ✅ Fixed

### 3. `app/api/transcripts/[id]/route.ts`
- **Before:** 
  - `import { db } from '@/lib/db';`
  - `import { withRequestLogging } from '@/lib/observability';`
  - `import { canEditTranscript } from '@/lib/_future/transcripts/lock-service';`
- **After:**
  - `import { createSupabaseServerClient } from '@/lib/supabase/server';`
  - `import { logger } from '@/lib/logger';` + inline `withRequestLogging`
  - Stub `canEditTranscript` function (TODO: implement with Supabase)
- **Status:** ✅ Fixed (stub added)

### 4. `app/api/transcripts/[id]/unlock/route.ts`
- **Before:** `import { unlockTranscript } from '@/lib/_future/transcripts/lock-service';`
- **After:** Stub `unlockTranscript` function (TODO: implement with Supabase)
- **Status:** ✅ Fixed (stub added)

### 5. `app/api/transcripts/[id]/versions/route.ts`
- **Before:** `import { getVersions } from '@/lib/_future/transcripts/version-service';`
- **After:** Stub `getVersions` function (TODO: implement with Supabase)
- **Status:** ✅ Fixed (stub added)

### 6. `app/api/jobs/[id]/route.ts`
- **Before:** `import { withRequestLogging } from '@/lib/observability';`
- **After:** `import { logger } from '@/lib/logger';` + inline `withRequestLogging` wrapper
- **Status:** ✅ Fixed

### 7. `app/api/transcribe/start/route.ts`
- **Before:** `import { logger, withRequestLogging } from '@/lib/observability';`
- **After:** `import { logger } from '@/lib/logger';` + inline `withRequestLogging` wrapper
- **Status:** ✅ Fixed

### 8. `lib/transcripts/permissions.ts`
- **Before:** `import { canEditTranscript } from '@/lib/_future/transcripts/lock-service';`
- **After:** Stub `canEditTranscript` function (TODO: implement with Supabase)
- **Status:** ✅ Fixed (stub added)

### 9. `app/api/transcripts/[id]/versions/[version]/restore/route.ts`
- **Before:** `import { restoreVersion } from '@/lib/_future/transcripts/version-service';`
- **After:** Stub `restoreVersion` function (TODO: implement with Supabase)
- **Status:** ✅ Fixed (stub added)

## Stub Functions Added

These functions were added as stubs to prevent runtime errors. They need to be implemented with Supabase:

1. **`canEditTranscript(transcriptId, userId)`** - Check if user can edit transcript
   - **Location:** `app/api/transcripts/[id]/route.ts`
   - **TODO:** Implement transcript locking with Supabase

2. **`unlockTranscript(transcriptId, userId, reason)`** - Unlock a finalized transcript
   - **Location:** `app/api/transcripts/[id]/unlock/route.ts`
   - **TODO:** Implement transcript unlocking with Supabase

3. **`getVersions(transcriptId)`** - Get version history for a transcript
   - **Location:** `app/api/transcripts/[id]/versions/route.ts`
   - **TODO:** Implement version history with Supabase

4. **`restoreVersion(transcriptId, versionId, userId)`** - Restore a transcript version
   - **Location:** `app/api/transcripts/[id]/versions/[version]/restore/route.ts`
   - **TODO:** Implement version restoration with Supabase

## Remaining Work

### `app/api/transcripts/[id]/route.ts`
This file still uses `db` from `@/lib/db` and needs full migration to Supabase. The file has been partially fixed (imports), but the Prisma queries inside still need to be converted.

**Priority:** HIGH (this is a critical API route)

---

**Date:** January 2025  
**Status:** Broken imports fixed ✅  
**Next:** Migrate remaining Prisma queries in `app/api/transcripts/[id]/route.ts`
