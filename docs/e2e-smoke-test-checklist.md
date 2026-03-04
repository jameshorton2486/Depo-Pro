# E2E Smoke Test Checklist — Pre-Beta
# Run on: https://app.depo-pro.com
# Complete all steps before sending beta invitations

## Setup
- [ ] You have one Court Reporter test account
- [ ] You have one Scopist test account (different email/firm)
- [ ] You have a short audio file (1–3 min, MP3 or WAV)

---

## Flow 1: Reporter Uploads and Transcribes

- [ ] 1. Log in as Court Reporter
- [ ] 2. Create a new job — enter case name, date, deponent name
- [ ] 3. Upload the audio file
- [ ] 4. Trigger transcription — confirm status changes to PROCESSING
- [ ] 5. Wait for completion — confirm status changes to COMPLETED
- [ ] 6. Open the transcript — verify text appears and is readable
- [ ] 7. Confirm flagged words panel is visible with at least 1 item

## Flow 2: Reporter Assigns to Scopist

- [ ] 8. From the job page, assign the Scopist test account
- [ ] 9. Log in as Scopist — confirm the job appears in dashboard

## Flow 3: Scopist Reviews Flagged Words

- [ ] 10. Open the job as Scopist
- [ ] 11. Open a flagged word — verify audio playback works (plays the word in context)
- [ ] 12. Enter a correction for at least 2 flagged words
- [ ] 13. Accept (confirm) at least 1 flagged word without change
- [ ] 14. Refresh the page — verify corrections are still saved (not lost)
- [ ] 15. Submit the review

## Flow 4: Export Verification (MOST CRITICAL)

- [ ] 16. Export as DOCX — download the file, open it
- [ ] 17. VERIFY: The corrected words from step 12 appear in the DOCX (not the original low-confidence words)
- [ ] 18. VERIFY: Line numbering is present (1–25 per page)
- [ ] 19. VERIFY: Font is Courier New 12pt
- [ ] 20. Export as PDF — open it
- [ ] 21. VERIFY: Same corrections appear in the PDF
- [ ] 22. VERIFY: PDF formatting matches DOCX (margins, line numbers)

## Flow 5: Security Checks

- [ ] 23. While logged in as Scopist, manually type a URL for a job belonging to a DIFFERENT firm
       e.g. /dashboard/jobs/[some-other-job-id]
- [ ] 24. VERIFY: Returns 403 or redirects to dashboard (not the job data)
- [ ] 25. Log out — verify session is cleared, redirected to login

## Flow 6: Edge Cases

- [ ] 26. Upload a very short audio file (<30 seconds) — confirm it processes without error
- [ ] 27. Navigate away during a correction and come back — verify no data loss
- [ ] 28. Open the same job in two browser tabs — confirm no UI crash

---

## Results

| Flow | Pass? | Notes |
|------|-------|-------|
| Flow 1: Upload & Transcribe | | |
| Flow 2: Assignment | | |
| Flow 3: Scopist Review | | |
| Flow 4: Export Verification | | |
| Flow 5: Security | | |
| Flow 6: Edge Cases | | |

**Sign-off:** All flows pass → Beta invitations approved.
