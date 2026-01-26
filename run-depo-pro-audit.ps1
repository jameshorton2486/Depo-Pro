# =============================================================================
# DEPO-PRO PRODUCTION-READINESS AUDIT - POWERSHELL SCRIPT
# =============================================================================
# 
# This script will:
#   1. Copy itself from Downloads to the depo-pro directory
#   2. Navigate to the depo-pro directory
#   3. Run the production audit via Codex CLI
#
# USAGE:
#   Open PowerShell and run:
#   C:\Users\james\Downloads\run-depo-pro-audit.ps1
#
# =============================================================================

# Configuration
$DownloadsPath = "C:\Users\james\Downloads"
$ProjectPath = "C:\Users\james\depo-pro"
$ScriptName = "run-depo-pro-audit.ps1"

# -----------------------------------------------------------------------------
# Step 1: Copy script and related files to project directory
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  DEPO-PRO PRODUCTION AUDIT" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Copying files to project directory..." -ForegroundColor Yellow

# Create project directory if it doesn't exist
if (-not (Test-Path $ProjectPath)) {
    Write-Host "  ERROR: Project directory not found: $ProjectPath" -ForegroundColor Red
    Write-Host "  Please ensure your depo-pro project is at this location." -ForegroundColor Red
    exit 1
}

# Copy this script to the project directory
$SourceScript = Join-Path $DownloadsPath $ScriptName
$DestScript = Join-Path $ProjectPath $ScriptName

if (Test-Path $SourceScript) {
    Copy-Item -Path $SourceScript -Destination $DestScript -Force
    Write-Host "  Copied: $ScriptName" -ForegroundColor Green
} else {
    Write-Host "  Script already running from project directory or not found in Downloads" -ForegroundColor DarkGray
}

# Copy any other audit-related files from Downloads (optional)
$AuditFiles = @(
    "DEPO-PRO-AUDIT-INSTRUCTIONS.md",
    "DEPO-PRO-PRODUCTION-AUDIT-PROMPT.md",
    "DEPO-PRO-ACTUAL-STATE-PLAN.md",
    "DEPO-PRO-CURSOR-MEGA-PROMPTS.md"
)

foreach ($file in $AuditFiles) {
    $SourceFile = Join-Path $DownloadsPath $file
    if (Test-Path $SourceFile) {
        $DestFile = Join-Path $ProjectPath "docs\audit\$file"
        
        # Create docs/audit directory if it doesn't exist
        $AuditDocsDir = Join-Path $ProjectPath "docs\audit"
        if (-not (Test-Path $AuditDocsDir)) {
            New-Item -ItemType Directory -Path $AuditDocsDir -Force | Out-Null
        }
        
        Copy-Item -Path $SourceFile -Destination $DestFile -Force
        Write-Host "  Copied: $file -> docs\audit\" -ForegroundColor Green
    }
}

# -----------------------------------------------------------------------------
# Step 2: Navigate to project directory
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/4] Navigating to project directory..." -ForegroundColor Yellow
Set-Location -Path $ProjectPath
Write-Host "  Current directory: $(Get-Location)" -ForegroundColor Green

# -----------------------------------------------------------------------------
# Step 3: Verify Codex CLI is available
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/4] Verifying Codex CLI..." -ForegroundColor Yellow

$CodexAvailable = Get-Command codex -ErrorAction SilentlyContinue
if (-not $CodexAvailable) {
    Write-Host "  WARNING: Codex CLI not found in PATH" -ForegroundColor Red
    Write-Host "  Install with: npm install -g @openai/codex" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Alternatively, copy the prompt below and paste into Cursor with @Codebase" -ForegroundColor Yellow
    Write-Host ""
}
else {
    Write-Host "  Codex CLI found: $($CodexAvailable.Source)" -ForegroundColor Green
}

# -----------------------------------------------------------------------------
# Step 4: Run the production audit
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "[4/4] Starting production audit..." -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  AUDIT IN PROGRESS - This may take several minutes" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Run Codex with the audit prompt
codex @"
You are a senior production-readiness auditor specializing in legal SaaS applications.

PROJECT: Depo-Pro - AI-powered legal transcription platform for court reporters, scopists, and law firms.

