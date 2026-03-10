# UI-01: Keyboard Navigation for Flagged Words

## Scope Lock
- **Only modify files listed below**
- Do NOT rewrite components — ADD to existing code
- Do NOT modify WaveformPlayer component (FROZEN)
- Do NOT rename any existing props or callbacks
- Do NOT remove existing click-based selection behavior
- Do NOT restructure component hierarchy
- Do NOT create branches — commit directly to main
- Do NOT install any new dependencies

## Step 0: Discover the actual component files
The review panel may be at one of these paths:
```powershell
Get-ChildItem -Path "components" -Recurse -Filter "*.tsx" | Select-String "flagged|low-confidence|FlaggedWord" | Select-Object -ExpandProperty Path
Get-ChildItem -Path "app" -Recurse -Filter "*review*client*" | Select-Object -ExpandProperty FullName
```

Also check what keyboard handling already exists:
```powershell
Select-String -Path "components/transcripts/low-confidence-panel.tsx" -Pattern "keydown|ArrowDown|ArrowUp|selectedIndex" | Select-Object LineNumber, Line
```

**Note:** Commit f5dce86 already added `containerRef`, `data-word-index`, and auto-scroll via `scrollIntoView`. Check if those are still present after the recent revert.

## Target Files (discover actual paths in Step 0)

### File 1: The flagged word panel component
Expected at one of:
- `components/review/flagged-word-panel.tsx`
- `components/transcripts/low-confidence-panel.tsx`

**If keyboard navigation (ArrowDown/ArrowUp/Tab/Shift+Tab) already exists:**
- Verify it works correctly
- Add only what's missing

**If keyboard navigation does NOT exist, add:**

```typescript
// Inside the component, add a useEffect for keyboard handling:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!filteredWords.length) return;
    
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev === null ? 0 : Math.min(prev + 1, filteredWords.length - 1)
      );
    }
    if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev === null ? 0 : Math.max(prev - 1, 0)
      );
    }
    if (e.key === 'Escape') {
      setSelectedIndex(null);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [filteredWords]);
```

**Also ensure:**
- `containerRef` on the scrollable word list div
- `data-word-index={index}` on each word card
- Auto-scroll effect:
```typescript
useEffect(() => {
  if (selectedIndex !== null && containerRef.current) {
    const el = containerRef.current.querySelector(`[data-word-index="${selectedIndex}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}, [selectedIndex]);
```
- Visual focus ring: `ring-2 ring-blue-500` class on selected word card

### File 2: The review client page
Expected at one of:
- `app/(dashboard)/jobs/[id]/review/review-client-new.tsx`
- `app/(dashboard)/jobs/[id]/review/page.tsx`

**Add (if not already present):**
- On word selection change → seek audio to word's start time
- Auto-scroll transcript viewer to show selected word

```typescript
// When selectedWordIndex changes:
if (word?.startTime !== undefined) {
  waveformPlayerRef.current?.seekTo(word.startTime);
}
```

## Validation
```bash
npm run typecheck    # Zero errors
npm run build        # Zero errors
```

Check that no other files were modified:
```bash
git diff --name-only
```
Should show ONLY the 1-2 component files.

## Commit
```bash
git add [discovered-panel-file] [discovered-review-client-file]
git commit -m "ui-01: add keyboard navigation for flagged word review (ArrowUp/Down, Tab, Escape)"
git push origin main
```

## STOP after commit. Do not proceed to any other task.
