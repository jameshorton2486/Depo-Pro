# ENGINE 0 — TRANSCRIPT INTEGRITY AUDIT
# DEPO-PRO AI Transcript Processing Specification v2.0
#
# Stage: FIRST — runs before any other engine
# Halt condition: ANY failure stops the entire pipeline
# Module: spec_engine/integrity_audit.py | core/correction_runner.py
#
# PURPOSE: Verify the raw Deepgram JSON is structurally valid before
# any AI or deterministic processing begins. If this engine fails,
# the transcript is marked NEEDS_MANUAL_REVIEW and no further
# processing occurs.

---

## INPUTS

| Field | Source | Required |
|-------|--------|----------|
| `raw_deepgram_json` | Deepgram API response | Yes |
| `expected_duration_seconds` | Audio file metadata | Yes |
| `job_config` | job_config.json | Yes |

## OUTPUTS

| Field | Type | Description |
|-------|------|-------------|
| `integrity_passed` | boolean | Pipeline gate — false halts everything |
| `word_count` | integer | Total words in transcript |
| `utterance_count` | integer | Total utterances |
| `speaker_ids_found` | string[] | e.g. ["spk_000","spk_001","spk_002"] |
| `confidence_stats` | object | mean, median, p10, p90 confidence scores |
| `gap_summary` | object | timestamp gaps detected |
| `failures` | object[] | Each failed check with details |
| `warnings` | object[] | Non-blocking issues |
| `metrics` | object | Full audit metrics for QA dashboard |

## SIDE EFFECTS

- Writes `integrity_audit_result` to `job_config.json`
- If `integrity_passed = false`, sets `transcript.status = 'NEEDS_MANUAL_REVIEW'`
- Logs all failures to `app_logging` at ERROR level

## DEPENDENCIES

None — this engine runs on raw input only.

---

## CHECK SUITE (all checks must pass)

### CHECK 0-A: JSON Structure Validity

```python
REQUIRED_KEYS = ["results", "metadata"]
REQUIRED_RESULTS_KEYS = ["channels", "utterances"]
REQUIRED_UTTERANCE_KEYS = ["id", "start", "end", "confidence", "speaker", "words", "transcript"]
REQUIRED_WORD_KEYS = ["word", "start", "end", "confidence", "speaker"]

def check_json_structure(deepgram_json: dict) -> CheckResult:
    """
    Verify Deepgram JSON has all required keys at every level.
    A missing key means the transcription job failed silently.
    """
    failures = []
    
    for key in REQUIRED_KEYS:
        if key not in deepgram_json:
            failures.append(f"Missing top-level key: '{key}'")
    
    utterances = deepgram_json.get("results", {}).get("utterances", [])
    if not utterances:
        failures.append("No utterances found — transcription may have failed")
    
    for i, utt in enumerate(utterances[:5]):  # Sample first 5
        for key in REQUIRED_UTTERANCE_KEYS:
            if key not in utt:
                failures.append(f"Utterance[{i}] missing key: '{key}'")
        for j, word in enumerate(utt.get("words", [])[:3]):
            for key in REQUIRED_WORD_KEYS:
                if key not in word:
                    failures.append(f"Word[{i}][{j}] missing key: '{key}'")
    
    return CheckResult(passed=len(failures) == 0, failures=failures)
```

**HALT CONDITION:** Any failure → halt pipeline immediately.

---

### CHECK 0-B: Utterance Ordering and Timestamp Integrity

