import { AddItemForm } from "./components/AddItemForm";
import { AnswerPanel } from "./components/AnswerPanel";
import { ItemList } from "./components/ItemList";
import { QueryBox } from "./components/QueryBox";
import { useItems } from "./hooks/useItems";
import { useQuery } from "./hooks/useQuery";

export default function App() {
  const { items, loading: itemsLoading, error: itemsError, refresh } = useItems();
  const { loading: queryLoading, error: queryError, result, ask } = useQuery();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-card/80">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
            <InboxIcon />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">AI Knowledge Inbox</h1>
            <p className="text-sm text-muted">Save knowledge. Ask questions.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <AddItemForm onCreated={() => void refresh()} />
        <ItemList items={items} loading={itemsLoading} error={itemsError} />
        <QueryBox loading={queryLoading} error={queryError} onAsk={ask} />
        <AnswerPanel loading={queryLoading} result={result} />
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
