import type { DocumentStats } from "../types/document";

export async function parseTextFile(
  file: File,
  options: {
    maxChars: number;
    lowTextThreshold: number;
  },
) {
  const rawText = await file.text();

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
