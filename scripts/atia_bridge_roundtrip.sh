#!/usr/bin/env bash
# ATIA bridge — manual server-side round-trip (no UI required).
#
# Exercises the whole server slice against a real deployed transcript:
#   1. AI Review (bridge)   -> generates + persists CorrectionObjects
#   2. GET corrections      -> lists what was produced
#   3. POST .../decide      -> accepts the first correction (applies to working transcript)
#   4. GET corrections      -> confirms the review.state flipped to "accepted"
#
# Prereqs on the target project:
#   - migration 20260729120000_corrections.sql applied
#   - the `ai-review` function deployed with env AI_REVIEW_BRIDGE=true
#   - the `editor-api` function deployed
#   - jq installed locally (for readable output)
#
# Usage:
#   export SUPABASE_URL="https://<project-ref>.supabase.co"
#   export SERVICE_ROLE_KEY="<service-role-key>"     # server-side test only — never ship this
#   export TRANSCRIPT_ID="<transcript_id, e.g. the Garza transcript>"
#   ./scripts/atia_bridge_roundtrip.sh
#
# SECURITY: the service-role key bypasses RLS. Use it only for this local
# validation against a test project; never embed it in client code or commit it.

set -euo pipefail

: "${SUPABASE_URL:?set SUPABASE_URL}"
: "${SERVICE_ROLE_KEY:?set SERVICE_ROLE_KEY}"
: "${TRANSCRIPT_ID:?set TRANSCRIPT_ID}"

FN="${SUPABASE_URL%/}/functions/v1"
REST="${SUPABASE_URL%/}/rest/v1"
AUTH=(-H "Authorization: Bearer ${SERVICE_ROLE_KEY}" -H "apikey: ${SERVICE_ROLE_KEY}" -H "Content-Type: application/json")

echo "== 0. Pre-flight: confirm the migration's tables exist =="
# A missing table makes the Edge Function 500 with an opaque error that looks
# identical to "the bridge produced no corrections" — check first.
for t in corrections correction_runs correction_decisions; do
  code="$(curl -sS -o /dev/null -w "%{http_code}" "${AUTH[@]}" "${REST}/${t}?select=id&limit=0")"
  if [ "${code}" != "200" ]; then
    echo "  ✗ table '${t}' not reachable (HTTP ${code}) — apply migration 20260729120000_corrections.sql first."
    exit 1
  fi
  echo "  ✓ ${t}"
done
echo

echo "== 1. Trigger bridge AI Review on ${TRANSCRIPT_ID} =="
# NOTE: a response with "mode":"bridge" confirms AI_REVIEW_BRIDGE reached the
# deployed function. If you see the legacy shape (suggestions_count, no "mode"),
# the flag is not set on the deployed ai-review function.
curl -sS "${AUTH[@]}" -X POST "${FN}/ai-review" \
  -d "{\"transcript_id\":\"${TRANSCRIPT_ID}\",\"force_rerun\":true}" | jq .
echo

echo "== 2. List corrections =="
CORRECTIONS="$(curl -sS "${AUTH[@]}" "${FN}/editor-api/${TRANSCRIPT_ID}/corrections")"
echo "${CORRECTIONS}" | jq '[.[] | {id, specialty, type: .change.type, confidence, state: .review.state, reason}]'
echo

FIRST_ID="$(echo "${CORRECTIONS}" | jq -r '.[0].id // empty')"
if [ -z "${FIRST_ID}" ]; then
  echo "No corrections produced. If the transcript has SPEAKER 0 labels / merged Q&A,"
  echo "iterate transcript_formatter/prompts/bridge/full_review.md before wiring the panel."
  exit 0
fi

echo "== 3. Accept the first correction (${FIRST_ID}) =="
curl -sS "${AUTH[@]}" -X POST "${FN}/editor-api/${TRANSCRIPT_ID}/corrections/${FIRST_ID}/decide" \
  -d '{"action":"accept","context":{"time_to_decide_ms":4200,"audio_played":true,"navigated_to_location":true}}' | jq .
echo

echo "== 4. Re-list — confirm state flipped to accepted =="
curl -sS "${AUTH[@]}" "${FN}/editor-api/${TRANSCRIPT_ID}/corrections" \
  | jq --arg id "${FIRST_ID}" '.[] | select(.id == $id) | {id, state: .review.state, applied: .downstream.applied_to_working_transcript, pending_reason: .downstream.pending_reason}'
echo

echo "== 5. First cost data point (correction_runs) =="
# Sanity band for a ~15k-word transcript on a sonnet-tier model: ~20k input,
# 2-4k output, 30-60s. A number 5x off means prompt or transport is misconfigured.
curl -sS "${AUTH[@]}" "${REST}/correction_runs?transcript_id=eq.${TRANSCRIPT_ID}&select=model,tokens_used_in,tokens_used_out,latency_ms,correction_count,rejected_count&order=created_at.desc&limit=1" | jq .
echo
echo "Done. A text correction should now show in transcript_words.working_text;"
echo "a speaker_reassignment should show a humanized transcript_speakers row."
echo "If correction_runs.rejected_count is high, the bridge prompt needs schema-alignment work."
