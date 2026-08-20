/** Prepare a note or URL, chunk it, embed, and persist in one request. */
import { randomUUID } from "node:crypto";
import { insertItemWithChunks } from "../db/client.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import type { IngestInput } from "../lib/validation.js";
import type { ChunkRecord, IngestResponse, ItemRecord } from "../types.js";
import { chunkText, normalizeWhitespace } from "./chunking.js";
import { embedTexts, serializeEmbedding } from "./embeddings.js";
import { fetchAndExtract } from "./urlFetcher.js";

export async function ingest(input: IngestInput, requestId?: string): Promise<IngestResponse> {
  const startedAt = Date.now();
  const prepared = await prepareContent(input);

  const chunks = chunkText(prepared.cleanedContent);
  if (chunks.length === 0) {
    throw new AppError(
      422,
      "URL_PARSE_ERROR",
      "Could not extract readable content from the submitted item",
    );
  }

  const embeddingStartedAt = Date.now();
  const embeddings = await embedTexts(chunks);
  const embeddingDurationMs = Date.now() - embeddingStartedAt;

  const now = new Date().toISOString();
  const item: ItemRecord = {
    id: randomUUID(),
    source_type: input.type,
    source_url: prepared.sourceUrl,
    title: prepared.title,
    raw_content: prepared.rawContent,
    cleaned_content: prepared.cleanedContent,
    created_at: now,
  };

  const chunkRecords: ChunkRecord[] = chunks.map((content, index) => {
    const vector = embeddings[index];
    if (!vector) {
      throw new AppError(500, "EMBEDDING_ERROR", "Missing embedding for a content chunk");
    }
    return {
      id: randomUUID(),
      item_id: item.id,
      chunk_index: index,
      content,
      embedding: serializeEmbedding(vector),
      created_at: now,
    };
  });

  insertItemWithChunks(item, chunkRecords);

  logger.info("Ingestion completed", {
    requestId,
    itemId: item.id,
    sourceType: item.source_type,
    chunkCount: chunkRecords.length,
    embeddingDurationMs,
    durationMs: Date.now() - startedAt,
  });

  return {
    id: item.id,
    sourceType: item.source_type,
    title: item.title,
    sourceUrl: item.source_url,
    chunkCount: chunkRecords.length,
    createdAt: item.created_at,
  };
}

interface PreparedContent {
  sourceUrl: string | null;
  title: string | null;
  rawContent: string;
  cleanedContent: string;
}

async function prepareContent(input: IngestInput): Promise<PreparedContent> {
  if (input.type === "note") {
    const cleaned = normalizeWhitespace(input.content);
    if (!cleaned) {
      throw new AppError(400, "VALIDATION_ERROR", "Note content cannot be empty");
    }
    return {
      sourceUrl: null,
      title: input.title ?? null,
      rawContent: input.content,
      cleanedContent: cleaned,
    };
  }

  const page = await fetchAndExtract(input.url);
  return {
    sourceUrl: page.url,
    title: input.title ?? page.title,
    rawContent: page.rawContent,
    cleanedContent: page.cleanedContent,
  };
}
