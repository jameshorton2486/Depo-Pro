# ADR-023C — Proceedings Event Contract

## Decision

Wave 23C preserves the callback-facing synthetic-event ID suffixes: `_off`, `_on`,
and `_conclusion`.

## Context

`transcribe-callback` uses these suffixes to select source sections, insertion anchors,
and timestamps. Replacing them with opaque numeric IDs would silently misplace or omit
procedural events.

## Consequence

`boundaryEngine` may normalize procedural text and deduplicate a supplied section batch,
but callback-wide deduplication is deferred to a focused callback-contract PR. This avoids
changing the callback contract during Wave 23C.