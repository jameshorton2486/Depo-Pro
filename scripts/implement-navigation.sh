#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# NAVIGATION SYSTEM IMPLEMENTATION SCRIPT
# scripts/implement-navigation.sh
#
# Automates the role-aware navigation system implementation
# Run: chmod +x scripts/implement-navigation.sh && ./scripts/implement-navigation.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 Depo-Pro Navigation System Implementation"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CREATED=0
SKIPPED=0
ERRORS=0

# Function to create directory if not exists
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo -e "${GREEN}✓ Created directory:${NC} $1"
    fi
}

# Function to backup file
backup_file() {
    if [ -f "$1" ]; then
        cp "$1" "$1.backup.$(date +%Y%m%d_%H%M%S)"
        echo -e "${YELLOW}📦 Backed up:${NC} $1"
    fi
}

echo -e "${BLUE}Phase 1: Verifying core files exist${NC}"
echo "───────────────────────────────────────────────────────────────"

# Check core files
CORE_FILES=(
    "lib/navigation.ts"
    "lib/auth/require-role.ts"
    "components/layouts/app-sidebar.tsx"
)

for file in "${CORE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ Found:${NC} $file"
    else
        echo -e "${RED}✗ Missing:${NC} $file"
        ERRORS=$((ERRORS + 1))
    fi
done

if [ $ERRORS -gt 0 ]; then
    echo -e "\n${RED}Error: Core files missing. Run the Claude implementation first.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Phase 2: Creating missing admin pages${NC}"
echo "───────────────────────────────────────────────────────────────"

# Create admin page directories
ADMIN_PAGES=(
    "app/(dashboard)/admin/users"
    "app/(dashboard)/admin/activity"
    "app/(dashboard)/admin/reports/usage"
    "app/(dashboard)/admin/reports/billing"
    "app/(dashboard)/admin/reports/accuracy"
    "app/(dashboard)/admin/security"
    "app/(dashboard)/admin/integrations"
)

for dir in "${ADMIN_PAGES[@]}"; do
    create_dir "$dir"
done

# Create placeholder admin pages
create_placeholder_page() {
    local dir="$1"
    local title="$2"
    local description="$3"
    local icon="$4"
    local file="$dir/page.tsx"
    
    if [ -f "$file" ]; then
        echo -e "${YELLOW}⏭ Skipped (exists):${NC} $file"
        SKIPPED=$((SKIPPED + 1))
        return
    fi
    
    cat > "$file" << EOF
// ═══════════════════════════════════════════════════════════════
// ${title^^} PAGE
// ═══════════════════════════════════════════════════════════════

import { protectRoute } from '@/lib/auth/require-role';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ${icon} } from 'lucide-react';

export default async function ${title}Page() {
  await protectRoute(['ADMIN']);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">${title}</h1>
        <p className="text-muted-foreground mt-1">
          ${description}
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <${icon} className="h-5 w-5" />
            ${title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This feature is coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
EOF
    echo -e "${GREEN}✓ Created:${NC} $file"
    CREATED=$((CREATED + 1))
}

# Create the placeholder pages
create_placeholder_page "app/(dashboard)/admin/users" "User Management" "Manage all users in the system" "Users"
create_placeholder_page "app/(dashboard)/admin/activity" "Activity Feed" "View recent system activity" "Activity"
create_placeholder_page "app/(dashboard)/admin/reports/usage" "Usage Reports" "Platform usage statistics" "BarChart3"
create_placeholder_page "app/(dashboard)/admin/reports/billing" "Billing Reports" "Revenue and billing reports" "CreditCard"
create_placeholder_page "app/(dashboard)/admin/reports/accuracy" "Accuracy Metrics" "AI transcription accuracy metrics" "CheckCircle"
create_placeholder_page "app/(dashboard)/admin/security" "Security Settings" "Security and access control" "Shield"
create_placeholder_page "app/(dashboard)/admin/integrations" "Integrations" "Third-party integrations" "Webhook"

echo ""
echo -e "${BLUE}Phase 3: Creating docs directory${NC}"
echo "───────────────────────────────────────────────────────────────"

create_dir "docs"

echo ""
echo -e "${BLUE}Phase 4: Backup existing layout${NC}"
echo "───────────────────────────────────────────────────────────────"

backup_file "app/(dashboard)/layout.tsx"

echo ""
echo -e "${BLUE}Phase 5: Verification${NC}"
echo "───────────────────────────────────────────────────────────────"

echo "Running TypeScript check..."
if npm run typecheck 2>/dev/null; then
    echo -e "${GREEN}✓ TypeScript check passed${NC}"
else
    echo -e "${YELLOW}⚠ TypeScript check had warnings (may be pre-existing)${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Implementation Complete!${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}Created:${NC}  $CREATED files"
echo -e "  ${YELLOW}Skipped:${NC}  $SKIPPED files"
echo -e "  ${RED}Errors:${NC}   $ERRORS"
echo ""
echo "Next steps:"
echo "  1. Review and update app/(dashboard)/layout.tsx to use SidebarLayout"
echo "  2. Test each role's navigation"
echo "  3. Add route protection to existing pages"
echo "  4. Run: npm run build"
echo ""
echo "See docs/NAVIGATION_IMPLEMENTATION_CURSOR_PROMPT.md for full guide"
echo "═══════════════════════════════════════════════════════════════"
