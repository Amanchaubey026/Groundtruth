import { useState } from "react";
import type { QuerySource } from "../api/client";
import type { QueryPhase } from "../hooks/useQuery";
import { MarkdownAnswer } from "./MarkdownAnswer";

interface AnswerPanelProps {
  phase: QueryPhase;
  question: string | null;
  answer: string;
  sources: QuerySource[];
}

export function AnswerPanel({ phase, question, answer, sources }: AnswerPanelProps) {
  const [activeSource, setActiveSource] = useState<number | null>(null);
  const retrieving = phase === "retrieving";
  const streaming = phase === "streaming";
  const empty = phase === "idle" && !answer;

  function focusSource(sourceNumber: number) {
    setActiveSource(sourceNumber);
    document.getElementById(`source-${sourceNumber}`)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  if (empty) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-card/70 p-6">
        <h2 className="font-display text-xl text-ink">Answer</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Ask a question to get a grounded answer with inline citations and source snippets.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Answer</p>
          {question ? (
            <p className="mt-1 font-display text-lg leading-snug text-ink">{question}</p>
          ) : null}
        </div>
        <StatusChip phase={phase} />
      </div>

      <div className="mt-4">
        {retrieving && !answer ? (
          <p className="text-sm text-muted">Searching your knowledge…</p>
        ) : (
          <MarkdownAnswer markdown={answer} streaming={streaming} onCite={focusSource} />
        )}
      </div>

      <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted">Sources</h3>
      {sources.length === 0 && phase === "done" ? (
        <p className="mt-2 text-sm text-muted">
          I couldn't find relevant information in your saved content.
        </p>
      ) : (
        <ol className="mt-3 space-y-3">
          {sources.map((source) => {
            const n = source.sourceNumber;
            const active = activeSource === n;
            return (
              <li
                key={`${source.itemId}-${n}`}
                id={`source-${n}`}
                className={`rounded-xl border p-3 transition-colors ${
                  active ? "border-accent bg-accent-soft" : "border-line bg-paper"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">
                    <span className="mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">
                      {n}
                    </span>
                    {source.title || "Untitled"}
                  </p>
                  <span className="shrink-0 text-xs text-muted">
                    {(source.score * 100).toFixed(0)}% match
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{source.snippet}</p>
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
            );
          })}
        </ol>
      )}
    </section>
  );
}

function StatusChip({ phase }: { phase: QueryPhase }) {
  if (phase === "retrieving") {
    return <span className="rounded-full bg-paper px-2.5 py-1 text-xs text-muted">Retrieving</span>;
  }
  if (phase === "streaming") {
    return <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent-dark">Writing</span>;
  }
  if (phase === "done") {
    return <span className="rounded-full bg-paper px-2.5 py-1 text-xs text-muted">Grounded</span>;
  }
  return null;
}
