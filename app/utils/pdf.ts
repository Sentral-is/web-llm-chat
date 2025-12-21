import type { DocumentStats } from "../types/document";

let pdfWorkerConfigured = false;

export async function parsePdfFile(
  file: File,
  options: {
    maxPages: number;
    maxChars: number;
    lowTextThreshold: number;
  },
) {
  // 1. Import the legacy build
  const pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // 2. Fix the "non-object" error by correctly identifying the export
  // Some environments return the library directly, others wrap it in .default
  const pdfjs = pdfjsModule.default || pdfjsModule;

  if (!pdfWorkerConfigured) {
    // 3. Point to the local worker in public/
    // This satisfies worker-src 'self' and bypasses all CDN/Blob issues
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    pdfWorkerConfigured = true;
  }

  const data = await file.arrayBuffer();

  try {
    const loadingTask = pdfjs.getDocument({
      data,
      useSystemFonts: true,
      disableFontFace: true,
    });

    const doc = await loadingTask.promise;
    const totalPages = doc.numPages;
    const pagesParsed = Math.min(totalPages, options.maxPages);

    let text = "";
    let charCount = 0;
    let truncated = totalPages > pagesParsed;

    for (let i = 1; i <= pagesParsed; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item: any) => item.str || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (pageText) {
        const chunk = pageText + "\n\n";
        if (charCount + chunk.length > options.maxChars) {
          text += chunk.slice(0, options.maxChars - charCount);
          charCount = options.maxChars;
          truncated = true;
          break;
        }
        text += chunk;
        charCount += chunk.length;
      }
    }

    await doc.destroy();

    const trimmedText = text.trim();
    console.log("[PDF] Parsed", {
      name: file.name,
      pagesParsed,
      totalPages,
      truncated,
      charCount: trimmedText.length,
      preview: trimmedText.slice(0, 200),
    });

    return {
      text: trimmedText,
      stats: {
        pagesParsed,
        totalPages,
        charCount: trimmedText.length,
        truncated,
      },
      lowText: trimmedText.length < options.lowTextThreshold,
    };
  } catch (error) {
    console.error("PDF Read Error:", error);
    throw error;
  }
}
