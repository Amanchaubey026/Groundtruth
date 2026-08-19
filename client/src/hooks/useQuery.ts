import { useCallback, useState } from "react";
import { queryKnowledge, type QueryResult } from "../api/client";

export function useQuery() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);

  const ask = useCallback(async (question: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await queryKnowledge(question);
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Failed to ask the question");
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, result, ask };
}
