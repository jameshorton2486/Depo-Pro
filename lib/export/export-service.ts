// =============================================================================
// lib/export/export-service.ts
// Unified document export service for all formats with ZIP support
// =============================================================================
//
// Supported formats:
// - DOCX (Microsoft Word)
// - PDF (Portable Document Format)
// - TXT (Plain Text)
// - ASCII (Legacy court systems)
// - Google Docs (Cloud collaboration)
// - ZIP (All pages as separate files)
// =============================================================================

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
} from 'docx';
import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';

// =============================================================================
// TYPES
// =============================================================================

export type ExportFormat = 'docx' | 'pdf' | 'txt' | 'ascii' | 'google-docs' | 'zip';

export interface ExportOptions {
  format: ExportFormat;
  // Content options
  includeTimestamps?: boolean;
  includeSpeakerLabels?: boolean;
  includeLineNumbers?: boolean;
  includePageNumbers?: boolean;
  includeWordIndex?: boolean;
  // Legal formatting
  linesPerPage?: number;           // Default: 25 for legal
  lineNumberInterval?: number;     // Default: 5 (number every 5 lines)
  // Header/Footer
  includeHeader?: boolean;
  includeFooter?: boolean;
  headerText?: string;
  footerText?: string;
  // Case info
  caseName?: string;
  caseNumber?: string;
  deponentName?: string;
  depositionDate?: Date;
  reporterName?: string;
  firmName?: string;
  // Google Docs specific
  googleFolderId?: string;
  googleDocTitle?: string;
  // Export location
  outputDirectory?: string;        // Default: User's Downloads folder
  // ZIP options
  zipFormat?: 'docx' | 'pdf';     // Format for individual pages in ZIP
  zipMaxSizeMB?: number;          // Default: 25MB - split ZIP if larger
}

export interface TranscriptContent {
  fullText: string;
  words?: Array<{
    word: string;
    punctuated_word?: string;
    start?: number;
    end?: number;
    speaker?: number;
    confidence?: number;
  }>;
  speakers?: Array<{
    id: number;
    name: string;
  }>;
}

export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  filename: string;
  filePath?: string;              // Full path to saved file (if saved to disk)
  buffer?: Buffer;
  url?: string;                   // For Google Docs
  googleDocId?: string;           // For Google Docs
  mimeType: string;
  size?: number;
  error?: string;
  // For ZIP exports with splitting
  files?: string[];               // Array of file paths if split
  totalSize?: number;             // Total size of all files
}

export interface ZipExportResult {
  files: string[];                // Paths to created ZIP files
  totalSize: number;
  pageCount: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BYTES_PER_MB = 1024 * 1024;

// =============================================================================
// DOWNLOADS DIRECTORY HELPER
// =============================================================================

/**
 * Get the user's Downloads directory
 * Cross-platform support for Windows, macOS, and Linux
 */
export function getDownloadsDirectory(): string {
  const platform = process.platform;
  const homeDir = os.homedir();

  switch (platform) {
    case 'win32': {
      // Windows: Check if Downloads folder exists in user profile
      const winDownloads = path.join(homeDir, 'Downloads');
      return winDownloads;
    }
    case 'darwin':
      // macOS: ~/Downloads
      return path.join(homeDir, 'Downloads');
    case 'linux': {
      // Linux: ~/Downloads or ~/downloads
      const linuxDownloads = path.join(homeDir, 'Downloads');
      return linuxDownloads;
    }
    default:
      // Fallback to home directory
      return homeDir;
  }
}

/**
 * Ensure directory exists, create if it doesn't
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

export async function exportDocument(
  content: TranscriptContent,
  options: ExportOptions
): Promise<ExportResult> {
  const filename = generateFilename(options);
  const outputDir = options.outputDirectory || getDownloadsDirectory();

  try {
    // Ensure output directory exists
    await ensureDirectoryExists(outputDir);

    switch (options.format) {
      case 'zip':
        return await exportToZip(content, options, filename, outputDir);
      case 'docx':
        return await exportToDocx(content, options, filename, outputDir);
      case 'pdf':
        return await exportToPdf(content, options, filename, outputDir);
      case 'txt':
        return await exportToTxt(content, options, filename, outputDir);
      case 'ascii':
        return await exportToAscii(content, options, filename, outputDir);
      case 'google-docs':
        return await exportToGoogleDocs(content, options, filename);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  } catch (error: any) {
    return {
      success: false,
      format: options.format,
      filename,
      mimeType: getMimeType(options.format),
      error: error.message,
    };
  }
}

// =============================================================================
// ZIP EXPORT (All Pages)
// =============================================================================

/**
 * Export all pages as individual files in a ZIP archive
 * Splits into multiple ZIP files if total size exceeds maxSizeMB
 */
async function exportToZip(
  content: TranscriptContent,
  options: ExportOptions,
  baseFilename: string,
  outputDir: string
): Promise<ExportResult> {
  const pageFormat = options.zipFormat || 'pdf';
  const maxSizeBytes = (options.zipMaxSizeMB || 25) * BYTES_PER_MB;
  const linesPerPage = options.linesPerPage || 25;
  const lines = content.fullText.split('\n');
  
  // Split content into pages
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    const pageLines = lines.slice(i, i + linesPerPage);
    pages.push(pageLines.join('\n'));
  }

