# One-shot deploy for the "single Deposition Transcript per case" release.
#
# Deploys the SERVER surfaces (Supabase edge functions + Cloud Run finalize worker)
# that carry: the diarize_model-safe Deepgram request, the certified-case guard, and
# the retranscribe-overwrite (pruneSupersededTranscripts). The Vite frontend (Vercel
# project depo-pro-web) and the destructive data cleanup are intentionally NOT here —
# see the printed "next steps".
#
# Run from the repo root in an authenticated shell:
#   - supabase CLI logged in + project linked (lqxiuwlwzkofdfitxuqe)
#   - gcloud auth'd, project depo-pro-website
#
#   pwsh ./scripts/deploy-deposition.ps1
#
# Safe to re-run; stops on the first error so you can fix and continue.

$ErrorActionPreference = "Stop"

$expectedBranch = "feature/one-deposition-transcript"
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
$sha    = (git rev-parse --short HEAD).Trim()
if ($branch -ne $expectedBranch) {
  Write-Host "ABORT: on branch '$branch' but expected '$expectedBranch'. Run: git checkout $expectedBranch" -ForegroundColor Red
  exit 1
}
Write-Host "Deploying from $branch @ $sha" -ForegroundColor Cyan

# --- 1. Edge functions (Supabase) ------------------------------------------------
# transcribe-start FIRST: fixes the live Deepgram 400 + adds the certified guard.
$edgeFns = @("transcribe-start", "transcribe-callback", "transcribe-watchdog", "recover-transcript")
foreach ($fn in $edgeFns) {
  Write-Host "`n=== supabase functions deploy $fn ===" -ForegroundColor Yellow
  supabase functions deploy $fn
}

# --- 2. Cloud Run finalize worker (overwrite runs here) --------------------------
$image = "us-central1-docker.pkg.dev/depo-pro-website/depo-pro/depo-pro-transcript-finalize:deposition-$sha"
Write-Host "`n=== Cloud Build: $image ===" -ForegroundColor Yellow
gcloud builds submit --config cloudbuild.transcript-finalize.yaml --substitutions "_IMAGE=$image"
Write-Host "`n=== Cloud Run deploy: depo-pro-transcript-finalize ===" -ForegroundColor Yellow
gcloud run deploy depo-pro-transcript-finalize --image $image --region us-central1

Write-Host "`nSERVER DEPLOY COMPLETE ($sha)." -ForegroundColor Green
Write-Host @"

NEXT STEPS (manual — not run by this script):
  a) Frontend: promote a Vercel PROD build of this commit on project 'depo-pro-web'
     (only needed if current prod was built from an older commit — required for the
     'Deposition Transcript' label + certified UI to show).
  b) Supabase dashboard -> Authentication -> URL Configuration: Site URL https://depo-pro.com
     + redirect URLs; and:
       supabase secrets set TRANSCRIBE_ALLOWED_ORIGINS="https://depo-pro.com,https://www.depo-pro.com"
  c) Domain: add depo-pro.com in Vercel (depo-pro-web) + point Bluehost DNS
     (A @ -> 76.76.21.21 ; CNAME www -> cname.vercel-dns.com).
  d) Data cleanup (DESTRUCTIVE, dry-run first, review, then --apply):
       node scripts/prune-extra-transcripts.mjs
       node scripts/prune-extra-transcripts.mjs --apply
"@ -ForegroundColor Cyan
