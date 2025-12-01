# 🧪 Depo-Pro End-to-End Testing Checklist

**Tester:** ________________  
**Date:** December 1, 2025  
**Environment:** Production (Vercel)  
**URL:** ________________

---

## 🎯 Testing Goal

Verify all critical user workflows function correctly in production before inviting beta users.

**Time Required:** ~60 minutes  
**Test Accounts Needed:** Admin, Reporter, Scopist

---

## 📋 Test 1: Authentication & Registration

### **1.1 New User Registration**
- [ ] Navigate to `/register`
- [ ] Fill form with valid data:
  - Email: `test-reporter@example.com`
  - Password: `TestPassword123!`
  - Name: `Test Reporter`
  - Role: `REPORTER`
- [ ] Click "Create Account"
- [ ] ✅ **PASS:** Redirected to dashboard
- [ ] ❌ **FAIL:** Error shown - Note: _________________

### **1.2 User Login**
- [ ] Logout (if logged in)
- [ ] Navigate to `/login`
- [ ] Enter credentials from 1.1
- [ ] Click "Sign In"
- [ ] ✅ **PASS:** Redirected to role-appropriate dashboard
- [ ] ❌ **FAIL:** Error shown - Note: _________________

### **1.3 Invalid Credentials**
- [ ] Try login with wrong password
- [ ] ✅ **PASS:** Clear error message shown
- [ ] ❌ **FAIL:** Different behavior - Note: _________________

### **1.4 Session Persistence**
- [ ] Login successfully
- [ ] Refresh page
- [ ] ✅ **PASS:** Still logged in
- [ ] ❌ **FAIL:** Logged out - Note: _________________

**Section Result:** ⬜ PASS ⬜ FAIL  
**Notes:** _________________________________

---

## 📋 Test 2: Reporter Workflow - Job Creation

### **2.1 Access Reporter Dashboard**
- [ ] Login as court reporter
- [ ] Navigate to `/reporter`
- [ ] ✅ **PASS:** Dashboard loads, shows stats
- [ ] ❌ **FAIL:** Error or wrong page - Note: _________________

### **2.2 Create New Job**
- [ ] Click "New Job" or navigate to `/jobs/new`
- [ ] Fill required fields:
  - Case Name: `Smith v. Jones`
  - Case Number: `2025-CV-12345`
  - Deposition Date: Today's date
  - Deponent Name: `John Smith`
- [ ] Click "Create Job"
- [ ] ✅ **PASS:** Job created, redirected to job detail
- [ ] ❌ **FAIL:** Error shown - Note: _________________

### **2.3 View Job Details**
- [ ] From job list, click on created job
- [ ] ✅ **PASS:** Job details page loads with correct info
- [ ] ❌ **FAIL:** Wrong data or error - Note: _________________

### **2.4 Edit Job Information**
- [ ] On job detail page, click "Edit"
- [ ] Change case name to `Smith v. Jones (Amended)`
- [ ] Click "Save"
- [ ] ✅ **PASS:** Changes saved, displayed correctly
- [ ] ❌ **FAIL:** Error or changes not saved - Note: _________________

**Section Result:** ⬜ PASS ⬜ FAIL  
**Notes:** _________________________________

---

## 📋 Test 3: File Upload & Transcription

### **3.1 Upload Audio File**
- [ ] On job detail page, find upload section
- [ ] Click "Upload Audio" or drag-and-drop
- [ ] Select a test audio file (MP3, WAV, or M4A)
- [ ] ✅ **PASS:** File uploads, progress shown, success message
- [ ] ❌ **FAIL:** Upload fails - Note: _________________

### **3.2 Verify File Appears**
- [ ] ✅ **PASS:** Uploaded file listed with name, size, date
- [ ] ❌ **FAIL:** File not shown - Note: _________________

### **3.3 Trigger Transcription**
- [ ] Click "Start Transcription" button
- [ ] ✅ **PASS:** Job status changes to "TRANSCRIBING"
- [ ] ❌ **FAIL:** Error or no change - Note: _________________

### **3.4 Wait for Transcription (3-5 minutes)**
- [ ] Refresh page periodically
- [ ] ✅ **PASS:** Status changes to "AI_COMPLETE"
- [ ] ❌ **FAIL:** Stuck in PROCESSING or ERROR - Note: _________________

### **3.5 View Transcript**
- [ ] Click "View Transcript" after completion
- [ ] ✅ **PASS:** Transcript text displayed
- [ ] ✅ **PASS:** Low-confidence words highlighted
- [ ] ❌ **FAIL:** No transcript or error - Note: _________________