  const zipFiles: string[] = [];
  let currentZipIndex = 1;
  let currentZipSize = 0;
  let currentArchive: archiver.Archiver | null = null;
  let currentZipPath: string | null = null;
  let currentClosePromise: Promise<void> | null = null;

  const finalizeCurrentZip = async (): Promise<void> => {
    if (currentArchive) {
      currentArchive.finalize();
      if (currentClosePromise) {
        await currentClosePromise;
      }
    }
  };

  const createNewZip = (): archiver.Archiver => {
    const zipFilename = zipFiles.length > 0
      ? `${baseFilename}_part${currentZipIndex}.zip`
      : `${baseFilename}.zip`;
    
    currentZipPath = path.join(outputDir, zipFilename);
    const output = fsSync.createWriteStream(currentZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    
    // Create promise to wait for close event
    currentClosePromise = new Promise<void>((resolve, reject) => {
      output.on('close', () => {
        zipFiles.push(currentZipPath!);
        resolve();
      });
      archive.on('error', reject);
      output.on('error', reject);
    });

    return archive;
  };

  currentArchive = createNewZip();

  // Export each page
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageContent: TranscriptContent = {
      fullText: pages[pageIndex],
      words: content.words,
      speakers: content.speakers,
    };

    // Export page in the requested format
    let pageBuffer: Buffer;
    let pageExtension: string;

    if (pageFormat === 'pdf') {
      const pdfResult = await exportToPdfInternal(pageContent, options, `${baseFilename}_page${pageIndex + 1}`);
      pageBuffer = pdfResult.buffer!;
      pageExtension = '.pdf';
    } else {
      const docxResult = await exportToDocxInternal(pageContent, options, `${baseFilename}_page${pageIndex + 1}`);
      pageBuffer = docxResult.buffer!;
      pageExtension = '.docx';
    }

    // Check if adding this page would exceed max size
    const estimatedZipSize = currentZipSize + pageBuffer.length + 1000; // Add overhead estimate

    if (estimatedZipSize > maxSizeBytes && currentZipSize > 0) {
      // Finalize current ZIP and create new one
      await finalizeCurrentZip();
      currentZipIndex++;
      currentZipSize = 0;
      currentArchive = createNewZip();
    }

    // Add page to current ZIP
    const pageFilename = `page_${String(pageIndex + 1).padStart(3, '0')}${pageExtension}`;
    currentArchive.append(pageBuffer, { name: pageFilename });
    currentZipSize += pageBuffer.length;
  }

  // Finalize last ZIP
  await finalizeCurrentZip();

  // Get total size
  let totalSize = 0;
  for (const zipFile of zipFiles) {
    const stats = await fs.stat(zipFile);
    totalSize += stats.size;
  }

  return {
    success: true,
    format: 'zip',
    filename: zipFiles.length === 1 ? `${baseFilename}.zip` : `${baseFilename}_parts.zip`,
    filePath: zipFiles.length === 1 ? zipFiles[0] : undefined,
    files: zipFiles,
    mimeType: 'application/zip',
    size: totalSize,
    totalSize,
  };
}

// =============================================================================
// DOCX EXPORT
// =============================================================================

async function exportToDocx(
  content: TranscriptContent,
  options: ExportOptions,
  filename: string,
  outputDir: string
): Promise<ExportResult> {
  const result = await exportToDocxInternal(content, options, filename);
  
  if (result.buffer) {
    const filePath = path.join(outputDir, result.filename);
    await fs.writeFile(filePath, result.buffer);
    return {
      ...result,
      filePath,
    };
  }

  return result;
}

