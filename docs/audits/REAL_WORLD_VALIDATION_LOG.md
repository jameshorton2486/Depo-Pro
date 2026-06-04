# REAL WORLD VALIDATION LOG

## Testing Environment

- Local single-user
- Repository: `Transcript_Editor_Bolt`
- Date started: `2026-06-02`
- Current branch: `feature/stage3-workspace-core`
- Current version / commit: `9ab972e`

## Test Transcript Inventory

| ID | Transcript | Pages | Audio | Interpreter | Status |
|---|---|---:|---|---|---|
| T001 |  |  |  |  | Not Started |
| T002 |  |  |  |  | Not Started |
| T003 |  |  |  |  | Not Started |
| T004 |  |  |  |  | Not Started |
| T005 |  |  |  |  | Not Started |

Suggested `Status` values:
- `Not Started`
- `In Progress`
- `Completed`
- `Blocked`

## Validation Issue Log

| Issue ID | Transcript | Severity | Area | Description | Reproduction | Expected | Actual | Status |
|---|---|---|---|---|---|---|---|---|
| RWV-001 |  |  |  |  |  |  |  | Open |

Severity:
- `Critical`
- `High`
- `Medium`
- `Low`

Areas:
- `Transcript Editor`
- `Audio`
- `Confidence Review`
- `Speakers`
- `Suggestions`
- `Exhibits`
- `Export`
- `Certification`
- `Performance`
- `UI`
- `Other`

Status:
- `Open`
- `Investigating`
- `Fixed`
- `Verified`

## Regression Checklist

For every release, verify:

- [ ] Open transcript
- [ ] Edit transcript
- [ ] Save transcript
- [ ] Reload transcript
- [ ] Audio sync
- [ ] Speaker reassignment
- [ ] Confidence review
- [ ] Suggestions
- [ ] Exhibits
- [ ] Export
- [ ] Certification

## Known Issues

Current confirmed fixes:

- Gate 1 progression
- Transcript persistence
- Audio readiness
- Confidence persistence
- Speaker reassignment persistence
- `findWordAtTime` overlap bug

Add newly confirmed issues here only after they are reproduced and accepted as real defects.

## Future Enhancements

Track ideas separately from bugs.

Do not mix feature requests with defects.

Suggested fields for future enhancements:

| Enhancement ID | Area | Idea | Reason | Priority | Status |
|---|---|---|---|---|---|
| FE-001 |  |  |  |  | Backlog |

## Usage Notes

- Use one row in `Test Transcript Inventory` per real deposition.
- Use one row in `Validation Issue Log` per distinct defect.
- If multiple transcripts reproduce the same defect, either:
  - add transcript IDs to the same row, or
  - create a linked follow-up row only if the failure mode is materially different.
- Prefer concrete reproduction steps over summaries.
- Mark an issue `Verified` only after retesting on a transcript that previously reproduced it.
