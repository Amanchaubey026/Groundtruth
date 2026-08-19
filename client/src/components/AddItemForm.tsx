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
        setSuccess(
          `Saved note${result.chunkCount ? ` · ${result.chunkCount} chunk${result.chunkCount === 1 ? "" : "s"}` : ""}.`,
        );
      } else {
        const result = await ingestUrl(url);
        setUrl("");
        setSuccess(
          `Saved ${result.title ?? "URL"} · ${result.chunkCount} chunk${result.chunkCount === 1 ? "" : "s"}.`,
        );
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
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Add knowledge</h2>
          <p className="mt-1 text-sm text-muted">Save a short note or fetch a web page.</p>
        </div>
        <div className="inline-flex rounded-full border border-line bg-paper p-1 text-sm">
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${kind === "note" ? "bg-accent text-white" : "text-muted"}`}
            onClick={() => setKind("note")}
            disabled={loading}
          >
            Note
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${kind === "url" ? "bg-accent text-white" : "text-muted"}`}
            onClick={() => setKind("url")}
            disabled={loading}
          >
            URL
          </button>
        </div>
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
        {kind === "note" ? (
          <label className="block">
            <span className="sr-only">Note content</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={5}
              placeholder="Paste a thought, excerpt, or fact you want to remember…"
              className="w-full resize-y rounded-xl border border-line bg-white px-3 py-2 text-sm leading-6 outline-none ring-accent/30 focus:ring-2"
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
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none ring-accent/30 focus:ring-2"
              disabled={loading}
            />
          </label>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            {loading
              ? kind === "url"
                ? "Fetching and processing URL…"
                : "Saving…"
              : success
                ? success
                : "\u00a0"}
          </p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent-dark"
          >
            {loading ? "Processing…" : "Save"}
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
