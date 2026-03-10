import Anthropic from '@anthropic-ai/sdk';
import { EMPTY_EXTRACTION, normalizeExtraction, type DepositionExtractionResult } from './types';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TEXT_LENGTH = 15000;

const EXTRACTION_SYSTEM_PROMPT = `You are a legal document parser for a court reporting platform.

Extract structured deposition scheduling information from any legal document
(notice of deposition, court order, subpoena, scheduling confirmation form).

RULES:
1. Return ONLY valid JSON — no preamble, no markdown, no explanation.
2. If a field is not found, return null (strings) or [] (arrays).
3. Never invent data not explicitly in the document.
4. Convert dates to ISO format: "2026-03-04"
5. Convert times to 24-hour format: "10:00" for 10am, "14:00" for 2pm
6. Detect MULTIPLE deposition sessions if present (e.g., 10am + 2pm same day)
7. Extract ALL party and attorney names for transcription_keywords
8. confidence: 1.0 = all key fields found · 0.5 = partial · 0.0 = failed

Return JSON matching the DepositionExtractionResult schema exactly.`;

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
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

    return parseExtractionResponse(text);
  } catch (error) {
    return normalizeExtraction({
      ...EMPTY_EXTRACTION,
      confidence: 0,
      notes: error instanceof Error ? error.message : 'AI extraction failed',
    });
  }
}