async function exportToDocxInternal(
  content: TranscriptContent,
  options: ExportOptions,
  filename: string
): Promise<ExportResult> {

  // Build document sections
  const sections: any[] = [];

  // Title page
  if (options.caseName) {
    sections.push(...createTitlePage(options));
  }

  // Transcript body
  const transcriptParagraphs = createTranscriptParagraphs(content, options);

  const doc = new Document({
    sections: [
      // Title page section (if applicable)
      ...(options.caseName ? [{
        properties: {},
        children: sections,
      }] : []),
      // Main transcript section
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1800,   // 1.25 inch for line numbers
            },
          },
        },
        headers: options.includeHeader ? {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: options.headerText || `${options.caseName || 'Deposition Transcript'}`,
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        } : undefined,
        footers: options.includePageNumbers ? {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Page ' }),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                  new TextRun({ text: ' of ' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                ],
              }),
            ],
          }),
        } : undefined,
        children: transcriptParagraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  return {
    success: true,
    format: 'docx',
    filename: `${filename}.docx`,
    buffer: Buffer.from(buffer),
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: buffer.byteLength,
  };
}

function createTitlePage(options: ExportOptions): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: 'DEPOSITION TRANSCRIPT',
          bold: true,
          size: 32,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: options.caseName || '',
          bold: true,
          size: 28,
        }),
      ],
    }),
    ...(options.caseNumber ? [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `Case No: ${options.caseNumber}`,
            size: 24,
          }),
        ],
      }),
    ] : []),
    ...(options.deponentName ? [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [
          new TextRun({
            text: `Deposition of: ${options.deponentName}`,
            size: 24,
          }),
        ],
      }),
    ] : []),
    ...(options.depositionDate ? [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `Date: ${options.depositionDate.toLocaleDateString()}`,
            size: 24,
          }),
        ],
      }),
    ] : []),
    new Paragraph({ children: [] }), // Page break handled by section
  ];
}

function createTranscriptParagraphs(
  content: TranscriptContent,
  options: ExportOptions
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = content.fullText.split('\n');
  let lineNumber = 1;

  for (const line of lines) {
    const children: TextRun[] = [];

    // Add line number if enabled
    if (options.includeLineNumbers && lineNumber % (options.lineNumberInterval || 5) === 0) {
      children.push(
        new TextRun({
          text: `${lineNumber.toString().padStart(3, ' ')}  `,
          font: 'Courier New',
          size: 24,
        })
      );
    } else if (options.includeLineNumbers) {
      children.push(
        new TextRun({
          text: '     ',
          font: 'Courier New',
          size: 24,
        })
      );
    }

    // Add the line content
    children.push(
      new TextRun({
        text: line,
        font: 'Courier New',
        size: 24,
      })
    );

    paragraphs.push(
      new Paragraph({
        spacing: { line: 360 }, // Double spacing
        children,
      })
    );

    lineNumber++;
  }

  return paragraphs;
}

// =============================================================================
// PDF EXPORT
// =============================================================================

async function exportToPdf(
  content: TranscriptContent,
  options: ExportOptions,
  filename: string,
  outputDir: string
): Promise<ExportResult> {
  const result = await exportToPdfInternal(content, options, filename);
  
  if (result.buffer) {
    const filePath = path.join(outputDir, result.filename);
    await fs.writeFile(filePath, result.buffer);
    return {
      ...result,
      filePath,
    };
  }

  return result;
}

