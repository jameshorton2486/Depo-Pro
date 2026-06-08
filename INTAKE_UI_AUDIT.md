# Intake UI Audit

Audit-only phase for `feature/stage3-workspace-core` at `ff0090d`.

## Scope

This report diagnoses the live Intake UI issues without changing runtime code. It covers the current state, root cause, classification, recommended fix, and risk for issues A-E in the prompt.

## A. Attorney picker

### Current state

- The live Participants drawer loads directory contacts through `useContactStore().search(...)` whenever a drawer category is open in `pick` mode. The trigger is `ParticipantsPanel.useEffect` at `src/components/IntakeScreen/ParticipantsPanel.tsx:489-494`.
- The underlying query path is `searchContacts(term, type?)`, which calls Supabase `from("contacts").select("*").ilike("name", ...).eq("type", type)` and orders by `times_used` then `name` (`src/api/contactService.ts:51-66`).
- Picking an attorney row does **not** add it to the case immediately. It only sets `selectedContact` and merges directory data into the draft via `handlePickContact(...)` (`src/components/IntakeScreen/ParticipantsPanel.tsx:545-549`).
- The actual case mutation happens later, inside `handleSave()`, where attorneys are added only on the `Add Attorney` button click via `addAttorney(...)` (`src/components/IntakeScreen/ParticipantsPanel.tsx:606-656`).
- Existing attorney cards in the live panel expose **remove only**. `EntryCard` accepts `onRemove` and renders only an `X` button (`src/components/IntakeScreen/ParticipantsPanel.tsx:999-1021`). The live attorney list passes only `onRemove` (`src/components/IntakeScreen/ParticipantsPanel.tsx:741-749`).

### Reporter comparison

- The reporter drawer uses the same contact-search list and selection banner path as attorneys (`ParticipantsPanel.tsx:489-549`, `816-856`, `860-870`).
- The difference is the reporter save path: selecting a saved reporter and clicking `Add Reporter` writes directly into `record.reporter.*` through `updateField(...)` via `applyReporterFromDirectory(...)`, not `addParticipant`/`addAttorney` (`src/components/IntakeScreen/ParticipantsPanel.tsx:577-584`, `611-623`).
- There is also a separate working reporter shortcut, `Use My Reporter Profile`, that bypasses the directory picker entirely and populates case fields from `reporter_profiles` (`src/components/IntakeScreen/ParticipantsPanel.tsx:586-603`, `711-718`).

### MSW / mock-mode evidence

- In dev mock mode, MSW starts with `onUnhandledRequest: "bypass"` (`src/main.tsx:16-33`).
- The active MSW handlers file contains document, audio, suggestions, exhibits, and certify handlers only; it has **no** `contacts`, `firms`, or `reporter_profiles` handlers (`src/mocks/handlers.ts:240-316`).
- The contact and firm services go straight to Supabase and require an authenticated session (`src/api/contactService.ts:34-66`, `src/api/firmService.ts:11-43`, `src/lib/supabase.ts:128-136`).
- Therefore, in mock mode, attorney directory reads are **not intercepted** and can fall through to live Supabase/auth, which matches the intermittent `mockServiceWorker.js` passthrough failures the user reported.

### Edit affordance classification

- Edit existing attorney is a **missing feature in the live panel**, not a broken wire.
- Evidence: the live `ParticipantsPanel` has no edit or replace callback at all for attorney entries (`ParticipantsPanel.tsx:741-749`, `999-1021`).
- There *is* older replace/edit logic in the unused `LegacyAppearancesPanel`, including `handleAttorneyReplace`, `updateAttorney`, and a `ContactPicker`-based replace flow (`src/components/IntakeScreen/IntakeScreen.tsx:565-760`), but that component is not the live mounted panel.

### Root cause

1. The attorney directory read path is environment-sensitive because mock mode lacks `contacts`/`firms` handlers, so the picker can show an empty list or error even though the UI is wired.
2. Selection is a two-step flow: choose contact first, then click the generic footer action. The “picked” state is only a green banner, not a case mutation.
3. Editing an existing attorney on the case is unimplemented in the live `ParticipantsPanel`.

### Classification

- Empty-list / failed-read in mock mode: **freeze-safe fix**
- Selection-save ambiguity: **freeze-safe fix**
- Edit existing attorney: **missing feature** (do not implement in this run)

