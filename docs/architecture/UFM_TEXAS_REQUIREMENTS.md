# Texas UFM Data Requirements — DEPO-PRO Case Assembly

**Status:** Authoritative jurisdiction requirements source for Texas deposition transcripts.
**Location when committed:** `docs/architecture/UFM_TEXAS_REQUIREMENTS.md`
**Supersedes:** The California-specific `UFM_DATA_DICTIONARY.md` is NOT applicable to Texas cases. Where the two conflict, this document governs Texas work.
**Source:** Texas Uniform Format Manual (UFM) data collection requirements, as compiled by the project owner from the Texas UFM. Template figures (errata sheet, jurat, certificates, witness index, examination blocks) live in `Texas_Uniform_Format_Manual_Comprehensive_Final.docx`.

This document defines, for the Intake Case Assembly Engine: (1) every field Texas transcript production requires, (2) which downstream artifact each field drives, and (3) the validation tier each field belongs to.

---

## 1. Witness / Deponent

| Field | Required | Drives |
|---|---|---|
| Full legal name | YES | Caption, witness index, jurat, errata sheet |
| Prefix / suffix / title | If applicable | Caption and appearance formatting |
| Party affiliation (Plaintiff / Defendant / Third Party) | YES | Caption, appearance page |
| Corporate-representative status (yes/no + entity represented) | YES when applicable | Caption wording, appearance page |
| Read & Sign election: read-and-sign vs. signature waived | YES — stated on the record | Jurat page vs. waiver language; errata sheet inclusion; certification finalization |
| Post-record spelling corrections | If any | Retroactive overrides; must be confirmed on the record and traceable |

Note: Read & Sign is COLLECTED at Intake (the witness's stated election on the record) and FINALIZED at Certification (completed / waived / expired). Two distinct states.

## 2. Attorneys (each appearing attorney)

| Field | Required | Drives |
|---|---|---|
| Full name with Mr./Ms. and suffixes | YES | Appearance page, examination blocks |
| Party represented | YES | Appearance page ("FOR THE PLAINTIFF:") |
| Law firm / office name | YES | Appearance page |
| SBOT (State Bar of Texas) number | YES | Appearance page |
| Physical address | YES | Appearance page |
| City / State / Zip | YES | Appearance page |
| Phone | YES | Appearance page |
| Email | YES | Appearance page |
| **Time used on the record** (hours:minutes, or "reserved at time of trial") | YES for Reporter's Certificate ¶4 | Reporter's Certificate paragraph 4 |

Note: Time Used is only knowable AFTER the deposition. It is NOT collected at Intake; it is edited in a post-record workflow (Workspace or Certification era). Intake owns attorney identities only.

## 3. Interpreter (when present)

| Field | Required | Drives |
|---|---|---|
| Full name | YES | Appearance page, THE INTERPRETER speaker label |
| Source language | YES | Interpreter parentheticals, certificate language |
| **Oath administered (yes/no)** | YES | "(The witness was sworn through the interpreter)" parenthetical; swaps the standard Reporter's Certificate for the **Interpreted Transcript Certificate** |
| Certification / credential info | If applicable | Certificate support |

## 4. Videographer / Technical Staff (when present)

| Field | Required | Drives |
|---|---|---|
| Full name | YES | "ALSO PRESENT" section |
| Role / title | YES | "ALSO PRESENT" section |

## 5. Other Attendees

| Field | Required | Drives |
|---|---|---|
| Full name(s) | YES for each | "ALSO PRESENT" section |
| Role / title (corporate representative, paralegal, spouse, expert consultant, etc.) | YES | "ALSO PRESENT" section |

## 6. Court Reporter (Deposition Officer)

| Field | Required | Drives |
|---|---|---|
| Full name | YES | Reporter's Certificate, signature block |
| Texas CSR license number | YES | Certificate, signature block |
| **CSR license expiration date** | YES | Certificate signature block |
| **Firm registration number** | YES | Certificate signature block |
| Firm name and address | YES | Certificate signature block |

## 7. Event & Method Logistics

| Field | Required | Drives |
|---|---|---|
| Reporting method (machine shorthand / via Zoom / in person / audio recording) | YES | Caption wording, certificate language |
| Location of proceeding: office/venue name | YES | Caption, certificate |
| City | YES | Caption, certificate |
| **County** | YES | Caption, certificate (Texas captions are county-anchored) |
| Date of proceeding | YES | Caption, certificate, jurat |
| Start time AND end time | YES (both, independently) | Transcript header/footer, certificate |
| Remote platform (when remote) | YES when applicable | Caption wording ("via Zoom") |

## 8. Case Caption

| Field | Required | Drives |
|---|---|---|
| Cause number | YES | Caption |
| Case style (party names as styled) | YES | Caption |
| Court (e.g., "193rd Judicial District Court") | YES | Caption |
| County | YES | Caption |
| Venue / jurisdiction line | YES | Caption |

---

## 9. Validation Tiers (specification for the Validation Engine)

**FAIL — blocks "Proceed to Transcript Creation":**
- Witness full legal name
- Cause number
- Case style / case name
- Court
- County
- Deposition date
- At least one attorney with party represented
- Reporting method
- Audio uploaded (durable, verified in storage — NOT a local file object)

**WARNING — proceed allowed, prominently flagged:**
- Any attorney missing SBOT number, address, phone, or email
- Reporter CSR number, expiration, or firm registration missing
- Interpreter present but source language or oath status missing
- Start/end time missing
- Witness party affiliation missing
- Read & Sign election not recorded

**INFO — completeness only (feeds Case Readiness Score, never blocks or warns):**
- Videographer details, other attendees, prefixes/suffixes, remote platform when not remote, supporting documents, scheduling notes

**Case Readiness Score:** non-blocking percentage over all FAIL+WARNING+INFO fields, always displayed with an explicit missing list, e.g.: `Case Readiness: 78% — Missing: Witness Read & Sign, Reporter Expiration, Interpreter Language`.

**Separate states rule:** `audio_uploaded` and `transcript_generated` are independent, durable, never-implied states. A green audio indicator must mean a verified storage object exists; a transcript indicator must mean a transcript record exists. Neither may be derived from the other.

---

## 10. Downstream Artifact Map (why these fields exist)

| Artifact | Consumes |
|---|---|
| Caption page | Cause number, style, court, county, venue, witness, date, method |
| Appearance page | Attorneys (all fields), interpreter, videographer, other attendees |
| Witness index / examination blocks | Witness name, examining attorneys |
| Interpreter parentheticals | Interpreter name, language, oath status |
| Reporter's Certificate | Reporter fields, time used per attorney (¶4), date, method |
| Interpreted Transcript Certificate | Substituted when interpreter oath administered |
| Jurat / errata sheet (PAGE / LINE / CHANGE / REASON) | Read & Sign election, witness name |
| Signature block | Reporter name, CSR number, expiration, firm registration, firm address |
