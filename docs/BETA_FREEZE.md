# DEPO-PRO — BETA FREEZE

Effective: 2026-03-09
Status: ACTIVE

## Allowed During Beta
- Bug fixes for issues reported by beta users
- Stability patches for crashes or data loss
- Performance improvements for existing features

## NOT Allowed During Beta
- New feature additions
- UI redesigns or layout changes
- Database schema changes (migrations)
- New third-party integrations
- Architecture refactors

## To Request an Exception
Open a GitHub issue tagged `beta-exception-request`.
Exception requires sign-off before any work begins.

## Beta Success Criteria (all must pass before wider launch)
- [ ] Reporter uploads audio, triggers transcription, assigns scopist
- [ ] Scopist reviews flagged words with keyboard navigation + audio sync
- [ ] Corrections persist after page refresh
- [ ] Optimistic locking prevents simultaneous edit conflicts (409 handled gracefully)
- [ ] DOCX export: 25 lines/page, Courier New, correct line numbering
- [ ] PDF export matches DOCX layout
- [ ] No crashes in 10 consecutive jobs end-to-end
- [ ] npm run build passes cleanly
- [ ] /api/health returns all services healthy
