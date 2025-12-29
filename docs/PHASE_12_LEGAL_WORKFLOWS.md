# Phase 12: Advanced Legal Workflows

> **Status:** ARCHIVED — NOT IN MVP  
> **Target:** Post-Beta (Q4 2025)  
> **Estimated Effort:** 4-6 weeks  
> **Risk Level:** High (complex legal domain)

---

## Overview

This phase implements advanced features for trial preparation and attorney workflows. These features differentiate Depo-Pro as a complete legal transcript platform rather than just a transcription tool.

---

## Current Solution

The MVP provides:
- Basic issue coding (tags on transcript lines)
- Annotations with notes
- Exhibit linking
- PDF export with legal formatting

**Status:** Sufficient for initial attorney use cases.

---

## Planned Features

### 1. Transcript Designations

**What:** Allow attorneys to select specific testimony ranges to be entered as evidence at trial.

**Industry Standard:**
```
DESIGNATION LIST
Smith v. Jones, Case No. 2024-CV-1234

Plaintiff's Designations:
- Smith Dep. 15:4-15:22  (Admission of liability)
- Smith Dep. 42:10-43:8  (Damages testimony)
- Jones Dep. 87:3-88:15  (Prior inconsistent statement)
```

**Schema Addition:**
```prisma
model TranscriptDesignation {
  id           String   @id @default(cuid())
  transcriptId String
  
  // Party making designation
  party        Party    // PLAINTIFF, DEFENDANT
  partyName    String?  // "Plaintiff" or specific attorney
  
  // Range
  pageStart    Int
  lineStart    Int
  pageEnd      Int
  lineEnd      Int
  
  // Metadata
  purpose      String?  // Why this is being designated
  category     String?  // Liability, Damages, Impeachment
  
  // Status
  status       DesignationStatus @default(PROPOSED)
  
  // Relationships
  counterDesignations CounterDesignation[]
  
  createdById  String
  createdAt    DateTime @default(now())
}

enum Party {
  PLAINTIFF
  DEFENDANT
  INTERVENOR
  THIRD_PARTY
}

enum DesignationStatus {
  PROPOSED
  OBJECTED
  SUSTAINED
  OVERRULED
  ADMITTED
  WITHDRAWN
}
```

### 2. Counter-Designations

**What:** Opposing counsel's response to designations, typically to provide context.

**Example:**
```
Plaintiff designates Smith Dep. 42:10-15 (partial answer)
Defendant counter-designates Smith Dep. 42:16-43:2 (complete answer)
```

**Schema Addition:**
```prisma
model CounterDesignation {
  id             String   @id @default(cuid())
  designationId  String
  designation    TranscriptDesignation @relation(...)
  
  // Counter-designation range
  pageStart      Int
  lineStart      Int
  pageEnd        Int
  lineEnd        Int
  
  // Reason
  reason         String?  // "Context", "Complete answer"
  
  createdById    String
  createdAt      DateTime @default(now())
}
```

### 3. Cross-Deposition Search

**What:** Search for issues across all depositions in a case.

**Use Case:**
- Attorney tags testimony about "negligence" in multiple depositions
- Search shows all negligence-tagged testimony in one view
- Facilitates pattern identification and case building

**Implementation:**
```typescript
// Search all transcripts in case for issue code
async function searchCaseByIssue(
  caseId: string,
  issueCode: string
): Promise<SearchResult[]> {
  return prisma.transcriptAnnotation.findMany({
    where: {
      transcript: {
        // Link through job to case
        job: { caseId },
      },
      issueCode,
    },
    include: {
      transcript: {
        select: {
          name: true,
          deponent: true,
        },
      },
    },
    orderBy: [
      { transcript: { depositionDate: 'asc' } },
      { pageStart: 'asc' },
    ],
  });
}
```

### 4. Impeachment Reports

**What:** Generate reports showing contradictions and inconsistencies for trial use.

**Report Types:**
1. **Prior Statement Comparison:** Compare current testimony to prior statements
2. **Internal Contradictions:** Witness contradicts themselves within same deposition
3. **Cross-Witness Contradictions:** Different witnesses contradict each other

**Example Output:**
```
IMPEACHMENT REPORT
Smith v. Jones - Witness: John Smith

CONTRADICTION #1
Current Testimony (Smith Dep. 45:10-12):
"I never saw the contract before signing it."

Prior Statement (Deposition in Smith v. ABC, 2022):
"I reviewed the contract carefully before signing."

Notes: Direct contradiction on contract review.

CONTRADICTION #2
...
```

### 5. Witness Timeline Visualization

**What:** Visual timeline of events based on testimony.

**Example:**
```
Jan 2023 ─────────────────────────────────── Dec 2023
    │                                            │
    ├── Contract signed (Smith Dep. 12:5)        │
    │                                            │
    ├── First meeting (Jones Dep. 34:8)          │
    │                                            │
    └── Incident occurred (Smith Dep. 67:2)      │
```

---

## Decision Criteria

Implement when:

1. **Attorney Feedback:** Attorneys specifically request trial prep features
2. **Competitive Pressure:** Competitors offer these features
3. **Revenue Opportunity:** Premium tier differentiation
4. **Resources:** 4-6 weeks development time available

---

## Implementation Phases (If Pursued)

### Phase 12.1: Designations (2 weeks)
- Schema additions
- UI for selecting ranges
- Designation list view
- Export to PDF/DOCX

### Phase 12.2: Counter-Designations (1 week)
- Counter-designation workflow
- Status tracking (objected, admitted)
- Combined report generation

### Phase 12.3: Cross-Deposition Search (1 week)
- Search API
- Search results UI
- Aggregate view by issue

### Phase 12.4: Impeachment Reports (2 weeks)
- Contradiction detection logic
- Report generation
- Manual comparison tools
- Export formatting

---

## Competitive Analysis

### TranscriptPad
- Full designation workflow
- Counter-designations
- Issue coding with search
- No AI transcription

### Casefleet
- Timeline visualization
- Issue coding
- Cross-document search
- Document-focused (not transcript-focused)

### Depo-Pro Advantage
- AI transcription + legal workflows
- Integrated scopist workflow
- Lower total cost

---

## Technical Considerations

### Performance
- Cross-deposition search needs efficient indexing
- Consider Elasticsearch for large cases (100+ depositions)

### Access Control
- Designations may be privilege-sensitive
- Need firm-level isolation
- Consider case-team permissions

### Export Compatibility
- Standard designation list formats
- Integration with trial presentation software
- E-filing requirements

---

## Resources

- [TranscriptPad](https://www.transcriptpad.com/) - Competitor analysis
- [EDRM](https://edrm.net/) - E-Discovery Reference Model
- [Federal Rules of Evidence](https://www.law.cornell.edu/rules/fre) - Designation requirements
- [Sample Designation Lists](link-to-examples)

---

## Notes

- These are premium features for sophisticated users
- May require legal consultation for workflow accuracy
- Consider partnering with trial attorneys for feedback
- Prioritize based on revenue potential
