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
    <div className="min-h-screen bg-paper text-ink">
      <header className="bg-black text-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <Mark />
            <span className="text-[0.95rem] font-semibold tracking-[0.22em]">GROUND TRUTH</span>
          </div>
          <p className="eyebrow text-white/45">RAG · Grounded · Cited</p>
        </nav>

        <div className="mx-auto max-w-6xl px-5 pb-16 pt-10 md:pb-20 md:pt-16">
          <p className="eyebrow text-white/40 rise">01 / Knowledge system</p>
          <h1 className="font-display rise mt-5 max-w-4xl text-[clamp(3.2rem,9vw,7.2rem)] leading-[0.88] font-extrabold tracking-[-0.05em]">
            Ground
            <br />
            Truth.
          </h1>
          <p className="rise mt-8 max-w-xl text-base leading-7 text-white/60 md:text-lg">
            Save notes and URLs. Retrieve with embeddings. Stream answers only from what you
            saved — with inline citations.
          </p>

          <div className="mt-12 grid max-w-3xl grid-cols-3 gap-px bg-white/15 text-sm">
            <Capability n="01" label="Ingest" />
            <Capability n="02" label="Retrieve" />
            <Capability n="03" label="Cite" />
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-5 pb-8">
          <QueryBox loading={queryLoading} error={queryError} onAsk={ask} />
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-px bg-hair px-0 py-0 md:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-px bg-hair">
          <AddItemForm onCreated={() => void refresh()} />
          <ItemList items={items} loading={itemsLoading} error={itemsError} />
        </div>
        <AnswerPanel
          phase={phase}
          question={question}
          answer={answer}
          sources={sources}
        />
      </main>
    </div>
  );
}

function Capability({ n, label }: { n: string; label: string }) {
  return (
    <div className="bg-black px-4 py-4">
      <p className="text-[0.65rem] tracking-[0.2em] text-white/35">{n}</p>
      <p className="mt-2 font-display text-xl tracking-tight">{label}</p>
    </div>
  );
}

function Mark() {
  return (
    <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true">
      <path
        fill="white"
        d="M8.6 0c4.8 0 8.4 3.3 8.4 9s-3.6 9-8.4 9H0V0h8.6Zm-.4 15.2c2.7 0 4.7-2 4.7-6.2S10.9 2.8 8.2 2.8H3.4v12.4h4.8ZM14.4 0h11.2v2.8h-4.2V18h-3.4V2.8h-3.6V0Z"
      />
    </svg>
  );
}
