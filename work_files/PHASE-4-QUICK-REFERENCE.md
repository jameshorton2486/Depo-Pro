# ⚡ PHASE 4: QUICK EXECUTION REFERENCE

**Use this while agent is running. Shows exactly what to expect at each step.**

---

## 🎬 THE 5-STEP FLOW (AT A GLANCE)

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Create Status Tracker (1-2 min)                     │
│ ✅ Creates: PHASE-4-STATUS.md                               │
│ ✅ Creates: PROMPT-1-COMPLETE.md                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Clean Public Pages (5-10 min)                       │
│ 📝 Modifies: src/app/page.tsx (homepage)                    │
│ 📝 Modifies: src/app/shop/page.tsx                          │
│ 📝 Modifies: src/app/product/[slug]/page.tsx               │
│ 📝 Modifies: src/app/cart/page.tsx                         │
│ 📝 Modifies: src/app/checkout/page.tsx                     │
│ 📝 Modifies: src/app/register/page.tsx                     │
│ 📝 Modifies: src/app/login/page.tsx                        │
│ 📝 Modifies: src/app/account/page.tsx                      │
│ 📝 Modifies: Static pages (about, contact, faq, etc)       │
│ ✅ Creates: PROMPT-2-COMPLETE.md                            │
│ 📊 Updates: PHASE-4-DETAILED-CHECKLIST.md with [x] marks   │
│ 📊 Updates: PHASE-4-STATUS.md                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Clean Admin Pages (3-5 min)                         │
│ 📝 Modifies: src/app/admin/dashboard/page.tsx             │
│ 📝 Modifies: src/app/admin/products/queue/page.tsx        │
│ 📝 Modifies: src/app/admin/categories/page.tsx            │
│ 📝 Modifies: src/app/admin/orders/page.tsx                │
│ 📝 Modifies: src/app/admin/settings/page.tsx (if exists)  │
│ ✅ Creates: PROMPT-3-COMPLETE.md                            │
│ 📊 Updates: PHASE-4-DETAILED-CHECKLIST.md with [x] marks   │
│ 📊 Updates: PHASE-4-STATUS.md                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Disable Non-Critical Features (2-3 min)            │
│ 📝 Modifies: Email send functions (comments out)           │
│ 📝 Modifies: Analytics endpoints (stubs)                   │
│ 📝 Modifies: Image sync endpoints (stubs)                  │
│ 📝 Modifies: Newsletter/blog nav (hides links)             │
│ ✅ Creates: PROMPT-4-COMPLETE.md                            │
│ 📊 Updates: PHASE-4-DETAILED-CHECKLIST.md with [x] marks   │
│ 📊 Updates: PHASE-4-STATUS.md                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Global Cleanup & Testing Guide (3-5 min)           │
│ 🔍 Searches: Repo for TODO/FIXME/placeholder/etc           │
│ 🔍 Fixes: Missing links, env var issues                    │
│ 📝 Creates: PHASE-4-HUMAN-TESTING.md                        │
│ ✅ Creates: PROMPT-5-COMPLETE.md                            │
│ 📊 Updates: PHASE-4-DETAILED-CHECKLIST.md (all [x])        │
│ 📊 Updates: PHASE-4-STATUS.md (final)                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    AGENT COMPLETE ✅
```

---

## 📂 FILES CREATED BY AGENT

**New files (5):**
```
✅ PHASE-4-STATUS.md               (Central tracker)
✅ PHASE-4-HUMAN-TESTING.md        (Testing guide)
✅ PROMPT-1-COMPLETE.md            (Step 1 checkpoint)
✅ PROMPT-2-COMPLETE.md            (Step 2 checkpoint)
✅ PROMPT-3-COMPLETE.md            (Step 3 checkpoint)
✅ PROMPT-4-COMPLETE.md            (Step 4 checkpoint)
✅ PROMPT-5-COMPLETE.md            (Step 5 checkpoint)
```

**Files modified (12-15):**
```
📝 src/app/page.tsx                        (Homepage)
📝 src/app/shop/page.tsx                   (Shop)
📝 src/app/category/[slug]/page.tsx        (Categories)
📝 src/app/product/[slug]/page.tsx         (Product detail)
📝 src/app/cart/page.tsx                   (Cart)
📝 src/app/checkout/page.tsx               (Checkout)
📝 src/app/register/page.tsx               (Register)
📝 src/app/login/page.tsx                  (Login)
📝 src/app/account/page.tsx                (Account)
📝 src/app/about/page.tsx                  (About)
📝 src/app/contact/page.tsx                (Contact)
📝 src/app/faq/page.tsx                    (FAQ)
📝 src/app/admin/dashboard/page.tsx        (Admin)
📝 src/app/admin/products/queue/page.tsx   (Approval queue)
📝 src/app/admin/orders/page.tsx           (Orders)
📝 API routes (email, analytics, sync)     (Various)
```

**Reference docs updated:**
```
📊 PHASE-4-DETAILED-CHECKLIST.md   (All tasks marked [x])
📊 PHASE-4-STATUS.md               (All sections marked [x])
```

---

## ⏱️ TIMING BY STEP

| Step | Task | Time | Sign of Progress |
|------|------|------|---|
| 1 | Create status tracker | 1-2 min | `PROMPT-1-COMPLETE.md` appears |
| 2 | Public pages cleanup | 5-10 min | Multiple files in git diff |
| 3 | Admin pages cleanup | 3-5 min | Admin files modified |
| 4 | Disable features | 2-3 min | Email/analytics stubs created |
| 5 | Global cleanup | 3-5 min | `PHASE-4-HUMAN-TESTING.md` created |
| **TOTAL** | **All steps** | **15-30 min** | **All PROMPT-X-COMPLETE files exist** |

---

## 🎯 WHAT EACH STEP DOES (IN DETAIL)

### STEP 1: STATUS TRACKER (1-2 min)

**Agent creates the central brain:**
- Creates `PHASE-4-STATUS.md` (central progress file)
- Documents Phase 4 goal (polish pages, disable features, get live)
- Lists all relevant file paths
- Creates high-level checklist: [ ] Public pages, [ ] Admin pages, [ ] Disabled features, etc.
- Creates `PROMPT-1-COMPLETE.md` (checkpoint marker)

**Check:** Does `PHASE-4-STATUS.md` exist and have content?

---

### STEP 2: PUBLIC PAGES (5-10 min)

**Agent cleans up customer-facing pages:**

For each of these files:
- `src/app/page.tsx` (Homepage)
- `src/app/shop/page.tsx` (Shop)
- `src/app/category/[slug]/page.tsx` (Categories)
- `src/app/product/[slug]/page.tsx` (Product detail)
- `src/app/cart/page.tsx` (Cart)
- `src/app/checkout/page.tsx` (Checkout)
- `src/app/register/page.tsx` (Register)
- `src/app/login/page.tsx` (Login)
- `src/app/account/page.tsx` (Account)
- Static pages (about, contact, faq, shipping-returns)

**Agent removes:**
- ❌ "Coming Soon" badges
- ❌ "Beta" labels
- ❌ Lorem ipsum placeholder text
- ❌ Incomplete sections (comments them out with `{/* Hidden for Phase 4 */}`)
- ❌ Broken image placeholders

**Agent verifies:**
- ✅ All links point to real pages
- ✅ Add to Cart buttons call correct functions
- ✅ Responsive layout (mobile-friendly)
- ✅ No console errors

**Agent marks:**
- ✅ Updates `PHASE-4-DETAILED-CHECKLIST.md` with [x] for each task
- ✅ Creates `PROMPT-2-COMPLETE.md` (checkpoint marker)

**Check:** Do public page files show diffs? Is `PROMPT-2-COMPLETE.md` created?

---

### STEP 3: ADMIN PAGES (3-5 min)

**Agent stabilizes admin workflows:**

For each admin area:
- `src/app/admin/dashboard/page.tsx` (Dashboard)
- `src/app/admin/products/queue/page.tsx` (Approval queue)
- `src/app/admin/categories/page.tsx` (Category management)
- `src/app/admin/orders/page.tsx` (Orders list)
- `src/app/admin/settings/page.tsx` (Settings - if exists)

**Agent verifies:**
- ✅ Admin-only access enforced
- ✅ Lists render without errors
- ✅ Buttons (Approve, Reject, Change Status) work
- ✅ Incomplete features are commented out

**Agent marks:**
- ✅ Updates `PHASE-4-DETAILED-CHECKLIST.md` with [x]
- ✅ Creates `PROMPT-3-COMPLETE.md` (checkpoint marker)

**Check:** Do admin files show diffs? Is `PROMPT-3-COMPLETE.md` created?

---

### STEP 4: DISABLE FEATURES (2-3 min)

**Agent safely disables incomplete/non-critical features:**

**Email notifications:**
- Searches for: `sendEmail`, `sendOrderConfirmation`, `sendProductApproved`
- Replaces send calls with:
  ```typescript
  if (process.env.NEXT_PUBLIC_EMAILS_ENABLED === 'true') {
    await sendOrderConfirmation(orderId);
  } else {
    console.log('Email disabled in Phase 4');
  }
  ```
- Adds `NEXT_PUBLIC_EMAILS_ENABLED=false` to `.env.example`

**Analytics endpoints:**
- Finds: `/api/admin/analytics`, analytics components
- Comments out from UI
- Stubs API routes to return: `{ status: 'disabled', message: 'Out of scope for Phase 4' }`

**Image sync from Google Drive:**
- Finds: `/api/products/sync-from-google-drive`
- Stubs to return: `{ status: 'disabled', message: 'Use manual upload' }`
- Hides sync buttons from admin UI

**Newsletter/Blog:**
- Removes links from nav/footer
- Leaves routes in code but hides navigation

**Agent marks:**
- ✅ Updates `PHASE-4-DETAILED-CHECKLIST.md` with [x]
- ✅ Creates `PROMPT-4-COMPLETE.md` (checkpoint marker)

**Check:** Are feature flag stubs in place? Is `PROMPT-4-COMPLETE.md` created?

---

### STEP 5: GLOBAL CLEANUP & TESTING GUIDE (3-5 min)

**Agent does final polish:**

**Searches entire repo for:**
- `TODO` (in UI code - should be `// TODO (Phase 5)` if legitimate)
- `FIXME` (should be fixed or removed)
- `Coming Soon` (should be removed)
- `Beta`, `Alpha` (should be removed)
- `Lorem ipsum`, `placeholder`, `xxx` (should be removed)

