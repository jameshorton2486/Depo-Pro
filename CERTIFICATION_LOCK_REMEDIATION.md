# Certification Lock Remediation

## Outcome

Certification is now an explicit, durable transition rather than a side effect of completing a checklist. A transcript is exportable only after `certification_date` is persisted, and editor mutation routes reject changes to a certified case with HTTP 409.

## Invariants

- Checklist readiness does not certify a transcript.
- Certification requires the user to select **Certify Transcript**.
- Certification controls are read-only after certification.
- TXT and JSON export require a complete checklist, statement, and certification date.
- Working text, review state, speaker mapping, suggestion actions, and AI-review mutations are blocked after certification.
- A certification row without a date is not presented as certified in the case browser.

## Reopening

This change intentionally does not add an uncertify or reopen action. A future reopening workflow must be permission-gated and audited; silently clearing `certification_date` would violate the transcript-integrity contract.
