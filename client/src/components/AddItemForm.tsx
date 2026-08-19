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
        await ingestNote(content);
        setContent("");
        setSuccess("Note saved.");
      } else {
        const result = await ingestUrl(url);
        setUrl("");
        setSuccess(`Saved “${result.title ?? "page"}”.`);
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !loading && (kind === "note" ? content.trim().length > 0 : url.trim().length > 0);

  return (
    <section className="card p-4">
      <h2 className="text-base font-semibold">Add</h2>
      <p className="mt-1 text-sm text-muted">Save a note or a web page.</p>

      <div className="mt-3 inline-flex rounded-lg bg-paper p-1 text-sm">
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 ${kind === "note" ? "bg-ink text-white" : "text-muted"}`}
          onClick={() => setKind("note")}
          disabled={loading}
        >
          Note
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 ${kind === "url" ? "bg-ink text-white" : "text-muted"}`}
          onClick={() => setKind("url")}
          disabled={loading}
        >
          Link
        </button>
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="mt-3 space-y-3">
        {kind === "note" ? (
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Your note</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={4}
              placeholder="Type or paste something to remember…"
              className="field"
              disabled={loading}
            />
          </label>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm text-muted">Page URL</span>
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
          <p className="text-sm text-muted" aria-live="polite">
            {loading ? (kind === "url" ? "Reading page…" : "Saving…") : success || "\u00a0"}
          </p>
          <button type="submit" disabled={!canSubmit} className="btn-primary">
            {loading ? "Saving…" : "Save"}
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