STACK: Next.js 15 (App Router), Supabase (PostgreSQL + Auth + Storage), Deepgram Nova-3, Stripe, Resend, BullMQ/Redis, TypeScript, Tailwind CSS, shadcn/ui.

CRITICAL RULE: READ-ONLY ANALYSIS ONLY. DO NOT modify, delete, or refactor any code. DO NOT create new files. DO NOT run destructive commands.

TASK: Perform a full production-readiness audit of the entire Depo-Pro repository.

=============================================================================
AUDIT REQUIREMENTS
=============================================================================

1. BUGS & BROKEN LOGIC
-----------------------
Scan for:
- Runtime errors and exceptions
- Invalid or circular imports
- Incorrect async/await usage (missing await, unhandled promises)
- Unhandled null/undefined assumptions
- Type assertion mismatches (as casts that could fail)
- Race conditions in concurrent operations
- Incorrect error handling (swallowed errors)

Depo-Pro Specific:
- Deepgram response parsing errors
- Audio file handling edge cases
- Transcript word array manipulation bugs
- Confidence score calculation errors
- Speaker diarization mapping issues

2. INCOMPLETE OR PLACEHOLDER CODE
---------------------------------
Scan for:
- TODO comments
- FIXME comments
- HACK comments
- console.log statements (debug code)
- Commented-out code blocks
- Stubbed functions returning mock data
- Partially implemented features
- Empty catch blocks
- Functions that throw 'Not implemented'

Depo-Pro Specific:
- Mock transcription responses
- Placeholder export formatting
- Incomplete calendar sync logic
- Stubbed billing/subscription flows
- Unfinished exhibit management features

3. ENVIRONMENT & SECRETS AUDIT
------------------------------
List ALL environment variables referenced in the codebase.

Required variables to verify:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY
- DEEPGRAM_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- RESEND_API_KEY
- REDIS_URL / UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
- LOW_CONFIDENCE_THRESHOLD

Flag:
- Missing required variables
- Variables in client code that should be server-only
- Secrets incorrectly prefixed with NEXT_PUBLIC_
- Hardcoded secrets or API keys
- Development URLs in production config
- Default/placeholder values

4. SECURITY & AUTH RISKS
------------------------
Authentication:
- Routes missing authentication checks
- Session validation gaps
- Token expiration handling
- Password reset flow vulnerabilities

Authorization:
- Missing role-based access control (RBAC) checks
- Privilege escalation vulnerabilities
- Cross-tenant data access (firm isolation breach)
- User accessing other users' data

API Security:
- Missing rate limiting on sensitive endpoints
- SQL injection risks
- XSS vulnerabilities
- CSRF protection gaps
- Missing input validation
- Excessive data exposure in responses

Depo-Pro Specific:
- Verify RLS policies on ALL tables (users, jobs, transcripts, files, firms)
- Check scopist can ONLY access assigned jobs
- Verify firm-level isolation is enforced
- Check audio file access is properly restricted
- Verify transcript download/export authorization
- Check all app/api/ routes have proper auth guards

5. DATA INTEGRITY RISKS
-----------------------
Database:
- Schema vs code mismatches (field names, types)
- Missing foreign key constraints
- Unsafe DELETE operations
- Missing transaction wrapping
- N+1 query patterns
- Missing indexes on frequently queried fields

Validation:
- Missing Zod schemas on API inputs
- Type coercion issues
- Date/timezone handling inconsistencies
- File upload validation gaps

Depo-Pro Specific:
- Transcript word array integrity (index references)
- Confidence score bounds (0-1 range)
- Job status state machine validity
- File storage path consistency
- Audit log completeness

6. DEAD / REDUNDANT CODE
------------------------
Scan for:
- Unused files (components, utilities, types)
- Unused exports
- Unreachable code paths
- Duplicate logic across files
- Legacy code from previous implementations
- Deprecated API usage

Depo-Pro Specific:
- NextAuth references (should be fully removed - migrated to Supabase)
- Prisma references (should use Supabase queries)
- Files in docs/_archive/ and scripts/archive/ that are still referenced
- Unused components in components/
- Duplicate Supabase client initializations

7. PRODUCTION & DEPLOYMENT RISKS
--------------------------------
Build Issues:
- TypeScript errors
- ESLint errors/warnings
- Missing dependencies
- Incorrect package versions
- Build-time vs runtime env var issues

