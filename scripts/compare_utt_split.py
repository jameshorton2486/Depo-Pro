#!/usr/bin/env python3
"""Compare Deepgram utterance segmentation across utt_split values (ATIA D1).

`utt_split` controls how Deepgram breaks the transcript into `results.utterances`.
Higher values → longer utterances (fewer, less fragmented) but risk merging two
distinct speaker turns; lower values → the reverse. This script quantifies that
tradeoff so the choice is evidence-backed rather than a guess.

Usage:
    # Recognize the SAME audio twice (only utt_split differs), save each response:
    #   .../listen?...&utt_split=1.0   -> resp_1.0.json
    #   .../listen?...&utt_split=1.2   -> resp_1.2.json
    python scripts/compare_utt_split.py resp_1.0.json resp_1.2.json

Reads only Deepgram JSON. No network, no audio decoding, no dependencies.

What "good" looks like: ONE utterance per speaker turn — few same-speaker
fragments, and zero utterances that span a speaker change.
"""

from __future__ import annotations

import json
import statistics
import sys
from pathlib import Path

# Two adjacent same-speaker utterances closer than this are almost certainly one
# real turn that got fragmented.
FRAGMENT_GAP_SECONDS = 0.75


def _utterances(resp: dict) -> list[dict]:
    return resp.get("results", {}).get("utterances", []) or []


def analyze(path: Path) -> dict:
    resp = json.loads(path.read_text(encoding="utf-8"))
    utts = _utterances(path and resp)
    if not utts:
        raise SystemExit(f"{path.name}: no results.utterances — was utterances=true requested?")

    word_counts, durations = [], []
    cross_speaker = 0          # an utterance whose words span >1 speaker (bad merge)
    fragments = 0              # adjacent same-speaker utterances < gap apart (bad split)
    speaker_changes = 0

    prev = None
    for u in utts:
        words = u.get("words", []) or []
        word_counts.append(len(words))
        durations.append(float(u.get("end", 0)) - float(u.get("start", 0)))
        spk = {w.get("speaker") for w in words if w.get("speaker") is not None}
        if len(spk) > 1:
            cross_speaker += 1
        if prev is not None:
            if u.get("speaker") != prev.get("speaker"):
                speaker_changes += 1
            elif float(u.get("start", 0)) - float(prev.get("end", 0)) < FRAGMENT_GAP_SECONDS:
                fragments += 1  # same speaker, tiny gap -> one turn split in two
        prev = u

    n = len(utts)
    return {
        "file": path.name,
        "utterances": n,
        "words_per_utt_median": round(statistics.median(word_counts), 1),
        "words_per_utt_mean": round(statistics.fmean(word_counts), 1),
        "duration_median_s": round(statistics.median(durations), 2),
        "same_speaker_fragments": fragments,
        "fragment_rate_pct": round(100 * fragments / n, 1),
        "cross_speaker_merges": cross_speaker,
        "merge_rate_pct": round(100 * cross_speaker / n, 1),
        "speaker_changes": speaker_changes,
    }


def main(argv: list[str]) -> None:
    if len(argv) != 2:
        raise SystemExit("usage: compare_utt_split.py <resp_a.json> <resp_b.json>")
    a, b = analyze(Path(argv[0])), analyze(Path(argv[1]))

    rows = [
        ("utterances (fewer≈longer turns)", "utterances"),
        ("median words/utterance", "words_per_utt_median"),
        ("median utterance duration (s)", "duration_median_s"),
        ("same-speaker fragments  ↓ better", "same_speaker_fragments"),
        ("  fragment rate %       ↓ better", "fragment_rate_pct"),
        ("cross-speaker merges    ↓ better", "cross_speaker_merges"),
        ("  merge rate %          ↓ better", "merge_rate_pct"),
    ]
    w = 36
    print(f"{'metric':<{w}}{a['file']:>16}{b['file']:>16}")
    print("-" * (w + 32))
    for label, key in rows:
        print(f"{label:<{w}}{a[key]:>16}{b[key]:>16}")

    # Heuristic read (the numbers, not a verdict — your ear breaks true ties).
    print("\nread:")
    if a["merge_rate_pct"] != b["merge_rate_pct"]:
        worse = a if a["merge_rate_pct"] > b["merge_rate_pct"] else b
        print(f"  • {worse['file']} merges distinct turns more often (cross-speaker "
              f"{worse['merge_rate_pct']}%) — that's the failure you most want to avoid.")
    if a["fragment_rate_pct"] != b["fragment_rate_pct"]:
        worse = a if a["fragment_rate_pct"] > b["fragment_rate_pct"] else b
        print(f"  • {worse['file']} fragments single turns more often "
              f"({worse['fragment_rate_pct']}%).")
    print("  • Prefer the file with the LOWER cross-speaker merge rate; if those tie, "
          "the lower fragment rate. Confirm the winner by ear on 2-3 Q/A exchanges.")


if __name__ == "__main__":
    main(sys.argv[1:])
