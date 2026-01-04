# Depo-Pro Development Standards

This document outlines coding standards and conventions for the Depo-Pro codebase.

## Parameter Naming Conventions

### Unused Parameters

**Rule:** Prefix unused parameters with `_` to indicate intentional non-use.

**Examples:**
```typescript
// ✅ Correct
function handler(_request: NextRequest) {
  // request not used
}

// ✅ Correct
function callback(_error: Error, data: Data) {
  // error not used, only data
}

// ❌ Incorrect - will trigger ESLint error
function handler(request: NextRequest) {
  // request not used
}
```

**Why:** This prevents ESLint `no-unused-vars` errors while clearly communicating intent.

## Route Parameter Naming

### Standard: Use `id` for Route Parameters

**Rule:** Route parameters in Next.js App Router should use `id` consistently.

**Examples:**
```typescript
// ✅ Correct - Route parameter is always 'id'
app/api/jobs/[id]/route.ts
app/api/calendar/[id]/route.ts
app/transcripts/[id]/page.tsx

// Inside the route handler, you can rename for clarity:
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await context.params; // ✅ Rename for clarity
  // Use jobId in function body
}
```

### Domain Identifiers: Use Explicit Names

**Rule:** Inside functions and business logic, use explicit domain identifiers.

**Examples:**
```typescript
// ✅ Correct - Explicit names in business logic
async function getJob(jobId: string) {
  return db.job.findUnique({ where: { id: jobId } });
}

async function assignReporter(jobId: string, reporterId: string) {
  // Clear what each ID represents
}

// ❌ Avoid - Ambiguous
async function process(id: string, otherId: string) {
  // What do these IDs represent?
}
```

## Summary

| Context | Convention | Example |
|---------|-----------|---------|
| Route parameters | Always `id` | `app/api/jobs/[id]/route.ts` |
| Function parameters | Explicit domain names | `jobId`, `userId`, `calendarId` |
| Unused parameters | Prefix with `_` | `_request`, `_error` |

## Benefits

- **Consistency:** All routes follow the same pattern
- **Clarity:** Explicit names reduce confusion
- **Maintainability:** Easier to understand and modify code
- **Type Safety:** TypeScript can better infer types with consistent naming
