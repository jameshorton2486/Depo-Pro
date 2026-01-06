#!/usr/bin/env pwsh
# Automated Prisma to Supabase Migration Script
# This script performs find-and-replace operations to convert Prisma code to Supabase

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Prisma to Supabase Migration Script" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Backup confirmation
Write-Host "⚠️  This script will modify multiple files!" -ForegroundColor Yellow
Write-Host "   Make sure you have committed your changes to git first." -ForegroundColor Yellow
Write-Host ""
Write-Host "Continue? (Y/N): " -NoNewline -ForegroundColor Yellow
$response = Read-Host

if ($response -notmatch '^[Yy]') {
    Write-Host "Migration cancelled." -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "Starting migration..." -ForegroundColor Green
Write-Host ""

# Step 1: Find all TypeScript files (excluding certain directories)
Write-Host "Step 1: Finding TypeScript files..." -ForegroundColor Cyan
$files = Get-ChildItem -Path . -Recurse -Include *.ts,*.tsx -Exclude node_modules,*.d.ts |
    Where-Object {
        $_.FullName -notmatch '\\node_modules\\' -and
        $_.FullName -notmatch '\\archive\\' -and
        $_.FullName -notmatch '\\scripts\\' -and
        $_.FullName -notmatch '\\prisma\\' -and
        $_.FullName -notmatch '\\tests\\' -and
        $_.FullName -notmatch '\\__tests__\\'
    }

Write-Host "  Found $($files.Count) files to process" -ForegroundColor Green
Write-Host ""

# Step 2: Process each file
$modifiedCount = 0
$errorCount = 0

foreach ($file in $files) {
    $relativePath = $file.FullName.Replace((Get-Location).Path + '\', '')
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue

    if (-not $content) {
        continue
    }

    $originalContent = $content
    $fileModified = $false

    # Replace Prisma imports
    if ($content -match "@prisma/client") {
        Write-Host "  Processing: $relativePath" -ForegroundColor Gray

        # Replace UserRole import
        $content = $content -replace "import \{ UserRole \} from '@prisma/client';", "import type { UserRole } from '@/types/database';"
        $content = $content -replace "import \{ UserRole \} from `"@prisma/client`";", "import type { UserRole } from '@/types/database';"

        # Replace JobStatus import
        $content = $content -replace "import \{ JobStatus \} from '@prisma/client';", "import type { JobStatus } from '@/types/database';"
        $content = $content -replace "import \{ JobStatus \} from `"@prisma/client`";", "import type { JobStatus } from '@/types/database';"

        # Replace multiple enum imports
        $content = $content -replace "import \{ UserRole, JobStatus", "import type { UserRole, JobStatus"
        $content = $content -replace "} from '@prisma/client';", "} from '@/types/database';"
        $content = $content -replace "} from `"@prisma/client`";", "} from '@/types/database';"

        # Remove PrismaClient import if present
        $content = $content -replace "import \{ PrismaClient.*} from '@prisma/client';", ""
        $content = $content -replace "import \{ PrismaClient.*} from `"@prisma/client`";", ""

        $fileModified = $true
    }

    # Replace lib/db imports
    if ($content -match "from '@/lib/db'") {
        Write-Host "  Processing: $relativePath (replacing db imports)" -ForegroundColor Gray

        # Replace db/prisma imports
        $content = $content -replace "import \{ db \} from '@/lib/db';", "import { createSupabaseServerClient } from '@/lib/supabase/server';"
        $content = $content -replace "import \{ db as prisma \} from '@/lib/db';", "import { createSupabaseServerClient } from '@/lib/supabase/server';"
        $content = $content -replace "import \{ prisma \} from '@/lib/db';", "import { createSupabaseServerClient } from '@/lib/supabase/server';"

        $fileModified = $true
    }

    # Save if modified
    if ($fileModified -and $content -ne $originalContent) {
        try {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $modifiedCount++
            Write-Host "    ✅ Updated" -ForegroundColor Green
        } catch {
            Write-Host "    ❌ Error: $_" -ForegroundColor Red
            $errorCount++
        }
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Migration Complete!" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Results:" -ForegroundColor White
Write-Host "   Files processed: $($files.Count)" -ForegroundColor White
Write-Host "   Files modified:  $modifiedCount" -ForegroundColor Green
Write-Host "   Errors:          $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($modifiedCount -gt 0) {
    Write-Host "⚠️  IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Review the changes:" -ForegroundColor White
    Write-Host "   git diff" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Manual fixes still required:" -ForegroundColor White
    Write-Host "   - Replace 'db.table.findUnique()' with Supabase queries" -ForegroundColor Gray
    Write-Host "   - Replace 'prisma.table.update()' with Supabase queries" -ForegroundColor Gray
    Write-Host "   - Use snake_case for database columns (firm_id, created_at)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Run typecheck to find remaining issues:" -ForegroundColor White
    Write-Host "   npm run typecheck" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. After all fixes, delete Prisma:" -ForegroundColor White
    Write-Host "   Remove-Item -Recurse -Force prisma" -ForegroundColor Gray
    Write-Host "   npm uninstall prisma @prisma/client" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📖 See PRISMA_MIGRATION_PLAN.md for detailed patterns" -ForegroundColor Cyan
}

Write-Host ""
