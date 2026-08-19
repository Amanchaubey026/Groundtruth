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
      <section className="card p-4">
        <h2 className="text-base font-semibold">Answer</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Save a note or link, then ask a question. The answer will appear here, with the
          snippets it came from.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Answer</h2>
          {question ? <p className="mt-1 text-sm text-muted">{question}</p> : null}
        </div>
        <StatusLabel phase={phase} />
      </div>

      <div className="mt-4">
        {retrieving && !answer ? (
          <p className="text-sm text-muted">Looking through your saved items…</p>
        ) : (
          <MarkdownAnswer markdown={answer} streaming={streaming} onCite={focusSource} />
        )}
      </div>

      <h3 className="mt-6 text-sm font-semibold">Where this came from</h3>
      {sources.length === 0 && phase === "done" ? (
        <p className="mt-2 text-sm text-muted">
          I couldn't find this in your saved notes or pages.
        </p>
      ) : (
        <ol className="mt-2 space-y-2">
          {sources.map((source) => {
            const n = source.sourceNumber;
            const active = activeSource === n;
            return (
              <li
                key={`${source.itemId}-${n}`}
                id={`source-${n}`}
                className={`rounded-lg border p-3 ${
                  active ? "border-ink bg-paper" : "border-line"
                }`}
              >
                <p className="text-sm font-medium">
                  {n}. {source.title || "Untitled"}
                  <span className="ml-2 font-normal text-muted">
                    {(source.score * 100).toFixed(0)}% match
                  </span>
                </p>
                <p className="mt-1 text-sm leading-6 text-muted">{source.snippet}</p>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs underline underline-offset-2"
                  >
                    Open page
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

function StatusLabel({ phase }: { phase: QueryPhase }) {
  if (phase === "retrieving") return <span className="text-xs text-muted">Searching</span>;
  if (phase === "streaming") return <span className="text-xs text-muted">Writing</span>;
  if (phase === "done") return <span className="text-xs text-muted">Done</span>;
  return null;
}
