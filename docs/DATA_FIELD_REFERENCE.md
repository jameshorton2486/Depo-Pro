> **Provenance note for the web app (`depo-pro`, Vite/React/Supabase):** Extracted from `DEPO-PRO_Data_Field_Reference.docx` in Downloads on June 5, 2026. This document governs field source ownership for Prompt 3C and later intake/parser work. Where this reference and repo-local shapes disagree, preserve source-ownership semantics and log local shape deltas in `CONTRACT_NOTES.md` rather than renaming the frozen contract.

DEPO-PRO
Data Field Reference
UFM Template Fields and Deepgram Transcription Fields — Structure and Application Usage
Repository: depo_final_wave8  ·  Compiled June 5, 2026
Sources: DEPO-PRO_UFM_Data_Dictionary_v2.md · DEPO-PRO_Field_Template_Matrix.md · backend/deepgram/client.py · backend/transcript/assembler.py · backend/db/schema_v1–v12 · backend/api/packaging.py · backend/packaging/admin_pages.py

1. Overview: Two Data Domains, One Certified Package
DEPO-PRO produces a certified Texas UFM-compliant deposition transcript by merging two entirely separate data domains. Understanding which domain owns which field is the single most important architectural rule in the system, because the two domains have opposite mutability rules and different sources of truth.

UFM Metadata Domain
Deepgram Transcript Domain
What it holds
Case, parties, counsel, session, reporter, firm, certificate and billing facts — everything printed on the administrative pages (caption, appearances, indices, certificate).
The spoken record itself: word-level tokens with timestamps, confidence scores, and diarized speaker turns.
Where it comes from
NOD/court-order parsing, the job sheet, on-record statements, saved reporter/firm profiles, operator entry, and post-proceeding capture.
The Deepgram Nova-3 batch REST API (or a deterministic offline fallback when no API key is configured).
Where it lives
SQLite intake tables (cases, parties, attorneys, case_attorneys, sessions, reporters, reporting_firms) plus the per-job deposition_metadata table.
The immutable raw.json packet on disk plus the transcript_jobs / transcript_speakers / transcript_utterances / transcript_words tables.
Mutability
Editable until packaging; the package is held at DRAFT while required fields are missing.
RAW layer is immutable after ingestion (SHA-256 hash-anchored); edits live only in the WORKING layer.
Where they converge
The Packaging Engine (Wave 20): _build_metadata_for_job() assembles the metadata dict that the five administrative page generators consume.
The Pagination/Geometry layer renders the working transcript body; a locked Certification Snapshot freezes it for the package.

The rest of this document specifies each domain field-by-field, then documents exactly how the application consumes the fields end to end.