**Fixes:**
- ✅ All visible nav links point to real pages
- ✅ All footer links work
- ✅ Stripe keys pulled from env vars (not hard-coded)
- ✅ Supabase URL from env vars
- ✅ ImageKit config from env vars

**Creates testing guide:**
- ✅ `PHASE-4-HUMAN-TESTING.md` with step-by-step manual test procedures
- Includes:
  - Customer purchase flow checklist
  - Admin approval workflow checklist
  - Static pages verification
  - Mobile responsiveness check
  - Console error check
  - Build commands to run

**Agent marks:**
- ✅ Updates `PHASE-4-DETAILED-CHECKLIST.md` ALL ITEMS [x]
- ✅ Updates `PHASE-4-STATUS.md` - all sections marked [x]
- ✅ Creates `PROMPT-5-COMPLETE.md` (final checkpoint marker)

**Check:** Does `PHASE-4-HUMAN-TESTING.md` exist? Are all PROMPT files created?

---

## 🔍 HOW TO MONITOR PROGRESS

**While agent is running, check for these files:**

```bash
# In new terminal, run:
watch -n 5 "ls -la PROMPT-*.md PHASE-4-*.md 2>/dev/null | tail -10"
```

This refreshes every 5 seconds and shows new files as agent creates them.

**Expected progression:**
```
First 2 min:  PROMPT-1-COMPLETE.md appears
Next 5 min:   PROMPT-2-COMPLETE.md appears
Next 3 min:   PROMPT-3-COMPLETE.md appears
Next 2 min:   PROMPT-4-COMPLETE.md appears
Next 5 min:   PROMPT-5-COMPLETE.md appears + PHASE-4-HUMAN-TESTING.md
```