### Recommended fix

- Add mock handlers for contacts/firms or otherwise make the directory read path deterministic in mock mode.
- Make the selected-attorney save semantics explicit in the live drawer UI.
- Leave “edit existing attorney” for a dedicated feature stage, because it is not present in the live component today.

### Risk

- Low for mock-handler and save-clarity fixes.
- Medium for edit-in-place because it touches attorney role/function preservation and must respect the Stage 0.5 normalization guard.

## B. “Add Other Participant” save path

### Current state

- The footer action is always a generic `Add {Category}` button (`src/components/IntakeScreen/ParticipantsPanel.tsx:948-957`).
- For non-reporter categories, `handleSave()` resolves as follows:
  - If `drawerMode === "pick"` and a contact is selected, it uses that existing contact object only (`ParticipantsPanel.tsx:626-630`).
  - If `drawerMode === "create"`, it first writes/upserts to the directory via `upsertDirectory(buildContactInsert(...))` (`ParticipantsPanel.tsx:626-630`).
  - For generic participants, it then always writes a case participant row via `addParticipant(...)` (`ParticipantsPanel.tsx:681-690`).

### Root cause

- The save target is mode-dependent but the UI does not say so:
  - `pick` mode = case write only
  - `create` mode = directory upsert + case write
- The drawer copy says “Pick a saved directory entry or create a new one, then capture case-specific details” (`ParticipantsPanel.tsx:808-809`), but the final button label does not tell the user whether the directory will be updated.

### Classification

- **freeze-safe fix**

### Recommended fix

- Make the footer action explicit about its write target, or add inline explanatory copy that distinguishes “add saved contact to case” from “create directory entry and add to case.”

### Risk

- Low. This is labeling/clarity around existing behavior, not a data-model change.

## C. Category dropdown / valid role set

### Current state

- “Role In This Proceeding” is currently rendered as a free-text field: `GENERIC_CASE_FIELDS = [{ key: "genericRoleInProceeding", label: "Role In This Proceeding", kind: "text" }]` (`src/components/IntakeScreen/ParticipantsPanel.tsx:176-178`).
- The value is stored directly as `participant.role_in_this_proceeding` on save (`src/components/IntakeScreen/ParticipantsPanel.tsx:682-689`).
- `ParticipantRole` itself is a separate enum-like type for the broad participant bucket (`REPORTER | ATTORNEY | WITNESS | INTERPRETER | VIDEOGRAPHER | PARALEGAL | OBSERVER | OTHER`) in `src/types/case.ts:49-57`.
- The live Participants UI maps Other-participant categories to either `PARALEGAL` or `OTHER` only (`src/components/IntakeScreen/ParticipantsPanel.tsx:79-89`).
- `buildUfmMetadata()` does **not** constrain `role_in_this_proceeding`; it just normalizes and passes the string through into appearances metadata (`src/lib/ufm/buildUfmMetadata.ts:318-330`).

### Valid set found in code

- UI category taxonomy currently present:
  - `scheduler`
  - `paralegal`
  - `legal_assistant`
  - `records_custodian`
  - `corporate_representative`
  - generic `participant`
  (`src/components/IntakeScreen/ParticipantsPanel.tsx:79-89`, `779-787`)
- Case-level `ParticipantRole` broad bucket currently available:
  - `PARALEGAL`
  - `OTHER`
  for these drawer categories in practice (`ParticipantsPanel.tsx:84-89`, `src/types/case.ts:49-57`)
- There is **no authoritative downstream accepted set** for `role_in_this_proceeding` beyond free text. UFM currently accepts whatever string is entered.

### Root cause

- The field was built as unconstrained text and no downstream module narrows it.
- There is no code-level UFM-recognized enum for this field today.

### Classification

- **missing feature / needs product decision**, not a pure bug

### Recommended fix

- Do not guess a downstream “valid UFM set” in this run.
- If this is tightened later, the safe options are:
  - constrain the UI to the current category taxonomy labels, or
  - define a formal accepted value set first and then wire the select to that set.

### Risk

- Medium. Constraining values without a documented downstream contract risks silently changing exported participant semantics.

## D. Drawer label clipping

### Current state

