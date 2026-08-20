import { useState, type FormEvent } from "react";

interface QueryBoxProps {
  loading: boolean;
  error: string | null;
  autoFocus?: boolean;
  onAsk: (question: string) => Promise<void>;
}

export function QueryBox({ loading, error, autoFocus = false, onAsk }: QueryBoxProps) {
  const [question, setQuestion] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    await onAsk(trimmed);
  }

  return (
    <section className="card p-4">
      <h2 className="text-base font-semibold">Ask</h2>
      <p className="mt-1 text-sm text-muted">Answers come only from what you have saved.</p>

      <form onSubmit={(event) => void onSubmit(event)} className="mt-3 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Your question</span>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={2}
            placeholder="e.g. What is retrieval-augmented generation?"
            className="field"
            disabled={loading}
            autoFocus={autoFocus}
          />
        </label>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            {loading ? "Finding an answer…" : "\u00a0"}
          </p>
          <button
            type="submit"
            disabled={loading || question.trim().length === 0}
            className="btn-primary"
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
