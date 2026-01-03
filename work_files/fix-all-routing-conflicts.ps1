# =============================================================================
# DEPO-PRO ROUTING CONFLICT FIX SCRIPT
# =============================================================================
# This script resolves the critical routing conflicts identified in the audit
# Run from the depo-pro project root directory
# =============================================================================

param(
    [switch]$DryRun = $false,
    [switch]$SkipBackup = $false
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "DEPO-PRO ROUTING CONFLICT FIX SCRIPT" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Please run this script from the depo-pro project root directory" -ForegroundColor Red
    exit 1
}

$projectName = (Get-Content "package.json" | ConvertFrom-Json).name
if ($projectName -ne "depo-pro") {
    Write-Host "ERROR: This doesn't appear to be the depo-pro project (found: $projectName)" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Verified: Running in depo-pro project directory" -ForegroundColor Green
Write-Host ""

# =============================================================================
# STEP 1: Create Backup
# =============================================================================

if (-not $SkipBackup) {
    $backupDir = "app_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Write-Host "Step 1: Creating backup..." -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would create backup: $backupDir" -ForegroundColor Gray
    } else {
        Copy-Item -Path "app" -Destination $backupDir -Recurse
        Write-Host "  ✓ Backup created: $backupDir" -ForegroundColor Green
    }
} else {
    Write-Host "Step 1: Skipping backup (--SkipBackup flag set)" -ForegroundColor Yellow
}

Write-Host ""

# =============================================================================
# STEP 2: Remove Duplicate Regular Folders (Keep Route Groups)
# =============================================================================

Write-Host "Step 2: Removing duplicate regular folders..." -ForegroundColor Yellow

$foldersToRemove = @(
    "app\login",
    "app\register",
    "app\attorney-dashboard",
    "app\exhibits",
    "app\issues"
)

foreach ($folder in $foldersToRemove) {
    if (Test-Path $folder) {
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would remove: $folder" -ForegroundColor Gray
        } else {
            Remove-Item -Path $folder -Recurse -Force
            Write-Host "  ✓ Removed: $folder" -ForegroundColor Green
        }
    } else {
        Write-Host "  - Not found (already removed?): $folder" -ForegroundColor DarkGray
    }
}

Write-Host ""

# =============================================================================
# STEP 3: Remove Dashboard Duplicates
# =============================================================================

Write-Host "Step 3: Removing dashboard duplicates..." -ForegroundColor Yellow

$dashboardFolders = @(
    "app\dashboard\reporter",
    "app\dashboard\scopist",
    "app\dashboard\admin"
)

foreach ($folder in $dashboardFolders) {
    if (Test-Path $folder) {
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would remove: $folder" -ForegroundColor Gray
        } else {
            Remove-Item -Path $folder -Recurse -Force
            Write-Host "  ✓ Removed: $folder" -ForegroundColor Green
        }
    } else {
        Write-Host "  - Not found (already removed?): $folder" -ForegroundColor DarkGray
    }
}

# Remove root dashboard page if it exists
$dashboardPage = "app\dashboard\page.tsx"
if (Test-Path $dashboardPage) {
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would remove: $dashboardPage" -ForegroundColor Gray
    } else {
        Remove-Item -Path $dashboardPage -Force
        Write-Host "  ✓ Removed: $dashboardPage" -ForegroundColor Green
    }
}

Write-Host ""

# =============================================================================
# STEP 4: Convert /auth/* Pages to Redirects
# =============================================================================

Write-Host "Step 4: Converting /auth/* pages to redirects..." -ForegroundColor Yellow

$redirectPages = @{
    "app\auth\login\page.tsx" = @"
// =============================================================================
// AUTH LOGIN REDIRECT
// Redirects to canonical /login route
// =============================================================================

import { redirect } from 'next/navigation';

export default function AuthLoginRedirect() {
  redirect('/login');
}
"@
    "app\auth\register\page.tsx" = @"
// =============================================================================
// AUTH REGISTER REDIRECT
// Redirects to canonical /register route
// =============================================================================

import { redirect } from 'next/navigation';

export default function AuthRegisterRedirect() {
  redirect('/register');
}
"@
    "app\auth\forgot-password\page.tsx" = @"
// =============================================================================
// AUTH FORGOT PASSWORD REDIRECT
// Redirects to canonical /forgot-password route
// =============================================================================

import { redirect } from 'next/navigation';

export default function AuthForgotRedirect() {
  redirect('/forgot-password');
}
"@
    "app\auth\reset-password\page.tsx" = @"
// =============================================================================
// AUTH RESET PASSWORD REDIRECT
// Redirects to canonical /reset-password route
// =============================================================================

import { redirect } from 'next/navigation';

export default function AuthResetRedirect() {
  redirect('/reset-password');
}
"@
}

foreach ($page in $redirectPages.Keys) {
    if (Test-Path $page) {
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would convert to redirect: $page" -ForegroundColor Gray
        } else {
            $redirectPages[$page] | Set-Content -Path $page -Encoding UTF8
            Write-Host "  ✓ Converted to redirect: $page" -ForegroundColor Green
        }
    } else {
        Write-Host "  - Not found: $page" -ForegroundColor DarkGray
    }
}

Write-Host ""

# =============================================================================
# STEP 5: Fix API Route Parameter Conflict
# =============================================================================

Write-Host "Step 5: Fixing API route parameter conflicts..." -ForegroundColor Yellow

$jobIdFolder = "app\api\jobs\[jobId]"

