<#
.SYNOPSIS
  Runs the Depo-Pro Codex remediation prompts one at a time, with a verification
  gate and one-commit-per-concern enforcement, on the feature branch.

.DESCRIPTION
  For each prompt this script:
    1. Asserts the working tree is clean so each prompt's diff is attributable.
    2. Feeds the prompt to `codex exec` and tees the session to a log.
    3. Checks the Codex exit code and stops on failure.
    4. Runs typecheck, lint, and test as the acceptance gate.
    5. Shows the diff, then either pauses for a manual commit or auto-commits
       with the mapped message.
    6. Records the commit hash in a markdown hash-chain manifest.

  Sensitive prompts 5, 7, and 8 are skipped unless `-IncludeSensitive` is
  passed, and they are always manual review plus manual commit only.
#>

param(
  [string]$CodexProfile = "depo-auto",
  [string]$PromptDir = "docs/prompts",
  [string]$LogDir = "ai_logs/remediation",
  [string]$Branch = "feature/stage3-workspace-core",
  [int[]]$Only,
  [switch]$AutoCommit,
  [switch]$IncludeSensitive,
  [switch]$AllowDirty,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$Meta = @{
  1 = @{ Msg = "fix(ai-review): read verified speaker identity from transcript_speakers"; Sensitive = $false }
  2 = @{ Msg = "test(config): run .test.tsx suite under jsdom"; Sensitive = $false }
  3 = @{ Msg = "fix(ai-review): audit-log AI auto-applied word edits"; Sensitive = $false }
  4 = @{ Msg = "chore(lint): clear eslint errors (useless-escape, unused args)"; Sensitive = $false }
  5 = @{ Msg = "chore(models): centralize Anthropic model IDs + fix healthcheck"; Sensitive = $true }
  6 = @{ Msg = "fix(extract-nod): return real HTTP status codes on error"; Sensitive = $false }
  7 = @{ Msg = "feat(rls): owner-scope transcript-family + speaker_resolution policies"; Sensitive = $true }
  8 = @{ Msg = "chore(privacy): remove real deposition PII, add synthetic fixtures"; Sensitive = $true }
  9 = @{ Msg = "feat(export): implement/gate DOCX+PDF export path"; Sensitive = $false }
  10 = @{ Msg = "chore(debt): required-fields SoT, deps, warnings, bundle"; Sensitive = $false }
}

function Assert-CleanTree {
  if ($AllowDirty) {
    return
  }

  $dirty = git status --porcelain
  if ($dirty) {
    Write-Host ""
    Write-Host "Working tree is not clean. Commit or stash before running:" -ForegroundColor Red
    git status --short
    throw "Refusing to run on a dirty tree (use -AllowDirty to override)."
  }
}

function Assert-Branch {
  $current = (git rev-parse --abbrev-ref HEAD).Trim()
  if ($current -ne $Branch) {
    throw "On branch '$current' but expected '$Branch'. Checkout the feature branch first."
  }
}

function Invoke-Gate {
  $ok = $true
  foreach ($step in @("run typecheck", "run lint", "test")) {
    Write-Host "  npm $step" -ForegroundColor DarkGray
    & npm $step.Split(" ")
    if ($LASTEXITCODE -ne 0) {
      $ok = $false
      Write-Host "  FAILED: npm $step" -ForegroundColor Red
    }
  }
  return $ok
}

function Test-LintClean {
  & npm run lint | Out-Null
  return $LASTEXITCODE -eq 0
}

function Assert-PromptOrder {
  param(
    [int]$PromptNumber
  )

  if ($PromptNumber -eq 4) {
    return
  }

  if (Test-LintClean) {
    return
  }

  throw "Lint is currently failing. Run prompt 4 first, or fix lint manually before running prompt $PromptNumber."
}

Assert-Branch
if (-not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}

$manifest = Join-Path $LogDir "HASH_CHAIN.md"
if (-not (Test-Path $manifest)) {
  "# Remediation hash chain`n`n| Prompt | Commit | Message | Timestamp |`n|---|---|---|---|" |
    Set-Content -Path $manifest -Encoding utf8
}

$indices = if ($Only) { $Only } else { 1..10 }

foreach ($i in $indices) {
  $prompt = Join-Path $PromptDir ("codex-remediation-prompt-{0:D2}.md" -f $i)
  if (-not (Test-Path $prompt)) {
    throw "Missing prompt file: $prompt"
  }

  $isSensitive = $Meta[$i].Sensitive
  if ($isSensitive -and -not $IncludeSensitive) {
    Write-Host "SKIP  prompt $i (sensitive; pass -IncludeSensitive to run it manually)" -ForegroundColor Yellow
    continue
  }

  $leaf = "codex-remediation-prompt-{0:D2}" -f $i
  $logPath = Join-Path $LogDir "$leaf.log"

  Write-Host ""
  Write-Host ("=" * 80)
  Write-Host "PROMPT $i  ($leaf)" -ForegroundColor Cyan
  if ($isSensitive) {
    Write-Host "  SENSITIVE - manual review and manual commit only" -ForegroundColor Yellow
  }
  Write-Host ("=" * 80)

  if ($DryRun) {
    Write-Host "  [dry-run] Get-Content $prompt -Raw | codex exec --profile $CodexProfile --cd ."
    continue
  }

  Assert-CleanTree
  Assert-PromptOrder -PromptNumber $i

  Get-Content $prompt -Raw | codex exec --profile $CodexProfile --cd . 2>&1 | Tee-Object -FilePath $logPath
  $codexExit = $LASTEXITCODE
  if ($codexExit -ne 0) {
    throw "codex exec failed on prompt $i (exit $codexExit). See $logPath. Stopping."
  }

  Write-Host ""
  Write-Host "Acceptance checks:" -ForegroundColor Cyan
  $passed = Invoke-Gate
  Write-Host ""
  Write-Host "Changed files:" -ForegroundColor Cyan
  git diff --stat

  if (-not $passed) {
    Write-Host ""
    Write-Host "Checks failed for prompt $i. Nothing committed. Fix or revert, then re-run with -Only $i." -ForegroundColor Red
    throw "Acceptance gate failed on prompt $i."
  }

  if ($AutoCommit -and -not $isSensitive) {
    git add -A
    git commit -m $Meta[$i].Msg | Out-Null
  } else {
    Write-Host ""
    Write-Host "Review the diff above. When ready, commit in another shell, then press Enter here." -ForegroundColor Cyan
    Write-Host "Suggested: git add -A; git commit -m `"$($Meta[$i].Msg)`"" -ForegroundColor DarkGray
    Read-Host "Press Enter once committed (Ctrl+C to abort)"
    Assert-CleanTree
  }

  $hash = (git rev-parse HEAD).Trim()
  $ts = (Get-Date).ToString("s")
  "| $i | $hash | $($Meta[$i].Msg) | $ts |" | Add-Content -Path $manifest -Encoding utf8
  Write-Host "Recorded $hash for prompt $i" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done. Hash chain: $manifest" -ForegroundColor Green
