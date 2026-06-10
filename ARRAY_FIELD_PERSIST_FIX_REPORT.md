# Array Field Persist Fix Report

**Date:** 2026-06-09  
**Branch:** `release/stage3-rc`

## Task 0 — Verification gate

### 0.1 Baseline

- `git status --short` -> clean
- `npm run typecheck` -> pass
- `npm run test` -> pass (`43` files, `228` tests)

### 0.2 Defect confirmation in `resolveExtractedPath`

`resolveExtractedPath` key parsing in [src/store/intakeReducer.ts](C:/Users/james/projects/depo-pro/src/store/intakeReducer.ts:289) already splits indexed paths correctly:

```ts
const keys = path
  .split(".")
  .flatMap((segment) => {
    const match = segment.match(/^([^[]+)\[(\d+)\]$/);
    return match ? [match[1], match[2]] : [segment];
  });
```

For `witnesses[0].name`, that produces `["witnesses", "0", "name"]`.

The current `set` closure in [src/store/intakeReducer.ts](C:/Users/james/projects/depo-pro/src/store/intakeReducer.ts:312) is not array-aware:

```ts
const set = (next: ExtractedField<T>): CaseRecord => {
  // Immutably rebuild from the leaf outward
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rebuilt: any = next;
  for (let i = ancestry.length - 1; i >= 0; i--) {
    const { obj, key } = ancestry[i];
    rebuilt = { ...obj, [key]: rebuilt };
  }
  return rebuilt as CaseRecord;
};
```

Confirmed issue: when `obj` is an array and `key` is `"0"`, `{ ...obj, [key]: rebuilt }` converts the array into an object-shaped structure instead of preserving the array.

### 0.3 Consequence path in `normalizeWitnesses`

`normalizeWitnesses` in [src/types/case.ts](C:/Users/james/projects/depo-pro/src/types/case.ts:1379) coerces non-array `witnesses` through the `isRecord` branch:

```ts
if (isRecord(rawWitnesses)) {
  coercedPaths.add("witnesses");
  return [normalizeWitness(rawWitnesses, "witness_1", { name: legacyName, role: legacyRole })];
}
```

`normalizeWitness` in [src/types/case.ts](C:/Users/james/projects/depo-pro/src/types/case.ts:838) preserves a witness's own `name` once the array element stays intact:

```ts
name: normalizeStringField(source?.name ?? legacyFallbacks?.name ?? defaults.name, defaults.name),
```

That confirms the loss is caused by the reducer rebuilding the array into an object. If the array shape is preserved, `normalizeWitness` keeps the typed `source?.name` value instead of falling back.

### 0.4 Conflicting array-aware setters

I searched for competing array-aware immutable rebuild logic and found no other setter path in `src/` that would conflict with this change.

Relevant search result:

- [src/store/intakeReducer.ts](C:/Users/james/projects/depo-pro/src/store/intakeReducer.ts:318) — the only matching rebuild path is the current unconditional `rebuilt = { ...obj, [key]: rebuilt };`

The nearby recursive helper `confirmAllFields` is array-aware, but it is a separate tree walk for confirmation state and does not rebuild path ancestry:

```ts
if (Array.isArray(obj)) return obj.map(confirmAllFields);
```

Conclusion: the defect is isolated to the `set` closure in `resolveExtractedPath`.

## Task 2 — Manual verification note

After deploy, run this browser check manually on the Intake screen:

1. Edit `Witness 1 — Name` (`witnesses[0].name`).
2. Save the value.
3. Confirm all of the following:
   - The typed value persists in the field cell instead of reverting to `—`.
   - The `1 required` badge clears.
   - `Proceed to Transcript Creation` becomes enabled when that was the blocking required item.
   - The recurring `[DEPO-PRO] Normalized legacy case payload` warning no longer fires on each witness edit.

## Final summary

### `resolveExtractedPath` setter before / after

Before:

```ts
const set = (next: ExtractedField<T>): CaseRecord => {
  // Immutably rebuild from the leaf outward
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rebuilt: any = next;
  for (let i = ancestry.length - 1; i >= 0; i--) {
    const { obj, key } = ancestry[i];
    rebuilt = { ...obj, [key]: rebuilt };
  }
  return rebuilt as CaseRecord;
};
```

After:

```ts
const set = (next: ExtractedField<T>): CaseRecord => {
  // Immutably rebuild from the leaf outward
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rebuilt: any = next;
  for (let i = ancestry.length - 1; i >= 0; i--) {
    const { obj, key } = ancestry[i];
    if (Array.isArray(obj)) {
      const copy = obj.slice();
      copy[Number(key)] = rebuilt;
      rebuilt = copy;
    } else {
      rebuilt = { ...obj, [key]: rebuilt };
    }
  }
  return rebuilt as CaseRecord;
};
```

### Regression test added

New test in [src/store/intakeReducer.test.ts](C:/Users/james/projects/depo-pro/src/store/intakeReducer.test.ts:161):

- `preserves array shapes when updating indexed witness and attorney fields`

It asserts that:

- `UPDATE_FIELD` on `witnesses[0].name` keeps `record.witnesses` as an array and preserves the edited value.
- `UPDATE_FIELD` on `attorneys[0].name` keeps `record.attorneys` as an array and preserves the edited value.

### Scope confirmation

- Key parsing in `resolveExtractedPath` was untouched.
- Reducer actions were untouched.
- `normalizeCaseRecord`, `normalizeWitnesses`, and other normalizers were untouched.
- No schema, dependency, migration, or architecture changes were made.
