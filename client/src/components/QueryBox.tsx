import { useState, type FormEvent } from "react";

interface QueryBoxProps {
  loading: boolean;
  error: string | null;
  onAsk: (question: string) => Promise<void>;
}

export function QueryBox({ loading, error, onAsk }: QueryBoxProps) {
  const [question, setQuestion] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    await onAsk(trimmed);
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)}>
      <div className="flex flex-col overflow-hidden bg-white text-ink shadow-[0_20px_80px_rgba(0,0,0,0.35)] md:flex-row md:items-stretch md:rounded-full">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Question</span>
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What did you save about retrieval-augmented generation?"
            className="h-16 w-full border-0 bg-transparent px-6 text-[1.02rem] outline-none md:h-[4.6rem] md:px-8 md:text-xl"
            disabled={loading}
          />
        </label>
        <button
          type="submit"
          disabled={loading || question.trim().length === 0}
          className="btn-primary m-2 rounded-full md:min-w-44"
        >
          {loading ? "Thinking" : "Ask"}
          <Arrow />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between px-2">
        <p className="text-xs tracking-wide text-white/45" aria-live="polite">
          {loading ? "Streaming a grounded answer from your sources." : "Answers use saved notes and pages only."}
        </p>
        {error ? (
          <p className="text-xs text-red-300" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Arrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 10 10 2M10 2H4M10 2v6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
