# Fix Calendar API Routes - Cursor AI Prompt

## 🎯 Objective
Fix all Calendar API routes to match the actual Prisma schema. The routes currently reference fields that don't exist in the `CalendarEvent` model.

## 📋 Files to Fix
1. `app/api/calendar/route.ts` - GET and POST endpoints
2. `app/api/calendar/[id]/route.ts` - GET, PATCH, DELETE endpoints  
3. `app/api/calendar/[id]/convert-to-job/route.ts` - Convert event to Job

## 🔍 Step 1: Read the Actual Schema

First, read `prisma/schema.prisma` and document the actual fields:

### CalendarEvent Model
Find the `model CalendarEvent` block and note:
- **DateTime fields**: What are they called? (`startTime`/`endTime` or `scheduledStart`/`scheduledEnd`?)
- **Title/Case fields**: Does it have `title`, `caseStyle`, `deponentName`, or something else?
- **Location fields**: `location`, `isRemote`, `meetingLink`? Or `locationType`, `locationAddress`?
- **Status field**: What's the enum type? What are the valid values?
- **Relations**: What relations exist? (`assignedReporter`, `job`, `orderingAttorney`, etc.)

### Job Model
Find `model Job` and note:
- **Status enum**: What are the valid `JobStatus` values? (CREATED, PENDING, SCHEDULED, etc.)
- **Required fields**: What fields are required when creating a Job?
- **Optional fields**: What can be null/optional?

### CSRRecord Model
Find `model CSRRecord` and note:
- **Time fields**: `scheduledStartTime` or `startTime`? `endTime` or `scheduledEndTime`?
- **Case fields**: `caseCaption` or `caseStyle`? `causeNumber` or `caseNumber`?
- **Location fields**: What location-related fields exist?
- **Deponent fields**: Does it have `deponentName` or is that in CSRWitness?

### CSRWitness Model
Find `model CSRWitness` and note:
- **Name field**: `fullLegalName`, `fullName`, or `name`?
- **Role field**: What's the enum type? What are valid values?
- **Primary field**: `isPrimary` or `isPrimaryDeponent`?

## 🔧 Step 2: Fix `app/api/calendar/route.ts`

### GET Endpoint Fixes

**Current issues:**
- Uses `scheduledStart`/`scheduledEnd` - replace with actual field names
- Uses `deponentName`, `caseStyle`, `caseNumber` - these may not exist
- Uses `locationType`, `locationAddress`, `zoomJoinUrl` - check actual fields
- Uses `interpreterRequired`, etc. - may not exist on CalendarEvent

**What to do:**
1. Update the `where` clause to use actual CalendarEvent fields:
   ```typescript
   where: {
     startTime: { gte: params.startDate, lte: params.endDate }, // Use actual field name
     // ... other filters
   }
   ```

2. Update the `include` to only include relations that exist

3. In the transformation, map actual CalendarEvent fields to CalendarEventUI:
   ```typescript
   const transformedEvents = events.map((event) => ({
     id: event.id,
     title: event.title, // Use actual field
     start: event.startTime, // Use actual field
     end: event.endTime, // Use actual field
     // ... map only fields that exist
   }));
   ```

4. If CSR data is needed (deponentName, caseStyle), fetch it via the Job relation:
   ```typescript
   include: {
     job: {
       include: {
         csrRecord: {
           include: {
             witnesses: { where: { isPrimary: true }, take: 1 }
           }
         }
       }
     }
   }
   ```

### POST Endpoint Fixes

**Current issues:**
- `createEventSchema` validates fields that don't exist
- `db.calendarEvent.create()` sets fields that don't exist

**What to do:**
1. Update `createEventSchema` to only validate fields that exist in CalendarEvent:
   ```typescript
   const createEventSchema = z.object({
     title: z.string().min(1),
     eventType: z.nativeEnum(EventType).optional(),
     startTime: z.string().transform((s) => new Date(s)), // Use actual field name
     endTime: z.string().transform((s) => new Date(s)).optional(),
     // ... only include fields that exist
   });
   ```

