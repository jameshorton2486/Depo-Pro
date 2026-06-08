# Participant Modal Audit

Audit baseline:
- Branch: `feature/stage3-workspace-core`
- Head inspected: `56682f6`
- Baseline gates: `npm test` = 43 files / 222 tests passing; `npm run typecheck` passing

## 1. Dialog owner and structure

- The participant add/create workflow is rendered entirely inside one component: [src/components/IntakeScreen/ParticipantsPanel.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/ParticipantsPanel.tsx:1).
- It is already a **single shared dialog workflow**, not per-category copies:
  - open state: `drawerCategory`
  - mode: `drawerMode`
  - draft state: `draft`
  - shared field renderer: `DrawerField`
  - shared save path: `handleSave`
- The current dialog block is rendered inline at the bottom of the panel when `drawerCategory` is truthy, beginning at [ParticipantsPanel.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/ParticipantsPanel.tsx:838).

## 2. Why it is cramped today

- The form is not a real overlay. It is appended inline inside the `ParticipantsPanel` section under:
  - the reporter summary
  - the attorney/interpreter/videographer cards
  - the “Other Participants” section
- The current shell is a bottom-attached in-panel block:
  - outer block: `border-t border-slate-200 bg-slate-50/80 px-4 py-4`
  - content grid: `grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]`
  in [ParticipantsPanel.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/ParticipantsPanel.tsx:839).
- Because the form lives inside the already constrained Intake column, the directory browser and the form compete for the same horizontal space.
- The save footer is inline at the bottom of the form content, so long forms can push it below the viewport.

## 3. Existing overlay/modal pattern

- The app already has an overlay modal pattern in [src/components/conflict/ConflictResolutionModal.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/conflict/ConflictResolutionModal.tsx:145).
- That pattern uses:
  - `fixed inset-0 z-50`
  - dark backdrop layer
  - centered panel
  - `role="dialog"` and `aria-modal="true"`
- The app also has a side-overlay pattern in [src/components/ExhibitsPanel/ExhibitsPanel.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/ExhibitsPanel/ExhibitsPanel.tsx:213), but that is a right drawer, not a centered modal.
- Recommendation: reuse the conflict modal’s centered overlay semantics rather than the exhibits side drawer.

## 4. Category inventory: HAS FORM vs NO FORM YET

### HAS FORM (safe to modal-ize)

- `attorney`
  - real directory fields + case-specific fields
- `reporter`
  - real directory fields
- `interpreter`
  - real directory fields + case-specific fields
- `videographer`
  - real directory fields
- generic participant route:
  - `scheduler`
  - `paralegal`
  - `legal_assistant`
  - `records_custodian`
  - `corporate_representative`
  - `participant`
  - these already use the existing shared generic form (`GENERIC_DIRECTORY_FIELDS` + `GENERIC_CASE_FIELDS`) in [ParticipantsPanel.tsx](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/ParticipantsPanel.tsx:164)

### NO FORM YET / do not build here

- `witness`
  - not part of this participant dialog component at all
- first-class distinct forms for:
  - `records_custodian`
  - `corporate_representative`
  - these categories currently exist only as labels routed through the generic participant form, not as distinct dedicated forms

## 5. Separation of presentation from behavior

- Save and dispatch logic are separable from presentation:
  - all data behavior remains in `handlePickContact`, `resolveFirm`, `applyReporterFromDirectory`, `handleUseMyProfile`, and `handleSave`
  - the render branch only determines where those controls are displayed
- This makes a presentation-only modal refactor freeze-safe, as long as:
  - field configs remain unchanged
  - save labels remain unchanged
  - event handlers remain unchanged
  - no service/store/context APIs are touched

## 6. Classification

- Shared modal shell conversion: **freeze-safe presentation refactor**
- Sticky footer / unclipped labels / wider centered form: **freeze-safe presentation refactor**
- Converging categories onto the shared shell: **already converged** for all existing forms
- Building new distinct category forms: **out of scope**
