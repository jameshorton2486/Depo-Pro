#!/bin/bash
# cleanup-depo-pro.sh
# Depo-Pro Repository Cleanup Script
# Run from project root: ./scripts/cleanup-depo-pro.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Counters
deleted_count=0
archived_count=0
errors=()

# Parse arguments
DRY_RUN=false
INCLUDE_CALENDAR=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true ;;
        --include-calendar) INCLUDE_CALENDAR=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  DEPO-PRO REPOSITORY CLEANUP${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}⚠️  DRY RUN MODE - No changes will be made${NC}"
    echo ""
fi

# ═══════════════════════════════════════════════════════════════
# PHASE 1: Remove Duplicate Files
# ═══════════════════════════════════════════════════════════════

echo -e "${MAGENTA}📁 PHASE 1: Removing Duplicate Files${NC}"
echo -e "${GRAY}─────────────────────────────────────────────────────────────${NC}"

duplicate_files=(
    "setup.ps1|Duplicate of scripts/setup.ps1"
    "setup.sh|Duplicate of scripts/setup.sh"
)

for item in "${duplicate_files[@]}"; do
    IFS='|' read -r file reason <<< "$item"
    if [ -f "$file" ]; then
        if [ "$DRY_RUN" = false ]; then
            if rm -f "$file" 2>/dev/null; then
                echo -e "  ${GREEN}✓ Deleted: $file${NC}"
                echo -e "    ${GRAY}└─ $reason${NC}"
                ((deleted_count++))
            else
                echo -e "  ${RED}✗ Failed to delete: $file${NC}"
                errors+=("Failed to delete $file")
            fi
        else
            echo -e "  ${YELLOW}[DRY] Would delete: $file${NC}"
        fi
    else
        echo -e "  ${GRAY}○ Not found: $file${NC}"
    fi
done

# ═══════════════════════════════════════════════════════════════
# PHASE 2: Remove Dead Code Files
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${MAGENTA}📁 PHASE 2: Removing Dead Code Files${NC}"
echo -e "${GRAY}─────────────────────────────────────────────────────────────${NC}"

dead_files=(
    "app/(dashboard)/jobs/[id]/review/review-client.tsx|Replaced by review-client-new.tsx"
    "test-env-browser.js|One-time debug script"
    "test-supabase-connection.js|One-time debug script"
    "verify-supabase.js|One-time debug script"
)

for item in "${dead_files[@]}"; do
    IFS='|' read -r file reason <<< "$item"
    if [ -f "$file" ]; then
        if [ "$DRY_RUN" = false ]; then
            if rm -f "$file" 2>/dev/null; then
                echo -e "  ${GREEN}✓ Deleted: $file${NC}"
                echo -e "    ${GRAY}└─ $reason${NC}"
                ((deleted_count++))
            else
                echo -e "  ${RED}✗ Failed to delete: $file${NC}"
                errors+=("Failed to delete $file")
            fi
        else
            echo -e "  ${YELLOW}[DRY] Would delete: $file${NC}"
        fi
    else
        echo -e "  ${GRAY}○ Not found: $file${NC}"
    fi
done

# ═══════════════════════════════════════════════════════════════
# PHASE 3: Archive Documentation
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${MAGENTA}📁 PHASE 3: Archiving Documentation${NC}"
echo -e "${GRAY}─────────────────────────────────────────────────────────────${NC}"

archive_path="docs/archive"

if [ ! -d "$archive_path" ]; then
    if [ "$DRY_RUN" = false ]; then
        mkdir -p "$archive_path"
        echo -e "  ${GREEN}✓ Created: $archive_path/${NC}"
    else
        echo -e "  ${YELLOW}[DRY] Would create: $archive_path/${NC}"
    fi
fi

