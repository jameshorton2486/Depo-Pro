import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  extractionMethod: 'mammoth' | 'pdf-parse' | 'plain-text' | 'rtf-strip' | 'google-docs-export';
  warnings: string[];
  error?: string;
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOC_MIME = 'application/msword';
const PDF_MIME = 'application/pdf';
const TXT_MIME = 'text/plain';
const RTF_MIMES = new Set(['application/rtf', 'text/rtf']);

let pdfWorkerConfigured = false;

function configurePdfWorker(): void {
  if (pdfWorkerConfigured) {
    return;
  }

  const workerPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  PDFParse.setWorker(pathToFileURL(workerPath).toString());
  pdfWorkerConfigured = true;
}

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  originalFileName: string,
  sourceUrl?: string,
): Promise<ExtractionResult> {
  try {
    if (sourceUrl?.includes('docs.google.com/document')) {
      return await extractFromGoogleDoc(sourceUrl);
    }

    const lower = originalFileName.toLowerCase();
    if (mimeType === DOCX_MIME || lower.endsWith('.docx') || mimeType === DOC_MIME || lower.endsWith('.doc')) {
      return await extractFromDocx(buffer);
    }
    if (mimeType === PDF_MIME || lower.endsWith('.pdf')) {
      return await extractFromPdf(buffer);
    }
    if (mimeType === TXT_MIME || lower.endsWith('.txt')) {
      return await extractFromTxt(buffer);
    }
    if (RTF_MIMES.has(mimeType) || lower.endsWith('.rtf')) {
      return await extractFromRtf(buffer);
    }

    return {
      text: '',
      extractionMethod: 'plain-text',
      warnings: [],
      error: `Unsupported file type: ${mimeType || originalFileName}`,
    };
  } catch (error) {
    return {
      text: '',
      extractionMethod: 'plain-text',
      warnings: [],
      error: error instanceof Error ? error.message : 'Unknown extraction error',
    };
  }
}

async function extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
  if (!buffer.length) {
    return {
      text: '',
      extractionMethod: 'mammoth',
      warnings: ['Empty document buffer'],
      error: 'File buffer is empty',
    };
  }

  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value.trim(),
    extractionMethod: 'mammoth',
    warnings: result.messages.map((message) => message.message),
  };
}

async function extractFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  if (!buffer.length) {
    return {
      text: '',
      extractionMethod: 'pdf-parse',
      warnings: ['Empty document buffer'],
      error: 'File buffer is empty',
    };
  }

  configurePdfWorker();
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return {
    text: result.text.trim(),
    pageCount: result.pages.length,
    extractionMethod: 'pdf-parse',
    warnings: [],
  };
}

async function extractFromTxt(buffer: Buffer): Promise<ExtractionResult> {
  return {
    text: buffer.toString('utf-8').trim(),
    extractionMethod: 'plain-text',
    warnings: buffer.length ? [] : ['Empty document buffer'],
    error: buffer.length ? undefined : 'File buffer is empty',
  };
}

async function extractFromRtf(buffer: Buffer): Promise<ExtractionResult> {
  const text = buffer
    .toString('utf-8')
    .replace(/\\[a-z]+-?[0-9]*[ ]?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\\\n/g, '\n')
    .replace(/\\par\b/gi, '\n')
    .replace(/\\\*/g, '')
    .trim();

  return {
    text,
    extractionMethod: 'rtf-strip',
    warnings: buffer.length ? [] : ['Empty document buffer'],
    error: buffer.length ? undefined : 'File buffer is empty',
  };
}

async function extractFromGoogleDoc(url: string): Promise<ExtractionResult> {
  const docId = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!docId) {
    return {
      text: '',
      extractionMethod: 'google-docs-export',
      warnings: [],
      error: 'Could not parse Google Docs document ID',
    };
  }

  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  const response = await fetch(exportUrl, { redirect: 'follow' });
  if (!response.ok) {
    return {
      text: '',
      extractionMethod: 'google-docs-export',
      warnings: [],
      error: `Google Docs export failed with status ${response.status}`,
    };
  }

  const text = await response.text();
  return {
    text: text.trim(),
    extractionMethod: 'google-docs-export',
    warnings: [],
  };
}
