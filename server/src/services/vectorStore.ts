import { listChunksWithItems } from "../db/client.js";
import { deserializeEmbedding } from "./embeddings.js";
import type { RetrievedSource } from "../types.js";

export interface ScoredChunk {
  chunkId: string;
  itemId: string;
  title: string | null;
  url: string | null;
  content: string;
  score: number;
}

function dot(a: Float32Array, b: Float32Array): number {
  const length = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return sum;
}

/**
 * Brute-force cosine similarity over the full chunk table.
 * Embeddings are L2-normalized, so cosine similarity is a dot product.
 */
export function searchSimilar(query: Float32Array, topK: number): ScoredChunk[] {
  const rows = listChunksWithItems();
  const scored: ScoredChunk[] = rows.map((row) => {
    const embedding = deserializeEmbedding(row.embedding);
    return {
      chunkId: row.id,
      itemId: row.item_id,
      title: row.title,
      url: row.source_url,
      content: row.content,
      score: dot(query, embedding),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(0, topK));
}

export function toRetrievedSources(chunks: ScoredChunk[]): RetrievedSource[] {
  return chunks.map((chunk, index) => ({
    sourceNumber: index + 1,
    chunkId: chunk.chunkId,
    itemId: chunk.itemId,
    title: chunk.title,
    url: chunk.url,
    content: chunk.content,
    score: roundScore(chunk.score),
  }));
}

export function roundScore(score: number): number {
  return Math.round(score * 10000) / 10000;
}
