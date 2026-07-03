<#
.SYNOPSIS
  Rebuilds the current mono-diff into attributable remediation commits.

.DESCRIPTION
  This script does not rewrite history by itself. It guides the operator through:
    1. creating a safety snapshot commit + tag,
    2. isolating pre-existing unrelated changes,
    3. staging each remediation concern in order,
    4. pausing for `git add -p` where shared files must be split,
    5. recording each resulting commit in `ai_logs/remediation/HASH_CHAIN.md`.

  It is intentionally interactive and conservative. Shared files are never staged
  automatically. The operator must confirm each split before committing.
#>

param(
  [string]$SnapshotTag = "remediation-snapshot",
  [string]$HashChainPath = "ai_logs/remediation/HASH_CHAIN.md",
  [switch]$SkipSnapshot
)

$ErrorActionPreference = "Stop"

function Write-Step($text) {
  Write-Host ""
  Write-Host ("=" * 80) -ForegroundColor DarkGray
  Write-Host $text -ForegroundColor Cyan
  Write-Host ("=" * 80) -ForegroundColor DarkGray
}

function Assert-OnFeatureBranch {
  $branch = (git rev-parse --abbrev-ref HEAD).Trim()
  if ($branch -ne "feature/stage3-workspace-core") {
    throw "Expected branch 'feature/stage3-workspace-core' but found '$branch'."
  }
}

function Ensure-HashChainFile {
  $dir = Split-Path $HashChainPath -Parent
  if ($dir -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir | Out-Null
  }

  if (-not (Test-Path $HashChainPath)) {
    "# Remediation hash chain`n`n| Prompt | Commit | Message | Timestamp |`n|---|---|---|---|" |
      Set-Content -Path $HashChainPath -Encoding utf8
  }
}

function Record-HashChain($promptNumber, $message) {
  $hash = (git rev-parse HEAD).Trim()
  $ts = (Get-Date).ToString("s")
  "| $promptNumber | $hash | $message | $ts |" | Add-Content -Path $HashChainPath -Encoding utf8
  Write-Host "Recorded $hash for prompt $promptNumber" -ForegroundColor Green
}

function Show-CurrentDiff($paths) {
  if (-not $paths -or $paths.Count -eq 0) {
    git diff --stat
    return
  }

  git diff --stat -- $paths
}

function Confirm-CleanIndex {
  $staged = git diff --cached --name-only
  if ($staged) {
    throw "Index is not clean. Commit, unstage, or reset staged changes before continuing."
  }
}

function Invoke-InteractiveCommit($step) {
  Write-Step "Step $($step.Id): $($step.Label)"
  Write-Host "Suggested commit message:" -ForegroundColor DarkGray
  Write-Host "  $($step.Message)"

  if ($step.Notes) {
    Write-Host ""
    foreach ($note in $step.Notes) {
      Write-Host "Note: $note" -ForegroundColor Yellow
    }
  }

  if ($step.Paths.Count -gt 0) {
    Write-Host ""
    Write-Host "Primary paths for this step:" -ForegroundColor DarkGray
    $step.Paths | ForEach-Object { Write-Host "  $_" }
    Write-Host ""
    Show-CurrentDiff $step.Paths
    Write-Host ""
    Write-Host "Auto-stage suggested paths with:" -ForegroundColor DarkGray
    Write-Host "  git add -- $($step.Paths -join ' ')"
  }

  if ($step.ManualPatchTargets.Count -gt 0) {
    Write-Host ""
    Write-Host "Manual split required in shared files:" -ForegroundColor Yellow
    $step.ManualPatchTargets | ForEach-Object { Write-Host "  git add -p -- $_" }
  }

  Write-Host ""
  Write-Host "Before committing, verify staged content with:" -ForegroundColor DarkGray
  Write-Host "  git diff --cached --stat"
  Write-Host "  git diff --cached"
  Read-Host "Press Enter after staging exactly this step"

  $staged = git diff --cached --name-only
  if (-not $staged) {
    throw "Nothing is staged for step $($step.Id)."
  }

  git commit -m $step.Message | Out-Null
  Record-HashChain $step.Id $step.Message
}

Assert-OnFeatureBranch
Ensure-HashChainFile
Confirm-CleanIndex

