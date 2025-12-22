import type { DocumentStats } from "../types/document";

export async function parseDocxFile(
  file: File,
  options: {
    maxChars: number;
    lowTextThreshold: number;
  },
) {
  const mammothModule = await import("mammoth/mammoth.browser");
  const extractRawText =
    (mammothModule as any).extractRawText ||
    (mammothModule as any).default?.extractRawText;

  if (!extractRawText) {
    throw new Error("DOCX parser is not available");
  }

  const arrayBuffer = await file.arrayBuffer();

  const result = await extractRawText({ arrayBuffer });
  const rawText: string = (result as any)?.value || "";

  let truncated = false;
  let text = rawText;

  if (rawText.length > options.maxChars) {
    text = rawText.slice(0, options.maxChars);
    truncated = true;
  }

  const trimmedText = text.trim();

  const stats: DocumentStats = {
    charCount: trimmedText.length,
    truncated,
  };

  return {
    text: trimmedText,
    stats,
    lowText: trimmedText.length < options.lowTextThreshold,
  };
}
