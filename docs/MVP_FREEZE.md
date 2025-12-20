# MVP Feature Freeze

**Date:** January 2025

**Status:** ACTIVE

---

## 🚨 FREEZE DECLARATION

**Depo-Pro MVP is feature-complete. Only bug fixes allowed.**

---

## What This Means

### ✅ Allowed
- Bug fixes (things that don't work as designed)
- Performance optimizations (if they break functionality)
- Security patches
- Documentation updates
- Test improvements

### ❌ NOT Allowed
- New features
- UI/UX redesigns
- Architecture changes
- New dependencies (unless critical for bugs)
- Refactoring (unless fixing bugs)
- Phase 2 features (waveform, TipTap, PDF streaming, etc.)

---

## MVP Scope (Locked)

### ✅ Included Features
1. **Authentication** - Login/Register with NextAuth v5
2. **Job Management** - Create, view, list jobs
3. **File Upload** - Audio file upload and storage
4. **Transcription** - Deepgram integration (nova-3 model)
5. **Review Interface** - Audio player + synced transcript + low-confidence review
6. **Word Editing** - Edit flagged words with persistence
7. **Review Completion** - Mark review complete, update job status
8. **Export** - DOCX export with edits reflected

### ❌ Excluded (Phase 2)
- Waveform visualization
- TipTap rich text editor
- PDF export
- Streaming transcription
- Real-time collaboration
- Advanced speaker identification
- Email notifications
- Webhook-based transcription

---

## Technical Constraints

### Data Contracts (Locked)
- Word object structure
- FlaggedSegment object structure
- JSON storage (no normalization)
- Confidence threshold: 0.85
- Deepgram model: nova-3

### API Contracts (Locked)
- `/api/transcripts/[id]/words` - PATCH method
- `/api/jobs/[id]/status` - PATCH method
- No schema changes
- No route renames

### Code Quality Gates
- Zero TypeScript errors
- Zero console errors
- All manual tests pass
- Database schema in sync

---

## Change Request Process

If you need to add something:

1. **Ask:** "Is this a bug fix or a feature?"
2. **If feature:** Document for Phase 2 roadmap
3. **If bug:** Fix it, but don't add features while fixing

---

## Release Criteria

MVP is ready for beta when:

- [x] All manual tests pass (see `MVP_MANUAL_TEST.md`)
- [x] Zero TypeScript errors
- [x] Zero console errors
- [x] Database connection stable
- [x] Edits persist after refresh
- [x] Exports reflect edits
- [x] Review page works end-to-end

---

## Post-MVP Roadmap

See `NEXT_FEATURES.md` for Phase 2 planning.

**Do not implement Phase 2 features until MVP is released and validated.**

---

## Enforcement

This freeze is enforced by:
- Code review process
- TypeScript strict mode
- Manual test checklist
- Team discipline

**Remember:** Shipping > Perfect. MVP first, features later.

---

**Last Updated:** January 2025
**Freeze Status:** ACTIVE ✅

