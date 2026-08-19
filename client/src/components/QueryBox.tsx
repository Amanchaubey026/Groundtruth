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
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="font-display text-xl text-ink">Ask your knowledge</h2>
        <p className="mt-1 text-sm text-muted">
          Answers come only from notes and pages you have saved.
        </p>
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
        <label className="block">
          <span className="sr-only">Question</span>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
            placeholder="What is retrieval-augmented generation?"
            className="w-full resize-y rounded-xl border border-line bg-white px-3 py-2 text-sm leading-6 outline-none ring-accent/30 focus:ring-2"
            disabled={loading}
          />
        </label>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            {loading ? "Streaming a grounded answer…" : "\u00a0"}
          </p>
          <button
            type="submit"
            disabled={loading || question.trim().length === 0}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Thinking…" : "Ask"}
          </button>
        </div>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