---

## ✅ VALIDATION CHECKLIST (AFTER AGENT FINISHES)

**Confirm agent completed successfully:**

```bash
# 1. Check all 5 prompts completed
ls PROMPT-1-COMPLETE.md PROMPT-2-COMPLETE.md PROMPT-3-COMPLETE.md PROMPT-4-COMPLETE.md PROMPT-5-COMPLETE.md
# Should list all 5 files with no "No such file" errors

# 2. Check testing guide created
ls PHASE-4-HUMAN-TESTING.md
# Should exist

# 3. Check status tracker exists
cat PHASE-4-STATUS.md | head -20
# Should show project status with many [x] marks

# 4. Check build still works
bun run build
# Should complete with "✓ Compiled successfully"

# 5. Spot-check a modified file
git diff src/app/page.tsx | head -30
# Should show changes (removed Coming Soon, cleaned placeholders, etc.)
```

**If all above pass:** ✅ Agent did its job correctly

---

## ⚠️ THINGS TO WATCH FOR

**Agent running slow?**
- Normal. File operations are I/O intensive. Let it run.

**Agent seems stuck on one step for >10 min?**
- Check if VS Code is frozen/unresponsive
- Check if chat is still updating (scroll to bottom)
- If truly frozen: Stop agent, check progress files, retry

