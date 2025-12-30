# ⚡ PHASE 4: SINGLE-PAGE CHEAT SHEET
**Print this. Keep it next to you while executing Phase 4.**

---

## 🎯 THE 3-STEP PLAN

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: AUTONOMOUS AUTOMATION (20-40 min)                  │
│ • Copy prompt from PHASE-4-MASTER-PROMPT.md                │
│ • Paste into VS Code Copilot Chat (Ctrl+Shift+I)           │
│ • Agent runs, you wait                                      │
│ • Result: 5 PROMPT-X-COMPLETE.md files appear              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: MANUAL TESTING (1-2 hours)                         │
│ • Run: bun run dev                                          │
│ • Follow: PHASE-4-HUMAN-TESTING.md (created by agent)     │
│ • Test: Purchase flow, admin workflow, static pages        │
│ • Verify: No console errors                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: DEPLOY (10-15 min)                                 │
│ • Run: git add . && git commit -m "Phase 4 complete"       │
│ • Run: git push origin main                                │
│ • Wait: Vercel deploys (~2-5 min)                         │
│ • Test: Production URL works                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 HOW TO COPY THE PROMPT (3 MIN)

1. Open: `PHASE-4-MASTER-PROMPT.md` in your repo
2. Find: Section "## PHASE 4 MASTER EXECUTION PROMPT"
3. Start copying at: `You are an autonomous coding agent...`
4. Stop copying at: `Ship it. 🚀`
5. DON'T copy: The backticks (```) or section headers
6. Verify: Last line of copied text is `Ship it. 🚀`

---

## 💬 HOW TO PASTE INTO COPILOT CHAT (1 MIN)

1. Press: **Ctrl+Shift+I** (open Copilot Chat)
2. Click: In the input box at the bottom
3. Paste: **Ctrl+V**
4. Verify: Entire prompt is pasted (scroll through it)
5. Press: **Enter**

**Result: Agent starts autonomously. You wait 20-40 minutes.**

---

## ⏱️ WHAT HAPPENS DURING AUTOMATION (WATCH FOR THESE)

| Time | What Appears | What It Means |
|------|--------------|--------------|
| 0-2 min | `PROMPT-1-COMPLETE.md` | Status tracker created ✅ |
| 2-7 min | `PROMPT-2-COMPLETE.md` | Public pages cleaned ✅ |
| 7-12 min | `PROMPT-3-COMPLETE.md` | Admin pages cleaned ✅ |
| 12-15 min | `PROMPT-4-COMPLETE.md` | Features disabled ✅ |
| 15-30 min | `PROMPT-5-COMPLETE.md` | Testing guide created ✅ |

**Check:** `ls PROMPT-*.md` to see progress

---

## 🧪 MANUAL TESTING CHECKLIST (1-2 HOURS)

Use this while testing:

### Customer Flow (20 min)
- [ ] Register new user
- [ ] Browse products at /shop
- [ ] Add product to cart
- [ ] Proceed to checkout
- [ ] Enter card: 4242 4242 4242 4242 | 12/25 | 123
- [ ] Complete purchase
- [ ] See confirmation page
- [ ] Order appears in account

### Admin Flow (10 min)
- [ ] Go to /admin/products/queue
- [ ] Approve a pending product
- [ ] Verify it appears in /shop

### Pages (5 min)
- [ ] /about - has reasonable copy
- [ ] /contact - has contact info
- [ ] /faq - has FAQs
- [ ] /shipping-returns - has policy

### Technical (5 min)
- [ ] Open DevTools (F12)
- [ ] Console should have no red errors
- [ ] Check mobile responsiveness (Ctrl+Shift+M)
- [ ] Run: `bun run build` (should succeed)

---

## ⚠️ IF SOMETHING GOES WRONG

| Problem | Check | Fix |
|---------|-------|-----|
| Agent won't start | Is Copilot Chat open? | Refresh VS Code |
| Agent gets stuck (10+ min no messages) | Does `PROMPT-4-COMPLETE.md` exist? | Check `PHASE-4-AGENT-ERROR.md` |
| Build fails | `git diff src/app/page.tsx` | See what changed, revert if broken |
| Page looks wrong | Refresh browser (Ctrl+R) | Clear cache (Ctrl+Shift+Del) |
| Console has errors | F12 → Console tab | See what error, google if unclear |

