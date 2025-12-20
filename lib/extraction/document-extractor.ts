// ═══════════════════════════════════════════════════════════════
// COMPREHENSIVE DOCUMENT EXTRACTION SERVICE
// lib/extraction/document-extractor.ts
// 
// Semantic, format-agnostic extraction using Claude AI
// Per-field confidence scoring
// Handles: NOD, CSR Paperwork, Depo Notes, Court Orders
// ═══════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ═══════════════════════════════════════════════════════════════
// COMPREHENSIVE EXTRACTED DATA TYPE
// Every field that appears in court reporting documents
// ═══════════════════════════════════════════════════════════════

export interface ComprehensiveExtractedData {
  // ═══════════════════════════════════════════════════════════════
  // CASE IDENTIFICATION
  // ═══════════════════════════════════════════════════════════════
  caseNumber: string | null;           // "D-1-GN-25-002857"
  causeNumber: string | null;          // Alternative format
  caseStyle: string | null;            // "Eric Estopinal v. A&H Foods, LLC..."
  shortTitle: string | null;           // "Estopinal v. A&H Foods"
  
  // ═══════════════════════════════════════════════════════════════
  // COURT INFORMATION
  // ═══════════════════════════════════════════════════════════════
  court: {
    name: string | null;               // "419th Judicial District Court"
    number: string | null;             // "419th"
    type: string | null;               // "District Court"
    county: string | null;             // "Travis"
    state: string | null;              // "Texas"
    judge: string | null;              // Judge name
  };
  
  // ═══════════════════════════════════════════════════════════════
  // PARTIES
  // ═══════════════════════════════════════════════════════════════
  plaintiffs: Array<{
    name: string;
    type: 'individual' | 'company' | 'government' | 'other';
    role?: string;
  }>;
  
  defendants: Array<{
    name: string;
    type: 'individual' | 'company' | 'government' | 'other';
    role?: string;
  }>;
  
  otherParties: Array<{
    name: string;
    type: string;
    role: string;                      // "Intervenor", "Third-Party Defendant"
  }>;
  
  // ═══════════════════════════════════════════════════════════════
  // DEPONENT INFORMATION
  // ═══════════════════════════════════════════════════════════════
  deponent: {
    name: string | null;               // "Aaron Walker"
    role: string | null;               // "Corporate Representative"
    capacity: string | null;           // "Individual and Corporate Representative"
    company: string | null;            // "A&H Foods, LLC"
    title: string | null;              // Job title if mentioned
  };
  