2. Update the create data to only set existing fields:
   ```typescript
   await db.calendarEvent.create({
     data: {
       title: data.title,
       startTime: data.startTime, // Use actual field name
       endTime: data.endTime,
       // ... only set fields that exist
     }
   });
   ```

## 🔧 Step 3: Fix `app/api/calendar/[id]/route.ts`

This file likely needs minimal changes, but verify:
- Any field references match the schema
- Date field names are correct
- Status enum values are valid

## 🔧 Step 4: Fix `app/api/calendar/[id]/convert-to-job/route.ts`

This is the most critical fix:

### Job Creation
1. Check valid `JobStatus` values - use `'CREATED'` not `'SCHEDULED'` (unless SCHEDULED exists)
2. Map CalendarEvent fields to Job fields:
   ```typescript
   const job = await tx.job.create({
     data: {
       title: event.title || 'New Deposition',
       caseName: event.title || 'Untitled Case', // Use available data
       depositionDate: event.startTime, // Use actual field
       location: event.location || null, // Use actual field
       zoomLink: event.meetingLink || null, // Use actual field
       status: 'CREATED', // Use valid enum value
       // ... only set fields that exist
     }
   });
   ```

### CSRRecord Creation
1. Use actual field names from CSRRecord:
   ```typescript
   await tx.cSRRecord.create({
     data: {
       jobId: job.id,
       depositionDate: event.startTime,
       scheduledStartTime: event.startTime, // Check actual field name
       endTime: event.endTime || null, // Check actual field name
       caseCaption: event.title || 'Untitled Case', // Use available data
       // ... only set fields that exist
     }
   });
   ```

2. **If CalendarEvent doesn't have deponent/case data:**
   - Create CSRRecord with minimal data
   - Don't create CSRWitness (user can add later)
   - Or skip CSRRecord creation entirely if required fields are missing

### CSRWitness Creation (if needed)
Only create if you have the data:
```typescript
// Only if deponent data exists (from CSRRecord or elsewhere)
if (deponentName) {
  await tx.cSRWitness.create({
    data: {
      csrRecordId: csrRecord.id,
      fullLegalName: deponentName, // Use actual field name
      role: deponentRole || 'FACT_WITNESS', // Use valid enum value
      isPrimary: true, // Use actual field name
    }
  });
}
```

## ✅ Step 5: Verification

After each file fix, run:
```bash
npm run typecheck
```

Fix any TypeScript errors before moving to the next file.

## 🎯 Success Criteria

All routes should:
- ✅ Compile with zero TypeScript errors
- ✅ Use only fields that exist in Prisma schema
- ✅ Handle nullable/optional fields correctly
- ✅ Use correct enum values
- ✅ Import from `@/lib/db` (not `@/lib/prisma`)

## 📝 Important Notes

1. **Field Mapping Strategy:**
   - If CalendarEvent has `title` but UI needs `caseStyle` + `deponentName`, use `title` as fallback
   - If CalendarEvent has `location` but UI needs `locationAddress`, use `location`
   - If CalendarEvent has `meetingLink` but UI needs `zoomJoinUrl`, use `meetingLink`

2. **Data Transformation:**
   - The API should transform Prisma models to UI types (CalendarEventUI)
   - Pull CSR data from Job relation when available
   - Use sensible defaults when data is missing

3. **Error Handling:**
   - Return clear error messages if required fields are missing
   - Use Zod validation to catch issues early
   - Handle nullable fields with `|| null` or `|| undefined`

## 🚀 After Completion

Test the routes:
```bash
# Start dev server
npm run dev

# Test endpoints (in another terminal or browser)
curl http://localhost:3000/api/calendar
```

## 📚 Reference

- Prisma schema: `prisma/schema.prisma`
- UI types: `components/calendar/calendar.types.ts`
- Constants: `lib/constants.ts` (for enums)

---

**Remember:** The goal is to make the routes work with your ACTUAL schema, not to change the schema. Use what exists and map creatively to what the UI needs.

