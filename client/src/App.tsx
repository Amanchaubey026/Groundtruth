import { useEffect, useState } from "react";
import { AddItemForm } from "./components/AddItemForm";
import { AnswerPanel } from "./components/AnswerPanel";
import { ItemList } from "./components/ItemList";
import { ModelSelect } from "./components/ModelSelect";
import { QueryBox } from "./components/QueryBox";
import { Toast } from "./components/Toast";
import { useItems } from "./hooks/useItems";
import { useLlm } from "./hooks/useLlm";
import { useQuery } from "./hooks/useQuery";
import { ApiError, type LlmSelection } from "./api/client";

export default function App() {
  const { items, loading: itemsLoading, error: itemsError, refresh } = useItems();
  const {
    phase,
    loading: queryLoading,
    error: queryError,
    question,
    answer,
    sources,
    ask,
    reset,
  } = useQuery();
  const llm = useLlm();
  const [chatKey, setChatKey] = useState(0);
  const [toast, setToast] = useState<{ title: string; steps: string[] } | null>(null);

  useEffect(() => {
    if (!llm.status || llm.loading) return;
    if (!llm.status.ollama.reachable) {
      setToast({
        title: "Ollama is not running",
        steps: [
          "Install Ollama from https://ollama.com (the installer usually starts it).",
          "If needed, run: ollama serve",
          `ollama pull ${llm.status.defaultModel}`,
          "Confirm with: ollama list",
          "Click Refresh models in the header.",
        ],
      });
      return;
    }
    const selected = llm.selectedOption;
    if (selected && !selected.available) {
      setToast({
        title: `${selected.model} is not pulled`,
        steps: [
          `ollama pull ${selected.model}`,
          "Confirm with: ollama list — the name must match exactly.",
          "Click Refresh models in the header.",
        ],
      });
      return;
    }
    setToast(null);
  }, [llm.loading, llm.selectedOption, llm.status]);

  function startNewChat() {
    reset();
    setChatKey((current) => current + 1);
  }

  function onSelectModel(next: LlmSelection) {
    llm.setSelection(next);
    const option = llm.status?.options.find(
      (item) => item.provider === next.provider && item.model === next.model,
    );
    if (option && !option.available) {
      setToast({
        title: `${option.model} is not pulled`,
        steps: [
          `ollama pull ${option.model}`,
          "Confirm with: ollama list — the name must match exactly.",
          "Click Refresh models in the header.",
        ],
      });
    } else {
      setToast(null);
    }
  }

  async function onAsk(nextQuestion: string) {
    try {
      await ask(nextQuestion, llm.selection);
    } catch (err) {
      if (err instanceof ApiError && err.steps && err.steps.length > 0) {
        setToast({ title: err.message, steps: err.steps });
      }
    }
  }

  async function onRefreshModels() {
    await llm.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Mark />
            <div>
              <p className="font-display text-lg leading-none tracking-tight">Ground Truth</p>
              <p className="mt-1 text-sm text-muted">Save notes or links, then ask questions.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ModelSelect
              options={llm.status?.options ?? []}
              selection={llm.selection}
              loading={llm.loading}
              onChange={onSelectModel}
              onRefresh={() => void onRefreshModels()}
            />
            <button type="button" className="btn-secondary shrink-0" onClick={startNewChat}>
              New chat
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-4">
          <AddItemForm onCreated={() => void refresh()} />
          <ItemList items={items} loading={itemsLoading} error={itemsError} />
        </div>
        <div className="flex flex-col gap-4">
          <QueryBox
            key={chatKey}
            loading={queryLoading}
            error={queryError}
            autoFocus={chatKey > 0}
            onAsk={onAsk}
          />
          <AnswerPanel
            key={`answer-${chatKey}`}
            phase={phase}
            question={question}
            answer={answer}
            sources={sources}
          />
        </div>
      </main>

      {toast ? (
        <Toast
          title={toast.title}
          steps={toast.steps}
          onClose={() => setToast(null)}
          onRefresh={() => {
            void onRefreshModels();
          }}
        />
      ) : null}
    </div>
  );
}

function Mark() {
  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink font-display text-[12px] font-extrabold tracking-tight text-white"
      aria-hidden="true"
    >
      GT
    </div>
  );
}
