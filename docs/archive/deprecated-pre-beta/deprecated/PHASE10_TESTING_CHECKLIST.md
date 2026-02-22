# Phase 10 Medical Chronology - Testing Checklist

## Pre-Deployment Verification

### Environment Setup
- [ ] `ANTHROPIC_API_KEY` added to Vercel (Production + Preview)
- [ ] `depo-files` storage bucket exists in Supabase
- [ ] Bucket settings: Private, 50MB limit, PDF only
- [ ] RLS policies applied (migration run)
- [ ] Vercel deployment successful

---

## 1. Access Control & Authentication

### As Admin User
- [ ] Navigate to `/jobs`
- [ ] Can see all jobs (including other reporters')
- [ ] Click on any job → Navigate to `/jobs/[id]`
- [ ] See "Medical Chronology" card with FileText icon
- [ ] Click "Open Chronology" → Navigate to `/jobs/[id]/medical`
- [ ] Page loads without errors

### As Reporter User
- [ ] Navigate to `/jobs`
- [ ] Can only see own jobs (not other reporters')
- [ ] Click on own job → Navigate to `/jobs/[id]`
- [ ] See "Medical Chronology" card
- [ ] Click "Open Chronology" → Navigate to `/jobs/[id]/medical`
- [ ] Page loads without errors

### As Scopist User
- [ ] Navigate to `/jobs`
- [ ] Can see assigned jobs only
- [ ] Access medical chronology for assigned jobs
- [ ] Cannot access chronology for unassigned jobs

### RLS Security Test
- [ ] Reporter A uploads medical record to Job X
- [ ] Reporter B attempts to access `/jobs/X/medical`
- [ ] Should see 403/404 or no records (RLS blocks access)
- [ ] Admin can access all medical records across all jobs

---

## 2. Medical Records Upload

### PDF Upload
- [ ] Click "Upload Medical Record" button
- [ ] File picker opens
- [ ] Select a valid PDF (e.g., sample medical record, 1-5 pages)
- [ ] File uploads successfully
- [ ] Record appears in list with status "UPLOADED"
- [ ] File metadata displayed: name, size, page count
- [ ] Upload timestamp shown

### File Validation
- [ ] Attempt to upload non-PDF (e.g., .docx, .jpg)
- [ ] Should reject with error: "Only PDF files allowed"
- [ ] Attempt to upload >50MB PDF
- [ ] Should reject with error: "File too large (max 50MB)"

### Multiple Files
- [ ] Upload 3 different medical records
- [ ] All appear in list
- [ ] Each has unique ID
- [ ] Sorted by upload date (newest first)

### Storage Verification (Supabase Dashboard)
- [ ] Go to Supabase → Storage → depo-files bucket
- [ ] Find uploaded PDFs in folder structure: `medical-records/[job-id]/[filename]`
- [ ] Files are accessible via signed URL
- [ ] Direct access without auth fails (bucket is private)

---

## 3. AI Extraction

### Basic Extraction
- [ ] Click "Extract Events" on an uploaded record
- [ ] Status changes to "EXTRACTING"
- [ ] Loading indicator appears
- [ ] Wait for extraction (30-120 seconds for typical record)
- [ ] Status changes to "EXTRACTED"
- [ ] Entry count shows (e.g., "15 entries extracted")

### Extraction Results
- [ ] Chronology timeline shows new entries
- [ ] Each entry has:
  - [ ] Event date
  - [ ] Category (Diagnosis, Treatment, Test, etc.)
  - [ ] Summary text
  - [ ] Provider name (if applicable)
  - [ ] Page reference (e.g., "Page 3")
  - [ ] Source badge: "AI Extracted"
  - [ ] Confidence indicator (visual or numeric)

### Edge Cases
- [ ] Upload PDF with no dates → Extraction returns 0 entries
- [ ] Upload PDF with unclear dates → Entries marked low confidence
- [ ] Upload non-medical PDF (e.g., invoice) → Extraction completes but finds no medical events
- [ ] Re-extract same record → Old AI entries deleted, new ones created

### Error Handling
- [ ] Test with invalid ANTHROPIC_API_KEY → Shows error message
- [ ] Test with network failure → Shows retry option
- [ ] Test with corrupted PDF → Shows extraction failed status

---

## 4. Chronology Timeline View

### Display & Sorting
- [ ] Timeline shows entries in chronological order (oldest to newest)
- [ ] Date headers separate entries by month/year
- [ ] Each entry card displays:
  - [ ] Event date (formatted: "January 15, 2024")
  - [ ] Category badge with color coding
  - [ ] Summary text
  - [ ] Provider name (if present)
  - [ ] Details section (expandable)
  - [ ] Page reference link
  - [ ] Source indicator (AI vs Manual)

### Filtering
- [ ] Filter by category (Diagnosis) → Only diagnosis entries shown
- [ ] Filter by date range → Only entries in range shown
- [ ] Filter by provider name → Only matching entries shown
- [ ] Filter by source (AI only) → Only AI-extracted shown
- [ ] Filter by verified status → Only verified entries shown
- [ ] Clear all filters → All entries reappear

### Pagination/Infinite Scroll
- [ ] Load job with 100+ entries
- [ ] Initial load shows first 25-50 entries
- [ ] Scroll down → More entries load automatically
- [ ] Performance remains smooth

---

## 5. Manual Entry Creation

### Create New Entry
- [ ] Click "Add Manual Entry" button
- [ ] Form appears with fields:
  - [ ] Event date (required)
  - [ ] Category dropdown (required)
  - [ ] Summary textarea (required)
  - [ ] Provider name (optional)
  - [ ] Details textarea (optional)
  - [ ] Page reference (optional)
- [ ] Fill all required fields
- [ ] Click "Save"
- [ ] Entry appears in timeline with "Manual" badge
- [ ] Sorted chronologically with AI entries

### Form Validation
- [ ] Submit without event date → Error: "Date required"
- [ ] Submit without category → Error: "Category required"
- [ ] Submit without summary → Error: "Summary required"
- [ ] Enter invalid date (e.g., "99/99/9999") → Error: "Invalid date"

### Date Precision
- [ ] Create entry with full date (MM/DD/YYYY)
- [ ] Create entry with month/year only → Stored with day = 1
- [ ] Create entry with year only → Stored with day = 1, month = 1
- [ ] Display reflects precision (e.g., "March 2024" vs "March 15, 2024")

---

## 6. Edit & Delete Operations

### Edit Entry
- [ ] Click edit icon on any entry
- [ ] Form pre-fills with existing data
- [ ] Change summary text
- [ ] Click "Save"
- [ ] Entry updates in place
- [ ] Updated timestamp shown

### Edit Verification
- [ ] Edit AI-extracted entry → Maintains "AI Extracted" badge
- [ ] Edit manual entry → Maintains "Manual" badge
- [ ] Edit verified entry → Verification status persists

### Delete Entry
- [ ] Click delete icon on entry
- [ ] Confirmation dialog appears: "Are you sure you want to delete this entry?"
- [ ] Click "Cancel" → Entry remains
- [ ] Click "Delete" → Entry removed from timeline
- [ ] Deletion is permanent (no undo)

### Bulk Delete
- [ ] Select multiple entries (checkbox selection)
- [ ] Click "Delete Selected"
- [ ] Confirmation shows count: "Delete 5 entries?"
- [ ] Confirm → All selected entries deleted

---

## 7. Verification Workflow

### Mark as Verified
- [ ] Find unverified AI-extracted entry
- [ ] Click "Verify" button/checkbox
- [ ] Entry marked as verified
- [ ] Verified badge appears (green checkmark)
- [ ] Verified by name shown (current user)
- [ ] Verified timestamp recorded

### Verified Count
- [ ] Medical record shows "X / Y verified" (e.g., "8 / 15 verified")
- [ ] Progress bar shows verification percentage
- [ ] Filter by verified status works

### Verification by Role
- [ ] Reporter verifies entry → Verified by "Reporter Name"
- [ ] Admin verifies entry → Verified by "Admin Name"
- [ ] Scopist cannot verify → Button disabled/hidden

---

## 8. Export to DOCX

### Basic Export
- [ ] Click "Export Chronology" button
- [ ] Download starts immediately
- [ ] File name: `Medical_Chronology_[JobName]_[Date].docx`
- [ ] File downloads to browser default location

### DOCX Content
- [ ] Open exported file in MS Word
- [ ] Title page shows:
  - [ ] "Medical Chronology"
  - [ ] Job/case name
  - [ ] Date range of events
  - [ ] Export date
- [ ] Timeline section shows:
  - [ ] Events in chronological order
  - [ ] Each entry has date, category, provider, summary
  - [ ] Page references included
  - [ ] Professional formatting (headers, spacing, bullets)

### Export Filtering
- [ ] Apply filter (e.g., only Diagnosis category)
- [ ] Click "Export Filtered"
- [ ] DOCX contains only filtered entries
- [ ] Export includes filter notation: "Filtered by: Category = Diagnosis"

### Large Export
- [ ] Export chronology with 100+ entries
- [ ] File generates successfully
- [ ] Opens in Word without errors
- [ ] All entries present and formatted

---

## 9. Summary Statistics

### Dashboard Stats
- [ ] Medical chronology page shows:
  - [ ] Total entries count
  - [ ] Verified entries count
  - [ ] Date range (earliest to latest event)
  - [ ] Entries by category (pie/bar chart)
  - [ ] Top providers (list)
  - [ ] Records uploaded count
  - [ ] Records extracted count

### Real-Time Updates
- [ ] Create new manual entry → Stats update immediately
- [ ] Verify entry → Verified count increments
- [ ] Delete entry → Total count decrements
- [ ] Extract new record → Stats reflect new entries

---

## 10. Performance & UX

### Load Times
- [ ] Initial page load < 2 seconds
- [ ] File upload feedback within 500ms
- [ ] AI extraction status polling every 2-3 seconds
- [ ] Timeline scrolling smooth (60fps)
- [ ] Filter application < 500ms

### Mobile Responsiveness
- [ ] Open `/jobs/[id]/medical` on mobile device
- [ ] Timeline cards stack vertically
- [ ] Upload button accessible
- [ ] Filters collapsed into drawer/accordion
- [ ] Export button visible
- [ ] Touch interactions work (tap to expand details)

### Error States
- [ ] Network error during load → Retry button appears
- [ ] API error → User-friendly message shown
- [ ] Empty state → "No entries yet" with call-to-action
- [ ] Loading states → Skeletons/spinners visible

---

## 11. Integration Tests

### Job Detail Page
- [ ] Navigate to `/jobs/[id]`
- [ ] "Medical Chronology" card appears
- [ ] Card shows entry count (if chronology exists)
- [ ] Card shows "No entries yet" (if empty)
- [ ] Click "Open Chronology" → Navigates correctly

### Exhibits Integration (ExhibitTimelinePanel)
- [ ] Navigate to `/jobs/[id]/review`
- [ ] ExhibitTimelinePanel renders without errors
- [ ] Panel shows exhibits in timeline format
- [ ] Click exhibit → Audio seeks to timestamp (if audio loaded)
- [ ] Empty state shown if no exhibits

### Navigation
- [ ] Breadcrumbs show: Jobs → [Job Name] → Medical Chronology
- [ ] Back button returns to job detail page
- [ ] Sidebar navigation highlights correct section

---

## 12. Edge Cases & Error Scenarios

### Data Integrity
- [ ] Delete medical record → Associated chronology entries deleted (cascade)
- [ ] Archive job → Medical chronology remains accessible (read-only)
- [ ] Duplicate job → Medical chronology NOT duplicated

### Concurrency
- [ ] Two users editing different entries simultaneously → Both save successfully
- [ ] Two users editing same entry → Last save wins (or conflict detection)

### API Rate Limits
- [ ] Extract 5 records rapidly → Anthropic rate limit handled gracefully
- [ ] Error message: "Too many requests, please wait X seconds"
- [ ] Retry mechanism available

### Storage Limits
- [ ] Upload files totaling >1GB for single job → Warning shown
- [ ] Bucket nearing capacity → Admin notification

---

## 13. Accessibility

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter/Space activates buttons
- [ ] Escape closes dialogs
- [ ] Arrow keys navigate timeline entries

### Screen Reader
- [ ] VoiceOver/NVDA announces page structure
- [ ] Timeline entries have meaningful labels
- [ ] Form fields have associated labels
- [ ] Error messages announced

### Visual
- [ ] High contrast mode supported
- [ ] Focus indicators visible
- [ ] Text meets WCAG AA contrast ratios
- [ ] No color-only distinctions (categories have icons + colors)

---

## 14. Security Audit

### Authentication
- [ ] Unauthenticated user redirected to login
- [ ] Expired session redirected to login
- [ ] CSRF protection active

### Authorization (RLS)
- [ ] Reporter cannot access other reporter's chronologies
- [ ] Scopist cannot modify entries (if read-only)
- [ ] Admin can access all chronologies
- [ ] Direct API calls respect RLS (test with curl/Postman)

### Input Validation
- [ ] XSS prevention: `<script>alert('xss')</script>` in summary → Escaped
- [ ] SQL injection: `'; DROP TABLE--` → Sanitized
- [ ] File upload: Malicious PDF rejected

### API Security
- [ ] ANTHROPIC_API_KEY not exposed in client code
- [ ] API routes require authentication
- [ ] Rate limiting prevents abuse

---

## 15. Post-Deployment Monitoring

### First 24 Hours
- [ ] Monitor Vercel logs for errors
- [ ] Check Supabase logs for RLS violations
- [ ] Monitor Anthropic API usage/costs
- [ ] Watch storage bucket growth
- [ ] Review user feedback

### Metrics to Track
- [ ] Medical records uploaded per day
- [ ] AI extraction success rate
- [ ] Average extraction time
- [ ] DOCX exports generated
- [ ] Error rate by endpoint

---

## ✅ Sign-Off

| Test Category | Status | Notes | Tested By | Date |
|--------------|--------|-------|-----------|------|
| Access Control | ⬜ | | | |
| File Upload | ⬜ | | | |
| AI Extraction | ⬜ | | | |
| Timeline View | ⬜ | | | |
| Manual Entry | ⬜ | | | |
| Edit/Delete | ⬜ | | | |
| Verification | ⬜ | | | |
| Export DOCX | ⬜ | | | |
| Statistics | ⬜ | | | |
| Performance | ⬜ | | | |
| Integration | ⬜ | | | |
| Edge Cases | ⬜ | | | |
| Accessibility | ⬜ | | | |
| Security | ⬜ | | | |

**Final Approval:** ___________________
**Date:** ___________________

---

## Test Data Recommendations

### Sample PDFs
1. **Simple Medical Record** (2-3 pages, 5-10 dated events)
2. **Complex Medical Record** (10+ pages, 50+ dated events)
3. **Poorly Scanned PDF** (low quality, unclear dates)
4. **Non-Medical PDF** (invoice, legal document - negative test)

### Test Accounts
- `admin@test.com` (Admin role)
- `reporter1@test.com` (Reporter role, Job Owner)
- `reporter2@test.com` (Reporter role, Different jobs)
- `scopist@test.com` (Scopist role, Assigned to Job 1)

### Test Jobs
- Job 1: Owned by reporter1, assigned scopist
- Job 2: Owned by reporter2, no scopist
- Job 3: Owned by reporter1, 100+ chronology entries (performance test)
