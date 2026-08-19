import { AddItemForm } from "./components/AddItemForm";
import { AnswerPanel } from "./components/AnswerPanel";
import { ItemList } from "./components/ItemList";
import { QueryBox } from "./components/QueryBox";
import { useItems } from "./hooks/useItems";
import { useQuery } from "./hooks/useQuery";

export default function App() {
  const { items, loading: itemsLoading, error: itemsError, refresh } = useItems();
  const { phase, loading: queryLoading, error: queryError, question, answer, sources, ask } =
    useQuery();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <Mark />
          <div>
            <p className="font-display text-lg leading-none tracking-tight">Ground Truth</p>
            <p className="mt-1 text-sm text-muted">Save notes or links, then ask questions.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-4">
          <AddItemForm onCreated={() => void refresh()} />
          <ItemList items={items} loading={itemsLoading} error={itemsError} />
        </div>
        <div className="flex flex-col gap-4">
          <QueryBox loading={queryLoading} error={queryError} onAsk={ask} />
          <AnswerPanel
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
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white">
      <svg width="22" height="16" viewBox="0 0 26 18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8.6 0c4.8 0 8.4 3.3 8.4 9s-3.6 9-8.4 9H0V0h8.6Zm-.4 15.2c2.7 0 4.7-2 4.7-6.2S10.9 2.8 8.2 2.8H3.4v12.4h4.8ZM14.4 0h11.2v2.8h-4.2V18h-3.4V2.8h-3.6V0Z"
        />
      </svg>
    </div>
  );
}
