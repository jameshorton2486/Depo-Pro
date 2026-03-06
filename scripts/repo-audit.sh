#!/bin/bash
# repo-audit.sh — Depo-Pro session pre-flight check
# Run at the start of every Claude Code session.
# Reports repo health. Does NOT make any changes.

echo "════════════════════════════════════════════════"
echo " DEPO-PRO REPO AUDIT — $(date '+%Y-%m-%d %H:%M')"
echo "════════════════════════════════════════════════"

# ── GOVERNANCE FILES ──────────────────────────────────────────────
echo ""
echo "── Governance files ──"
for f in AI_AUTONOMOUS_RULES.md MASTER_CONTROL.md \
          AI_MASTER_ORCHESTRATOR.md BETA_FREEZE.md; do
  if [ -f "$f" ]; then
    echo "  ✅ $f"
  else
    echo "  ❌ MISSING: $f — STOP. Do not proceed."
  fi
done

# ── BETA FREEZE STATUS ────────────────────────────────────────────
echo ""
echo "── Beta freeze ──"
if [ -f BETA_FREEZE.md ]; then
  STATUS=$(grep "^# STATUS:" BETA_FREEZE.md | awk '{print $3}')
  echo "  STATUS: ${STATUS:-UNKNOWN}"
fi

# ── FROZEN FILES (confirm they exist and were not deleted) ────────
echo ""
echo "── Frozen files (must exist) ──"
for f in "lib/transcription" "types/transcript.ts" \
          "lib/export.ts" "lib/auth"; do
  if [ -e "$f" ]; then
    echo "  ✅ $f"
  else
    echo "  ❌ MISSING FROZEN FILE: $f"
  fi
done

# ── DEAD CODE (confirm it was deleted in Task 12) ─────────────────
echo ""
echo "── Dead code (should not exist) ──"
for f in "lib/supabase/queries/old-prisma-backup" \
          "lib/auth-compat.ts" \
          "lib/export/legal-docx-export.ts" \
          "lib/export/export-service.ts"; do
  if [ -e "$f" ]; then
    echo "  ⚠️  STILL EXISTS: $f"
  else
    echo "  ✅ Deleted: $f"
  fi
done

# ── GIT STATUS ────────────────────────────────────────────────────
echo ""
echo "── Git status ──"
DIRTY=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$DIRTY" = "0" ]; then
  echo "  ✅ Working tree clean"
else
  echo "  ⚠️  $DIRTY uncommitted change(s):"
  git status --short | head -10
fi
echo "  Branch: $(git branch --show-current)"
echo "  Last commit: $(git log --oneline -1)"

# ── TEST FILE COUNT ───────────────────────────────────────────────
echo ""
echo "── Test files ──"
COUNT=$(find tests -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
echo "  Test files found: $COUNT"

# ── TYPECHECK ─────────────────────────────────────────────────────
echo ""
echo "── TypeScript check ──"
npx tsc --noEmit 2>&1 | tail -3
TS_EXIT=${PIPESTATUS[0]}
if [ "$TS_EXIT" = "0" ]; then
  echo "  ✅ No TypeScript errors"
else
  echo "  ❌ TypeScript errors found — check before proceeding"
fi

# ── SUMMARY ───────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
echo " AUDIT COMPLETE"
echo " If all items show ✅ — proceed with task."
echo " If any item shows ❌ — STOP and resolve first."
echo "════════════════════════════════════════════════"
