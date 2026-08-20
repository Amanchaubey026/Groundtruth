import { useCallback, useRef, useState } from "react";
import {
  ApiError,
  queryKnowledgeStream,
  type LlmSelection,
  type QueryResult,
  type QuerySource,
} from "../api/client";

export type QueryPhase = "idle" | "retrieving" | "streaming" | "done";

/** One question at a time. New chat aborts the in-flight stream and clears the answer. */
export function useQuery() {
  const [phase, setPhase] = useState<QueryPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<QuerySource[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const ask = useCallback(async (nextQuestion: string, llm?: LlmSelection) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("retrieving");
    setError(null);
    setQuestion(nextQuestion);
    setAnswer("");
    setSources([]);

    try {
      await queryKnowledgeStream(
        nextQuestion,
        {
          onSources: (nextSources) => {
            setSources(nextSources);
          },
          onToken: (text) => {
            setPhase("streaming");
            setAnswer((current) => current + text);
          },
          onDone: (result: QueryResult) => {
            setSources(result.sources);
            setAnswer(result.answer);
            setPhase("done");
          },
        },
        controller.signal,
        llm,
      );
      setPhase((current) => (current === "retrieving" ? "done" : current));
    } catch (err) {
      if (controller.signal.aborted) return;
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Failed to ask the question");
      throw err instanceof ApiError ? err : new Error("Failed to ask the question");
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
    setError(null);
    setQuestion(null);
    setAnswer("");
    setSources([]);
  }, []);

  const loading = phase === "retrieving" || phase === "streaming";

  return {
    phase,
    loading,
    error,
    question,
    answer,
    sources,
    ask,
    reset,
  };
}
