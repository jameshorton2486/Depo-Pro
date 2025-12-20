// ═══════════════════════════════════════════════════════════════
// EXHIBIT STAMPING UTILITY
// lib/exhibits/stamp.ts
// Adds legal exhibit stamps to PDF files
// ═══════════════════════════════════════════════════════════════

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface ExhibitStampData {
  exhibitNumber: number;
  caseName: string;
  deponentName: string;
  depositionDate: string; // ISO date string
  reporterName?: string;
}

/**
 * Stamp a PDF with exhibit information
 * Returns the stamped PDF as a Buffer
 */
export async function stampExhibitPDF(
  pdfBuffer: Buffer,
  stampData: ExhibitStampData
): Promise<Buffer> {
  try {
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Format date
    const date = new Date(stampData.depositionDate);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Stamp text
    const stampText = [
      `EXHIBIT ${stampData.exhibitNumber}`,
      stampData.caseName,
      `Deposition of ${stampData.deponentName}`,
      formattedDate,
    ];

    if (stampData.reporterName) {
      stampText.push(stampData.reporterName);
    }

    // Add stamp to each page (bottom-right corner)
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Calculate position (bottom-right with margin)
      const margin = 20;
      const fontSize = 10;
      const lineHeight = 14;
      const stampHeight = stampText.length * lineHeight;
      const startY = margin + stampHeight;

      // Draw background rectangle (optional, for better visibility)
      page.drawRectangle({
        x: width - 200 - margin,
        y: margin,
        width: 200,
        height: stampHeight + 10,
        color: rgb(1, 1, 1),
        opacity: 0.9,
      });

      // Draw border
      page.drawRectangle({
        x: width - 200 - margin,
        y: margin,
        width: 200,
        height: stampHeight + 10,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      // Draw stamp text
      stampText.forEach((line, index) => {
        const isBold = index === 0; // Make "EXHIBIT X" bold
        page.drawText(line, {
          x: width - 195 - margin,
          y: startY - (index * lineHeight),
          size: fontSize,
          font: isBold ? boldFont : font,
          color: rgb(0, 0, 0),
        });
      });
    }

    // Save the stamped PDF
    const stampedPdfBytes = await pdfDoc.save();
    return Buffer.from(stampedPdfBytes);
  } catch (error) {
    console.error('Error stamping PDF:', error);
    throw new Error(`Failed to stamp PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

