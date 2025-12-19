# Final Prompt Improvements - Notes

## 🔴 A. Explicitly Forbid Silent Refactors During Type Fixes

**Problem:** Cursor could "clean up" code while fixing types, introducing subtle bugs.

**Solution:** Added explicit constraint:
```
- ❌ Do NOT perform stylistic or structural refactors while fixing types
```

**Impact:** Prevents Cursor from reorganizing imports, renaming variables, or restructuring code during type fixes.

---

## 🟠 B. Clarify Audio Element Ownership

**Problem:** Without explicit ownership, Cursor might instantiate multiple `<audio>` elements, breaking sync.

**Solution:** Added explicit rule:
```
- A SINGLE shared audio element / ref must be used for all playback and syncing
```

**Impact:** Ensures one audio element is shared between AudioPlayer and transcript sync, preventing desync bugs.

---

## 🟠 C. Lock the Review Persistence Trigger

**Problem:** "Review state must persist" is ambiguous - when does it save?

**Solution:** Added explicit persistence rule:
```
- Edits and review state are saved ONLY when the user clicks "Save" or "Mark Complete"
- Do NOT autosave on every keystroke
```

**Impact:** Prevents Cursor from adding autosave logic that could cause performance issues or unexpected behavior.

---

## 🟡 D. Add One Explicit Non-Goal (Performance)

**Problem:** Cursor sometimes "optimizes" prematurely, adding complexity.

**Solution:** Added explicit constraint:
```
- No performance optimizations beyond correctness
```

**Impact:** Prevents premature optimization that could introduce bugs or complicate the codebase.

---

## Summary

These four improvements:
1. **Prevent dangerous assumptions** during type fixes
2. **Avoid silent runtime bugs** from multiple audio elements
3. **Reduce back-and-forth** by clarifying persistence behavior
4. **Prevent premature optimization** that complicates the codebase

**None of these change scope** — they tighten execution to ensure a true MVP.

