/** Retrieve top chunks, then stream a grounded answer. Skip the LLM when nothing is similar enough. */
import { config } from "../lib/config.js";
import { logger } from "../lib/logger.js";
import type { QueryResponse, QuerySource, RetrievedSource } from "../types.js";
import { embedQuery } from "./embeddings.js";
import { activeModelName, streamAnswer } from "./llm.js";
import { searchSimilar, toRetrievedSources } from "./vectorStore.js";

export const NO_CONTENT_ANSWER =
  "I couldn't find relevant information in your saved content.";

const SNIPPET_LENGTH = 400;

export type QueryStreamEvent =
  | { type: "sources"; sources: QuerySource[] }
  | { type: "token"; text: string }
  | { type: "done"; answer: string; sources: QuerySource[] };

export async function answerQuestion(
  question: string,
  requestId?: string,
  signal?: AbortSignal,
): Promise<QueryResponse> {
  let answer = "";
  let sources: QuerySource[] = [];
  for await (const event of streamQuestion(question, requestId, signal)) {
    if (event.type === "sources") sources = event.sources;
    if (event.type === "token") answer += event.text;
    if (event.type === "done") {
      return { answer: event.answer, sources: event.sources };
    }
  }
  return { answer: answer.trim() || NO_CONTENT_ANSWER, sources };
}

export async function* streamQuestion(
  question: string,
  requestId?: string,
  signal?: AbortSignal,
): AsyncGenerator<QueryStreamEvent> {
  const startedAt = Date.now();
  const queryVector = await embedQuery(question);
  const retrieved = searchSimilar(queryVector, config.topK);
  const relevant = retrieved.filter((chunk) => chunk.score >= config.minSimilarity);
  const retrievedSources = toRetrievedSources(relevant);
  const sources = retrievedSources.map(toQuerySource);
  const topSimilarity = retrieved[0]?.score ?? 0;

  yield { type: "sources", sources };

  if (sources.length === 0) {
    logger.info("Query completed", {
      requestId,
      questionLength: question.length,
      retrievedChunks: 0,
      topSimilarity,
      llmDurationMs: 0,
      model: activeModelName(),
      durationMs: Date.now() - startedAt,
    });
    yield { type: "token", text: NO_CONTENT_ANSWER };
    yield { type: "done", answer: NO_CONTENT_ANSWER, sources: [] };
    return;
  }

  const llmStartedAt = Date.now();
  let answer = "";
  for await (const token of streamAnswer(retrievedSources, question, signal)) {
    if (!token) continue;
    answer += token;
    yield { type: "token", text: token };
  }

  const trimmed = answer.trim();
  logger.info("Query completed", {
    requestId,
    questionLength: question.length,
    retrievedChunks: sources.length,
    topSimilarity,
    llmDurationMs: Date.now() - llmStartedAt,
    model: activeModelName(),
    streamed: true,
    durationMs: Date.now() - startedAt,
  });

  yield {
    type: "done",
    answer: trimmed || NO_CONTENT_ANSWER,
    sources,
  };
}

function toQuerySource(source: RetrievedSource): QuerySource {
  return {
    sourceNumber: source.sourceNumber,
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