async function exportToPdfInternal(
  content: TranscriptContent,
  options: ExportOptions,
  filename: string
): Promise<ExportResult> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: {
        top: 72,
        bottom: 72,
        left: 90,
        right: 72,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve({
        success: true,
        format: 'pdf',
        filename: `${filename}.pdf`,
        buffer,
        mimeType: 'application/pdf',
        size: buffer.byteLength,
      });
    });
    doc.on('error', reject);

    // Title page
    if (options.caseName) {
      doc.fontSize(18).font('Helvetica-Bold').text('DEPOSITION TRANSCRIPT', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(options.caseName, { align: 'center' });
      if (options.caseNumber) {
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text(`Case No: ${options.caseNumber}`, { align: 'center' });
      }
      if (options.deponentName) {
        doc.moveDown(0.5);
        doc.text(`Deposition of: ${options.deponentName}`, { align: 'center' });
      }
      if (options.depositionDate) {
        doc.moveDown(0.5);
        doc.text(`Date: ${options.depositionDate.toLocaleDateString()}`, { align: 'center' });
      }
      doc.addPage();
    }

    // Transcript content
    doc.font('Courier').fontSize(12);
    const lines = content.fullText.split('\n');
    let lineNumber = 1;
    const linesPerPage = options.linesPerPage || 25;
    let linesOnPage = 0;

    for (const line of lines) {
      // Add line number
      if (options.includeLineNumbers) {
        const showNumber = lineNumber % (options.lineNumberInterval || 5) === 0;
        const prefix = showNumber ? lineNumber.toString().padStart(3, ' ') + '  ' : '     ';
        doc.text(prefix + line);
      } else {
        doc.text(line);
      }

      lineNumber++;
      linesOnPage++;

      // Page break at lines per page
      if (linesOnPage >= linesPerPage && lineNumber < lines.length) {
        doc.addPage();
        linesOnPage = 0;

        // Add page number in footer
        if (options.includePageNumbers) {
          const pageNum = doc.bufferedPageRange().count;
          doc.fontSize(10).text(`Page ${pageNum}`, 72, doc.page.height - 50, { align: 'center' });
          doc.fontSize(12);
        }
      }
    }

    doc.end();
  });
}

// =============================================================================
// TXT EXPORT
// =============================================================================

async function exportToTxt(
  content: TranscriptContent,
  options: ExportOptions,
  filename: string,
  outputDir: string
): Promise<ExportResult> {
  let text = '';

  // Header
  if (options.caseName) {
    text += `DEPOSITION TRANSCRIPT\n`;
    text += `${'='.repeat(50)}\n\n`;
    text += `Case: ${options.caseName}\n`;
    if (options.caseNumber) text += `Case No: ${options.caseNumber}\n`;
    if (options.deponentName) text += `Deponent: ${options.deponentName}\n`;
    if (options.depositionDate) text += `Date: ${options.depositionDate.toLocaleDateString()}\n`;
    if (options.reporterName) text += `Reporter: ${options.reporterName}\n`;
    text += `\n${'='.repeat(50)}\n\n`;
  }

  // Content with optional line numbers
  const lines = content.fullText.split('\n');
  let lineNumber = 1;

  for (const line of lines) {
    if (options.includeLineNumbers) {
      const showNumber = lineNumber % (options.lineNumberInterval || 5) === 0;
      const prefix = showNumber ? lineNumber.toString().padStart(3, ' ') + '  ' : '     ';
      text += prefix + line + '\n';
    } else {
      text += line + '\n';
    }
    lineNumber++;
  }

  const buffer = Buffer.from(text, 'utf-8');
  const filePath = path.join(outputDir, `${filename}.txt`);
  await fs.writeFile(filePath, buffer);

  return {
    success: true,
    format: 'txt',
    filename: `${filename}.txt`,
    filePath,
    buffer,
    mimeType: 'text/plain',
    size: buffer.byteLength,
  };
}

// =============================================================================
// ASCII EXPORT (Legacy court format)
// =============================================================================

