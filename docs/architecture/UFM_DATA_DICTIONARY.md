# UFM Data Dictionary
Version 1.0

---

## Purpose

This document defines every data field required by the Uniform Format Manual (UFM) for California court reporters.
All fields listed here must be present and validated before a transcript may proceed to Stage 6 (Certification) or Stage 7 (Export).

Fields are grouped by the UFM section in which they appear.

---

## 1. Case Caption Fields

| Field | Type | Required | Max Length | Description |
|---|---|---|---|---|
| `case_name` | string | Yes | 200 | Full case title. E.g. `Smith v. Meridian Infrastructure Partners` |
| `case_number` | string | Yes | 50 | Court-assigned docket number. E.g. `2024-CV-08821` |
| `court_name` | string | Yes | 200 | Full court name. E.g. `Superior Court of California, County of Los Angeles` |
| `department` | string | No | 20 | Department or division. E.g. `Dept. 32` |
| `judge_name` | string | No | 100 | Presiding judge. E.g. `Hon. Patricia L. Monroe` |

---

## 2. Deponent Fields

| Field | Type | Required | Max Length | Description |
|---|---|---|---|---|
| `deponent_name` | string | Yes | 100 | Full legal name of the deponent |
| `deponent_role` | enum | Yes | — | `WITNESS`, `PARTY`, `EXPERT`, `OTHER` |
| `deponent_title` | string | No | 100 | Professional title or designation |
| `deponent_employer` | string | No | 200 | Employer or affiliation |

---

## 3. Session Fields

| Field | Type | Required | Max Length | Description |
|---|---|---|---|---|
| `deposition_date` | ISO date | Yes | — | Date of deposition. Format: `YYYY-MM-DD` |
| `start_time` | ISO time | No | — | Session start time. Format: `HH:MM` |
| `end_time` | ISO time | No | — | Session end time. Format: `HH:MM` |
| `location_address` | string | Yes | 300 | Full street address of deposition |
| `location_city` | string | Yes | 100 | City |
| `location_state` | string | Yes | 2 | Two-letter state abbreviation. E.g. `CA` |
| `location_zip` | string | No | 10 | ZIP code |
| `is_remote` | boolean | No | — | `true` if conducted via videoconference |
| `remote_platform` | string | No | 50 | Platform name if remote. E.g. `Zoom`, `Teams` |

---

## 4. Counsel and Appearances Fields

| Field | Type | Required | Max Length | Description |
|---|---|---|---|---|
| `attorneys` | array | Yes | — | Array of `AttorneyRecord` objects (see below) |

### AttorneyRecord

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Full name including Esq. or bar designation |
| `firm` | string | No | Law firm name |
| `role` | enum | Yes | `EXAMINING`, `OPPOSING`, `CO_COUNSEL`, `OTHER` |
| `representing` | string | No | Party represented. E.g. `Plaintiff`, `Defendant` |
| `bar_number` | string | No | State bar number |
| `email` | string | No | Contact email |

---

## 5. Court Reporter Fields

| Field | Type | Required | Max Length | Description |
|---|---|---|---|---|
| `reporter_name` | string | Yes | 100 | Full name of the certified court reporter |
| `reporter_cert_number` | string | Yes | 20 | CSR certificate number. E.g. `CSR-12345` |
| `reporter_cert_state` | string | Yes | 2 | State of certification. E.g. `CA` |
| `reporter_firm` | string | No | 200 | Reporting firm name |
| `reporter_email` | string | No | 100 | Reporter contact email |
| `reporter_phone` | string | No | 20 | Reporter contact phone |

---

## 6. Transcript Format Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `lines_per_page` | integer | Yes | Standard: `25` |
| `chars_per_line` | integer | Yes | Standard: `58` |
| `first_page_number` | integer | Yes | Starting page number. Usually `1` |
| `include_line_numbers` | boolean | Yes | Whether to print line numbers |
| `include_timestamps` | boolean | No | Whether to embed timecodes in exported DOCX/PDF |
| `font_family` | string | Yes | E.g. `Courier New`. UFM default is Courier. |
| `font_size_pt` | number | Yes | Standard: `12` |

---

## 7. Exhibit Index Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `exhibits` | array | No | Array of `ExhibitRecord` objects (see below) |

### ExhibitRecord

| Field | Type | Required | Description |
|---|---|---|---|
| `exhibit_id` | string | Yes | Internal ID. E.g. `ex_001` |
| `label` | string | Yes | Display label. E.g. `Exhibit 1` |
| `description` | string | Yes | Brief description of exhibit |
| `marked_by` | enum | No | `PLAINTIFF`, `DEFENDANT`, `COURT` |
| `admitted` | boolean | No | Whether exhibit was admitted into evidence |
| `page_reference` | integer | No | Transcript page where first referenced |
| `line_reference` | integer | No | Transcript line where first referenced |

---

## 8. Certification Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `certification_date` | ISO date | Yes | Date the reporter signs the certificate |
| `certification_statement` | string | Yes | Verbatim certification text per UFM spec |
| `notary_required` | boolean | No | Whether notarization is required in this jurisdiction |
| `notary_name` | string | Conditional | Required if `notary_required` is `true` |
| `notary_commission_expiry` | ISO date | Conditional | Required if `notary_required` is `true` |

---

## Validation Rules

1. All `Required: Yes` fields must be non-empty strings before Stage 6 (Certification) may proceed.
2. `deposition_date` must be a valid calendar date not in the future at time of certification.
3. `reporter_cert_number` must match the pattern `[A-Z]{2,4}-\d{4,6}` or be free-form if jurisdiction allows.
4. `attorneys` array must contain at least one entry with `role: EXAMINING`.
5. `lines_per_page` must be `25` for California UFM compliance unless a variance is documented.
6. `chars_per_line` must be `58` for California UFM compliance unless a variance is documented.

---

## Notes

- This dictionary reflects California UFM requirements. Other jurisdictions may differ.
- Fields not marked Required may still be mandatory for specific export formats (e.g. e-filing).
- All fields map directly to `case.json` schema defined in `CASE_STORAGE_SPEC.md`.