Runtime Issues:
- Edge vs Node runtime incompatibilities
- Server-only code in client components
- Client-only code in server components
- Missing 'use client' directives
- Hydration mismatches
- Memory leaks

Depo-Pro Specific:
- Verify Vercel deployment compatibility
- Check for Node.js APIs used in Edge runtime
- Verify Supabase client initialized per-request
- Check middleware doesn't exceed Edge runtime limits

8. PERFORMANCE & SCALABILITY RISKS
----------------------------------
Scan for:
- Large bundle sizes
- Missing code splitting
- Unoptimized images
- Missing caching headers
- Expensive operations in render loops
- Missing pagination on list endpoints
- Unbounded queries without LIMIT

Depo-Pro Specific:
- Large transcript loading without virtualization
- Audio file streaming vs full download
- Word array operations on long transcripts (10k+ words)
- Dashboard stats queries without caching

9. ERROR HANDLING & OBSERVABILITY
---------------------------------
Scan for:
- Missing error boundaries
- Unhandled promise rejections
- Missing try/catch blocks
- Generic error messages
- Missing logging for critical operations
- No error tracking integration

Depo-Pro Specific:
- Deepgram API error handling
- File upload failure handling
- Transcription job failure recovery
- Export generation error handling

10. LEGAL & COMPLIANCE RISKS
----------------------------
Scan for:
- Audit logging gaps
- Data retention policy gaps
- PII exposure in logs
- Missing data encryption
- GDPR/privacy compliance gaps

Depo-Pro Specific:
- Transcript data is legally sensitive
- Audit trail for all transcript edits
- Secure file storage and access
- User consent tracking

=============================================================================
CRITICAL FILES TO AUDIT
=============================================================================

Authentication & Authorization:
- middleware.ts
- lib/auth/*
- lib/supabase/server.ts
- lib/supabase/client.ts
- app/api/auth/*

Core Business Logic:
- lib/transcription.ts
- lib/deepgram/*
- lib/export.ts
- lib/jobs/*
- app/api/jobs/*
- app/api/transcripts/*

Data Layer:
- lib/supabase/queries/*
- supabase/migrations/*
- types/database.ts

UI Components (Data Handling):
- components/transcripts/low-confidence-panel.tsx
- components/transcripts/audio-player.tsx
- components/jobs/*

Configuration:
- next.config.ts
- .env.example
- lib/env.ts
- lib/env/schema.ts

=============================================================================
OUTPUT FORMAT
=============================================================================

Structure your report as follows:

EXECUTIVE SUMMARY
-----------------
- Total issues found by severity
- Top 5 most critical issues
- Overall production-readiness score (1-10)
- Recommendation: Ready for beta / Needs work / Not ready

CRITICAL ISSUES (P0 - Must fix immediately)
-------------------------------------------
Issues causing: data loss, security breaches, complete failure, legal violations

HIGH SEVERITY (P1 - Must fix before beta)
-----------------------------------------
Issues causing: significant failures, poor UX, performance issues, partial security risks

MEDIUM SEVERITY (P2 - Fix before public launch)
-----------------------------------------------
Issues causing: minor functionality issues, maintainability problems, tech debt

LOW SEVERITY (P3 - Nice to fix)
-------------------------------
Issues: code style, minor optimizations, documentation gaps

For each issue provide:
- File path and line numbers
- Clear description of the problem
- Why it matters (impact)
- Recommended fix (DO NOT implement)
- Priority level

=============================================================================
IMPORTANT REMINDERS
=============================================================================

1. DO NOT modify any code - read-only audit
2. Be conservative - report actual issues, not style preferences
3. Be specific - include file paths and line numbers
4. Be actionable - each issue needs a clear fix recommendation
5. Prioritize correctly - security and data integrity are CRITICAL
6. Consider legal context - this handles sensitive legal transcripts
7. Check for regressions - look for incomplete migrations

BEGIN AUDIT NOW.
"@

# -----------------------------------------------------------------------------
# Completion
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  AUDIT COMPLETE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Audit files saved to: $ProjectPath\docs\audit\" -ForegroundColor Green
Write-Host ""
