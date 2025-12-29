# 🤖 PHASE-4-MASTER-PROMPT.md
**Complete Autonomous AI Agent Prompt for Phase 4: Polish & Launch**

---

## CRITICAL: READ THIS FIRST

This is a **single, comprehensive prompt** designed to be pasted into VS Code Copilot Chat (or similar AI agent) for autonomous execution through all 5 phases of Phase 4 cleanup.

**Key principles:**
- ✅ 100% file-based changes (no terminal execution)
- ✅ No manual clicking for code changes — the AI agent handles all file edits
- ✅ You'll still do one manual pass to run `bun run dev/build/test` and deploy
- ✅ Out of scope: Redis, email systems, monitoring, newsletters (can be added in a later phase)
- ✅ Focus: Getting Kollect-It live with clean, working features

**Expected output:** After running through all 5 phases, you'll have a complete, tested-ready codebase. Then you do the human manual testing and deploy.

---

## PHASE 4 MASTER EXECUTION PROMPT

**Copy everything below this line into your AI agent. The agent will execute Prompts 1-5 sequentially, creating progress files as it goes.**

---

```
You are an autonomous coding agent for Phase 4: Polish & Launch of Kollect-It, 
a luxury collectibles marketplace built with Next.js 15, TypeScript, Supabase, 
Stripe, and ImageKit.

Your mission: Polish existing pages, fix rough edges, disable incomplete features, 
and prepare the site for real users — WITHOUT adding new infrastructure or big features.

════════════════════════════════════════════════════════════════════════════════
GLOBAL CONSTRAINTS (Read carefully. Do not violate these.)
════════════════════════════════════════════════════════════════════════════════

1. FILE OPERATIONS ONLY
   ✅ Edit, create, delete, and move files as needed.
   ❌ Do NOT run any terminal commands (bun, npm, git, prisma, etc.).
   ❌ Do NOT execute shell scripts or call external processes.
   If a human must run a command, write it to a markdown file as instructions.

2. PRESERVE EXISTING WORK
   ✅ You may comment out incomplete/buggy features (keep the code).
   ✅ You may add feature flags (env var checks) that default to "off."
   ❌ Do not delete large chunks of logic unless obviously dead/unused boilerplate.

3. OUT OF SCOPE FOR PHASE 4 (Can be added in a later phase)
   ❌ Redis or new distributed caching systems
   ❌ Email provider integrations (Gmail API, SendGrid, etc.)
   ❌ Monitoring stacks, log aggregation, APM
   ❌ Newsletter systems
   ❌ Blog systems
   ❌ AI recommendations or advanced analytics beyond what exists
   ❌ New UI pages not already in the design

4. SOURCE OF TRUTH
   Use these documents as your primary guidance:
   - PHASE-4-DETAILED-CHECKLIST.md (242 specific tasks)
   - PHASE-4-HOW-TO-USE.md (strategy)
   - PHASE-4-POLISH-AND-LAUNCH.md (approach)
   If code conflicts with these docs, update code to match docs.

5. ERROR HANDLING (STOP if these occur)
   ❌ You cannot find a file you need → STOP, write error report to PHASE-4-AGENT-ERROR.md
   ❌ A change would break TypeScript → STOP, report to error file
   ❌ You encounter something requiring terminal execution → STOP, document it
   ❌ A feature would require major architectural work → Do NOT attempt. Add TODO comment.

════════════════════════════════════════════════════════════════════════════════
EXECUTION FLOW: 5 SEQUENTIAL PROMPTS (FULLY AUTONOMOUS)
════════════════════════════════════════════════════════════════════════════════

You will run through these 5 prompts in order. After completing each prompt, 
you will:
1. Update PHASE-4-STATUS.md with progress
2. Create a completion marker file (PROMPT-{N}-COMPLETE.md)
3. Proceed to the next prompt unless an error occurs

════════════════════════════════════════════════════════════════════════════════
STEP 1 OF 5: CREATE GLOBAL STATUS TRACKER
════════════════════════════════════════════════════════════════════════════════

Create a new file in the repo root: PHASE-4-STATUS.md

In this file:
1. Add a summary (4-6 bullets):
   - Polish public pages (sections 1-9)
   - Polish admin pages (sections 10-14)
   - Disable non-critical features (sections 15+)
   - No Redis, email integration, monitoring, newsletters (out of scope for Phase 4)
   - Get live on Vercel and ready for beta users
   - One manual testing pass by human required

2. Create a table of contents with sections:
   - Public pages (Sections 1-9)
   - Admin pages (Sections 10-14)
   - Disabled features (Sections 15+)
   - Human manual tasks

3. Add a high-level checklist:
   - [ ] Public pages polished (Sections 1-9)
   - [ ] Admin pages polished (Sections 10-14)
   - [ ] Non-critical features safely disabled (Sections 15+)
   - [ ] Human manual testing completed
   - [ ] Ready for production deployment

4. For each major bucket, add:
   - Title (e.g., "## Public pages (Sections 1-9)")
   - Short paragraph describing what "done" means
   - Bullet list of relevant files

5. At the end, add:
   ## Human tasks (manual only)
   - Run dev server: `bun run dev`
   - Run production build: `bun run build`
   - Manually test all flows (detailed in PHASE-4-HUMAN-TESTING.md)
   - Deploy to Vercel
   - Test production URL

6. Create file: PROMPT-1-COMPLETE.md with content:
   ✅ PROMPT 1 COMPLETE
   Created: PHASE-4-STATUS.md
   Status tracker initialized. Ready for PROMPT 2.

When PHASE-4-STATUS.md exists and looks clean, proceed to PROMPT 2.

════════════════════════════════════════════════════════════════════════════════
STEP 2 OF 5: CLEAN UP PUBLIC PAGES (Sections 1-9)
════════════════════════════════════════════════════════════════════════════════

Use PHASE-4-DETAILED-CHECKLIST.md Sections 1-9 as your exact task list.

Target files:
- src/app/page.tsx (Homepage)
- src/app/shop/page.tsx (Product catalog)
- src/app/category/[slug]/page.tsx (Categories)
- src/app/product/[slug]/page.tsx (Product detail)
- src/app/cart/page.tsx (Shopping cart)
- src/app/checkout/page.tsx (Checkout)
- src/app/register/page.tsx (Register)
- src/app/login/page.tsx (Login)
- src/app/account/page.tsx (User account)
- src/app/about/page.tsx (or wherever About is)
- src/app/contact/page.tsx (or wherever Contact is)
- src/app/faq/page.tsx (or wherever FAQ is)
- src/app/shipping-returns/page.tsx (or wherever Shipping is)

For each file:
1. Open the file and read it.
2. Follow the relevant task(s) from PHASE-4-DETAILED-CHECKLIST.md:
   - Remove "Coming Soon", "Beta", "Alpha", placeholder sections
   - Replace placeholder copy with professional, neutral text
   - Hide incomplete sections (empty "Related Products", unfinished reviews, etc.) by commenting them out
   - Ensure all links (href, Link to) point to pages that exist
   - Ensure buttons ("Add to Cart", "Checkout", etc.) call the correct logic
   - Keep changes small and surgical; do not attempt major refactors

3. Allowed changes:
   - Comment out components: {/* Hidden for Phase 4 */}{/* <ComponentName /> */}
   - Remove placeholder text like "Lorem ipsum", "Your headline here", "TBD"
   - Delete obviously dead code (unused imports, commented-out blocks)
   - Ensure TypeScript types are valid; do not introduce type errors

4. Not allowed:
   - Build entirely new features
   - Change authentication logic
   - Modify Stripe integration (keep test mode as-is)
   - Add new dependencies or external APIs

5. After editing each file:
   - Update PHASE-4-DETAILED-CHECKLIST.md:
     Mark the relevant section tasks as [x] or ✅ (so human can see progress).
   - Do NOT delete tasks; just mark them complete.

6. When Sections 1-9 are done:
   - Update PHASE-4-STATUS.md:
     Under "Public pages (Sections 1-9)", add a bullet list of changes made.
     Set: - [x] Public pages polished (Sections 1-9)
   - Create file: PROMPT-2-COMPLETE.md with content:
     ✅ PROMPT 2 COMPLETE
     Cleaned up all public pages (Sections 1-9).
     Files modified: [list key files]
     Ready for PROMPT 3.

When all public pages are polished, proceed to PROMPT 3.

════════════════════════════════════════════════════════════════════════════════
STEP 3 OF 5: CLEAN UP ADMIN PAGES (Sections 10-14)
════════════════════════════════════════════════════════════════════════════════

Use PHASE-4-DETAILED-CHECKLIST.md Sections 10-14 as your exact task list.

Target areas:
- src/app/admin/dashboard/page.tsx (Admin dashboard)
- src/app/admin/products/queue/page.tsx (Approval queue)
- src/app/admin/categories/page.tsx (Category management)
- src/app/admin/orders/page.tsx (Orders list)
- src/app/admin/orders/[id]/page.tsx (Order detail)
- src/app/admin/settings/page.tsx (Settings, if it exists)
- Related components in src/components/admin/

For each admin section:
1. Ensure admin-only access is enforced (check auth middleware).
2. Ensure lists (orders, products) render without errors.
3. Ensure detail views work without errors.
4. Ensure action buttons (approve, reject, update status) call the right routes/actions.
5. Comment out incomplete or flaky sections (charts, advanced analytics).
6. Hide navigation links to any disabled admin features.

Principles:
- Do not add new admin capabilities; only stabilize what exists.
- If a section is incomplete, hide it from the sidebar and add a TODO comment.
- Keep changes minimal.

After editing:
1. Update PHASE-4-DETAILED-CHECKLIST.md Sections 10-14 as [x]/✅.
2. Update PHASE-4-STATUS.md:
   Under "Admin pages (Sections 10-14)", summarize changes.
   When complete: - [x] Admin pages polished (Sections 10-14)
3. Create file: PROMPT-3-COMPLETE.md with content:
   ✅ PROMPT 3 COMPLETE
   Stabilized admin dashboard and workflows (Sections 10-14).
   Files modified: [list key files]
   Ready for PROMPT 4.

When admin pages are stable, proceed to PROMPT 4.

════════════════════════════════════════════════════════════════════════════════
STEP 4 OF 5: DISABLE NON-CRITICAL FEATURES (Sections 15+)
════════════════════════════════════════════════════════════════════════════════

Use PHASE-4-DETAILED-CHECKLIST.md Sections 15 onward as your guide.

Disable these features while keeping code for future phases:

1. EMAIL NOTIFICATIONS
   Search for: sendEmail, sendOrderConfirmation, sendProductApproved, send*
   For each occurrence:
   - Comment out the actual send.
   - Replace with: console.log('Email disabled in Phase 4: would send to', recipient);
   - Or wrap in feature flag:
     if (process.env.NEXT_PUBLIC_EMAILS_ENABLED === 'true') {
       await sendOrderConfirmation(...);
     } else {
       console.log('Email disabled in Phase 4...');
     }
   - Add NEXT_PUBLIC_EMAILS_ENABLED=false to .env.example

2. ADVANCED ANALYTICS
   Search for: analytics, Chart, dashboard components
   - Comment out analytics UI from admin dashboard:
     {/* Advanced analytics disabled for Phase 4 */}
     {/* <AdvancedCharts /> */}
   - For dedicated analytics routes (/admin/analytics, /api/admin/analytics):
     Return simple disabled message:
     export async function GET() {
       return NextResponse.json({
         status: 'disabled',
         message: 'Advanced analytics out of scope for Phase 4.'
       });
     }

3. IMAGE SYNC FROM GOOGLE DRIVE
   Find: /api/products/sync-from-google-drive, /api/sync-images
   - Replace implementation with stub:
     export async function GET() {
       return NextResponse.json({
         status: 'disabled',
         message: 'Image sync disabled for Phase 4. Use manual upload.'
       }, { status: 501 });
     }
   - Hide any admin UI buttons that trigger sync.

4. NEWSLETTER / BLOG / MARKETING EXTRAS
   - Remove/hide newsletter form links from nav/footer.
   - Remove/hide blog links from nav/footer.
   - If blog/newsletter routes exist but are incomplete, hide them OR leave them 
     but do not expose links to them.

After changes:
1. Update PHASE-4-DETAILED-CHECKLIST.md Sections 15+ as [x]/✅.
2. Update PHASE-4-STATUS.md:
   Add section: ## Disabled features summary
   - Email notifications → disabled (flagged with NEXT_PUBLIC_EMAILS_ENABLED)
   - Advanced analytics UI → commented out on admin dashboard
   - Image sync endpoints → stubbed out
   - Newsletter/blog links → hidden
   When complete: - [x] Non-critical features safely disabled (Sections 15+)
3. Create file: PROMPT-4-COMPLETE.md with content:
   ✅ PROMPT 4 COMPLETE
   Disabled non-critical features (email, analytics, Drive sync, newsletter/blog).
   Code preserved for future phases.
   Ready for PROMPT 5.

When non-critical features are disabled, proceed to PROMPT 5.

════════════════════════════════════════════════════════════════════════════════
STEP 5 OF 5: GLOBAL CLEANUP & CREATE HUMAN TESTING GUIDE
════════════════════════════════════════════════════════════════════════════════

1. GLOBAL CLEANUP
   Search repo for: TODO, FIXME, Coming Soon, Beta, Alpha, Lorem ipsum, placeholder, xxx
   For each:
   - If in UI/code that must work for Phase 4 → replace with final text or remove/hide feature.
   - If it's a legitimate Phase 5+ improvement → keep the TODO but make it explicit:
     // TODO (Phase 5): [description]
   Check navigation:
   - Ensure all visible nav and footer links go to existing, non-broken pages.
   - Hide or remove links to incomplete sections (disabled admin features, newsletter, blog).
   Sanity-check environment:
   - All Stripe keys, Supabase URLs, ImageKit configs pulled from env vars, not hard-coded.
   - If you see secrets in code, move to .env.example as placeholders, replace in code with env lookups.
   - Do NOT add actual secrets to any file.

2. CREATE HUMAN TESTING GUIDE
   Create file: PHASE-4-HUMAN-TESTING.md
   Include:
   
   ## Customer Purchase Flow
   - [ ] Register new user
   - [ ] Browse products in /shop
   - [ ] Click on a product
   - [ ] Add to cart
   - [ ] Go to cart page
   - [ ] Proceed to checkout
   - [ ] Fill in shipping info
   - [ ] Enter Stripe test card: 4242 4242 4242 4242, exp: 12/25, CVC: 123
   - [ ] Complete payment
   - [ ] See order confirmation page
   - [ ] Check account page — order appears in history
   - [ ] Check admin /admin/orders — order visible
   
   ## Seller/Admin Approval Flow
   - [ ] Create a test product (if applicable)
   - [ ] Go to /admin/products/queue
   - [ ] Verify product appears in pending
   - [ ] Click Approve
   - [ ] Verify product disappears from queue
   - [ ] Go to /shop, verify product appears
   
   ## Admin Dashboard
   - [ ] Navigate to /admin/dashboard
   - [ ] Verify product count is accurate
   - [ ] Verify order count is accurate
   - [ ] Verify recent orders/products are listed
   
   ## Static Pages
   - [ ] Visit /about — see reasonable copy
   - [ ] Visit /contact — see contact form or email
   - [ ] Visit /faq — see 5-10 FAQs
   - [ ] Visit /shipping-returns — see clear policy
   
   ## Mobile Check
   - [ ] Open DevTools, toggle device mode
   - [ ] Select iPhone 12 or similar
   - [ ] Run through a quick purchase flow
   - [ ] Verify text is readable, buttons are tappable
   
   ## Console & Build
   - [ ] Run: bun run dev
   - [ ] Navigate through all pages, check browser console (F12)
   - [ ] Confirm NO red errors on any page (warnings OK)
   - [ ] Run: bun run build
   - [ ] Build should complete with "✓ Compiled successfully"
   
   ## Deployment (manual by human)
   - [ ] Ensure all changes are committed: git status (should be clean)
   - [ ] Push to GitHub: git push origin main
   - [ ] Vercel auto-deploys; check dashboard
   - [ ] Test production URL
   - [ ] All flows work on live URL

3. UPDATE TRACKING DOCS
   Update PHASE-4-STATUS.md:
   - Set: - [x] Human manual testing checklist prepared
   - Leave: - [ ] Ready for production deployment (human marks this after they test)

4. FINAL STATUS
   Create file: PROMPT-5-COMPLETE.md with content:
   ✅ PROMPT 5 COMPLETE
   Global cleanup complete.
   Human testing guide created: PHASE-4-HUMAN-TESTING.md
   
   NEXT STEPS (for human):
   1. Run: bun run dev (verify flows locally)
   2. Run: bun run build (verify production build)
   3. Manually test using PHASE-4-HUMAN-TESTING.md
   4. Deploy to Vercel: git push origin main
   5. Test production URL
   6. Mark PHASE-4-STATUS.md as Ready for production deployment

════════════════════════════════════════════════════════════════════════════════
COMPLETION SUMMARY
════════════════════════════════════════════════════════════════════════════════

After all 5 prompts are complete, you will have:

✅ PHASE-4-STATUS.md — Central progress tracker
✅ PHASE-4-DETAILED-CHECKLIST.md — Updated with [x] marks
✅ PHASE-4-HUMAN-TESTING.md — Manual testing guide for the human
✅ PROMPT-1-COMPLETE.md through PROMPT-5-COMPLETE.md — Progress markers
✅ All public pages polished (clean, no placeholders, working flows)
✅ All admin pages stabilized (dashboard, approvals, orders functional)
✅ Non-critical features safely disabled (email, analytics, Drive sync, newsletter/blog)
✅ Global cleanup done (no TODOs in UI, all nav links valid)
✅ Ready for human manual testing and deployment

The human will then:
1. Run bun run dev and bun run build locally
2. Test all flows manually
3. Deploy to Vercel
4. Mark PHASE-4-STATUS.md as "Ready for production deployment"

════════════════════════════════════════════════════════════════════════════════
START HERE
════════════════════════════════════════════════════════════════════════════════

Begin with STEP 1 OF 5 above. Execute each step in order. 
After each step, you will have created completion marker files.
If you encounter an error at any point, STOP and write a detailed report to:
PHASE-4-AGENT-ERROR.md

Good luck. Ship it. 🚀
```

---

## NOTES FOR USER

**How to use this prompt:**

1. Copy the section between the backticks (everything from "You are an autonomous coding agent..." through "Ship it. 🚀")
2. Open VS Code Copilot Chat (Ctrl+Shift+I)
3. Paste the entire prompt
4. Hit Enter
5. **Let it run.** The agent will work autonomously through all 5 steps.

**What to expect:**

- The agent will create/modify files as it goes
- Progress files (`PROMPT-X-COMPLETE.md`) will appear after each step
- `PHASE-4-STATUS.md` will update with real-time progress
- If anything breaks or blocks the agent, it will stop and write to `PHASE-4-AGENT-ERROR.md`

**After the agent finishes:**

- You do the human manual testing (via `PHASE-4-HUMAN-TESTING.md`)
- You run `bun run dev` and `bun run build`
- You deploy to Vercel
- Done.

---

**This prompt is self-contained, self-documenting, and designed for autonomous execution. Paste and go.**
