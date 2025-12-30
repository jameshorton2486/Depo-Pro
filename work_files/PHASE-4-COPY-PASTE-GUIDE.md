# 📋 HOW TO COPY & PASTE THE MASTER PROMPT

**This is the most important step. Follow exactly.**

---

## ✅ WHAT YOU'RE ABOUT TO DO

You will:
1. Open the master prompt file
2. Copy a specific section (between the backticks)
3. Open VS Code Copilot Chat
4. Paste it
5. Hit Enter
6. Let the AI agent run autonomously for 20-40 minutes

**That's it. No clicking through UI. No terminal commands. Just paste and wait.**

---

## 🎯 STEP 1: FIND THE MASTER PROMPT FILE

**Location:** Your Kollect-It repo root

**File name:** `PHASE-4-MASTER-PROMPT.md`

**Open it with:** Any text editor or VS Code

**Verify it contains:** "You are an autonomous coding agent for Phase 4"

---

## 🔍 STEP 2: FIND THE SECTION TO COPY

**Inside `PHASE-4-MASTER-PROMPT.md`, find this section:**

```
## PHASE 4 MASTER EXECUTION PROMPT

**Copy everything below this line into your AI agent. The agent will execute Prompts 1-5 sequentially, creating progress files as it goes.**

---

```
```
You are an autonomous coding agent for Phase 4: Polish & Launch of Kollect-It,
```
```

**This is where you start copying.**

---

## ✂️ STEP 3: COPY THE PROMPT TEXT

**What to copy:**
- Start: `You are an autonomous coding agent...` (first line after the backticks)
- End: `Ship it. 🚀` (last line before the backticks close)
- **Include everything in between**

**What NOT to copy:**
- ❌ The backticks (```) themselves
- ❌ The section above: "## PHASE 4 MASTER EXECUTION PROMPT"
- ❌ The section below: "## NOTES FOR USER"

**Visual guide:**

```markdown
## PHASE 4 MASTER EXECUTION PROMPT          ← DO NOT COPY THIS

**Copy everything below this line...**      ← DO NOT COPY THIS

---                                         ← DO NOT COPY THIS

```
```                                         ← DO NOT COPY THIS
You are an autonomous coding agent...       ← START COPYING HERE
[... all the prompt content ...]
Ship it. 🚀                                 ← END COPYING HERE
```
```                                         ← DO NOT COPY THIS

---                                         ← DO NOT COPY THIS

## NOTES FOR USER                           ← DO NOT COPY THIS
```

**How to copy:**
1. Click at the start of `You are an autonomous...`
2. Hold Shift and click at the end of `Ship it. 🚀`
3. Press Ctrl+C to copy
4. Or: Triple-click a line to select paragraph, repeat until you have it all

**How to verify you copied it correctly:**
1. Open a blank text editor (Notepad, VS Code, etc)
2. Paste (Ctrl+V)
3. Check:
   - First line: `You are an autonomous coding agent...`
   - Last line: `Ship it. 🚀`
   - Middle should have sections like `STEP 1 OF 5`, `STEP 2 OF 5`, etc.

---

## 🤖 STEP 4: OPEN VS CODE COPILOT CHAT

**Option A: Keyboard Shortcut (Fastest)**
1. Open your Kollect-It project in VS Code
2. Press: **Ctrl+Shift+I** (on Windows) or **Cmd+Shift+I** (on Mac)
3. Chat panel opens on the right side

**Option B: Click the Icon**
1. Look for the Copilot icon in the left sidebar (looks like a sparkle/star)
2. Click it
3. Chat panel opens

**Option C: Menu**
1. Click: View → Copilot → Open Copilot Chat
2. Chat panel opens

**Verify it's open:**
- You should see a text input box at the bottom that says "Ask Copilot anything..."
- You should see a chat history above it (probably empty)

---

## 📌 STEP 5: PASTE THE PROMPT

1. Click in the chat input box (at the bottom where it says "Ask Copilot anything...")
2. Paste your copied text: **Ctrl+V** (on Windows) or **Cmd+V** (on Mac)
3. The entire prompt should now be in the input box
4. Scroll down in the input box to verify the whole thing is there (last line should be `Ship it. 🚀`)