**Agent creates PHASE-4-AGENT-ERROR.md?**
- This means agent hit a blocker
- Read the error file to understand what went wrong
- Usually it's a missing file or TypeScript issue
- Fix it manually and re-run agent

**Agent doesn't create all 5 PROMPT-X-COMPLETE files?**
- It hit an error at some point
- Check: Last file created tells you which step failed
- Example: Only PROMPT-1, 2, 3 exist? Agent failed at step 4
- See error file and fix the issue

**Some files not modified?**
- Expected. If a page doesn't exist or is already clean, agent skips it
- Example: If `/about` is already perfect, agent doesn't modify it

---

## 🚀 WHAT HAPPENS AFTER AGENT FINISHES

1. **You run manual tests** (using `PHASE-4-HUMAN-TESTING.md`)
   - Takes ~1-2 hours
   - Just follow the checklist

2. **You do local verification**
   ```bash
   bun run dev       # Starts dev server
   bun run build     # Builds for production
   git status        # Shows all changed files
   ```

3. **You deploy**
   ```bash
   git add .
   git commit -m "Phase 4: Autonomous cleanup complete"
   git push origin main
   # Vercel auto-deploys
   ```

4. **Done!** Kollect-It is now ready for beta users

---

## 📞 QUICK TROUBLESHOOTING

| Problem | Check | Fix |
|---------|-------|-----|
| Agent stuck for 10+ min | Is chat still responsive? | Refresh or restart |
| Only 3 PROMPT files exist | Which file is missing? | See error file, retry |
| Build fails after agent | `git diff src/` | Revert broken file |
| Page looks wrong after | Refresh browser | Clear cache (Ctrl+Shift+Del) |
| Console has errors | DevTools → Console | Fix TypeScript issues |

---

## ✨ THAT'S IT

**Paste the master prompt and let it run for 20-40 minutes.**

**Then spend 1-2 hours testing.**

**Then deploy.**

**You're done with Phase 4.** 🎉

---

**Status:** Ready to execute  
**Next:** Paste `PHASE-4-MASTER-PROMPT.md` (the code block) into VS Code Copilot Chat  
**Expected duration:** 2-4 hours total (mostly automated)  
**Result:** Kollect-It ready for launch
