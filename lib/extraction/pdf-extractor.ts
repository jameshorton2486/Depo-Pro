// ═══════════════════════════════════════════════════════════════
// PDF TEXT EXTRACTION UTILITY
// lib/extraction/pdf-extractor.ts
// ═══════════════════════════════════════════════════════════════

// pdf-parse import - handled dynamically

const pdfParse = require('pdf-parse');

export interface PDFExtractionResult {
  success: boolean;
  text: string;
  pageCount: number;
  error?: string;
}

/**
 * Extract text from a PDF buffer
 */
export async function extractTextFromPDFBuffer(buffer: Buffer): Promise<PDFExtractionResult> {
  try {
    const data = await pdfParse(buffer);

    return {
      success: true,
      text: data.text,
      pageCount: data.numpages,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      success: false,
      text: '',
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Unknown PDF extraction error',
    };
  }
}

/**
 * Detect document type from filename and content
 */
export function detectDocumentType(fileName: string, content: string): string {
  const fileNameLower = fileName.toLowerCase();
  const contentLower = content.toLowerCase();

  // Check filename patterns first (more reliable)
  if (fileNameLower.includes('amended') && fileNameLower.includes('nod')) {
    return 'AMENDED_NOTICE';
  }
  if (fileNameLower.includes('notice') || fileNameLower.includes('nod')) {
    return 'NOTICE_OF_DEPOSITION';
  }
  if (fileNameLower.includes('csr') || fileNameLower.includes('paperwork')) {
    return 'CSR_PAPERWORK';
  }
  if (fileNameLower.includes('note')) {
    return 'DEPO_NOTES';
  }
  if (fileNameLower.includes('order') || fileNameLower.includes('subpoena')) {
    return 'COURT_ORDER';
  }
  if (fileNameLower.includes('exhibit')) {
    return 'EXHIBIT_LIST';
  }
  if (fileNameLower.includes('appearance')) {
    return 'APPEARANCE_SHEET';
  }

  // Check content patterns
  if (contentLower.includes('notice of intention to take') ||
      contentLower.includes('oral and videotaped deposition') ||
      contentLower.includes('take notice') ||
      contentLower.includes('deposition of')) {
    if (contentLower.includes('amended') || contentLower.includes('second amended')) {
      return 'AMENDED_NOTICE';
    }
    return 'NOTICE_OF_DEPOSITION';
  }

  if (contentLower.includes('court reporting') &&
      (contentLower.includes('ordering attorney') ||
       contentLower.includes('copy attorney') ||
       contentLower.includes('csr:'))) {
    return 'CSR_PAPERWORK';
  }

  if ((contentLower.includes('exhibit') && contentLower.includes('description')) ||
      contentLower.includes('depo notes') ||
      contentLower.includes('euo')) {
    return 'DEPO_NOTES';
  }

  if (contentLower.includes('it is ordered') ||
      contentLower.includes('hereby ordered') ||
      contentLower.includes('scheduling order')) {
    return 'COURT_ORDER';
  }

  return 'OTHER';
}

/**
 * Clean and normalize extracted text
 */
export function cleanExtractedText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/[ \t]+/g, ' ')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    // Remove excessive newlines (keep max 2)
    .replace(/\n{3,}/g, '\n\n')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 || line === '')
    .join('\n')
    // Remove common PDF artifacts
    .replace(/\f/g, '\n') // Form feeds
    .replace(/\x00/g, '') // Null characters
    // Remove page numbers standing alone
    .replace(/^\d+\s*$/gm, '')
    .trim();
}
