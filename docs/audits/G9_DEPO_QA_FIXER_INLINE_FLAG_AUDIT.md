# G9 — depo_qa_fixer.py Inline Flag Audit

Date: 2026-06-25
Branch: `feature/stage3-workspace-core`
Auditor: Codex (remote read — see §File located)

## File located

`depo_qa_fixer.py` is not present in the `feature/stage3-workspace-core` SaaS repository.

Search evidence:

- no `depo_qa_fixer.py` file exists in this repo
- no `depo_qa_fixer` import or symbol exists in this repo
- no desktop `spec_engine` tree is present in this repo

The file is confirmed to live in the separate desktop app at:

`C:\Users\james\PycharmProjects\depo_transcribe\spec_engine\qa_fixer.py`

That desktop repository is outside this environment, so this audit is necessarily partial.

## Inline flag behavior

Cannot be determined from the SaaS repo alone.

What is known from the canonical standards set:

- DP-012 §6 requires inline flag stripping to remove only the bracket span
- the verbatim token preceding the flag must remain in the output
- dropping the token with the flag is forbidden because it silently alters testimony

What is known from the available reference path:

- the wave8/reference flag marker format is bracket-based
- the actual desktop clean-delivery strip implementation is not present here

Therefore this audit cannot prove whether `qa_fixer.py` preserves the verbatim token or drops it.

## Block flag behavior

Also unverified from this repo alone.

The standards distinguish two behaviors:

- inline flags: remove the bracket span only, preserve the token
- block flags: remove the whole flag line on clean delivery

Whether the desktop implementation handles those in one code path or separate ones cannot be confirmed without reading the desktop file.

## Implementation structure

Unknown from this repository.

The only defensible conclusion is that the implementation must be checked locally in the desktop repo. The SaaS repo contains no runtime code for `depo_qa_fixer.py`, and `document_builder.py` here contains no SCOPIST flag handling.

## Verdict

INCOMPLETE

## Risk

If the desktop cleaner strips `[SCOPIST: FLAG N: ...]` together with the preceding verbatim token, the certified DOCX path silently deletes spoken content from the legal record. That is a transcript-integrity failure, not a cosmetic issue. Because the desktop path is the beta certified DOCX path, this remains a real blocker for certified DOCX confidence until the desktop file is read locally.

## Minimal fix

No patch is proposed from this repo because the implementation file is not present. The required local check is to locate every regex or cleanup branch that matches `[SCOPIST` and confirm it removes only the bracketed span for inline flags while leaving the preceding token untouched.

## Required local next action

Run the following against the desktop repo:

```powershell
Get-Content "C:\Users\james\PycharmProjects\depo_transcribe\spec_engine\qa_fixer.py"

Select-String -Path "C:\Users\james\PycharmProjects\depo_transcribe\spec_engine\*.py" `
  -Pattern "SCOPIST|FLAG|strip|clean"

Get-ChildItem -Recurse -Filter "*.py" `
  "C:\Users\james\PycharmProjects\depo_transcribe\spec_engine\tests\" |
  Select-String "SCOPIST|FLAG|inline"
```

Update this audit with a PASS / FAIL / PARTIAL verdict after that local read.