async function exportToAscii(
  content: TranscriptContent,
  options: ExportOptions,
  filename: string,
  outputDir: string
): Promise<ExportResult> {
  // ASCII format has strict requirements:
  // - 25 lines per page
  // - 80 characters max per line
  // - Line numbers on left
  // - Page numbers
  // - All uppercase option for some courts

  const maxLineLength = 65; // Leave room for line numbers
  const linesPerPage = options.linesPerPage || 25;
  let output = '';
  let pageNumber = 1;
  let lineNumber = 1;
  let linesOnPage = 0;

  // Title page
  if (options.caseName) {
    output += centerText('DEPOSITION TRANSCRIPT', 80) + '\n';
    output += '\n';
    output += centerText(options.caseName.toUpperCase(), 80) + '\n';
    if (options.caseNumber) {
      output += centerText(`CASE NO: ${options.caseNumber}`, 80) + '\n';
    }
    if (options.deponentName) {
      output += '\n';
      output += centerText(`DEPOSITION OF: ${options.deponentName.toUpperCase()}`, 80) + '\n';
    }
    if (options.depositionDate) {
      output += '\n';
      output += centerText(`DATE: ${options.depositionDate.toLocaleDateString()}`, 80) + '\n';
    }
    output += '\n' + '='.repeat(80) + '\n';
    output += '\f'; // Form feed for page break
    pageNumber++;
  }

  // Process content
  const lines = content.fullText.split('\n');

  for (const rawLine of lines) {
    // Wrap long lines
    const wrappedLines = wrapText(rawLine, maxLineLength);

    for (const line of wrappedLines) {
      // Format: "  1  The witness stated..."
      const lineNumStr = (lineNumber % (options.lineNumberInterval || 5) === 0)
        ? lineNumber.toString().padStart(3, ' ')
        : '   ';
      output += `${lineNumStr}  ${line}\n`;

      lineNumber++;
      linesOnPage++;

      // Page break
      if (linesOnPage >= linesPerPage) {
        // Add page footer
        output += '\n';
        output += centerText(`Page ${pageNumber}`, 80) + '\n';
        output += '\f'; // Form feed
        pageNumber++;
        linesOnPage = 0;
      }
    }
  }

  // Final page number
  if (linesOnPage > 0) {
    while (linesOnPage < linesPerPage - 2) {
      output += '\n';
      linesOnPage++;
    }
    output += '\n';
    output += centerText(`Page ${pageNumber}`, 80) + '\n';
  }

  const buffer = Buffer.from(output, 'ascii');
  const filePath = path.join(outputDir, `${filename}.asc`);
  await fs.writeFile(filePath, buffer);

  return {
    success: true,
    format: 'ascii',
    filename: `${filename}.asc`,
    filePath,
    buffer,
    mimeType: 'text/plain',
    size: buffer.byteLength,
  };
}

// =============================================================================
// GOOGLE DOCS EXPORT
// =============================================================================

async function exportToGoogleDocs(
  content: TranscriptContent,
  options: ExportOptions,
  filename: string
): Promise<ExportResult> {
  // This requires Google OAuth - return instructions if not configured
  // The actual implementation needs googleapis package and OAuth tokens

  // For now, return a structured response that can be used by the API route
  // which has access to the user's Google OAuth tokens

  return {
    success: false,
    format: 'google-docs',
    filename: options.googleDocTitle || filename,
    mimeType: 'application/vnd.google-apps.document',
    error: 'GOOGLE_DOCS_REQUIRES_API_ROUTE',
    // Include the content for the API route to use
    // @ts-expect-error - extending for API route use
    _content: content,
    _options: options,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateFilename(options: ExportOptions): string {
  const parts: string[] = [];

  if (options.caseName) {
    parts.push(options.caseName.replace(/[^a-zA-Z0-9]/g, '_'));
  }

  if (options.deponentName) {
    parts.push(options.deponentName.replace(/[^a-zA-Z0-9]/g, '_'));
  }

  if (options.depositionDate) {
    parts.push(options.depositionDate.toISOString().split('T')[0]);
  }

  if (parts.length === 0) {
    parts.push('transcript');
  }

  parts.push('transcript');

  return parts.join('_');
}

function getMimeType(format: ExportFormat): string {
  const mimeTypes: Record<ExportFormat, string> = {
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'ascii': 'text/plain',
    'google-docs': 'application/vnd.google-apps.document',
    'zip': 'application/zip',
  };
  return mimeTypes[format] || 'application/octet-stream';
}

function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function wrapText(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxLength) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);

  return lines;
}

// =============================================================================
// EXPORT FORMAT INFO
// =============================================================================

export const FORMAT_INFO: Record<ExportFormat, {
  name: string;
  description: string;
  extension: string;
  icon: string;
}> = {
  'docx': {
    name: 'Microsoft Word',
    description: 'Editable Word document with formatting',
    extension: '.docx',
    icon: 'FileText',
  },
  'pdf': {
    name: 'PDF',
    description: 'Read-only document for delivery',
    extension: '.pdf',
    icon: 'FileText',
  },
  'txt': {
    name: 'Plain Text',
    description: 'Simple text file',
    extension: '.txt',
    icon: 'FileType',
  },
  'ascii': {
    name: 'ASCII (Legacy)',
    description: 'Legacy court system format',
    extension: '.asc',
    icon: 'Terminal',
  },
  'google-docs': {
    name: 'Google Docs',
    description: 'Create in Google Drive for collaboration',
    extension: '',
    icon: 'Cloud',
  },
  'zip': {
    name: 'ZIP Archive',
    description: 'All pages as separate files in compressed archive',
    extension: '.zip',
    icon: 'Archive',
  },
};