**For detailed help:** See `PHASE-4-LAUNCH-CHECKLIST.md` (Error Handling section)

---

## 📂 FILE REFERENCE

### Copy Prompt FROM:
```
Your Repo Root/
  PHASE-4-MASTER-PROMPT.md
```

### Paste INTO:
```
VS Code → Copilot Chat (Ctrl+Shift+I)
```

### Agent Creates:
```
PHASE-4-STATUS.md                   (progress tracker)
PHASE-4-HUMAN-TESTING.md            (testing guide)
PROMPT-1-COMPLETE.md through PROMPT-5-COMPLETE.md  (checkpoints)
```

### During Testing, Use:
```
PHASE-4-HUMAN-TESTING.md            (step-by-step guide)
PHASE-4-EXECUTION-CHECKLIST.md      (checkbox tracker)
```

---

## 🎬 THE EXACT STEPS (QUICK REFERENCE)

### NOW (2 MIN)
```bash
# Verify everything is ready
git status
# Should show clean or expected changes

# Check reference docs exist
ls PHASE-4-*.md
# Should list 4 files
```

### STEP 1: COPY (3 MIN)
```
Open: PHASE-4-MASTER-PROMPT.md
Find: "## PHASE 4 MASTER EXECUTION PROMPT"
Copy: From "You are..." to "Ship it. 🚀"
Skip: The backticks themselves
```

### STEP 2: PASTE (1 MIN)
```
Press: Ctrl+Shift+I (open Copilot Chat)
Paste: Ctrl+V
Press: Enter
```

### STEP 3: WAIT (20-40 MIN)
```
Do NOT close VS Code
Do NOT close Copilot Chat
Do NOT paste another prompt
Just wait and watch for PROMPT files appearing
```

### STEP 4: VERIFY (1 MIN)
```bash
# Check agent finished
ls PROMPT-*.md
# Should list all 5

# Check testing guide created
ls PHASE-4-HUMAN-TESTING.md
```

### STEP 5: TEST (1-2 HOURS)
```bash
# Start dev server
bun run dev

# Follow PHASE-4-HUMAN-TESTING.md checklist
# Test all flows manually
```

### STEP 6: DEPLOY (10 MIN)
```bash
# Commit changes
git add .
git commit -m "Phase 4: Autonomous cleanup complete"

# Push to GitHub
git push origin main

# Wait for Vercel (~2-5 min)
# Test production URL
```

**DONE!** Kollect-It is live. 🚀

---

## 📊 TIMELINE

```
Pre-Execution:    5 min  (verify everything)
Copy Prompt:      3 min  (copy from file)
Paste & Start:    1 min  (paste to chat)
Wait for Agent:   20-40 min  (automated, you wait)
Manual Testing:   1-2 hours  (you test)
Deploy:           10 min  (git push)
────────────────────────────
TOTAL:            2-3 hours
```

---

## ✅ SUCCESS CRITERIA

**After Agent Finishes:**
- [ ] All 5 `PROMPT-X-COMPLETE.md` files exist
- [ ] `PHASE-4-HUMAN-TESTING.md` created
- [ ] `bun run build` succeeds
- [ ] `git diff --name-only` shows expected files modified

**After Manual Testing:**
- [ ] Customer purchase flow works end-to-end
- [ ] Admin workflow works
- [ ] Static pages load
- [ ] Mobile responsive
- [ ] No console errors

**After Deployment:**
- [ ] Production URL accessible
- [ ] All flows work on production
- [ ] Vercel shows "Deployed"

---

## 🎯 KEY REMINDERS

1. **DON'T** close VS Code while agent runs
2. **DON'T** close Copilot Chat while agent runs
3. **DON'T** paste another prompt while agent is working
4. **DO** let agent run for full 20-40 min (it's working)
5. **DO** test manually before deploying
6. **DO** check console for errors (F12)

---

## 🚀 YOU GOT THIS

**Ready?**
1. Copy the prompt
2. Paste into Copilot Chat
3. Let it run
4. Test
5. Deploy

**Questions?**
- Troubleshooting: See `PHASE-4-LAUNCH-CHECKLIST.md`
- Details: See `PHASE-4-QUICK-REFERENCE.md`
- Planning: See `PHASE-4-ROADMAP.md`

**Let's ship Phase 4!** 🎉

---

**Print this. Keep it visible. Follow the steps. Success.** ✨