```python
TIMESTAMP_GAP_WARNING_SECONDS = 30.0
TIMESTAMP_GAP_CRITICAL_SECONDS = 120.0
TIMESTAMP_OVERLAP_TOLERANCE_SECONDS = 0.1

def check_timestamp_integrity(utterances: list) -> CheckResult:
    """
    Verify utterances are in chronological order with no impossible overlaps.
    Large gaps may indicate off-record sections or recording failures.
    """
    failures = []
    warnings = []
    gaps = []
    
    for i in range(1, len(utterances)):
        prev = utterances[i - 1]
        curr = utterances[i]
        
        # Check ordering
        if curr["start"] < prev["start"]:
            failures.append(
                f"Utterance ordering violation: [{i}] starts at {curr['start']:.2f}s "
                f"but [{i-1}] starts at {prev['start']:.2f}s"
            )
        
        # Check for impossible overlaps (beyond tolerance)
        overlap = prev["end"] - curr["start"]
        if overlap > TIMESTAMP_OVERLAP_TOLERANCE_SECONDS:
            failures.append(
                f"Impossible overlap at utterance {i}: {overlap:.2f}s overlap"
            )
        
        # Check for gaps
        gap = curr["start"] - prev["end"]
        if gap > TIMESTAMP_GAP_CRITICAL_SECONDS:
            failures.append(
                f"Critical gap of {gap:.1f}s between utterances {i-1} and {i} "
                f"at {prev['end']:.1f}s — recording may have been interrupted"
            )
            gaps.append({"position": i, "duration_seconds": gap, "severity": "critical"})
        elif gap > TIMESTAMP_GAP_WARNING_SECONDS:
            warnings.append(
                f"Gap of {gap:.1f}s at {prev['end']:.1f}s — likely off-record section"
            )
            gaps.append({"position": i, "duration_seconds": gap, "severity": "warning"})
    
    return CheckResult(
        passed=len(failures) == 0,
        failures=failures,
        warnings=warnings,
        data={"gaps": gaps}
    )
```

**HALT CONDITION:** Ordering violations or overlaps > 0.1s → halt.
**WARNING ONLY:** Gaps 30–120s (likely off-record). Record in metrics.

---

### CHECK 0-C: Speaker ID Presence and Coverage

```python
MIN_SPEAKERS_EXPECTED = 2   # At minimum: reporter + witness or reporter + attorney
MAX_SPEAKERS_REALISTIC = 8  # Beyond 8 is likely diarization fragmentation

def check_speaker_coverage(utterances: list) -> CheckResult:
    """
    Verify Deepgram assigned speaker IDs to utterances and the number
    of distinct speakers is within realistic bounds for a deposition.
    """
    failures = []
    warnings = []
    
    missing_speaker = [u for u in utterances if u.get("speaker") is None]
    if missing_speaker:
        failures.append(
            f"{len(missing_speaker)} utterances have no speaker ID assigned. "
            f"Diarization may have failed."
        )
    
    speaker_ids = list(set(u["speaker"] for u in utterances if u.get("speaker") is not None))
    
    if len(speaker_ids) < MIN_SPEAKERS_EXPECTED:
        failures.append(
            f"Only {len(speaker_ids)} speaker(s) detected. "
            f"Minimum expected: {MIN_SPEAKERS_EXPECTED}. "
            f"Diarization likely failed."
        )
    
    if len(speaker_ids) > MAX_SPEAKERS_REALISTIC:
        warnings.append(
            f"{len(speaker_ids)} speaker clusters detected. "
            f"Likely diarization fragmentation — multiple clusters may be the same person."
        )
    
    # Check for diarization collapse: one speaker has wildly disproportionate share
    speaker_word_counts = {}
    for utt in utterances:
        spk = utt.get("speaker")
        if spk is not None:
            speaker_word_counts[spk] = speaker_word_counts.get(spk, 0) + len(utt.get("words", []))
    
    total_words = sum(speaker_word_counts.values())
    for spk, count in speaker_word_counts.items():
        pct = (count / total_words * 100) if total_words > 0 else 0
        if pct > 85:
            warnings.append(
                f"Speaker {spk} accounts for {pct:.0f}% of all words. "
                f"Possible diarization collapse — multiple speakers merged into one cluster."
            )
    
    return CheckResult(
        passed=len(failures) == 0,
        failures=failures,
        warnings=warnings,
        data={
            "speaker_ids": speaker_ids,
            "speaker_word_counts": speaker_word_counts,
            "speaker_count": len(speaker_ids)
        }
    )
```

**HALT CONDITION:** No speaker IDs, or fewer than 2 speakers.
**WARNING ONLY:** >8 speakers or >85% concentration in one cluster.

---

### CHECK 0-D: Confidence Statistics