- The drawer layout is a two-column shell with a fixed left rail and flexible right pane: `lg:grid-cols-[280px_1fr]` (`src/components/IntakeScreen/ParticipantsPanel.tsx:816`).
- The right pane then renders directory fields and case fields in `md:grid-cols-2` (`ParticipantsPanel.tsx:873-876`, `939-944`).
- Labels and values themselves are not explicitly truncated in `DrawerField`; they are stacked with normal block layout (`ParticipantsPanel.tsx:419-460`).

### Root cause

- The clipping comes from layout compression, not text-specific truncation logic:
  - a fixed 280px left rail
  - a right pane split into two field columns at medium widths
  - the whole drawer living inside an already constrained Intake rail
- That combination leaves too little horizontal space for input labels and values, which matches the reported “Test Phor / Test Ema / Attorne” behavior.

### Classification

- **freeze-safe fix**

### Recommended fix

- Widen or reflow the drawer form layout rather than changing behavior:
  - reduce the fixed left rail width, or
  - collapse the right pane to one column sooner, or
  - increase the available drawer width and preserve `min-w-0` boundaries.

### Risk

- Low. This is layout-only.

## E. Reporter form formatting

### Current state

- Reporter drawer fields are plain text today:
  - `CSR Number`
  - `CSR Expiration`
  - `Firm Registration`
  (`src/components/IntakeScreen/ParticipantsPanel.tsx:180-186`)
- `DrawerField` renders these with plain `<input type="text">` via the generic text path (`ParticipantsPanel.tsx:451-460`).
- `buildContactInsert("reporter", ...)` stores those three values by simple `trim()` only (`ParticipantsPanel.tsx:380-388`).
- The reporter contact directory is stored in `contacts.details.kind === "reporter"` (`src/types/contact.ts:16-20`, `115-126`, `151-158`).
- The `Use My Reporter Profile` button reads from `reporter_profiles` via `getMyProfile()` and writes those values into case fields only; it does **not** save back to the profile here (`src/components/IntakeScreen/ParticipantsPanel.tsx:586-603`, `src/api/reporterProfileService.ts:36-84`).

### Storage-home conclusion

- The reporter drawer’s create/save flow writes to the **contacts directory**, not `reporter_profiles`.
- `reporter_profiles` is a separate per-user profile store used by `Use My Reporter Profile` and `buildUfmMetadata` profile sourcing (`src/api/reporterProfileService.ts:36-84`, `src/lib/ufm/buildUfmMetadata.ts:567-570`).

### Root cause

- The live reporter drawer has no masking, no canonicalization, and no soft validation beyond trim().
- The field types in both `Contact.details.reporter` and `ReporterProfile` are plain nullable strings (`src/types/contact.ts:16-20`, `src/types/reporterProfile.ts:1-26`).

### Classification

- **freeze-safe fix**

### Recommended fix

- Add display formatting/masking at the drawer layer and store canonical strings in the `contacts.details.reporter` path.
- Because this drawer writes contacts, not `reporter_profiles`, the canonical-storage rule should target `Contact.details.reporter` first.
- Profile formatting should be treated as a separate UI surface if needed later.

### Risk

- Low to medium. Input-formatting changes are local, but canonicalization must not break existing contact rows or UFM profile fallback behavior.

## Summary matrix

| Issue | Classification | Notes |
| --- | --- | --- |
| A1. Attorney directory read path in mock/dev | freeze-safe fix | Missing MSW handlers for contacts/firms |
| A2. Attorney selection/save semantics | freeze-safe fix | Pick is not the same as add; UI is ambiguous |
| A3. Edit existing attorney on case | missing feature | Exists only in unused legacy panel |
| B. Other Participant save semantics | freeze-safe fix | Mode-dependent write target is not explicit |
| C. Role In This Proceeding dropdown | missing feature / needs product decision | No authoritative accepted downstream set today |
| D. Drawer clipping | freeze-safe fix | Layout compression |
| E. Reporter input formatting | freeze-safe fix | Plain text + trim only; writes contacts, not reporter_profiles |

## Priority conclusion

Top priority attorney-picker root cause:

1. The live picker/search code exists and does fire.
2. In mock/dev, it is undermined by missing `contacts` / `firms` MSW handlers.
3. Even when a directory contact is picked, the live panel does not commit it until the user clicks the generic footer action.
4. Editing an already-added attorney is not broken wiring; it is absent from the live component.
