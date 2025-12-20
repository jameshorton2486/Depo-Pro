// lib/exhibits/pdf-stamper.ts
// PDF stamping utility for exhibit identification

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface StampParams {
  pdfBuffer: Buffer;
  exhibitNumber: number;
  caseName: string;
  deponentName: string;
  depositionDate: Date;
}

export interface StampResult {
  buffer: Buffer;
  success: boolean;
  error?: string;
}

/**
 * Stamps a PDF with exhibit identification in the bottom-right corner
 * of the first page.
 */
export async function stampExhibitPdf(params: StampParams): Promise<Buffer> {
  const { pdfBuffer, exhibitNumber, caseName, deponentName, depositionDate } = params;

  try {
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: false,
    });

    // Get the first page
    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      throw new Error('PDF has no pages');
    }
    const firstPage = pages[0];

    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Format the date
    const formattedDate = depositionDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Build stamp lines
    const stampLines = [
      `EXHIBIT ${exhibitNumber}`,
      caseName,
      `Deposition of ${deponentName}`,
      formattedDate,
    ];

    // Stamp configuration
    const fontSize = 10;
    const lineHeight = fontSize * 1.3;
    const padding = 20;
    const stampWidth = 200;

    // Calculate stamp position (bottom-right)
    const { width, height } = firstPage.getSize();
    const startX = width - stampWidth - padding;
    const startY = padding + (stampLines.length * lineHeight);

    // Draw background rectangle (optional - light gray)
    firstPage.drawRectangle({
      x: startX - 5,
      y: padding - 5,
      width: stampWidth + 10,
      height: (stampLines.length * lineHeight) + 10,
      color: rgb(0.95, 0.95, 0.95),
      opacity: 0.9,
    });

    // Draw border
    firstPage.drawRectangle({
      x: startX - 5,
      y: padding - 5,
      width: stampWidth + 10,
      height: (stampLines.length * lineHeight) + 10,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Draw each line of text
    stampLines.forEach((line, index) => {
      const y = startY - (index * lineHeight);
      
      // Truncate long lines
      let displayText = line;
      const maxWidth = stampWidth - 10;
      while (font.widthOfTextAtSize(displayText, fontSize) > maxWidth && displayText.length > 3) {
        displayText = displayText.slice(0, -4) + '...';
      }

      firstPage.drawText(displayText, {
        x: startX,
        y: y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
    });

    // Serialize the PDF
    const stampedPdfBytes = await pdfDoc.save();
    
    return Buffer.from(stampedPdfBytes);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('encrypted')) {
        throw new Error('Cannot stamp encrypted or password-protected PDFs');
      }
      throw new Error(`Failed to stamp PDF: ${error.message}`);
    }
    throw new Error('Failed to stamp PDF: Unknown error');
  }
}

/**
 * Validates that a buffer is a valid PDF that can be stamped
 */
export async function validatePdfForStamping(pdfBuffer: Buffer): Promise<{ valid: boolean; error?: string }> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: false,
    });
    
    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      return { valid: false, error: 'PDF has no pages' };
    }
    
    return { valid: true };
  } catch (error) {
    if (error instanceof Error) {
      return { valid: false, error: error.message };
    }
    return { valid: false, error: 'Invalid PDF format' };
  }
}