```python
LOW_CONFIDENCE_WORD_THRESHOLD = 0.70
CRITICAL_LOW_CONFIDENCE_RATE = 0.40   # >40% of words below threshold = likely bad audio

def check_confidence_statistics(utterances: list) -> CheckResult:
    """
    Compute confidence statistics across all words. Very high rates of
    low-confidence words indicate audio quality problems that will make
    AI correction unreliable.
    """
    warnings = []
    all_confidences = []
    
    for utt in utterances:
        for word in utt.get("words", []):
            conf = word.get("confidence")
            if conf is not None:
                all_confidences.append(conf)
    
    if not all_confidences:
        return CheckResult(passed=False, failures=["No confidence scores found in any word"])
    
    low_conf_count = sum(1 for c in all_confidences if c < LOW_CONFIDENCE_WORD_THRESHOLD)
    low_conf_rate = low_conf_count / len(all_confidences)
    
    stats = {
        "word_count": len(all_confidences),
        "mean_confidence": sum(all_confidences) / len(all_confidences),
        "low_confidence_count": low_conf_count,
        "low_confidence_rate": low_conf_rate,
        "p10": sorted(all_confidences)[int(len(all_confidences) * 0.10)],
        "p50": sorted(all_confidences)[int(len(all_confidences) * 0.50)],
        "p90": sorted(all_confidences)[int(len(all_confidences) * 0.90)],
    }
    
    if low_conf_rate > CRITICAL_LOW_CONFIDENCE_RATE:
        warnings.append(
            f"{low_conf_rate:.0%} of words below {LOW_CONFIDENCE_WORD_THRESHOLD} confidence. "
            f"Audio quality is poor. AI corrections will have reduced reliability. "
            f"Consider retranscription with better audio source."
        )
    
    return CheckResult(passed=True, warnings=warnings, data={"confidence_stats": stats})
```

**HALT CONDITION:** None — low confidence is a warning, not a blocker.
**Metric output:** Full stats written to QA dashboard.

---

### CHECK 0-E: Duplicate Word ID Detection

```python
def check_duplicate_word_ids(utterances: list) -> CheckResult:
    """
    Verify no word appears twice with the same ID. Duplicates cause
    silent data loss when words are updated by ID later in the pipeline.
    """
    seen_ids = set()
    duplicates = []
    
    for utt in utterances:
        for word in utt.get("words", []):
            word_id = word.get("id") or f"{word['start']}_{word['word']}"
            if word_id in seen_ids:
                duplicates.append(word_id)
            seen_ids.add(word_id)
    
    if duplicates:
        return CheckResult(
            passed=False,
            failures=[f"Duplicate word IDs found: {duplicates[:10]}... ({len(duplicates)} total)"]
        )
    
    return CheckResult(passed=True)
```

**HALT CONDITION:** Any duplicate word IDs → halt.

---

## METRICS OUTPUT (QA Dashboard)

```python
def build_audit_metrics(results: dict) -> dict:
    """
    Build the metrics object written to the QA dashboard and job_config.json.
    """
    return {
        "engine": "integrity_audit",
        "version": "v2.0",
        "timestamp": datetime.utcnow().isoformat(),
        "passed": results["integrity_passed"],
        "checks_run": 5,
        "checks_passed": sum(1 for r in results["check_results"] if r["passed"]),
        "failures": [f for r in results["check_results"] for f in r.get("failures", [])],
        "warnings": [w for r in results["check_results"] for w in r.get("warnings", [])],
        "word_count": results["word_count"],
        "utterance_count": results["utterance_count"],
        "speaker_count": results["speaker_count"],
        "speaker_ids": results["speaker_ids"],
        "confidence_stats": results["confidence_stats"],
        "timestamp_gaps": results["gaps"],
        "pipeline_recommendation": (
            "PROCEED" if results["integrity_passed"]
            else "HALT — manual review required"
        )
    }
```

---

## ERROR HANDLING

```
If ANY check returns passed=False:
  1. Set transcript.status = 'NEEDS_MANUAL_REVIEW'
  2. Write all failures to job_config.json under 'integrity_failures'
  3. Send notification to reporter: "Transcript [ID] requires manual review.
     Reason: [first failure message]"
  4. DO NOT proceed to Engine 1.
  5. Log at ERROR level with full check results.

If all checks pass but warnings exist:
  1. Write warnings to job_config.json under 'integrity_warnings'
  2. Proceed to Engine 1.
  3. Warnings are surfaced in the Workspace QA dashboard.
  4. Do NOT show warnings to the reporter as errors.
```

---

## PIPELINE GATE

```
integrity_audit_result.integrity_passed == True
  → PROCEED to Engine 1 (Boundary Engine)

integrity_audit_result.integrity_passed == False
  → HALT. Mark NEEDS_MANUAL_REVIEW. Stop here.
```
