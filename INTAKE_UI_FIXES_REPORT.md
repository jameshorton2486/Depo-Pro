# Intake UI Fixes Report

**Date:** 2026-06-09  
**Branch:** `release/stage3-rc`

## Task 0 — Verification + audit gate

### 0.1 Baseline

- `git status --short` -> clean
- `npm run typecheck` -> pass
- `npm run test` -> pass (`43` files, `228` tests)

### 0.2 Defect-site verification

#### Log spam

Warn site is present in [src/types/case.ts](C:/Users/james/projects/depo-pro/src/types/case.ts:1507):

```ts
if (coercedPaths.size > 0) {
  console.warn("[DEPO-PRO] Normalized legacy case payload", {
    case_id: deduped.case_id,
    coercedPaths: [...coercedPaths],
  });
}
```

`normalizeCaseRecord` call sites found:

- [src/api/caseService.ts](C:/Users/james/projects/depo-pro/src/api/caseService.ts:95)
- [src/context/IntakeContext.tsx](C:/Users/james/projects/depo-pro/src/context/IntakeContext.tsx:64)
- [src/lib/normalizeCaseRecord.ts](C:/Users/james/projects/depo-pro/src/lib/normalizeCaseRecord.ts:3)
- [supabase/functions/transcribe-start/index.ts](C:/Users/james/projects/depo-pro/supabase/functions/transcribe-start/index.ts:89)
- Tests also call it directly in [src/types/case.test.ts](C:/Users/james/projects/depo-pro/src/types/case.test.ts:1) and [src/types/case.rolePreservation.test.ts](C:/Users/james/projects/depo-pro/src/types/case.rolePreservation.test.ts:1)

Intake load path is confirmed in [src/context/IntakeContext.tsx](C:/Users/james/projects/depo-pro/src/context/IntakeContext.tsx:63):

```ts
dispatch({ type: "LOAD_CASE", payload: { record: normalizeCaseRecord(rec) } });
```

That explains why a legacy payload warning repeats on case load.

#### Confirm-jump

The pending-focus effect in [src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:556) is:

```ts
useEffect(() => {
  if (!pendingFocusRowId) {
    return;
  }

  const button = confirmButtonRefs.current.get(pendingFocusRowId);
  if (!button) {
    setPendingFocusRowId(null);
    return;
  }

  button.focus();
  button.scrollIntoView({ behavior: "smooth", block: "nearest" });
  setPendingFocusRowId(null);
}, [filtered, pendingFocusRowId]);
```

`handleConfirm` sets the next row in the same file at [ExtractedFieldsTable.tsx](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:572):

```ts
setPendingFocusRowId(findNextConfirmableRowId(filtered, row.id, next));
```

Wrap-around is confirmed in [src/components/ExtractedFieldsTable/tableBehavior.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/tableBehavior.ts:25):

```ts
for (let offset = 1; offset <= rows.length; offset += 1) {
  const row = rows[(currentIndex + offset) % rows.length];
```

Result: the next confirmable row can be in a distant section, and the viewport jump is caused by both `button.focus()` and an explicit `button.scrollIntoView(...)`.

#### Boolean overlap

Raw values are stringified in [src/components/ExtractedFieldsTable/fieldProjection.ts](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/fieldProjection.ts:100):

```ts
const value = rawValue == null || rawValue === "" ? "" : String(rawValue);
```

That means booleans are projected as literal `"true"` / `"false"` in `row.value`.

The value cell in [src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:176) renders `displayValue` directly:

```tsx
<td className="max-w-[200px] px-3 py-3">
  {!displayValue || displayValue === "" ? (
    <span className="text-sm italic text-slate-400">—</span>
  ) : (
    <span className="break-words text-sm text-slate-800">{displayValue}</span>
  )}
</td>
```

The field-label cell is a separate sibling `<td>` at [ExtractedFieldsTable.tsx](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:163):

```tsx
<td className="py-3 pl-5 pr-3">
  <div className="flex items-start gap-1.5">
    <div>
      <p className="text-sm font-medium leading-tight text-slate-800">{row.label}</p>
      <p className="mt-0.5 font-mono text-[10px] leading-none text-slate-400">{row.path}</p>
    </div>
  </div>
</td>
```

The table itself is fixed-layout at [ExtractedFieldsTable.tsx](C:/Users/james/projects/depo-pro/src/components/ExtractedFieldsTable/ExtractedFieldsTable.tsx:621):

```tsx
<table className="w-full table-fixed border-collapse text-left">
```

Root-cause classification: **(a) booleans rendering as raw `"true"` / `"false"` strings**. I did **not** find direct evidence in this component of the Field cell and Value cell overlapping each other through shared layout; they render as separate fixed-layout table cells.

### 0.3 Existing test coverage that would constrain the fixes

- No test asserts that `[DEPO-PRO] Normalized legacy case payload` is logged.
- No test asserts the literal rendered text `"true"` or `"false"` in `ExtractedFieldsTable`.
- `tableBehavior` tests cover confirm-row selection logic, but they do not lock in scrolling behavior.

### 0.4 Gate outcome

Task 0 found a material divergence from the prompt’s confirm-jump description:

- The current viewport jump is not only caused by `button.focus()`.
- The component also calls `button.scrollIntoView({ behavior: "smooth", block: "nearest" })`.

Under the prompt’s instruction to stop if reality diverges from the described defect, I am stopping here rather than making behavior edits that would require re-scoping Task 2.

