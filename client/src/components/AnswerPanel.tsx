import type { QueryResult } from "../api/client";

interface AnswerPanelProps {
  loading: boolean;
  result: QueryResult | null;
}

export function AnswerPanel({ loading, result }: AnswerPanelProps) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">Answer</h2>
        <p className="mt-3 text-sm text-muted">Searching your knowledge…</p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-card p-5">
        <h2 className="text-lg font-semibold tracking-tight">Answer</h2>
        <p className="mt-3 text-sm text-muted">
          Ask a question to see a grounded answer and the source snippets it came from.
        </p>
      </section>
    );
  }

  const noSources = result.sources.length === 0;

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight">Answer</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{result.answer}</p>

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">Sources</h3>
      {noSources ? (
        <p className="mt-2 text-sm text-muted">
          I couldn't find relevant information in your saved content.
        </p>
      ) : (
        <ol className="mt-3 space-y-3">
          {result.sources.map((source, index) => (
            <li key={`${source.itemId}-${index}`} className="rounded-xl border border-line bg-paper p-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">
                  [Source {index + 1}] {source.title || "Untitled"}
                </p>
                <span className="shrink-0 text-xs text-muted">
                  {(source.score * 100).toFixed(0)}% match
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted">{source.snippet}</p>
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-accent hover:underline"
                >
                  {source.url}
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