if (-not $SkipSnapshot) {
  Write-Step "Safety snapshot"
  Write-Host "This creates a temporary snapshot commit and tag, then returns the repo to a dirty worktree."
  Write-Host "Commands:"
  Write-Host "  git add -A"
  Write-Host "  git commit -m `"SNAPSHOT: full remediation + preexisting (do not keep)`""
  Write-Host "  git tag $SnapshotTag"
  Write-Host "  git reset --soft HEAD~1"
  Write-Host "  git reset"
  Read-Host "Press Enter to execute the snapshot sequence"

  git add -A
  git commit -m "SNAPSHOT: full remediation + preexisting (do not keep)" | Out-Null
  git tag $SnapshotTag
  git reset --soft HEAD~1
  git reset | Out-Null

  Write-Host "Snapshot tag created: $SnapshotTag" -ForegroundColor Green
}

$steps = @(
  @{
    Id = "pre"
    Label = "Separate pre-existing unrelated changes"
    Message = "chore: pre-existing worktree changes (unrelated to remediation)"
    Paths = @(
      "src/components/DeepgramKeytermManager/types.ts",
      "src/lib/keytermRanker.ts",
      "src/lib/transcriptionJobs.ts",
      "src/lib/transcript/multifileCallbackFlow.ts",
      "src/lib/transcript/multifileCallbackFlow.test.ts",
      "src/components/AudioPreAnalysisGate",
      "src/lib/audio/audioPreAnalysis.test.ts",
      "src/lib/transcript/autoChunking.ts",
      "src/lib/transcript/autoChunking.test.ts"
    )
    ManualPatchTargets = @()
    Notes = @(
      "Inspect these paths first. If any hunk is remediation-related, split it manually with git add -p instead of staging the whole file."
    )
  }
  @{
    Id = 4
    Label = "Prompt 4 lint fixes"
    Message = "chore(lint): clear eslint errors"
    Paths = @(
      "eslint.config.js",
      "src/api/workspaceService.audio.test.ts",
      "src/lib/transcriptDownloads.ts",
      "src/lib/transcriptDownloads.test.ts"
    )
    ManualPatchTargets = @()
    Notes = @()
  }
  @{
    Id = 1
    Label = "Prompt 1 speaker identity fix"
    Message = "fix(ai-review): read verified speaker identity from transcript_speakers"
    Paths = @(
      "DATA_REALITY_FINDINGS.md",
      "src/lib/transcript/aiReview.test.ts"
    )
    ManualPatchTargets = @(
      "supabase/functions/ai-review/index.ts"
    )
    Notes = @(
      "Stage only the speaker-resolution schema/read hunks from ai-review/index.ts here.",
      "Do not include auto-apply audit or model-centralization hunks in this step."
    )
  }
  @{
    Id = 3
    Label = "Prompt 3 AI auto-apply audit gating"
    Message = "fix(ai-review): gate and audit AI auto-apply"
    Paths = @(
      "src/lib/transcript/aiReview.ts",
      "src/lib/transcript/aiReview.test.ts",
      "supabase/migrations/20260703105000_expand_transcript_audit_log_ai_actions.sql"
    )
    ManualPatchTargets = @(
      "supabase/functions/ai-review/index.ts",
      "ARCHITECTURE_DECISIONS.md"
    )
    Notes = @(
      "Stage only auto-apply/audit/failure-meta hunks from ai-review/index.ts here.",
      "Include ADR-002 only from ARCHITECTURE_DECISIONS.md in this step."
    )
  }
  @{
    Id = 2
    Label = "Prompt 2 component test activation"
    Message = "test(config): run .test.tsx suite under jsdom"
    Paths = @(
      "package.json",
      "package-lock.json",
      "vitest.config.ts",
      "src/components/AIReviewBanner/AIReviewBanner.test.tsx",
      "src/components/CaseScopedErrorBoundary.test.tsx",
      "src/components/CertificationScreen/CertificationScreen.test.tsx",
      "src/components/CorrectionsPanel/AISuggestionsSection.test.tsx",
      "src/components/ExportScreen/ExportScreen.test.tsx",
      "src/components/PreTranscriptionConfirmDialog.test.tsx",
      "src/components/SpeakerPanel/SpeakerPanel.test.tsx",
      "src/components/StructureReviewBanner/StructureReviewBanner.test.tsx",
      "src/components/TranscriptCreation/RetranscriptionConfirmDialog.test.tsx",
      "src/components/TranscriptCreation/TranscriptHistoryPanel.test.tsx",
      "src/components/UtteranceContextMenu/UtteranceContextMenu.test.tsx",
      "src/components/WorkspaceTranscriptChooser.test.tsx"
    )
    ManualPatchTargets = @()
    Notes = @(
      "This step includes the jsdom/testing-library dependency adds and the fixed component tests."
    )
  }
  @{
    Id = 5
    Label = "Prompt 5 model centralization"
    Message = "chore(models): centralize Anthropic model IDs"
    Paths = @(
      "src/lib/aiModels.ts",
      "src/lib/transcript/aiSuggestionEngine.ts",
      "supabase/functions/_shared/models.ts",
      "supabase/functions/anthropic-healthcheck/index.ts",
      "supabase/functions/extract-nod/index.ts",
      "supabase/functions/transcribe-callback/index.ts"
    )
    ManualPatchTargets = @(
      "supabase/functions/ai-review/index.ts",
      "ARCHITECTURE_DECISIONS.md"
    )
    Notes = @(
      "Stage only the model-centralization hunk from ai-review/index.ts here.",
      "Include ADR-003 only from ARCHITECTURE_DECISIONS.md in this step.",
      "Live model verification is still pending outside this splitter."
    )
  }
  @{
    Id = 6
    Label = "Prompt 6 extract-nod HTTP status fixes"
    Message = "fix(extract-nod): return real HTTP status codes on error"
    Paths = @(
      "scripts/extract-nod-smoke.mjs",
      "src/lib/parsing/aiExtract.ts",
      "supabase/functions/extract-nod/index.ts"
    )
    ManualPatchTargets = @()
    Notes = @()
  }
  @{
    Id = 7
    Label = "Prompt 7 speaker_resolution_current RLS"
    Message = "feat(rls): owner-scope speaker_resolution_current"
    Paths = @(
      "supabase/migrations/20260703113000_owner_scope_speaker_resolution_current.sql"
    )
    ManualPatchTargets = @()
    Notes = @(
      "Transcript-family owner-scoped policies were already present; this step should be the focused speaker_resolution_current migration only."
    )
  }
  @{
    Id = 8
    Label = "Prompt 8 PII removal and synthetic fixtures"
    Message = "chore(privacy): remove real PII and add synthetic fixtures"
    Paths = @(
      ".gitignore",
      "AGENTS.md",
      "GITHUB_CLEANUP_PLAN.md",
      "scripts/fixtures/novak-buildright.txt",
      "scripts/extract-nod-smoke.mjs",
      "src/lib/format/__fixtures__/synthetic_deepgram_response.json",
      "src/lib/format/cfe.test.ts",
      "etminan_response.json",
      "scripts/fixtures/garza-home-depot.txt"
    )
    ManualPatchTargets = @()
    Notes = @(
      "This commit should include the deletions of the real files and their synthetic replacements."
    )
  }
  @{
    Id = 9
    Label = "Prompt 9 honest DOCX/PDF export gating"
    Message = "feat(export): gate DOCX and PDF export with tracking"
    Paths = @(
      "NUMBERING_REGISTRY.md",
      "src/components/ExportScreen/ExportScreen.tsx",
      "src/components/ExportScreen/ExportScreen.test.tsx"
    )
    ManualPatchTargets = @()
    Notes = @()
  }
  @{
    Id = 10
    Label = "Prompt 10 debt cleanup and documented build waiver"
    Message = "chore(debt): required-fields SoT, deps, warnings, waivers"
    Paths = @(
      "transcript_formatter/requirements.txt",
      "vite.config.ts",
      "src/lib/ufm/buildUfmMetadata.ts",
      "src/lib/ufm/requiredFields.ts",
      "src/lib/ufm/requiredFields.test.ts",
      "src/components/CorrectionsPanel/CorrectionsPanel.helpers.ts",
      "src/components/CorrectionsPanel/CorrectionsPanel.tsx",
      "src/components/CorrectionsPanel/CorrectionsPanel.test.ts",
      "src/components/SpeakerPanel/AddParticipantInlineForm.tsx",
      "src/components/SpeakerPanel/SpeakerPanel.helpers.ts",
      "src/components/SpeakerPanel/SpeakerPanel.tsx",
      "src/components/SpeakerPanel/SpeakerPanel.test.tsx",
      "src/components/UtteranceContextMenu/UtteranceContextMenu.tsx"
    )
    ManualPatchTargets = @(
      "ARCHITECTURE_DECISIONS.md"
    )
    Notes = @(
      "Include ADR-004 only from ARCHITECTURE_DECISIONS.md in this step."
    )
  }
)

Write-Step "Rebuild sequence"
Write-Host "The following interactive steps will run in order:"
$steps | ForEach-Object {
  Write-Host "  $($_.Id): $($_.Message)"
}
Read-Host "Press Enter to begin the staged reconstruction flow"

foreach ($step in $steps) {
  Confirm-CleanIndex
  Invoke-InteractiveCommit $step
}

Write-Step "Final reconciliation"
Write-Host "Recommended final checks:" -ForegroundColor DarkGray
Write-Host "  git diff $SnapshotTag --stat"
Write-Host "  git log --oneline -12"
Write-Host "  npm run typecheck"
Write-Host "  npm run lint"
Write-Host "  npm test"
