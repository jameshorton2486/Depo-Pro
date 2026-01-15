#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Checking for legacy Supabase anon key usage..."

# Search for legacy patterns (excluding docs/archive/diagnostics)
if rg -n "NEXT_PUBLIC_SUPABASE_ANON_KEY|anon key|anonymous key|eyJhbGci" \
  --glob '!*.md' \
  --glob '!*archive*' \
  --glob '!*diagnostics*' \
  --glob '!*_archive*' \
  --glob '!node_modules/**' \
  --glob '!.next/**' \
  .; then
  echo ""
  echo "❌ ERROR: Legacy Supabase anon/JWT key usage detected."
  echo "❌ Remove all references and use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY instead."
  echo ""
  echo "📋 Files to check:"
  echo "   - lib/supabase/*.ts"
  echo "   - app/**/*.ts"
  echo "   - middleware.ts"
  echo "   - scripts/**/*.{ts,js,ps1}"
  exit 1
fi

echo "✅ No legacy Supabase keys found in active code."
