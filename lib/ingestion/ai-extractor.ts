import Anthropic from '@anthropic-ai/sdk';
import { EMPTY_EXTRACTION, normalizeExtraction, type DepositionExtractionResult } from './types';

const MODEL = 'claude-3-haiku-20240307';
const MAX_TEXT_LENGTH = 15000;

const EXTRACTION_SYSTEM_PROMPT = `You are a legal document parser for a court reporting platform.

Extract structured deposition scheduling information from any legal document
(notice of deposition, court order, subpoena, scheduling confirmation form).

RULES:
1. Return ONLY valid JSON — no preamble, no markdown fences, no explanation.
2. If a field is not found, return null (strings) or [] (arrays).
3. Never invent data not explicitly in the document.
4. Convert dates to ISO format: "2026-03-04"
5. Convert times to 24-hour format: "10:00" for 10am, "14:00" for 2pm
6. Detect MULTIPLE deposition sessions if present (e.g., 10am + 2pm same day)
7. Extract ALL party and attorney names for transcription_keywords
8. confidence: 1.0 = all key fields found · 0.5 = partial · 0.0 = failed

You MUST return JSON matching this EXACT schema:
{
  "document_type": "notice_of_deposition" | "court_order" | "subpoena" | "scheduling_form" | "duces_tecum" | "other" | null,
  "confidence": 0.0 to 1.0,
  "case_information": {
    "cause_number": string | null,
    "case_style": "Plaintiff v. Defendant" | null,
    "court_name": string | null,
    "court_number": string | null,
    "county": string | null,
    "state": string | null
  },
  "parties": {
    "plaintiffs": string[],
    "defendants": string[],
    "third_parties": string[]
  },
  "attorneys": [
    {
      "name": string,
      "firm": string | null,
      "role": "ordering" | "opposing" | "copy" | null,
      "represents": "plaintiff" | "defendant" | null,
      "address": string | null,
      "city": string | null,
      "state": string | null,
      "postal_code": string | null,
      "phone": string | null,
      "fax": string | null,
      "email": string | null,
      "delivery_format": string | null,
      "is_rush": boolean
    }
  ],
  "deposition_sessions": [
    {
      "deponent_name": string,
      "deposition_date": "YYYY-MM-DD" | null,
      "start_time": "HH:MM" | null,
      "location": string | null,
      "is_remote": boolean,
      "remote_platform": string | null,
      "zoom_link": string | null,
      "is_videotaped": boolean,
      "includes_duces_tecum": boolean
    }
  ],
  "court_reporter": {
    "firm": string | null,
    "name": string | null,
    "phone": string | null
  },
  "transcription_keywords": {
    "names": string[],
    "firms": string[],
    "locations": string[],
    "legal_terms": string[],
    "all_keywords": string[]
  },
  "ordered_by": string | null,
  "notes": string | null
}`;

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.warn('[intake-debug] key prefix:', apiKey?.slice(0, 15), 'length:', apiKey?.length);
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return new Anthropic({ apiKey });
}

export function truncateExtractionText(rawText: string): string {
  return rawText.length > MAX_TEXT_LENGTH ? rawText.slice(0, MAX_TEXT_LENGTH) : rawText;
}

export function parseExtractionResponse(rawText: string): DepositionExtractionResult {
  try {
    let normalized = rawText.trim();
    if (normalized.startsWith('```json')) {
      normalized = normalized.slice(7);
    } else if (normalized.startsWith('```')) {
      normalized = normalized.slice(3);
    }
    if (normalized.endsWith('```')) {
      normalized = normalized.slice(0, -3);
    }

    return normalizeExtraction(JSON.parse(normalized.trim()));
  } catch {
    return normalizeExtraction({
      ...EMPTY_EXTRACTION,
      confidence: 0,
      notes: 'Failed to parse AI response',
    });
  }
}

export async function extractDepositionData(
  rawText: string,
  fileName: string,
): Promise<DepositionExtractionResult> {
  try {
    const anthropic = getAnthropicClient();
    const truncated = truncateExtractionText(rawText);
    console.warn(`[intake] AI extraction starting — file: ${fileName}, text length: ${truncated.length}`);
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract deposition scheduling data from "${fileName}".\n\n${truncated}`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!text) {
      return normalizeExtraction({
        ...EMPTY_EXTRACTION,
        confidence: 0,
        notes: 'Anthropic returned no text content',
      });
    }

    console.warn(`[intake] AI extraction complete — parsing response`);
    return parseExtractionResponse(text);
  } catch (error) {
    console.error(`[intake] AI extraction failed for ${fileName}:`, error instanceof Error ? error.message : error);
    return normalizeExtraction({
      ...EMPTY_EXTRACTION,
      confidence: 0,
      notes: error instanceof Error ? error.message : 'AI extraction failed — please complete intake manually',
    });
  }
}
