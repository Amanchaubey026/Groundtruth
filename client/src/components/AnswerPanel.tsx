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
      <section className="flex min-h-[28rem] flex-col justify-between bg-paper p-6 md:p-10">
        <div>
          <p className="eyebrow">03 / Answer</p>
          <h2 className="font-display mt-4 max-w-lg text-4xl leading-[0.95] tracking-tight md:text-6xl">
            Ask to begin.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-6 text-muted">
            Questions are answered only from ingested notes and pages. If nothing is relevant,
            the model is not asked to guess.
          </p>
        </div>
        <p className="text-[0.7rem] tracking-[0.22em] uppercase text-muted">Ready</p>
      </section>
    );
  }

  return (
    <section className="bg-paper p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">03 / Answer</p>
          {question ? (
            <h2 className="font-display mt-3 max-w-3xl text-3xl leading-[1.05] tracking-tight md:text-5xl">
              {question}
            </h2>
          ) : null}
        </div>
        <StatusLabel phase={phase} />
      </div>

      <div className="mt-8 border-t border-ink pt-8">
        {retrieving && !answer ? (
          <p className="text-sm tracking-wide text-muted">Retrieving relevant sources…</p>
        ) : (
          <MarkdownAnswer markdown={answer} streaming={streaming} onCite={focusSource} />
        )}
      </div>

      <div className="mt-12">
        <p className="eyebrow">Sources</p>
        {sources.length === 0 && phase === "done" ? (
          <p className="mt-4 text-sm text-muted">
            I couldn't find relevant information in your saved content.
          </p>
        ) : (
          <ol className="mt-5 grid gap-px bg-ink sm:grid-cols-2">
            {sources.map((source) => {
              const n = source.sourceNumber;
              const active = activeSource === n;
              return (
                <li
                  key={`${source.itemId}-${n}`}
                  id={`source-${n}`}
                  className={`p-5 ${active ? "bg-ink text-white" : "bg-paper text-ink"}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={`font-display text-3xl tracking-tight ${active ? "text-white" : ""}`}>
                      {String(n).padStart(2, "0")}
                    </p>
                    <span className={`text-[0.65rem] tracking-[0.16em] uppercase ${active ? "text-white/50" : "text-muted"}`}>
                      {(source.score * 100).toFixed(0)}% match
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-xl leading-tight tracking-tight">
                    {source.title || "Untitled"}
                  </h3>
                  <p className={`mt-3 text-sm leading-6 ${active ? "text-white/70" : "text-muted"}`}>
                    {source.snippet}
                  </p>
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-4 inline-flex items-center gap-2 text-[0.7rem] tracking-[0.16em] uppercase ${
                        active ? "text-white" : ""
                      }`}
                    >
                      Open source ↗
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

function StatusLabel({ phase }: { phase: QueryPhase }) {
  const label =
    phase === "retrieving" ? "Retrieving" : phase === "streaming" ? "Writing" : phase === "done" ? "Grounded" : "";
  if (!label) return null;
  return (
    <span className="shrink-0 border border-ink px-3 py-1 text-[0.65rem] tracking-[0.18em] uppercase">
      {label}
    </span>
  );
}
