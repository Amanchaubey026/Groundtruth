import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";
import type { QueryResponse, QuerySource, RetrievedSource } from "../types.js";
import { embedQuery } from "./embeddings.js";
import { generateAnswer } from "./llm.js";
import { searchSimilar, toRetrievedSources } from "./vectorStore.js";

const NO_CONTENT_ANSWER =
  "I couldn't find relevant information in your saved content.";

const SNIPPET_LENGTH = 400;

export async function answerQuestion(
  question: string,
  requestId?: string,
): Promise<QueryResponse> {
  const startedAt = Date.now();
  const queryVector = await embedQuery(question);
  const retrieved = searchSimilar(queryVector, config.topK);
  const relevant = retrieved.filter((chunk) => chunk.score >= config.minSimilarity);
  const sources = toRetrievedSources(relevant);
  const topSimilarity = retrieved[0]?.score ?? 0;

  if (sources.length === 0) {
    logger.info("Query completed", {
      requestId,
      questionLength: question.length,
      retrievedChunks: 0,
      topSimilarity,
      llmDurationMs: 0,
      durationMs: Date.now() - startedAt,
    });
    return { answer: NO_CONTENT_ANSWER, sources: [] };
  }

  const llmStartedAt = Date.now();
  const answer = await generateAnswer(sources, question);
  const llmDurationMs = Date.now() - llmStartedAt;

  logger.info("Query completed", {
    requestId,
    questionLength: question.length,
    retrievedChunks: sources.length,
    topSimilarity,
    llmDurationMs,
    durationMs: Date.now() - startedAt,
  });

  return {
    answer,
    sources: sources.map(toQuerySource),
  };
}

function toQuerySource(source: RetrievedSource): QuerySource {
  return {
    itemId: source.itemId,
    title: source.title,
    url: source.url,
    snippet: snippet(source.content),
    score: source.score,
  };
}

function snippet(content: string): string {
  const collapsed = content.replace(/\s+/g, " ").trim();
  if (collapsed.length <= SNIPPET_LENGTH) return collapsed;
  return `${collapsed.slice(0, SNIPPET_LENGTH).trimEnd()}…`;
}