2. UFM Template Data Fields
Authority: the Texas Uniform Format Manual for Texas Reporters' Records (07/01/2010 edition), reconciled in the repo's authoritative data dictionary (docs/DEPO-PRO_UFM_Data_Dictionary_v2.md). Scope is the Texas civil freelance deposition — the five-template set: Caption, Appearances, Master Index, Exhibit Index, and Reporter's Certificate, plus Changes & Signature and Certificate of Non-Appearance.
2.1 Source Codes (Field Ownership)
Every field is owned by exactly one extraction source. Reliability descends in this order — an explicit document beats an on-record statement, which beats inference. The ownership principle: a NOD is written before anyone speaks, so it can never supply on-record facts (actual times, who appeared, exhibits marked) — those belong to the transcript parser or operator entry.
Code
Meaning
Examples of fields it owns
ORDER
Court order compelling/scheduling the deposition (highest authority; parser deferred — seam reserved)
Overrides to any NOD field
NOD
Notice of Deposition (pre-proceeding paper)
Cause number, court, county, parties, attorney names/addresses, witness identity, noticing party
JOB
Reporting-firm job sheet / scheduling worksheet
Scheduled start, service type, custodial attorney, cost party
RECORD
Stated on the record (the transcript parser's territory)
Actual start/end times, situs, appearances, sworn status, exhibits marked, interpreter oath, time on record
PROFILE
Saved reporter/firm profile (looked up, never parsed)
CSR number and expiration, firm registration number, firm address, signature file
COMPUTED
Derived downstream (never a parse target)
Volume number, index page references, caption display string, page counts
POST
Captured after the proceeding
Errata line items, certificate execution date/county/state, charges

2.2 Template Legend
Code
Template
UFM authority
CAP
Title / Caption page
§3.1 (field list); Tex. R. Civ. P. 203; UFM Figure 3
APP
Appearances page
§3.1j (attorney name, address, party represented — freelance floor)
IDX
Master Index
§3.24 (freelance index)
EXI
Exhibit Index
§5; §3.24a-7/8 (certified questions, requested documents)
CERT
Reporter's Certificate
§3.4 (freelance certificate); TRCP 203.2(e); UFM Figures 8/8A
SIG
Changes & Signature page
§3.24a-5 (errata)
CNA
Certificate of Non-Appearance
TRCP 203 path; modeled as non_appearance_events

2.3 Field Groups (What the Fields Look Like)
Each table below shows the canonical field name, a worked example from the Benitez freelance deposition, the owning source, whether the UFM mandates it (Yes = mandatory with section cited · Cond = if applicable · Firm = above the freelance manual floor, a firm choice), and which templates consume it.
A. Case & Court (from NOD / Court Order)
Field
Example
Source
Required
Templates
cause_number
2025CI11923
NOD
Yes §3.1d
CAP, CNA, CERT
case_number_label
CAUSE NO.
NOD
Yes §3.1d
CAP, CNA
jurisdiction_type
texas_state
NOD
—
(routing)
court_name
District Court
NOD
Yes §3.1a
CAP, CNA
judicial_district
408th
NOD
Yes §3.1a
CAP, CNA
county
Bexar
NOD
Yes §3.1b
CAP, CNA, CERT
state
Texas
NOD
Yes §3.1b
CAP, CERT

B. Parties & Caption (from NOD / Court Order)
Field
Example
Source
Required
Templates
plaintiff_full_name
LOLA PAVAN, INDIVIDUALLY AND AS NEXT FRIEND OF A.S., A MINOR
NOD
Yes §3.1c
CAP, CNA
defendant_full_name
FRANK ECHEVARRIA BENITEZ D/B/A FEB TRANSPORT AND JUNIOR BENITEZ
NOD/RECORD
Yes §3.1c
CAP, CNA
party.role
plaintiff / defendant
NOD
Yes §3.1c
CAP
party.role_modifier
as next friend of
NOD
Yes §3.1c
CAP
party.entity_type
individual / llc
NOD
Yes §3.1c
CAP
party.fka_or_dba
D/B/A FEB Transport
NOD
Yes §3.1c
CAP
case_style_display
derived caption string
COMPUTED
—
CAP
Caption caveat: when the NOD spelling (“Yunior”) conflicts with the on-record caption (“Junior”), the parser must flag the conflict, never silently pick. The on-record caption governs the printed transcript.
C. Counsel / Appearances (repeated per attorney, both sides)
NOD owns parties-on-paper; RECORD owns who actually appeared — these can differ. In Benitez, Justin Hill signed the NOD (noticing/custodial role) but Gabriel Narvaez appeared and examined. Both are real and both are needed.
Field
Example (examining)
Source
Required
Templates
atty.honorific
Mr.
RECORD
Cond
APP, IDX
atty.full_name
Gabriel Narvaez
NOD/RECORD
Yes §3.1j
APP, IDX, CERT
atty.last_name
Narvaez
COMPUTED
Yes
IDX, CERT
atty.bar_number
24057902 (Hill)
NOD
Firm (Official-only §3.1j)
APP
atty.firm_name
Hill Law Firm
NOD/RECORD
Yes §3.1j
APP
atty.street_address
445 Recoleta Rd.
NOD
Yes §3.1j
APP
atty.city/state/zip
San Antonio, TX 78216
NOD
Yes §3.1j
APP
atty.phone
(210) 960-3939
NOD
Firm (Official-only)
APP
atty.email
justin@jahlawfirm.com
NOD
Firm
APP
atty.party_represented
PLAINTIFF
NOD/RECORD
Yes §3.1j
APP, IDX
atty.role
noticing / custodial / examining / defending
NOD+RECORD
Yes
IDX, CERT
atty.appearance_type
Examining Counsel
RECORD
Cond
APP
atty.is_lead
true
NOD
—
(intake)

D. Session / Proceeding (JOB for scheduled; RECORD for actual)
Field
Example
Source
Required
Templates
type_of_proceedings
Oral and Videotaped Deposition
NOD/RECORD
Yes §3.1f
CAP
deposition_date
April 16, 2026
NOD/JOB
Yes §3.1g
CAP, CNA, CERT
day/month/year parts
16th / April / 2026
COMPUTED
Yes §3.1g
CAP, CERT
scheduled_start
10:00 a.m.
JOB
—
(scheduling)
actual_start_time
10:03 a.m.
RECORD
Yes §3.1g
CAP
end_time
11:49 a.m.
RECORD
Yes §3.1g
CAP
location_address (situs)
2900 Blue Wing Road, San Antonio, Texas
RECORD
Yes §3.1g
CAP, CNA
location_type
zoom / in_person / hybrid / phone
NOD/JOB
Cond
CAP
method_of_recording
oral stenography
RECORD
Yes §3.1i
CAP
volume_number
Volume 1 of 1 (no Roman numerals)
COMPUTED
Yes §3.1h
CAP
noticing_party
Plaintiff
NOD
Yes
CAP, CNA
service_type
CR_plus_Zoom
JOB
—
(scheduling)
read_and_sign
retained / waived
NOD/JOB/RECORD
Yes
SIG, CERT
witness_name
Frank Echevarria Benitez
NOD/RECORD
Yes §3.10
CAP, IDX, CERT, CNA
witness_type
individual / corporate_rep_30b6 / expert / custodian
NOD
Cond
CAP, IDX
witness_sworn
yes (sworn through interpreter)
RECORD
Yes §3.10–3.11
CERT
interpreter_required
yes
NOD/RECORD
Yes §3.11 if used
CERT

E. Reporter & Reporting Firm (JOB / PROFILE / RECORD / Certificate)
Field
Example
Source
Required
Templates
reporter_full_name
Miah Bardot
RECORD/PROFILE
Yes
CAP, CERT
reporter_csr_number
12129
PROFILE
Yes
CERT
csr_expiration_date
6-30-2026
PROFILE
Yes
CERT
reporter_credentials
CSR / RPR / CRR
PROFILE
Cond
CERT
reporting_firm_name
SA Legal Solutions
NOD/PROFILE
Cond
CERT
firm_registration_no
(from firm profile)
PROFILE
Yes §3.4 (if firm)
CERT
firm_address/city/state/zip/phone
3201 Cherry Ridge B 208-3, San Antonio, TX 78230
PROFILE
Cond
CERT
Firm registration and firm address come from a saved firm profile — never from the NOD or the certificate page. A reporter's personal address on the cert may legitimately differ from the firm address (independent contractor case).
F. Other Attendees (RECORD only — never on the NOD)
Field
Example
Source
Required
Templates
videographer_name
Mario Leal
RECORD
Cond
APP
videographer_company/contact
—
RECORD/JOB
Cond
APP
interpreter_name
Mauricio Dominguez
RECORD
Cond §3.11
APP, CERT
interpreter_language_pair
Spanish ⇄ English
RECORD
Cond §3.12
CERT
interpreter_sworn
yes
RECORD
Cond
CERT
interpreter_cert_number
—
RECORD
Cond
CERT
other_attendee name/role
(also-present list)
RECORD
Cond
APP

G. Exhibits, Requested Documents, Certified Questions (RECORD)
Field
Example
Source
Required
Templates
exhibit_number
Exhibit 1
RECORD
Cond
EXI, IDX
exhibit_description
MRI scans
RECORD
Cond
EXI, IDX
exhibit_page_reference
p. 14
COMPUTED
Cond
EXI, IDX
exhibit_bates_stamp
BATES_0001–0012
RECORD
Cond
EXI
exhibit_offered_by / admitted
—
RECORD
Cond
EXI
requested_doc no/desc/page
(duces tecum)
NOD/RECORD
Cond §3.24a-8
EXI
certified_question no/desc/page
—
RECORD
Cond §3.24a-7
EXI

H. Index Page References (COMPUTED — pagination, never parsed)
appearances_page, stipulations_page, examination_page_1..4, signature_page, certificate_page, and exhibit_page_n all come from the Wave 19/20 Pagination Engine, not from any input document. Required by §3.24 and consumed by IDX. They are listed in the dictionary only so they are not mistaken for parse targets.
I. Certificate / Execution / Billing (POST / JOB / Certificate)
Field
Example
Source
Required
Templates
custodial_attorney
Justin Hill / Hill Law Firm
NOD/JOB
Yes §3.4
CERT
time_on_record (per atty)
Narvaez 01:35 · Madrid 00:00
RECORD
Yes §3.4 / TRCP 203.2(e)
CERT
charges_amount
450.00
JOB/POST
Yes §3.4
CERT
cost_party
Plaintiffs
NOD/JOB
Yes §3.4
CERT
cert_execution day/county/state
(filled at certification)
POST
Yes
CERT
transcript_page_count / volume_count
48 / 1
COMPUTED
Yes
CERT, CAP
reporter_signature_file
(from profile)
PROFILE
Cond
CERT

J. Errata / Changes & Signature (POST — from the witness)
Field
Example
Source
Required
Templates
errata.page / line
12 / 5
POST
Cond §3.24a-5
SIG
errata.original_text / corrected_text
yes → no
POST
Cond
SIG
errata.reason
transcription error
POST
Cond
SIG
errata.witness_signed / signature_date
yes / 2026-05-15
POST
Cond
SIG

K. CNA-Specific Fields
Field
Example
Source
Required
Templates
cna.scheduled_for / statement_time
(datetimes)
NOD/RECORD
Cond
CNA
cna.attorneys_present
(list)
RECORD
Cond
CNA
cna.reserved_right_to_redepose
yes
RECORD
Cond
CNA

2.4 How the Application Uses the UFM Fields
Storage (SQLite, schema v1 + v9)
Intake fields are normalized into Layer 1 tables, each mapping directly onto a dictionary group:
Table
Holds (dictionary group)
Key columns
cases
Group A — Case & Court
jurisdiction_type, case_number_label, case_number_value, judicial_district, county, state, caption_full
parties
Group B — Parties & Caption
role, name, role_modifier, fka_or_dba, entity_type, related_to_party_id, sort_order
attorneys
Group C — Counsel (people)
full_name, bar_state, bar_number, email, phone, fax
case_attorneys
Group C — Counsel (per-case junction)
represents_party_id, firm_name, firm address fields, role_label, speaker_label, is_lead, is_noticing_party
sessions
Group D — Session / Proceeding
scheduled_at, witness_name, witness_type, location_type, location_address, service_type, reporter_id, reporting_firm_id, outcome
reporters
Group E — Reporter
full_name, csr_number, csr_state, csr_expiration, default_reporting_firm_id
reporting_firms / _offices
Group E — Firm profile
name, firm_registration_number, address_line, city, state, zip, phone, is_default
deposition_metadata (v9)
Group I — Certificate fields
volume, examination_disposition, officer_charges_amount, charges_party, certificate_service_date, time_per_party_json, also_present_json
transcript_exhibits (v12)
Group G — Exhibits
exhibit events feeding the Exhibit Index

Note the speaker_label column on case_attorneys (e.g. “MR. NUNEZ”) — it is derived from the attorney's full name specifically so the Deepgram diarization mapping in Stage 3 can bind speaker indices to counsel. This is one of the deliberate bridges between the two data domains.
The Packaging Metadata Builder (backend/api/packaging.py)
At package-assembly time, _build_metadata_for_job(job_id, override) walks every persisted source and produces one flat metadata dict. The caller-supplied override dict wins on every key, so explicit request-body values always beat auto-populated ones. The pull order:
Case: cause_number, caption, county, judicial_district, plus a composed court string; party names from the parties table (falling back to splitting caption_full on “VS.”); appearances from case_attorneys (falling back to intake parser metadata).
Session: witness_name, party_at_instance, custodial_attorney, location; proceedings_date plus month/day(ordinal)/year parts and 12-hour start_time/end_time derived from scheduled_at; deposition_method mapped from location_type (zoom → “Zoom videoconference”, in_person → “stenographic”, etc.).
Reporter & firm: reporter_name, reporter_csr_number, reporter_csr_expiration, firm_registration_no, firm_address, firm_city_state_zip — looked up from the reporter profile and its default firm office.
Job certificate fields: volume, examination_disposition, officer_charges_amount, charges_party, certificate_service_date, time_per_party, also_present — from deposition_metadata, written through the PUT /api/depo-meta/jobs/{job_id} endpoint.
Computed: certified_day/month/year default to today's date (ordinalized) for the certificate execution block.
Template Population (backend/packaging/admin_pages.py)
Each of the administrative pages is a template-driven generator that consumes only the structured metadata dict — never parsed transcript text. The wording is the exact Texas statutory language (TRCP 203.2/203.3; UFM Figures 3, 4, 8, 8A). Two rules govern population:
Bracketed placeholders: any missing metadata value renders as a [BRACKETED] placeholder — e.g. [CAUSE NUMBER], [WITNESS NAME], [CSR NUMBER], [##/##/####] for the CSR expiration — and the package is held at DRAFT until the data is supplied. Certification is the gate, not intake.
Template contract: when building a template's population code, every field mapped to that template in the matrix must resolve to a value or an explicit “missing required” before packaging. The Required = Yes rows seed the future ufm_validation ERROR set; Cond rows become WARNING-if-context-present.
Parser Contract
Every NOD-source row in the matrix is a NOD-parser extraction target; every RECORD-source row is a transcript-parser target; PROFILE, COMPUTED, and POST rows are never parsed. Each parser is built to exactly its rows — nothing more. A planned write-boundary guard keyed on the Source column will enforce that a writer may only touch fields it owns (profile, certificate, and billing data are never parser-writable).
Scale of the Field Set
The current live intake captures 16 fields; the five templates need roughly 50 parsed fields plus computed page references and post-proceeding data. ufm_schema_v1 already models about 75–80% of it — the open work is exposing that richness in intake and closing the known gaps (Section 5).

3. Deepgram Data Fields
Authority: backend/deepgram/client.py (request side) and backend/transcript/assembler.py (response side). DEPO-PRO calls Deepgram's pre-recorded batch REST endpoint (https://api.deepgram.com/v1/listen) directly with the Python standard library — no SDK — keeping the desktop build dependency-light. When DEEPGRAM_API_KEY is absent or DEPOPRO_TRANSCRIPTION_PROVIDER=offline, a deterministic synthetic transcript with the identical response shape is generated so the entire pipeline can run and be tested with no network; offline output is flagged non-authoritative and cannot be certified.
3.1 Request Parameters (DEEPGRAM_PARAMS)
Parameter
Value
Why it is set this way
model
nova-3
The Nova-3 batch model specified in the DEPO-PRO technical spec.
punctuate
true
Punctuated tokens are the preferred raw_text form downstream.
paragraphs
true
Presentation flag; safe because the full JSON is persisted verbatim as the immutable raw packet.
diarize_model
latest
Enables diarization AND selects Deepgram's v2 diarizer (much better speaker separation than legacy diarize=true, which stays pinned to v1). A future live/streaming path must use diarize=true instead — diarize_model is rejected on streaming.
filler_words
true
Legal transcripts require verbatim hesitations (“um”, “uh”); with this off, Deepgram strips them.
utterances
true
Speaker-turn blocks are the primary grouping the assembler persists one-to-one.
smart_format
true
Presentation flag affecting rendered text; acceptable for the same raw-packet reason as paragraphs.
keyterm (repeated)
up to 100 terms
Nova-3 Keyterm Prompting: in-context vocabulary boosting. Terms beyond 100 are silently ignored by Deepgram, so normalize_keyterms() collapses whitespace, drops case-insensitive duplicates, and caps at 100.

Keyterm source: Stage 1 intake writes the authoritative list to data/cases/{case_id}/keyterms.json; ingestion loads it per job (a missing file is fine). An audio preset may supply params_override, which merges onto DEEPGRAM_PARAMS with the override winning; base keys like filler_words are never dropped by an override that does not mention them. Operational guards: 250 MB upload cap (standard-library uploader), per-extension Content-Type header (mp3, wav, m4a, mp4, mov, aac, ogg, flac, webm), 600-second timeout, and DeepgramError raised on HTTP/network/JSON failure so the job can be marked failed.
3.2 Response Shape (What Comes Back)
Both the real API and the offline fallback return the same Deepgram batch shape. The assembler reads exactly these paths:
Path
Fields read
Meaning
metadata
duration, model_info, transcription_source
Audio duration in seconds; model identity; 'offline-fallback' marker when synthetic.
results.channels[0].alternatives[0]
transcript, confidence, words[]
The flat word list for channel 0's primary alternative — the fallback grouping source if utterances are absent.
results.channels[0]...words[n]
word, punctuated_word, start, end, confidence, speaker
One spoken token: bare lowercase form, punctuated form, start/end offsets in float seconds, model confidence [0.0–1.0], diarization speaker index (0, 1, 2, ...).
results.utterances[n]
speaker, start, end, transcript, confidence, words[]
One continuous speaker turn: its diarization index, time span, concatenated verbatim text, average confidence, and its owned slice of word objects.

3.3 Normalization: Deepgram Field → Canonical Word Object → Database Column
assembler.normalize() performs structural assembly only — continuity, ordering, speaker grouping. No punctuation rewriting, cleanup, or legal formatting happens here (“faithful transcript acquisition, not transformation”). Deepgram utterances persist one-to-one as canonical utterances; no same-speaker merging occurs at ingest, because the canonical/raw layer must faithfully mirror the provider response. The mapping:
Deepgram field
Canonical word object / transcript_words column
Notes
punctuated_word (else word)
raw_text
IMMUTABLE verbatim ASR token; never modified after ingestion.
—
working_text
Editable override; NULL means “unedited, use raw_text”. The entire Workspace edit layer lives here.
speaker (word-level, else utterance)
speaker_index
Word-level speaker wins; falls back to the utterance's index.
start / end
start_time / end_time
Float seconds of audio offset, preserved exactly.
confidence
confidence
Rounded to 4 decimals; drives low-confidence highlighting in review.
— (derived)
is_filler
1 when the token is in {um, uh, uh-huh, huh-uh, mm-hmm, er, ah}; preserved verbatim but flagged so export can optionally suppress.
— (derived)
reviewed
0 at ingest; flipped by the review workflow.
— (generated)
word_id / utterance_id / word_index
UUIDv4 identities plus a global strict 0-based ordering within the job.

Deepgram field
transcript_utterances / transcript_speakers column
Notes
utterances[n] (ordinal)
utterance_index
Strict 0-based ordering within the job.
speaker
speaker_index, speaker_label
Label is generated (“Speaker 0”, “Speaker 1”, ...).
start / end
start_time / end_time
Turn time span.
transcript
text
Concatenated verbatim text (raw layer); rebuilt from word raw_text if absent.
confidence
avg_confidence
Falls back to the mean of the turn's word confidences.
— (aggregated)
transcript_speakers: word_count, assigned_name, speaker_role
Per-speaker word counts at ingest; assigned_name and speaker_role (WITNESS, EXAMINING_ATTORNEY, REPORTER, ...) are filled later by the reporter in the Workspace speaker-mapping stage.

3.4 Persistence and Job Tracking
Immutable raw packet: the full provider JSON is written exactly once to data/transcripts/{job_id}/raw.json and treated as immutable (Wave 19B anchors it with SHA-256 hashing; packaging and certification are blocked with HTTP 409 if verification fails). working.json sits alongside as the editable packet.
transcript_jobs row: one row per uploaded media file — source_filename, size, media_kind, sequence_index (batch ordering), status lifecycle (queued → preprocessing → transcribing → assembling → completed/failed), engine ('deepgram-nova-3'), transcription_source ('deepgram' | 'offline-fallback'), duration_seconds, word/utterance/speaker counts, avg_confidence, and the audio/raw/working paths.
Canonical word storage: the transcript is stored as canonical word objects, never as a giant mutable string. This is the non-negotiable Screen 2 design principle: the RAW layer is immutable; all edits live in the WORKING layer (transcript_words.working_text).
3.5 Downstream Consumption of Deepgram-Derived Data
Stage
What it consumes
What it produces
Speaker mapping (Stage 3)
speaker_index + transcript_speakers; case_attorneys.speaker_label
assigned_name / speaker_role bindings (MR. NARVAEZ, THE WITNESS)
Review / readback
confidence (low-confidence highlighting), is_filler, timestamps for audio sync
reviewed flags; working_text edits
Correction engine (G·A·M·T·F·U + Stage X)
WORKING lines from render.py
Deterministic corrections, logged per stage
Export render (Wave 12/19A)
Working lines + speaker labels
25-line paginated pages with Q./A. indentation and colloquy formatting — the same module feeds preview and DOCX/PDF so they cannot drift
Snapshots & certification
Frozen utterance/word state
Locked Certification Snapshot; CERTIFIED package (one-way)


4. Where the Two Domains Converge: the Certified Package
POST /api/packages/jobs/{job_id} assembles a DRAFT package from a locked Certification Snapshot. The flow, in order:
1. Integrity gate — the immutable raw.json is hash-verified; failure blocks packaging with HTTP 409.
2. Metadata assembly — _build_metadata_for_job() merges every UFM source (Section 2.4) under caller overrides.
3. Body assembly — the snapshot's frozen utterances/words are paginated by the Geometry Layer; exhibit events feed IndexInputs.
4. Page generation — the administrative page generators render CAP, APP, IDX, EXI, and CERT from the metadata dict, with [BRACKETED] placeholders for anything missing.
5. Certification — POST /api/packages/{package_id}/certify is one-way finalization; a certified package is immutable, and any change requires assembling a new package version. All exports (DOCX/PDF/RTF/TXT) are backend-only.
5. Known Field Gaps (Tracked in the Data Dictionary)
These UFM-relevant fields are identified in the authoritative dictionary as missing or thin in the current schema/pipeline. They render as bracketed placeholders or are simply absent until built:
method_of_recording [UFM-REQ §3.1i] and type_of_proceedings [§3.1f] — no dedicated schema home; deposition_method is currently inferred from location_type.
Attorney honorific and appearance_type (examining / defending / of counsel); explicit attorney roles deferred to a noticing/custodial/examining/defending column set on case_attorneys.
Videographer — no table at all; interpreter table exists but is thin (no cert_number).
Subpoena duces tecum / requested-documents and certified-questions line items [§3.24a-7/8].
Errata / changes-and-signature line items — no table [§3.24a-5].
Certificate execution metadata (execution county/state, signature file) and cost_party / charges_amount capture beyond the deposition_metadata text columns.
Deferred by design: deposition_orders table + court-order parser (ORDER seam reserved), the provenance write-guard, and the packaging-time ufm_validation gate.

Separately, on the Deepgram side: the schema defines transcript_words.working_text as the editable layer, but no backend writer for it exists yet — working-transcript edits currently live only in frontend memory. Until the working_text writer ships, the WORKING layer described in Section 3 is a schema contract, not a persisted reality.
