# 🚀 PHASE 4: PRE-FLIGHT LAUNCH CHECKLIST

**Status:** Ready to execute autonomous cleanup  
**Date:** November 11, 2025  
**Approach:** 100% file-based AI agent automation (5 sequential prompts)

---

## ✅ DOCUMENT VALIDATION

All 4 reference documents are present and complete:

- [x] **PHASE-4-MASTER-PROMPT.md** (457 lines)
  - ✅ Global constraints documented
  - ✅ 5 sequential prompts clearly defined
  - ✅ Error handling conditions specified
  - ✅ Progress markers explained

- [x] **PHASE-4-DETAILED-CHECKLIST.md** (1,666 lines)
  - ✅ 26 sections covering all pages
  - ✅ 242 individual tasks with specific instructions
  - ✅ Public pages (Sections 1-9): 8 sections
  - ✅ Admin pages (Sections 10-14): 5 sections
  - ✅ Feature disabling (Sections 15-22): 8 sections
  - ✅ Testing & deployment (Sections 23-26): 4 sections

- [x] **PHASE-4-HOW-TO-USE.md** (339 lines)
  - ✅ Three execution approaches (Linear, Feature-based, Quick & Dirty)
  - ✅ Time estimates per section
  - ✅ Step-by-step execution pattern
  - ✅ Progress tracking templates

- [x] **PHASE-4-CAPACITY-ANALYSIS.md** (335 lines)
  - ✅ Honest assessment: No Redis needed yet (1,000-2,000 concurrent users OK)
  - ✅ Clear recommendation: Focus Phase 4 on Email + Monitoring, not infrastructure
  - ✅ Cost analysis and triggers for future scaling

---

## 🔗 DOCUMENT ALIGNMENT CHECK

**Cross-referencing to ensure consistency:**

| Reference | MASTER-PROMPT | DETAILED-CHECKLIST | HOW-TO-USE | CAPACITY-ANALYSIS |
|-----------|---------------|-------------------|-----------|-------------------|
| Sections 1-9 (Public pages) | ✅ Prompt 2 | ✅ Sections 1-9 | ✅ Week 1 target | - |
| Sections 10-14 (Admin pages) | ✅ Prompt 3 | ✅ Sections 10-14 | ✅ Week 2 target | - |
| Sections 15+ (Disable features) | ✅ Prompt 4 | ✅ Sections 15-22 | ✅ Priority items | ✅ Email/Analytics out of scope |
| Email notifications | ✅ Out of scope for Phase 4 | ✅ Section 15 | ✅ Not in critical path | ✅ Recommended for Phase 4A |
| Redis requirement | ✅ Not required | ✅ Not required | ✅ Not required | ✅ Not needed (yet) |
| Test & Deploy | ✅ Prompt 5 | ✅ Sections 23-26 | ✅ Final steps | - |

**Result:** ✅ All documents are aligned. No conflicts.

---

## 🎯 PRE-EXECUTION REQUIREMENTS

**Verify your repo is ready:**

- [ ] Repository initialized with Git
  - Command: `git status` (should show clean or with expected changes)
  
- [ ] All reference docs copied to repo root
  - [ ] PHASE-4-MASTER-PROMPT.md
  - [ ] PHASE-4-DETAILED-CHECKLIST.md
  - [ ] PHASE-4-HOW-TO-USE.md
  - [ ] PHASE-4-CAPACITY-ANALYSIS.md
  - Command: `ls PHASE-4-*.md` (should list all 4 files)

- [ ] Project dependencies installed
  - Command: `bun install` (or `npm install`)

- [ ] Environment variables configured
  - [ ] .env.local exists with Supabase credentials
  - [ ] Stripe test keys configured
  - [ ] ImageKit API keys configured
  - Command: `echo $DATABASE_URL` (should return value, not empty)

- [ ] Database is up to date
  - Command: `bunx prisma db push` (should say "database is up to date")

- [ ] No uncommitted changes that would be lost
  - Command: `git status` (should be clean or show only new .md files)

---

## 🤖 MASTER PROMPT EXECUTION

### Step 1: Copy the Master Prompt

1. Open this file: `/PHASE-4-MASTER-PROMPT.md`
2. Find the section: `## PHASE 4 MASTER EXECUTION PROMPT`
3. Copy **EVERYTHING** between the backticks (lines starting with "You are an autonomous coding agent..." through "Ship it. 🚀")
4. Do NOT copy the "NOTES FOR USER" section below

### Step 2: Open VS Code Copilot Chat

1. Open VS Code
2. Press: **Ctrl+Shift+I** (opens Copilot Chat)
3. Or click the Copilot icon in the sidebar

### Step 3: Paste & Execute

1. Paste the entire master prompt into chat
2. Press: **Enter**
3. **Wait.** The agent will now execute autonomously through all 5 steps.

**Expected behavior:**
- Agent reads constraints (first 10 seconds)
- Agent creates PHASE-4-STATUS.md (Step 1) — ~1-2 minutes
- Agent opens PHASE-4-DETAILED-CHECKLIST.md and starts editing files (Steps 2-5) — ~10-30 minutes depending on your repo size
- Progress files appear: PROMPT-1-COMPLETE.md, PROMPT-2-COMPLETE.md, etc.
- Agent stops when finished or encounters error