**Expected state:**
- Input box is full of text (all the prompt content)
- You can scroll up/down in the input box to see different parts
- Last visible line: `Ship it. 🚀`

---

## 🚀 STEP 6: SEND THE PROMPT

1. Press: **Enter** (or click the Send button if visible)
2. Copilot Chat processes the prompt and starts responding
3. Agent begins autonomously executing Step 1 of 5

**What happens next:**
- Chat area shows agent's progress
- Agent creates/modifies files in your repo
- Progress files appear: `PROMPT-1-COMPLETE.md`, then `PROMPT-2-COMPLETE.md`, etc.
- Agent runs for 15-40 minutes (depending on your repo size)
- **DO NOT close VS Code or refresh the chat**
- **DO NOT paste another prompt**
- Just let it run

---

## ⏱️ WHAT TO DO WHILE AGENT IS RUNNING

**Option 1: Watch the Progress (Active Monitoring)**
1. Keep VS Code Copilot Chat visible
2. Scroll down in the chat to see latest messages
3. Watch for "PROMPT-X-COMPLETE" messages as they appear
4. This takes 20-40 minutes

**Option 2: Let It Run (Passive Monitoring)**
1. Open a separate terminal
2. Run: `watch -n 5 "ls -la PROMPT-*.md 2>/dev/null"`
3. This shows you when new files appear
4. Check occasionally without watching the whole time

**Option 3: Go Get Coffee**
1. Let agent run in background
2. Check back in 30-40 minutes
3. Verify all 5 PROMPT-X-COMPLETE.md files exist