**Section Result:** ⬜ PASS ⬜ FAIL  
**Notes:** _________________________________

---

## 📋 Test 4: Scopist Assignment

### **4.1 Create Scopist Account**
- [ ] Logout and register new user:
  - Email: `test-scopist@example.com`
  - Role: `SCOPIST`
- [ ] ✅ **PASS:** Account created
- [ ] ❌ **FAIL:** Error - Note: _________________

### **4.2 Assign Scopist to Job**
- [ ] Login back as reporter
- [ ] Go to job detail page
- [ ] Find "Assign Scopist" section
- [ ] Select test scopist from dropdown
- [ ] Click "Assign"
- [ ] ✅ **PASS:** Scopist assigned, confirmation shown
- [ ] ❌ **FAIL:** Error - Note: _________________

### **4.3 Verify Scopist Dashboard**
- [ ] Logout and login as scopist
- [ ] Navigate to `/scopist`
- [ ] ✅ **PASS:** Assigned job appears in queue
- [ ] ❌ **FAIL:** Job not shown - Note: _________________

**Section Result:** ⬜ PASS ⬜ FAIL  
**Notes:** _________________________________

---

## 📋 Test 5: Low-Confidence Word Review

### **5.1 Access Review Page**
- [ ] As scopist, click "Review" on assigned job
- [ ] Navigate to `/jobs/[id]/review`
- [ ] ✅ **PASS:** Review page loads with:
  - [ ] Audio player visible
  - [ ] Flagged words panel on right
  - [ ] Transcript statistics
- [ ] ❌ **FAIL:** Layout broken or error - Note: _________________

### **5.2 Audio Player Functionality**
- [ ] Click play button
- [ ] ✅ **PASS:** Audio plays
- [ ] Try pause, seek, volume controls
- [ ] ✅ **PASS:** All controls work
- [ ] ❌ **FAIL:** Audio issues - Note: _________________

### **5.3 Review Flagged Words**
- [ ] Check flagged words panel
- [ ] ✅ **PASS:** List shows words with confidence < 85%
- [ ] ✅ **PASS:** Each word shows context and timestamp
- [ ] ❌ **FAIL:** No flagged words or display issues - Note: _________________

### **5.4 Click-to-Play Feature**
- [ ] Click on a timestamp next to flagged word
- [ ] ✅ **PASS:** Audio jumps to that position (minus 2 seconds)
- [ ] ✅ **PASS:** Relevant section plays
- [ ] ❌ **FAIL:** Audio doesn't sync - Note: _________________

### **5.5 Edit Word Inline**
- [ ] Click on a flagged word to edit
- [ ] Change the word (e.g., "hear" → "here")
- [ ] Press Enter or click save
- [ ] ✅ **PASS:** Word updated
- [ ] ✅ **PASS:** Success message shown
- [ ] ❌ **FAIL:** Edit doesn't save - Note: _________________

### **5.6 Mark as Reviewed**
- [ ] Check the "Reviewed" checkbox on a word
- [ ] ✅ **PASS:** Word marked complete
- [ ] ✅ **PASS:** Progress counter updates
- [ ] ❌ **FAIL:** Status doesn't change - Note: _________________

### **5.7 Keyboard Navigation**
- [ ] Test keyboard shortcuts:
  - [ ] ↑↓ arrows to navigate words
  - [ ] Space to play/pause
  - [ ] Enter to edit
  - [ ] R to mark reviewed
- [ ] ✅ **PASS:** Shortcuts work
- [ ] ❌ **FAIL:** Shortcuts don't work - Note: _________________

**Section Result:** ⬜ PASS ⬜ FAIL  
**Notes:** _________________________________

---

## 📋 Test 6: Document Export

### **6.1 Export to DOCX**
- [ ] From transcript viewer, click "Export DOCX"
- [ ] ✅ **PASS:** File downloads successfully
- [ ] Open in Word/Google Docs
- [ ] ✅ **PASS:** Document has:
  - [ ] Title page with case info
  - [ ] Line numbers (every 5 lines)
  - [ ] Proper legal formatting
  - [ ] Complete transcript text
- [ ] ❌ **FAIL:** Export issues - Note: _________________

### **6.2 Export to PDF**
- [ ] Click "Export PDF"
- [ ] ✅ **PASS:** PDF downloads successfully
- [ ] Open PDF
- [ ] ✅ **PASS:** Content properly formatted
- [ ] ❌ **FAIL:** PDF issues - Note: _________________

