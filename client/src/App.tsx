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
      <header className="border-b border-line bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
            <InboxIcon />
          </div>
          <div>
            <h1 className="font-display text-2xl tracking-tight">AI Knowledge Inbox</h1>
            <p className="text-sm text-muted">Save knowledge. Ask questions.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[minmax(300px,400px)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
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

function InboxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 13h4l2 3h4l2-3h4v7H4v-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M4 13 7.2 5h9.6L20 13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