if (Test-Path $jobIdFolder) {
    # Check if we need to merge any routes first
    $jobIdStatusRoute = "app\api\jobs\[jobId]\status\route.ts"
    $idStatusRoute = "app\api\jobs\[id]\status\route.ts"
    
    # The [jobId] folder has GET handler, [id] has PATCH handler
    # We need to merge them
    
    if ((Test-Path $jobIdStatusRoute) -and (Test-Path $idStatusRoute)) {
        Write-Host "  Merging status routes..." -ForegroundColor Cyan
        
        if (-not $DryRun) {
            # Read both files
            $jobIdContent = Get-Content $jobIdStatusRoute -Raw
            $idContent = Get-Content $idStatusRoute -Raw
            
            # Create merged content with both GET and PATCH handlers
            $mergedContent = @"
// =============================================================================
// JOB STATUS API
// app/api/jobs/[id]/status/route.ts
//
// GET: Retrieve job status and transcription progress
// PATCH: Update job status
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { JobStatus } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/jobs/[id]/status
 * Get job status and transcription progress
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        title: true,
        transcription: {
          select: {
            status: true,
            progress: true,
            errorMessage: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      title: job.title,
      transcription: job.transcription ? {
        status: job.transcription.status,
        progress: job.transcription.progress ?? 0,
        error: job.transcription.errorMessage,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/jobs/[id]/status
 * Update job status
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Validate status is a valid JobStatus
    if (!Object.values(JobStatus).includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const updatedJob = await db.job.update({
      where: { id: jobId },
      data: { status },
    });

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error('Error updating job status:', error);
    return NextResponse.json(
      { error: 'Failed to update job status' },
      { status: 500 }
    );
  }
}
"@
            $mergedContent | Set-Content -Path $idStatusRoute -Encoding UTF8
            Write-Host "  ✓ Merged status routes into [id]/status/route.ts" -ForegroundColor Green
        } else {
            Write-Host "  [DRY RUN] Would merge status routes" -ForegroundColor Gray
        }
    }
    
    # Handle upload route
    $jobIdUploadRoute = "app\api\jobs\[jobId]\upload\route.ts"
    $idUploadFolder = "app\api\jobs\[id]\upload"
    
    if (Test-Path $jobIdUploadRoute) {
        if (-not (Test-Path $idUploadFolder)) {
            if ($DryRun) {
                Write-Host "  [DRY RUN] Would create folder: $idUploadFolder" -ForegroundColor Gray
            } else {
                New-Item -ItemType Directory -Path $idUploadFolder -Force | Out-Null
            }
        }
        
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would move upload route to [id] folder" -ForegroundColor Gray
        } else {
            # Read content and update param name
            $uploadContent = Get-Content $jobIdUploadRoute -Raw
            $uploadContent = $uploadContent -replace 'jobId:', 'id:'
            $uploadContent = $uploadContent -replace '\{ jobId \}', '{ id }'
            $uploadContent = $uploadContent -replace '\{jobId\}', '{id}'
            $uploadContent = $uploadContent -replace 'params\.jobId', 'params.id'
            $uploadContent | Set-Content -Path "$idUploadFolder\route.ts" -Encoding UTF8
            Write-Host "  ✓ Moved upload route to [id]/upload/route.ts" -ForegroundColor Green
        }
    }
    
    # Now remove the [jobId] folder
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would remove: $jobIdFolder" -ForegroundColor Gray
    } else {
        Remove-Item -Path $jobIdFolder -Recurse -Force
        Write-Host "  ✓ Removed duplicate folder: $jobIdFolder" -ForegroundColor Green
    }
} else {
    Write-Host "  - [jobId] folder not found (already fixed?)" -ForegroundColor DarkGray
}

Write-Host ""

# =============================================================================
# STEP 6: Remove Archive Folder (Optional)
# =============================================================================

Write-Host "Step 6: Checking archive folder..." -ForegroundColor Yellow

if (Test-Path "archive") {
    $archiveSize = (Get-ChildItem "archive" -Recurse | Measure-Object -Property Length -Sum).Sum / 1KB
    Write-Host "  Found archive folder (~$([math]::Round($archiveSize, 0)) KB)" -ForegroundColor Cyan
    Write-Host "  Recommendation: Move to external backup location" -ForegroundColor Cyan
    
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would leave archive folder (manual action recommended)" -ForegroundColor Gray
    }
} else {
    Write-Host "  - Archive folder not found" -ForegroundColor DarkGray
}

Write-Host ""

# =============================================================================
# STEP 7: Verify Build
# =============================================================================

Write-Host "Step 7: Verifying build..." -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "  [DRY RUN] Would run: npm run build" -ForegroundColor Gray
} else {
    Write-Host "  Running: npm run build" -ForegroundColor Cyan
    
    try {
        $buildResult = & npm run build 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ Build successful!" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Build failed. Check output above." -ForegroundColor Red
            Write-Host $buildResult -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ Build error: $_" -ForegroundColor Red
    }
}

Write-Host ""

# =============================================================================
# SUMMARY
# =============================================================================

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "FIX SCRIPT COMPLETE" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "This was a DRY RUN. No changes were made." -ForegroundColor Yellow
    Write-Host "Run without -DryRun flag to apply changes." -ForegroundColor Yellow
} else {
    Write-Host "Changes Applied:" -ForegroundColor Green
    Write-Host "  ✓ Removed duplicate route folders"
    Write-Host "  ✓ Converted /auth/* pages to redirects"
    Write-Host "  ✓ Fixed API route parameter conflicts"
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Review the changes in git: git diff"
    Write-Host "  2. Test auth flows manually"
    Write-Host "  3. Test API endpoints"
    Write-Host "  4. Deploy to staging environment"
}

Write-Host ""