### **6.3 Export to TXT**
- [ ] Click "Export TXT"
- [ ] ✅ **PASS:** TXT file downloads
- [ ] Open in text editor
- [ ] ✅ **PASS:** Plain text with proper formatting
- [ ] ❌ **FAIL:** TXT issues - Note: _________________

**Section Result:** ⬜ PASS ⬜ FAIL  
**Notes:** _________________________________

---

## 📋 Test 7: Role-Based Access Control

### **7.1 Scopist Restrictions**
- [ ] Login as scopist
- [ ] Try to access `/reporter` dashboard
- [ ] ✅ **PASS:** Redirected or access denied
- [ ] Try to create new job
- [ ] ✅ **PASS:** Cannot access job creation
- [ ] ❌ **FAIL:** Scopist has inappropriate access - Note: _________________

### **7.2 Reporter Restrictions**
- [ ] Login as reporter
- [ ] Try to access jobs not owned by you
- [ ] ✅ **PASS:** Access controlled appropriately
- [ ] ❌ **FAIL:** Can access other users' data - Note: _________________

**Section Result:** ⬜ PASS ⬜ FAIL  
**Notes:** _________________________________

---

## 📋 Test 8: Error Handling & Edge Cases

### **8.1 Invalid File Upload**
- [ ] Try uploading a non-audio file (e.g., .pdf)
- [ ] ✅ **PASS:** Clear error message shown
- [ ] ❌ **FAIL:** No error or app crashes - Note: _________________

### **8.2 Empty Required Fields**
- [ ] Try creating job without required fields
- [ ] ✅ **PASS:** Validation errors shown
- [ ] ❌ **FAIL:** Form submits anyway - Note: _________________

### **8.3 Session Timeout**
- [ ] Wait 30+ minutes idle
- [ ] Try to perform action
- [ ] ✅ **PASS:** Redirected to login
- [ ] ❌ **FAIL:** Error or unexpected behavior - Note: _________________

**Section Result:** ⬜ PASS ⬜ FAIL  
**Notes:** _________________________________

---

## 📋 Test 9: Mobile Responsiveness

### **9.1 Dashboard on Mobile**
- [ ] Open site on phone or use browser dev tools (375px width)
- [ ] ✅ **PASS:** Layout adapts, readable
- [ ] ❌ **FAIL:** Broken layout - Note: _________________

### **9.2 Job Creation on Mobile**
- [ ] Try creating job on mobile view
- [ ] ✅ **PASS:** Form usable, can submit
- [ ] ❌ **FAIL:** Unusable - Note: _________________

**Section Result:** ⬜ PASS ⬜ FAIL  
**Notes:** _________________________________

---

## 📋 Test 10: Performance & Loading

### **10.1 Page Load Times**
- [ ] Test pages load in < 3 seconds:
  - [ ] Dashboard
  - [ ] Job list
  - [ ] Job detail
  - [ ] Review page
- [ ] ✅ **PASS:** All pages load quickly
- [ ] ❌ **FAIL:** Slow loading - Note: _________________

### **10.2 Audio Playback**
- [ ] Test audio starts within 2 seconds
- [ ] ✅ **PASS:** Quick playback start
- [ ] ❌ **FAIL:** Long buffer time - Note: _________________

**Section Result:** ⬜ PASS ⬜ FAIL  
**Notes:** _________________________________

---

## 🎯 FINAL RESULTS

### **Critical Tests (Must Pass)**
- [ ] Authentication works
- [ ] Job creation works
- [ ] File upload works
- [ ] Transcription completes
- [ ] Review workflow functional
- [ ] Export generates documents

### **Important Tests (Should Pass)**
- [ ] Role-based access control
- [ ] Error handling
- [ ] Audio synchronization
- [ ] Word editing and tracking

### **Nice-to-Have Tests (Can Fix Later)**
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Edge case handling

---

## 🚨 Critical Bugs Found

| # | Severity | Description | Steps to Reproduce | Impact |
|---|----------|-------------|-------------------|--------|
| 1 | 🔴 HIGH | | | |
| 2 | 🟡 MEDIUM | | | |
| 3 | 🟢 LOW | | | |

---

## ✅ DECISION

⬜ **SHIP IT** - No critical bugs, ready for beta users  
⬜ **FIX FIRST** - Critical bugs found, fix before launch  
⬜ **NEEDS WORK** - Major issues, requires more development

---

**Tested By:** ________________  
**Date Completed:** ________________  
**Sign-off:** ________________
