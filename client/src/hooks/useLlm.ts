import { useCallback, useEffect, useMemo, useState } from "react";
import { getLlmStatus, type LlmSelection, type LlmStatus } from "../api/client";

const STORAGE_KEY = "gt.llm-selection";

function readStored(): LlmSelection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LlmSelection>;
    if (
      (parsed.provider === "ollama" ||
        parsed.provider === "openrouter" ||
        parsed.provider === "xai") &&
      typeof parsed.model === "string" &&
      parsed.model.trim()
    ) {
      return { provider: parsed.provider, model: parsed.model.trim() };
    }
  } catch {
    return null;
  }
  return null;
}

export function useLlm() {
  const [status, setStatus] = useState<LlmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelectionState] = useState<LlmSelection>(() => {
    return readStored() ?? { provider: "ollama", model: "llama3.1:8b" };
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getLlmStatus();
      setStatus(next);
      setSelectionState((current) => {
        const stored = readStored() ?? current;
        const match = next.options.find(
          (option) =>
            option.provider === stored.provider && option.model === stored.model,
        );
        if (match) return { provider: match.provider, model: match.model };
        return { provider: next.defaultProvider, model: next.defaultModel };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load models");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setSelection = useCallback((next: LlmSelection) => {
    setSelectionState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const selectedOption = useMemo(() => {
    return (
      status?.options.find(
        (option) =>
          option.provider === selection.provider && option.model === selection.model,
      ) ?? null
    );
  }, [selection, status]);

  return {
    status,
    loading,
    error,
    selection,
    selectedOption,
    setSelection,
    refresh,
  };
}
