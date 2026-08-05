| Attorney Field | Directory Source | UFM Target | Consumer (Used / Unused) |
| --- | --- | --- | --- |
| `name` | `contacts.name` | `appearances[].name` | Used |
| `bar_number` | `contacts.details.bar_number` | `appearances[].bar_number` | Used |
| `firm_id` | `contacts.firm_id` -> `firms.id` | `appearances[].firm`, `law_firms[]` | Used |
| `direct_phone` | `contacts.details.direct_phone` with `contacts.phone` fallback | `appearances[].phone` | Used |
| `fax` | `contacts.details.fax` plus linked `firms.fax` | `law_firms[].fax` | Used |
| `email` | `contacts.email` | `appearances[].email` | Used |
| `preferred_appearance_label` | `contacts.details.preferred_appearance_label` | `appearances[].appearance_label` | Used |
| `representing` | `CaseRecord.attorneys[].representing` | `appearances[].representing` | Used |
| `function` | `CaseRecord.attorneys[].role` | `appearances[].function` | Used |
| `time_used` | `CaseRecord.attorneys[].time_used` | `appearances[].time_used` | Used |
| `address` | linked `firms.address` plus case fallback | `law_firms[].address` | Used |
| `city` | linked `firms.city` plus case fallback | `law_firms[].city` | Used |
| `state` | linked `firms.state` plus case fallback | `law_firms[].state` | Used |
| `zip` | linked `firms.zip` plus case fallback | `law_firms[].zip` | Used |
| `extension` | `contacts.details.extension` | — | Unused |
| `assistant_name` | `contacts.details.assistant_name` | — | Unused |
| `assistant_email` | `contacts.details.assistant_email` | — | Unused |

No-orphan rule for Stage 1:
- no attorney field may be collected without a documented UFM, Deepgram, Transcript, or Directory consumer
- `extension`, `assistant_name`, and `assistant_email` remain directory-only and out of scope for Stage 1 consumers