---

## 📊 MONITORING DURING EXECUTION

### What You'll See:

**PROMPT 1 (Status Tracker)** — ~1-2 minutes
```
✅ PROMPT 1 COMPLETE
Created: PHASE-4-STATUS.md
Status tracker initialized. Ready for PROMPT 2.
```
Files created:
- `PHASE-4-STATUS.md` (new)
- `PROMPT-1-COMPLETE.md` (new)

**PROMPT 2 (Public Pages)** — ~5-10 minutes
```
✅ PROMPT 2 COMPLETE
Cleaned up all public pages (Sections 1-9).
Files modified: src/app/page.tsx, src/app/shop/page.tsx, ...
Ready for PROMPT 3.
```
Files modified:
- `src/app/page.tsx`
- `src/app/shop/page.tsx`
- `src/app/product/[slug]/page.tsx`
- `src/app/cart/page.tsx`
- `src/app/checkout/page.tsx`
- `src/app/register/page.tsx`
- `src/app/login/page.tsx`
- `src/app/account/page.tsx`
- Static pages

**PROMPT 3 (Admin Pages)** — ~3-5 minutes
```
✅ PROMPT 3 COMPLETE
Cleaned up admin pages (Sections 10-14).
Files modified: src/app/admin/dashboard/page.tsx, ...
Ready for PROMPT 4.
```
Files modified:
- Admin dashboard
- Admin product queue
- Admin orders
- Admin settings (if present)

**PROMPT 4 (Disable Features)** — ~2-3 minutes
```
✅ PROMPT 4 COMPLETE
Disabled non-critical features (email, analytics, Drive sync, newsletter/blog).
Code preserved for future phases.
Ready for PROMPT 5.
```
Files modified:
- API routes for email
- Admin analytics components
- Image sync endpoints
- Newsletter/blog navigation

**PROMPT 5 (Cleanup & Testing Guide)** — ~3-5 minutes
```
✅ PROMPT 5 COMPLETE
Global cleanup complete.
Human testing guide created: PHASE-4-HUMAN-TESTING.md

NEXT STEPS (for human):
1. Run: bun run dev (verify flows locally)
2. Run: bun run build (verify production build)
3. Manually test using PHASE-4-HUMAN-TESTING.md
4. Deploy to Vercel: git push origin main
5. Test production URL
```
Files created:
- `PHASE-4-HUMAN-TESTING.md` (new)
- `PROMPT-5-COMPLETE.md` (new)
- `PHASE-4-STATUS.md` (updated with completion marks)
- `PHASE-4-DETAILED-CHECKLIST.md` (updated with [x] marks)

### Check Progress Files:

While agent is running, check for these files:
```bash
ls -la PROMPT-*.md PHASE-4-STATUS.md PHASE-4-HUMAN-TESTING.md
```

If all 5 `PROMPT-X-COMPLETE.md` files exist → Agent finished successfully

---

## ⚠️ ERROR HANDLING

### If Agent Gets Stuck

**Signs:**
- No new messages from agent for >5 minutes
- Error messages appear in chat
- Agent says "I cannot find file X"

**What to do:**
1. Stop the agent (press Escape or close chat)
2. Check for error file: `PHASE-4-AGENT-ERROR.md`
3. Read the error report
4. Fix the issue manually (usually missing file or TypeScript error)
5. Re-run master prompt (it will resume from where it left off)

### Common Errors & Recovery

**Error: "Cannot find PHASE-4-DETAILED-CHECKLIST.md"**
- Solution: Copy all 4 reference documents to repo root
- Retry: Re-run master prompt

**Error: "TypeScript error in src/app/page.tsx"**
- Solution: Agent encountered a type error while editing
- Check: `git diff src/app/page.tsx` to see what changed
- Fix: Revert with `git checkout src/app/page.tsx`
- Retry: Re-run master prompt (agent will try different approach)