**DO NOT:**
- ❌ Close VS Code
- ❌ Close Copilot Chat
- ❌ Paste another prompt
- ❌ Switch chat windows
- ❌ Stop the agent (unless it's clearly stuck for 10+ minutes)

---

## 🛑 IF SOMETHING GOES WRONG DURING EXECUTION

### Agent Says "I Cannot Find File X"

**Stop immediately. This is a blocker.**

1. Stop the agent (close Copilot Chat)
2. Verify the file exists in your repo:
   ```bash
   ls -la PHASE-4-DETAILED-CHECKLIST.md
   ```
3. If it doesn't exist: Copy all 4 reference docs to repo root
4. Try again: Restart VS Code, re-open Copilot Chat, paste prompt again

### Agent Gets Stuck (No New Messages for 10+ Minutes)

**Signs it's stuck:**
- Last message is from 10+ minutes ago
- Agent is repeating the same task
- Copilot Chat seems unresponsive

**What to do:**
1. Close Copilot Chat
2. Check: Are new `PROMPT-X-COMPLETE.md` files being created?
   ```bash
   ls PROMPT-*.md
   ```
3. If yes: Agent is working, just slow. Re-open chat and wait more.
4. If no: Agent is stuck.
   - Check: `PHASE-4-AGENT-ERROR.md` (error report)
   - Read the error
   - Fix the issue
   - Restart agent by pasting prompt again

### Agent Creates Error File

**If `PHASE-4-AGENT-ERROR.md` appears:**

1. Open it and read the error description
2. Common errors:
   - "Cannot find PHASE-4-DETAILED-CHECKLIST.md" → Copy reference docs to repo
   - "TypeScript error in src/app/page.tsx" → Check what changed, revert if needed
   - "Feature would require major architectural work" → This is OK, skip it

3. Fix the issue manually:
   ```bash
   git diff src/app/page.tsx
   # Review what changed
   git checkout src/app/page.tsx
   # If broken, revert it
   ```

4. Restart agent: Paste prompt again

---

## ✅ AGENT FINISHED (HOW TO KNOW)

**Signs agent completed successfully:**

1. **Chat shows final message:**
   ```
   ✅ PROMPT 5 COMPLETE
   Global cleanup complete.
   Human testing guide created: PHASE-4-HUMAN-TESTING.md
   
   NEXT STEPS (for human):
   1. Run: bun run dev ...
   ```

2. **All completion files exist:**
   ```bash
   ls PROMPT-1-COMPLETE.md PROMPT-2-COMPLETE.md PROMPT-3-COMPLETE.md PROMPT-4-COMPLETE.md PROMPT-5-COMPLETE.md
   # Should list all 5
   ```

3. **Human testing guide created:**
   ```bash
   ls PHASE-4-HUMAN-TESTING.md
   # Should exist
   ```

**If any of the above are missing:** Agent didn't complete. Check error file and fix issue.

---

## 🎬 NEXT STEPS AFTER AGENT FINISHES

1. **Verify everything looks good:**
   ```bash
   git diff --name-only
   # Shows all files agent modified
   ```

2. **Build verification:**
   ```bash
   bun run build
   # Should succeed with "✓ Compiled successfully"
   ```

3. **Manual testing (1-2 hours):**
   - Follow: `PHASE-4-HUMAN-TESTING.md`
   - Test: Customer purchase flow
   - Test: Admin approval workflow
   - Test: All pages load, no errors

4. **Deploy:**
   ```bash
   git add .
   git commit -m "Phase 4: Autonomous cleanup complete"
   git push origin main
   ```

5. **Watch Vercel deploy** (takes 2-5 minutes)

---

## 📋 CHECKLIST BEFORE YOU START

Before you paste the prompt, verify:

- [ ] You have `PHASE-4-MASTER-PROMPT.md` in repo root
- [ ] You have all 4 reference docs in repo root:
  - [ ] `PHASE-4-DETAILED-CHECKLIST.md`
  - [ ] `PHASE-4-HOW-TO-USE.md`
  - [ ] `PHASE-4-CAPACITY-ANALYSIS.md`
- [ ] VS Code is open with your Kollect-It project
- [ ] You've verified Copilot Chat works (opened it at least once)
- [ ] Your repo has no uncommitted changes or you've committed them:
  - Run: `git status` (should show clean or expected changes)
- [ ] You have 30-60 minutes available (don't need to watch the whole time)
- [ ] You understand: Don't close VS Code while agent runs

**All checked?** You're ready.

---

## 🚀 THE MOMENT OF TRUTH

**Ready to execute?**

1. **Copy** the master prompt (Steps 1-3 above)
2. **Open** Copilot Chat (Step 4)
3. **Paste** (Step 5)
4. **Press Enter** (Step 6)
5. **Wait** for agent to complete (20-40 minutes)
6. **Verify** 5 PROMPT-X-COMPLETE files exist
7. **Follow** PHASE-4-HUMAN-TESTING.md for manual testing
8. **Deploy** to Vercel

---

## 💡 PRO TIPS

**Tip 1: Save the prompt to a text file first**
```bash
# Before pasting into chat, save it:
cp PHASE-4-MASTER-PROMPT.md ~/Desktop/phase4-backup.md
# If you need to re-run, you have a copy
```

**Tip 2: Open two VS Code windows**
- Window 1: Copilot Chat running the agent
- Window 2: File explorer to see files being modified in real-time

**Tip 3: Git commit before running**
```bash
# In case something goes wrong, you can revert
git add .
git commit -m "Pre-Phase-4-automation checkpoint"
```

**Tip 4: Monitor file changes in real-time**
```bash
# In terminal, run:
watch -n 2 "git diff --name-only"
# This shows modified files as agent changes them
```

---

## ❓ FINAL QUESTIONS BEFORE YOU START

**Q: Will this delete any of my code?**
A: No. Agent only comments out incomplete features. All code is preserved.

**Q: Can I stop the agent if I need to?**
A: Yes. Close Copilot Chat at any time. Files created so far will be saved. You can restart.

**Q: What if the build breaks?**
A: Agent is designed to avoid breaking TypeScript. If it happens, check error file, revert broken files, and re-run.

**Q: How long will this take?**
A: 20-40 minutes for full automation. Then 1-2 hours manual testing. Then 10 minutes to deploy.

**Q: What if I have custom code I don't want modified?**
A: Agent reads PHASE-4-DETAILED-CHECKLIST.md for exact files to modify. If a file isn't listed, agent won't touch it.

**Q: Can I run this multiple times?**
A: Yes. If you run it again, agent will re-check everything and skip tasks already done.

---

## 🎯 YOU'RE READY

**Copy the master prompt. Paste into Copilot Chat. Press Enter. Done.**

**The agent does the rest.** 🚀
