# Formatter Owner Audit

## Scope

- Pull request: #20 — PR #17B Formatter Service Infrastructure
- Owner: Formatter Service
- Base: `feature/stage3-workspace-core`
- Evidence date: 2026-07-21 (America/Chicago) / 2026-07-22 UTC

## Ownership

Formatter Service owns `formatter_core`, the private Cloud Run worker, Cloud Tasks request handling, physical-line pagination, artifact generation, Cloud Storage persistence, signed URLs, retry/idempotency, and processing-lease lifecycle.

Formatter Service consumes the completed Unified Render Model and versioned export request. It does not own or modify compiler semantics, geometry decisions, Unified Rendering construction, Editorial normalization, Certification, the Export Contract, Stage S, or UI behavior.

## Render-Model Consumption

The formatter is a pure consumer of the completed render model:

- every line retains its declared geometry role, first-line tab, text tab, and continuation indent;
- global margins, format-box width, line spacing, and lines-per-page settings remain input-owned;
- role placement is not reconstructed from transcript wording;
- centered lines remain centered;
- Q/A, speaker, parenthetical, header, and continuation placement survives into DOCX layout;
- PDF is produced only by a layout-faithful DOCX conversion engine. If no faithful converter is available, the export fails retryably instead of returning a geometry-stripped PDF.

## Pagination and Numbering

The formatter expands logical render lines into physical wrapped lines using the supplied geometry before assigning line numbers and page boundaries. Artificial paragraph separators are not inserted. Numbered blank lines therefore arise only when an explicit render-model line requires them, never from string joining.

## Task and Worker Lifecycle

- Malformed named tasks are recorded as terminal, non-retryable failures and acknowledged with HTTP 200.
- A malformed redelivery cannot overwrite an already completed job.
- `(transcriptId, idempotencyKey)` is claimed before formatting.
- Completed jobs are immutable under duplicate dispatch.
- Processing leases use unique ownership tokens, conditional generation updates, periodic renewal, stale recovery, and owner-only release.
- A worker that loses its lease cannot publish completion or artifacts as authoritative output.
- Signed URL TTL begins after formatting completes.

## Regression Evidence

Formatter regressions cover:

- geometry preservation for all supported line roles;
- centered positioning and Q/A wrap geometry;
- absence of artificial numbered blank lines;
- physical wrapped-line pagination;
- terminal malformed-task handling;
- completed-job protection from malformed redelivery;
- idempotent duplicate dispatch;
- stale-lease recovery;
- processing-lease renewal and ownership-safe release;
- lost-lease publication prevention;
- runtime-identity signed URLs;
- faithful PDF conversion failure when no layout-preserving converter exists.

## Local Validation

- Formatter suite: 24 tests passed.
- Full repository suite: 110 files, 692 tests passed.
- Typecheck: passed.
- Lint: passed.
- Production build: passed.
- Python bytecode compilation: passed.
- `git diff --check`: passed.
## Production Path

The production acceptance path is:

`Cloud Tasks → private Cloud Run → FastAPI /tasks/format → formatter_core → Cloud Storage → signed URLs → ExportJob COMPLETED`

Deployment identifiers, synthetic job evidence, object generations, and retry results are recorded in `docs/operations/FORMATTER_SERVICE_DEPLOYMENT.md` after each production acceptance run.

## Conclusion

Formatter Service is the sole owner of artifact formatting infrastructure and worker lifecycle. The implementation consumes upstream contracts without changing them, preserves supplied geometry, paginates physical transcript lines deterministically, and maintains terminal/idempotent behavior across Cloud Tasks retries.