**Error: "Feature would require major architectural work"**
- Solution: Agent correctly identified scope creep
- Action: Skip that feature (it'll be marked TODO (Phase 5))
- This is EXPECTED and OK

**Error: "Agent ran for 30+ minutes"**
- Solution: Agent may have gotten into infinite loop (rare)
- Action: Stop agent, check progress files
- Check: `tail -100 PHASE-4-STATUS.md` to see what was done
- Retry: Re-run master prompt (it will continue from last checkpoint)

### Bailout Conditions (Agent Will Stop)

Agent will stop and report to `PHASE-4-AGENT-ERROR.md` if:
- ❌ Cannot find a referenced file
- ❌ A change would break TypeScript strict mode
- ❌ Something requires terminal execution it can't do
- ❌ Feature would require architecture redesign
- ❌ Same error occurs 3 times in a row

This is SAFE behavior. Agent refusing to do something risky is good.

---

## 🎬 AFTER AGENT FINISHES

### Step 1: Verify Completion

```bash
# Check all prompts completed
ls PROMPT-*.md
# Should show: PROMPT-1-COMPLETE.md through PROMPT-5-COMPLETE.md

# Check status tracker
cat PHASE-4-STATUS.md | head -30
# Should show checkmarks on major tasks

# Check human testing guide created
ls PHASE-4-HUMAN-TESTING.md
```

### Step 2: Review Changes

```bash
# See what agent changed
git diff --name-only
# This shows all modified/created files

# Browse the changes
git diff src/app/page.tsx | head -50
```

### Step 3: Run Local Tests

```bash
# Start dev server
bun run dev

# In another terminal, verify it starts
# Open http://localhost:3000
# Spot-check:
#  - Homepage loads
#  - Shop page loads
#  - Admin dashboard loads
#  - Console has no red errors
```

### Step 4: Build Test

```bash
# This catches any build-time issues
bun run build

# Should complete with "✓ Compiled successfully"
# If errors appear, fix them before deploying
```

### Step 5: Manual Testing (1-2 hours)

Follow `PHASE-4-HUMAN-TESTING.md`:
- [ ] Customer purchase flow
- [ ] Admin product approval flow
- [ ] Static pages
- [ ] Mobile responsiveness
- [ ] All links work
- [ ] No console errors

### Step 6: Deploy

```bash
# Commit all changes
git add .
git commit -m "Phase 4: Autonomous cleanup complete, ready for launch"

# Push to GitHub (Vercel auto-deploys)
git push origin main

# Wait ~2-5 minutes for Vercel build
# Check: https://vercel.com/dashboard
```

---

## 📋 QUICK REFERENCE: WHAT THE AGENT WILL DO

### Public Pages (Sections 1-9)
✅ Remove Beta/Coming Soon badges  
✅ Clean placeholder text  
✅ Fix broken links  
✅ Hide incomplete sections  
✅ Verify Add to Cart works  
✅ Ensure responsive mobile layout  

### Admin Pages (Sections 10-14)
✅ Verify admin-only access  
✅ Fix dashboard counts  
✅ Ensure approval queue works  
✅ Verify orders list displays  
✅ Hide incomplete admin features  

### Disable Features (Sections 15-22)
✅ Comment out email sends  
✅ Stub analytics endpoints  
✅ Hide Drive sync buttons  
✅ Remove newsletter/blog links  
✅ Add feature flags  

### Cleanup (Sections 23-26)
✅ Remove leftover TODOs/FIXME from UI  
✅ Verify all env vars used  
✅ No hard-coded secrets  
✅ Create testing guide  

---

## 🎯 SUCCESS CRITERIA

**Agent completed successfully if:**

- [x] All 5 `PROMPT-X-COMPLETE.md` files exist
- [x] `PHASE-4-STATUS.md` shows all major tasks checked
- [x] `PHASE-4-HUMAN-TESTING.md` created with clear test procedures
- [x] `bun run build` succeeds with "✓ Compiled successfully"
- [x] No `PHASE-4-AGENT-ERROR.md` file (or it's empty/resolved)
- [x] `git diff --name-only` shows expected files modified (public/admin pages, etc.)
- [x] Local tests pass: dev server starts, pages load, no console errors

---

## ⏱️ TOTAL TIMELINE

| Phase | Task | Expected Time |
|-------|------|---|
| **Pre-Flight** | Validation + Setup | 5 mins |
| **Agent Execution** | Prompt 1-5 (all automatic) | 20-40 mins |
| **Post-Execution** | Verification + Testing | 30-60 mins |
| **Manual Testing** | Human QA flow (from guide) | 1-2 hours |
| **Deployment** | Build + Push + Vercel deploy | 10-15 mins |
| **TOTAL** | Start to production | **2-4 hours** |

---

## 🚀 YOU'RE READY TO LAUNCH

**Next step:** Copy the master prompt and paste into VS Code Copilot Chat.

**It will take 20-40 minutes of pure automation.**

**Then you do ~2 hours of testing and deployment.**

**Result: Phase 4 complete, Kollect-It ready for beta users.**

---

## 📞 TROUBLESHOOTING QUICK LINKS

**Agent runs slow:**
- Expected. File operations + TypeScript checking takes time. Let it run.

**Agent asks for clarification:**
- Say: "Continue with the approach you've defined. Make safe choices."

**Agent stops at Step 2:**
- Check: Does `PHASE-4-DETAILED-CHECKLIST.md` exist in repo root?
- If not: Copy all 4 reference docs and retry

**Agent modifies a file incorrectly:**
- Undo: `git checkout -- [filename]`
- Re-run: Agent will try different approach next time

**Build fails after agent finishes:**
- Check: `git diff src/` to see what changed
- Look for: TypeScript errors, broken imports, missing dependencies
- Fix: Manually correct the error or revert file
- Re-run: Build again

**Still stuck?**
- Read: `PHASE-4-AGENT-ERROR.md` (detailed error report from agent)
- Check: Agent's chat messages (scroll up to see what it tried)
- Last resort: Run through checklist manually (use `PHASE-4-HOW-TO-USE.md` to go step-by-step)

---

**Status: ✅ READY TO LAUNCH**

Paste the master prompt and let it run. 🚀
