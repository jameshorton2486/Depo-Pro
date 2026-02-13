# App Router Loading & Error Handling Conventions

## Overview

This document defines the standard patterns for handling loading states, errors, and empty states in Next.js App Router pages and components.

---

## Core Principles

1. **Always show loading states** - Never leave users staring at blank screens
2. **Handle errors gracefully** - Provide retry mechanisms and clear messages
3. **Use consistent components** - Reuse loading/error/empty state components
4. **Separate concerns** - Loading states per data fetch, not per page
5. **Optimistic UI** - Show content as soon as data is available

---

## Loading States

### Pattern: Early Return for Full-Page Loading

When the entire page depends on initial data:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { DashboardSkeleton } from '@/components/wkt/loading-skeleton';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch data...
  }, []);

  // Early return for full-page loading
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page content */}
    </div>
  );
}
```

### Pattern: Inline Loading for Partial Data

When only part of the page is loading:

```tsx
{isLoading ? (
  <div className="space-y-3">
    <div className="h-16 w-full animate-pulse rounded bg-gray-200" />
    <div className="h-16 w-full animate-pulse rounded bg-gray-200" />
  </div>
) : (
  <div>
    {/* Actual content */}
  </div>
)}
```

### Pattern: Skeleton Components

Use dedicated skeleton components for consistency:

```tsx
import { StatCardSkeleton, QuestionSkeleton } from '@/components/wkt/loading-skeleton';

// For stat cards
{isLoading ? (
  <>
    <StatCardSkeleton />
    <StatCardSkeleton />
    <StatCardSkeleton />
  </>
) : (
  // Actual stat cards
)}

// For questions
{isLoading ? (
  <QuestionSkeleton />
) : (
  // Actual question
)}
```

---

## Error Handling

### Pattern: Error Message Component

Use the `ErrorMessage` component with retry:

```tsx
import { ErrorMessage } from '@/components/wkt/error-message';

const [error, setError] = useState<string | null>(null);

// In JSX:
{error ? (
  <ErrorMessage
    message={error}
    onRetry={() => {
      setError(null);
      loadData();
    }}
  />
) : (
  // Normal content
)}
```

### Pattern: Separate Error States

When multiple data sources can fail independently:

```tsx
const [progressError, setProgressError] = useState<string | null>(null);
const [examsError, setExamsError] = useState<string | null>(null);

// Handle errors separately
{progressError && (
  <ErrorMessage message={progressError} onRetry={loadProgress} />
)}

{examsError && (
  <ErrorMessage message={examsError} onRetry={loadExams} />
)}
```

### Pattern: Error in Data Fetch

```tsx
const loadData = useCallback(async (isMountedRef: { current: boolean }) => {
  setIsLoading(true);
  setError(null);

  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error('Failed to load data');
    }
    const data = await response.json();
    
    if (isMountedRef.current) {
      setData(data);
    }
  } catch (err) {
    if (isMountedRef.current) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  } finally {
    if (isMountedRef.current) {
      setIsLoading(false);
    }
  }
}, []);
```

---

## Empty States

### Pattern: Empty State Components

Use dedicated empty state components:

```tsx
import { NoQuestionsFound, NoExamsYet, AllCaughtUp } from '@/components/wkt/empty-state';

{data.length === 0 ? (
  <NoQuestionsFound 
    onAction={() => router.push('/wkt/practice')} 
  />
) : (
  // Content list
)}
```

### Pattern: Conditional Empty States

```tsx
{isLoading ? (
  <LoadingSkeleton />
) : error ? (
  <ErrorMessage message={error} onRetry={loadData} />
) : items.length === 0 ? (
  <EmptyState onAction={handleAction} />
) : (
  <ItemsList items={items} />
)}
```

---

## State Management Patterns

### Pattern: Mounted Ref for Cleanup

Prevent state updates after unmount:

```tsx
useEffect(() => {
  const isMountedRef = { current: true };

  async function loadData() {
    try {
      const data = await fetchData();
      if (isMountedRef.current) {
        setData(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }

  loadData();

  return () => {
    isMountedRef.current = false;
  };
}, []);
```

### Pattern: useCallback for Data Loading

Prevent unnecessary re-renders:

```tsx
const loadData = useCallback(async (isMountedRef: { current: boolean }) => {
  // Loading logic
}, []); // Empty deps if no dependencies

useEffect(() => {
  const isMountedRef = { current: true };
  loadData(isMountedRef);
  return () => {
    isMountedRef.current = false;
  };
}, [loadData]);
```

---

## Component Structure

### Standard Page Structure

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSkeleton } from '@/components/wkt/loading-skeleton';
import { ErrorMessage } from '@/components/wkt/error-message';
import { EmptyState } from '@/components/wkt/empty-state';

export default function MyPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isMountedRef: { current: boolean }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('Failed to load');
      const result = await response.json();
      
      if (isMountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const isMountedRef = { current: true };
    loadData(isMountedRef);
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  // Early return for full-page loading
  if (isLoading && !data) {
    return (
      <div className="max-w-6xl mx-auto">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {error ? (
        <ErrorMessage message={error} onRetry={() => loadData({ current: true })} />
      ) : !data || data.length === 0 ? (
        <EmptyState onAction={() => router.push('/action')} />
      ) : (
        // Main content
      )}
    </div>
  );
}
```

---

## Available Components

### Loading Skeletons
Located in `components/wkt/loading-skeleton.tsx`:
- `StatCardSkeleton` - For stat/metric cards
- `DashboardSkeleton` - Full dashboard layout
- `QuestionSkeleton` - Question card layout
- `PracticeSkeleton` - Practice page layout

### Error Messages
Located in `components/wkt/error-message.tsx`:
- `ErrorMessage` - Standard error with optional retry

### Empty States
Located in `components/wkt/empty-state.tsx`:
- `NoQuestionsFound` - No questions available
- `NoExamsYet` - No exams taken
- `AllCaughtUp` - All items completed

---

## Best Practices

### ✅ Do

- Use early returns for full-page loading
- Separate loading states for independent data sources
- Provide retry mechanisms for errors
- Use consistent skeleton components
- Check `isMountedRef.current` before state updates
- Clear error state when retrying

### ❌ Don't

- Show blank screens during loading
- Mix loading states for unrelated data
- Ignore errors silently
- Update state after component unmount
- Use inline loading text ("Loading...")
- Forget to reset state on retry

---

## Summary

**Key Takeaways:**

1. **Loading**: Always show skeletons, never blank screens
2. **Errors**: Always provide retry, use `ErrorMessage` component
3. **Empty**: Use dedicated empty state components
4. **State**: Use `isMountedRef` to prevent updates after unmount
5. **Consistency**: Reuse components from `components/wkt/`

**Quick Reference:**
- Full-page loading → Early return with skeleton
- Partial loading → Inline skeleton
- Errors → `ErrorMessage` with retry
- Empty → Dedicated empty state component
- Cleanup → `isMountedRef` pattern