archive_files=(
    "BUILD_MODE.md|BUILD_MODE.md|Cursor AI reference"
    "BUILD_MODE_GUIDE.md|BUILD_MODE_GUIDE.md|Cursor AI reference"
    "UI_CONTRACTS.md|UI_CONTRACTS.md|API contract reference"
    "RLS_POLICIES.md|RLS_POLICIES.md|SQL policies (in migrations)"
    ".cursor/tasks/depo-pro-calendar.md|cursor-calendar-task-OUTDATED.md|Outdated Prisma references"
)

for item in "${archive_files[@]}"; do
    IFS='|' read -r src dest reason <<< "$item"
    if [ -f "$src" ]; then
        if [ "$DRY_RUN" = false ]; then
            if mv "$src" "$archive_path/$dest" 2>/dev/null; then
                echo -e "  ${YELLOW}✓ Archived: $src → $archive_path/$dest${NC}"
                echo -e "    ${GRAY}└─ $reason${NC}"
                ((archived_count++))
            else
                echo -e "  ${RED}✗ Failed to archive: $src${NC}"
                errors+=("Failed to archive $src")
            fi
        else
            echo -e "  ${YELLOW}[DRY] Would archive: $src → $archive_path/$dest${NC}"
        fi
    else
        echo -e "  ${GRAY}○ Not found: $src${NC}"
    fi
done

# ═══════════════════════════════════════════════════════════════
# PHASE 4: Calendar Component Consolidation (Optional)
# ═══════════════════════════════════════════════════════════════

if [ "$INCLUDE_CALENDAR" = true ]; then
    echo ""
    echo -e "${MAGENTA}📁 PHASE 4: Calendar Component Consolidation${NC}"
    echo -e "${GRAY}─────────────────────────────────────────────────────────────${NC}"
    echo -e "  ${YELLOW}⚠️  This phase requires manual review - listing only${NC}"
    
    echo -e "  ${GRAY}○ Review: components/calendar/CalendarEventCard.tsx (263 lines) vs calendar-event-card.tsx (57 lines)${NC}"
    echo -e "  ${GRAY}○ Review: components/calendar/CalendarShell.tsx vs calendar-shell.tsx${NC}"
    echo -e "  ${GRAY}○ Review: components/calendar/CalendarTimeline.tsx vs calendar-timeline.tsx${NC}"
    echo -e "  ${GRAY}○ Review: components/calendar/CalendarView.tsx vs calendar-view.tsx${NC}"
    
    echo ""
    echo -e "  ${CYAN}📝 Manual steps required:${NC}"
    echo -e "     ${GRAY}1. Compare functionality in PascalCase vs kebab-case versions${NC}"
    echo -e "     ${GRAY}2. Merge unique features into kebab-case versions${NC}"
    echo -e "     ${GRAY}3. Update CalendarShell.tsx imports to use kebab-case${NC}"
    echo -e "     ${GRAY}4. Delete PascalCase duplicates after testing${NC}"
fi

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  CLEANUP SUMMARY${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "  ${YELLOW}⚠️  DRY RUN - No changes were made${NC}"
else
    echo -e "  📊 Results:"
    echo -e "     ${GREEN}Files deleted:  $deleted_count${NC}"
    echo -e "     ${YELLOW}Files archived: $archived_count${NC}"
fi

if [ ${#errors[@]} -gt 0 ]; then
    echo ""
    echo -e "  ${RED}❌ Errors encountered:${NC}"
    for error in "${errors[@]}"; do
        echo -e "     ${RED}- $error${NC}"
    done
fi

echo ""
echo -e "  ${CYAN}📋 Next steps:${NC}"
echo -e "     ${GRAY}1. Run: npm run build${NC}"
echo -e "     ${GRAY}2. Run: npm run test${NC}"
echo -e "     ${GRAY}3. Review: docs/archive/ for archived documentation${NC}"

if [ "$INCLUDE_CALENDAR" = false ]; then
    echo -e "     ${GRAY}4. Optional: Run with --include-calendar for phase 2${NC}"
fi

echo ""
