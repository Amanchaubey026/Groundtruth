import { useCallback, useRef, useState } from "react";
import {
  queryKnowledgeStream,
  type QueryResult,
  type QuerySource,
} from "../api/client";

export type QueryPhase = "idle" | "retrieving" | "streaming" | "done";

export function useQuery() {
  const [phase, setPhase] = useState<QueryPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<QuerySource[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const ask = useCallback(async (nextQuestion: string) => {
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
      );
      setPhase((current) => (current === "retrieving" ? "done" : current));
    } catch (err) {
      if (controller.signal.aborted) return;
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Failed to ask the question");
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
