const TARGET_WORDS = 500;
const OVERLAP_WORDS = 50;

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function wordCount(text: string): number {
  return splitWords(text).length;
}

function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function lastWords(text: string, count: number): string {
  const words = splitWords(text);
  if (words.length <= count) return words.join(" ");
  return words.slice(-count).join(" ");
}

/**
 * Paragraph-aware word chunking.
 *
 * 1. Normalize whitespace.
 * 2. Split on blank lines (paragraphs).
 * 3. Pack paragraphs until ~500 words.
 * 4. Split oversized paragraphs on word boundaries.
 * 5. Prepend ~50 words of the previous packed chunk as overlap.
 *
 * Chunk sizes are measured in words, not tokens.
 */
export function chunkText(text: string): string[] {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").trim())
    .filter(Boolean);

  const blocks: string[] = [];
  for (const paragraph of paragraphs) {
    const words = splitWords(paragraph);
    if (words.length <= TARGET_WORDS) {
      blocks.push(words.join(" "));
      continue;
    }
    for (let i = 0; i < words.length; i += TARGET_WORDS) {
      blocks.push(words.slice(i, i + TARGET_WORDS).join(" "));
    }
  }

  const packed: string[] = [];
  let current: string[] = [];
  let currentCount = 0;

  for (const block of blocks) {
    const count = wordCount(block);
    if (currentCount > 0 && currentCount + count > TARGET_WORDS) {
      packed.push(current.join("\n\n"));
      current = [];
      currentCount = 0;
    }
    current.push(block);
    currentCount += count;
  }
  if (current.length > 0) {
    packed.push(current.join("\n\n"));
  }

  if (packed.length <= 1) return packed;

  return packed.map((chunk, index) => {
    if (index === 0) return chunk;
    const overlap = lastWords(packed[index - 1] ?? "", OVERLAP_WORDS);
    return overlap ? `${overlap}\n\n${chunk}` : chunk;
  });
}

export const CHUNKING = {
  targetWords: TARGET_WORDS,
  overlapWords: OVERLAP_WORDS,
} as const;
