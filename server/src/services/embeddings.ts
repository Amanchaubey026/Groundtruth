import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIMENSIONS = 384;

const BATCH_SIZE = 8;

let embedderPromise: Promise<FeatureExtractionPipeline> | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedderPromise) {
    logger.info("Loading embedding model", { model: EMBEDDING_MODEL });
    const startedAt = Date.now();
    embedderPromise = pipeline("feature-extraction", EMBEDDING_MODEL)
      .then((extractor) => {
        logger.info("Embedding model ready", {
          model: EMBEDDING_MODEL,
          dimensions: EMBEDDING_DIMENSIONS,
          durationMs: Date.now() - startedAt,
        });
        return extractor;
      })
      .catch((error: unknown) => {
        embedderPromise = null;
        const message = error instanceof Error ? error.message : "unknown error";
        logger.error("Failed to load embedding model", { error: message });
        throw new AppError(
          500,
          "EMBEDDING_ERROR",
          "Failed to load the embedding model",
        );
      });
  }
  return embedderPromise;
}

export async function warmupEmbeddings(): Promise<void> {
  await getEmbedder();
}

function toVectors(output: unknown, expectedCount: number): Float32Array[] {
  const tensor = output as { data: ArrayLike<number>; dims: number[] };
  const data = tensor.data;
  const dims = tensor.dims;

  if (!data || !dims || dims.length === 0) {
    throw new AppError(500, "EMBEDDING_ERROR", "Embedding model returned an unexpected tensor");
  }

  const dim = dims[dims.length - 1] ?? 0;
  if (dim !== EMBEDDING_DIMENSIONS) {
    throw new AppError(
      500,
      "EMBEDDING_ERROR",
      `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${dim}`,
    );
  }

  const rowCount = dims.length === 1 ? 1 : (dims[0] ?? expectedCount);
  const vectors: Float32Array[] = [];
  for (let i = 0; i < rowCount; i++) {
    const start = i * dim;
    const vector = new Float32Array(dim);
    for (let j = 0; j < dim; j++) {
      vector[j] = Number(data[start + j]);
    }
    vectors.push(vector);
  }

  if (vectors.length !== expectedCount) {
    throw new AppError(
      500,
      "EMBEDDING_ERROR",
      `Embedding count mismatch: expected ${expectedCount}, got ${vectors.length}`,
    );
  }

  return vectors;
}

export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  if (texts.length === 0) return [];

  try {
    const extractor = await getEmbedder();
    const vectors: Float32Array[] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const output = await extractor(batch, { pooling: "mean", normalize: true });
      vectors.push(...toVectors(output, batch.length));
    }

    return vectors;
  } catch (error) {
    if (error instanceof AppError) throw error;
    const message = error instanceof Error ? error.message : "unknown error";
    logger.error("Embedding generation failed", { error: message, count: texts.length });
    throw new AppError(500, "EMBEDDING_ERROR", "Failed to generate embeddings");
  }
}

export async function embedQuery(text: string): Promise<Float32Array> {
  const [vector] = await embedTexts([text]);
  if (!vector) {
    throw new AppError(500, "EMBEDDING_ERROR", "Failed to generate a query embedding");
  }
  return vector;
}

export function serializeEmbedding(vector: Float32Array): Buffer {
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
}

export function deserializeEmbedding(buffer: Buffer): Float32Array {
  const copy = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return new Float32Array(copy);
}
