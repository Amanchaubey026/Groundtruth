import { useState, type FormEvent } from "react";
import { ingestNote, ingestUrl } from "../api/client";

type ItemKind = "note" | "url";

interface AddItemFormProps {
  onCreated: () => void;
}

export function AddItemForm({ onCreated }: AddItemFormProps) {
  const [kind, setKind] = useState<ItemKind>("note");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (kind === "note") {
        const result = await ingestNote(content);
        setContent("");
        setSuccess(`Saved · ${result.chunkCount} chunk${result.chunkCount === 1 ? "" : "s"}`);
      } else {
        const result = await ingestUrl(url);
        setUrl("");
        setSuccess(`Saved ${result.title ?? "URL"} · ${result.chunkCount} chunks`);
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !loading && (kind === "note" ? content.trim().length > 0 : url.trim().length > 0);

  return (
    <section className="bg-paper p-6 md:p-8">
      <p className="eyebrow">01 / Ingest</p>
      <h2 className="font-display mt-3 text-3xl leading-none tracking-tight">Add knowledge</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        A short note, or a URL fetched and cleaned server-side.
      </p>

      <div className="mt-6 flex border border-ink">
        <Toggle active={kind === "note"} onClick={() => setKind("note")} disabled={loading}>
          Note
        </Toggle>
        <Toggle active={kind === "url"} onClick={() => setKind("url")} disabled={loading}>
          URL
        </Toggle>
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="mt-4 space-y-3">
        {kind === "note" ? (
          <label className="block">
            <span className="sr-only">Note content</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              placeholder="Paste a thought, excerpt, or fact…"
              className="field"
              disabled={loading}
            />
          </label>
        ) : (
          <label className="block">
            <span className="sr-only">URL</span>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/article"
              className="field"
              disabled={loading}
            />
          </label>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs tracking-wide text-muted" aria-live="polite">
            {loading ? (kind === "url" ? "Fetching page…" : "Indexing…") : success || "\u00a0"}
          </p>
          <button type="submit" disabled={!canSubmit} className="btn-primary">
            {loading ? "Processing" : "Save"}
            <Arrow />
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

function Toggle({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 py-2 text-xs font-semibold tracking-[0.18em] uppercase ${
        active ? "bg-ink text-white" : "bg-paper text-muted"
      }`}
    >
      {children}
    </button>
  );
}

function Arrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 10 10 2M10 2H4M10 2v6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