  // ═══════════════════════════════════════════════════════════════
  // DEPOSITION SCHEDULING
  // ═══════════════════════════════════════════════════════════════
  scheduling: {
    date: string | null;               // "2025-12-18" (ISO format)
    scheduledTime: string | null;      // "10:00 AM"
    timeZone: string | null;           // "CST"
    actualStartTime: string | null;
    actualEndTime: string | null;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // LOCATION
  // ═══════════════════════════════════════════════════════════════
  location: {
    name: string | null;               // "Pappas Grubbs Price, PC"
    address: string | null;            // "7500 Rialto Boulevard"
    address2: string | null;           // "Building 2, Suite 250"
    city: string | null;               // "Austin"
    state: string | null;              // "Texas"
    zip: string | null;                // "78735"
    isRemote: boolean;
    zoomLink: string | null;
    conferenceRoom: boolean | null;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // COURT REPORTING DETAILS
  // ═══════════════════════════════════════════════════════════════
  courtReporting: {
    firmName: string | null;           // "SA Legal Solutions"
    reporterName: string | null;
    reporterCSRNumber: string | null;
    isCertifiedShorthand: boolean | null;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // RECORDING METHOD
  // ═══════════════════════════════════════════════════════════════
  recording: {
    isVideotaped: boolean;
    isStenographic: boolean;
    videographerName: string | null;
    videographerCompany: string | null;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // INTERPRETER
  // ═══════════════════════════════════════════════════════════════
  interpreter: {
    hasInterpreter: boolean;
    name: string | null;
    language: string | null;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // ATTORNEYS (All attorneys from all documents)
  // ═══════════════════════════════════════════════════════════════
  attorneys: Array<{
    name: string;
    barNumber: string | null;
    firm: string | null;
    role: 'ordering' | 'copy' | 'plaintiff' | 'defense' | 'other';
    representing: string | null;
    email: string | null;
    phone: string | null;
    fax: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    wantsCopy: boolean;
    deliveryFormat: string | null;     // "Original", "Copy"
    deliveryMethod: string | null;     // "E-Trans", "Hard Copy", "Both"
    deliveryPriority: string | null;   // "Standard", "Rush"
    rushDueDate: string | null;
    associateAttorneys: Array<{ name: string; email?: string }>;
  }>;
  
  // ═══════════════════════════════════════════════════════════════
  // TRANSCRIPT OPTIONS
  // ═══════════════════════════════════════════════════════════════
  transcriptOptions: {
    readAndSign: boolean | null;
    signatureWaived: boolean | null;
    sendTo: string | null;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // EXHIBITS (From Depo Notes)
  // ═══════════════════════════════════════════════════════════════
  exhibits: Array<{
    number: string | number;
    description: string | null;
    marked: boolean;
  }>;
  exhibitStats: {
    totalCount: number | null;
    blackAndWhite: number | null;
    color: number | null;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // INSURANCE/EUO FIELDS (For Examination Under Oath)
  // ═══════════════════════════════════════════════════════════════
  insurance: {
    isEUO: boolean;
    insuredName: string | null;
    insurerName: string | null;
    claimNumber: string | null;
    policyNumber: string | null;
    dateOfLoss: string | null;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // DEPOSITION TOPICS (From Rule 199 / 30(b)(6) Notices)
  // ═══════════════════════════════════════════════════════════════
  depositionTopics: Array<{
    number: number;
    category: string | null;
    description: string;
  }>;
  
  // ═══════════════════════════════════════════════════════════════
  // BILLING & LOGISTICS
  // ═══════════════════════════════════════════════════════════════
  billing: {
    orderedByName: string | null;      // Who ordered
    orderedByFirm: string | null;
    travelMiles: number | null;
    parkingFee: number | null;
    isRush: boolean;
    rushDueDate: string | null;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // SPECIAL INSTRUCTIONS
  // ═══════════════════════════════════════════════════════════════
  specialInstructions: string | null;
  notes: string | null;
  
  // ═══════════════════════════════════════════════════════════════
  // EXTRACTED KEYWORDS FOR DEEPGRAM
  // ═══════════════════════════════════════════════════════════════
  extractedTerms: Array<{
    term: string;
    normalizedTerm: string;
    category: 'person_name' | 'company_name' | 'place_name' | 'legal_term' | 
              'medical_term' | 'technical_term' | 'case_specific' | 
              'attorney_name' | 'witness_name' | 'product_name' | 'vehicle_info';
    source: string;                    // Which document
  }>;
  
  // ═══════════════════════════════════════════════════════════════
  // CONFIDENCE SCORING (Per-field)
  // ═══════════════════════════════════════════════════════════════
  confidenceByField: {
    caseNumber?: number;
    caseStyle?: number;
    court?: number;
    deponentName?: number;
    depositionDate?: number;
    depositionTime?: number;
    location?: number;
    attorneys?: number;
    exhibits?: number;
    insurance?: number;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // SOURCE TRACKING
  // ═══════════════════════════════════════════════════════════════
  sourcesByField: {
    [fieldName: string]: string[];     // Which documents contributed
  };
  
  // Overall metadata
  documentTypes: string[];             // What types of documents were processed
  overallConfidence: number;
  needsReview: boolean;
  reviewReasons: string[];
}

// ═══════════════════════════════════════════════════════════════
// EXTRACTION PROMPT - SEMANTIC, FORMAT-AGNOSTIC
// ═══════════════════════════════════════════════════════════════

const COMPREHENSIVE_EXTRACTION_PROMPT = `You are a legal document extraction specialist for court reporters in Texas. Your job is to extract ALL relevant information from legal documents, regardless of their format or layout.

CRITICAL INSTRUCTIONS:
1. Documents may vary WILDLY in format - do not assume any specific structure
2. Extract fields SEMANTICALLY - look for meaning, not position
3. The same information may appear multiple times in different formats - deduplicate
4. Leave fields as null if NOT CONFIDENTLY found - never guess
5. Provide confidence score (0.0-1.0) for each major field
6. Extract ALL proper nouns, names, and technical terms for the keyword list

DOCUMENT TYPES YOU MAY RECEIVE:
- Notice of Deposition (formal legal pleading with case info)
- CSR Paperwork (job sheets with attorney contacts, delivery preferences)
- Depo Notes (handwritten or typed notes with exhibits, timing)
- Court Orders (scheduling orders, subpoenas)
- Appearance Sheets

FIELDS TO EXTRACT:

1. CASE IDENTIFICATION
   - Case/Cause Number (various formats: "D-1-GN-25-002857", "Cause No. 123-456")
   - Case Style/Caption ("Plaintiff v. Defendant")
   - Short title for quick reference

2. COURT INFORMATION
   - Court name, number, type
   - County, state
   - Judge name (if assigned)

3. PARTIES
   - All plaintiffs (name, individual vs company)
   - All defendants (name, individual vs company)
   - Other parties (intervenors, third-parties)

4. DEPONENT
   - Full name
   - Role (Corporate Representative, Fact Witness, Expert, etc.)
   - Capacity (individual, representative, or both)
   - Company/employer
   - Title (if mentioned)

5. SCHEDULING
   - Date (convert to YYYY-MM-DD)
   - Scheduled start time
   - Time zone
   - Actual start/end times (if noted)

6. LOCATION
   - Venue name
   - Full address (street, suite/building, city, state, zip)
   - Remote/Zoom info if applicable

7. COURT REPORTING
   - Court reporting firm
   - Reporter name (if assigned)
   - CSR certification status

8. RECORDING
   - Videotaped? (look for "videotaped", "video recording")
   - Stenographic? (usually yes by default)
   - Videographer name/company

9. INTERPRETER
   - Is interpreter needed?
   - Interpreter name/language

10. ATTORNEYS (for EACH attorney mentioned)
    - Name, bar number
    - Firm name
    - Role (ordering attorney, copy attorney, plaintiff/defense counsel)
    - Who they represent
    - Contact: email, phone, fax
    - Address: street, city, state, zip
    - Delivery preferences: format, method, priority, rush due date
    - Associate attorneys at same firm

11. TRANSCRIPT OPTIONS
    - Read and Sign (R/S)
    - Signature waived
    - Send to (who gets the original)

12. EXHIBITS
    - Exhibit number and description
    - Total count, B&W vs color

13. INSURANCE/EUO (if applicable)
    - Is this an EUO (Examination Under Oath)?
    - Insured name, insurer name
    - Claim number, policy number
    - Date of loss

14. DEPOSITION TOPICS (from Rule 199 / 30(b)(6) notices)
    - Topic number
    - Category heading
    - Full description

15. BILLING/LOGISTICS
    - Who ordered
    - Travel miles, parking
    - Rush status and due date

16. KEYWORDS FOR TRANSCRIPTION
    Extract ALL of these for Deepgram accuracy:
    - Every person's name (parties, attorneys, witnesses, judge)
    - Every company/firm name
    - Every place name (cities, counties, addresses)
    - Legal terms specific to this case
    - Technical/medical terms
    - Product names, vehicle info (license plates, etc.)
    - Any unusual proper nouns

CONFIDENCE SCORING:
- 0.95-1.0: Explicitly stated, clearly visible
- 0.80-0.94: Strongly implied or partially visible
- 0.60-0.79: Inferred from context, may need verification
- Below 0.60: Do not include, mark as null

RESPOND WITH ONLY VALID JSON in the exact structure provided. No markdown, no explanation.`;

// ═══════════════════════════════════════════════════════════════
// MAIN EXTRACTION FUNCTION
// ═══════════════════════════════════════════════════════════════

export async function extractFromDocuments(
  documents: Array<{ text: string; fileName: string; type?: string }>
): Promise<{
  success: boolean;
  data: ComprehensiveExtractedData | null;
  error: string | null;
}> {
  try {
    // Combine all document texts with source markers
    const combinedText = documents.map(doc => 
      `\n══════════════════════════════════════\nDOCUMENT: ${doc.fileName}\nTYPE: ${doc.type || 'UNKNOWN'}\n══════════════════════════════════════\n${doc.text}`
    ).join('\n\n');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `${COMPREHENSIVE_EXTRACTION_PROMPT}

DOCUMENTS TO EXTRACT FROM:
${combinedText}

Extract all information and respond with ONLY valid JSON matching the ComprehensiveExtractedData structure. Include confidenceByField scores and sourcesByField tracking.`,
        },
      ],
    });

    // Extract JSON from response
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';
    
    // Parse JSON (handle potential markdown code blocks)
    let jsonStr = responseText;
    if (responseText.includes('```json')) {
      jsonStr = responseText.split('```json')[1].split('```')[0];
    } else if (responseText.includes('```')) {
      jsonStr = responseText.split('```')[1].split('```')[0];
    }

    const extractedData = JSON.parse(jsonStr.trim()) as ComprehensiveExtractedData;
    
    // Post-process: normalize keywords
    if (extractedData.extractedTerms) {
      extractedData.extractedTerms = normalizeKeywords(extractedData.extractedTerms);
    }
    
    // Calculate if review needed
    extractedData.needsReview = checkIfNeedsReview(extractedData);
    extractedData.reviewReasons = getReviewReasons(extractedData);
    
    return {
      success: true,
      data: extractedData,
      error: null,
    };
  } catch (error) {
    console.error('Document extraction failed:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown extraction error',
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// KEYWORD NORMALIZATION
// ═══════════════════════════════════════════════════════════════

function normalizeKeywords(
  terms: ComprehensiveExtractedData['extractedTerms']
): ComprehensiveExtractedData['extractedTerms'] {
  const seen = new Set<string>();
  const normalized: ComprehensiveExtractedData['extractedTerms'] = [];
  
  for (const term of terms) {
    // Normalize: trim, title case for names, remove extra punctuation
    let normalizedTerm = term.term.trim();
    
    // Remove trailing punctuation
    normalizedTerm = normalizedTerm.replace(/[.,;:!?]+$/, '');
    
    // Title case for names
    if (term.category.includes('name')) {
      normalizedTerm = normalizedTerm
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    // Skip if we've seen this normalized form
    const key = normalizedTerm.toLowerCase();
    if (seen.has(key)) continue;
    if (normalizedTerm.length < 2) continue; // Skip single chars
    
    // Skip common stop words
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    if (stopWords.includes(key)) continue;
    
    seen.add(key);
    normalized.push({
      ...term,
      term: term.term,
      normalizedTerm,
    });
  }
  
  return normalized;
}

// ═══════════════════════════════════════════════════════════════
// REVIEW FLAG LOGIC
// ═══════════════════════════════════════════════════════════════

function checkIfNeedsReview(data: ComprehensiveExtractedData): boolean {
  const conf = data.confidenceByField;
  if (!conf) return true;
  
  // Check critical fields
  const criticalFields = ['caseNumber', 'deponentName', 'depositionDate'];
  for (const field of criticalFields) {
    const fieldConf = conf[field as keyof typeof conf];
    if (fieldConf !== undefined && fieldConf < 0.85) {
      return true;
    }
  }
  
  // Check if missing critical data
  if (!data.caseNumber && !data.caseStyle) return true;
  if (!data.deponent?.name) return true;
  
  return data.overallConfidence < 0.80;
}

function getReviewReasons(data: ComprehensiveExtractedData): string[] {
  const reasons: string[] = [];
  const conf = data.confidenceByField;
  
  if (!data.caseNumber) reasons.push('Case number not found');
  if (!data.deponent?.name) reasons.push('Deponent name not found');
  if (!data.scheduling?.date) reasons.push('Deposition date not found');
  
  if (conf) {
    if (conf.caseNumber && conf.caseNumber < 0.85) reasons.push('Case number confidence low');
    if (conf.deponentName && conf.deponentName < 0.85) reasons.push('Deponent name confidence low');
    if (conf.attorneys && conf.attorneys < 0.85) reasons.push('Attorney info confidence low');
  }
  
  if (!data.attorneys?.length) reasons.push('No attorneys extracted');
  
  return reasons;
}

// ═══════════════════════════════════════════════════════════════
// GET DEEPGRAM KEYWORDS (Clean, ready-to-use)
// ═══════════════════════════════════════════════════════════════

export function getDeepgramKeywords(data: ComprehensiveExtractedData): string[] {
  if (!data.extractedTerms) return [];
  
  return data.extractedTerms
    .filter(t => t.normalizedTerm && t.normalizedTerm.length >= 2)
    .map(t => t.normalizedTerm);
}

// ═══════════════════════════════════════════════════════════════
// EXPORT TYPES
// ═══════════════════════════════════════════════════════════════

// ComprehensiveExtractedData is already exported as interface above
