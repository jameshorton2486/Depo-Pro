export async function extractDocumentText(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "pdf") return extractPDFText(file);
  if (extension === "docx" || extension === "doc") return extractDocxText(file);
  if (extension === "txt" || extension === "text") return extractTxtText(file);
  throw new Error(`Unsupported file type ".${extension}". Upload a PDF, DOCX, or TXT file.`);
}

async function extractPDFText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let lastY: number | null = null;
    for (const item of content.items) {
      if ("str" in item) {
        const y = (item.transform as number[])[5];
        if (lastY !== null && Math.abs(y - lastY) > 4) lines.push("\n");
        lines.push(item.str);
        lastY = y;
      }
    }
    pages.push(lines.join(""));
  }

  return pages.join("\n\n--- PAGE BREAK ---\n\n");
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

function extractTxtText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read text file."));
    reader.readAsText(file);
  });
}
