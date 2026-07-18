export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
  charCount: number;
}

export interface PdfExtractionResult {
  fileName: string;
  sanitizedFileName: string;
  pageCount: number;
  processedPages: number;
  charCount: number;
  truncated: boolean;
  text: string;
  pages: ExtractedPdfPage[];
}

export interface PdfExtractionOptions {
  maxFileSizeBytes?: number;
  maxPages?: number;
  maxChars?: number;
}

export const defaultPdfExtractionOptions = {
  maxFileSizeBytes: 10 * 1024 * 1024,
  maxPages: 40,
  maxChars: 60_000,
} satisfies Required<PdfExtractionOptions>;

export function sanitizePdfFileName(name: string): string {
  const fallback = "pitch-deck.pdf";
  const base = name.split(/[\\/]/).pop()?.trim() || fallback;
  const cleaned = base
    .replace(/[^a-zA-Z0-9._ -]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[. -]+|[. -]+$/g, "")
    .slice(0, 120);
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned || "pitch-deck"}.pdf`;
}

export function isPdfUploadLike(file: Pick<File, "name" | "type">): boolean {
  const nameLooksPdf = file.name.toLowerCase().endsWith(".pdf");
  const typeLooksPdf = !file.type || file.type === "application/pdf" || file.type === "application/x-pdf";
  return nameLooksPdf && typeLooksPdf;
}

export function validatePdfUpload(file: Pick<File, "name" | "type" | "size">, options: PdfExtractionOptions = {}): void {
  const merged = { ...defaultPdfExtractionOptions, ...options };
  if (!isPdfUploadLike(file)) {
    throw new Error("Only PDF pitch decks are supported for local extraction.");
  }
  if (file.size <= 0) {
    throw new Error("The selected PDF is empty.");
  }
  if (file.size > merged.maxFileSizeBytes) {
    throw new Error(`PDF is too large for local extraction. Limit: ${Math.round(merged.maxFileSizeBytes / 1024 / 1024)} MB.`);
  }
}

function normalizePageText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function formatDeckPageText(pages: ExtractedPdfPage[], maxChars = defaultPdfExtractionOptions.maxChars): { text: string; truncated: boolean; charCount: number } {
  const blocks = pages
    .map((page) => ({ ...page, text: normalizePageText(page.text) }))
    .filter((page) => page.text.length > 0)
    .map((page) => `Page ${page.pageNumber}: ${page.text}`);
  const fullText = blocks.join("\n\n");
  if (fullText.length <= maxChars) return { text: fullText, truncated: false, charCount: fullText.length };
  const marker = "\n\n[PDF extraction truncated for local review. Upload primary documents or paste additional pages if needed.]";
  return { text: `${fullText.slice(0, Math.max(0, maxChars - marker.length)).trim()}${marker}`, truncated: true, charCount: maxChars };
}

export async function extractPdfTextFromFile(file: File, options: PdfExtractionOptions = {}): Promise<PdfExtractionResult> {
  const merged = { ...defaultPdfExtractionOptions, ...options };
  validatePdfUpload(file, merged);

  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc ||= new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const processedPages = Math.min(pdf.numPages, merged.maxPages);
  const pages: ExtractedPdfPage[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= processedPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = normalizePageText(
        content.items
          .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
          .filter(Boolean)
          .join(" "),
      );
      pages.push({ pageNumber, text, charCount: text.length });
    }
  } finally {
    await loadingTask.destroy();
  }

  const formatted = formatDeckPageText(pages, merged.maxChars);
  return {
    fileName: file.name,
    sanitizedFileName: sanitizePdfFileName(file.name),
    pageCount: pdf.numPages,
    processedPages,
    charCount: formatted.text.length,
    truncated: formatted.truncated || pdf.numPages > processedPages,
    text: formatted.text,
    pages,
  };
}
