import { useState } from "react";
import { AddItemForm } from "./components/AddItemForm";
import { AnswerPanel } from "./components/AnswerPanel";
import { ItemList } from "./components/ItemList";
import { QueryBox } from "./components/QueryBox";
import { useItems } from "./hooks/useItems";
import { useQuery } from "./hooks/useQuery";

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
  const [chatKey, setChatKey] = useState(0);

  function startNewChat() {
    reset();
    setChatKey((current) => current + 1);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Mark />
            <div>
              <p className="font-display text-lg leading-none tracking-tight">Ground Truth</p>
              <p className="mt-1 text-sm text-muted">Save notes or links, then ask questions.</p>
            </div>
          </div>
          <button type="button" className="btn-secondary shrink-0" onClick={startNewChat}>
            New chat
          </button>
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
            onAsk={ask}
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
