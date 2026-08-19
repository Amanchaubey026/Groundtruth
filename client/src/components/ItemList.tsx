import type { ItemSummary } from "../api/client";

interface ItemListProps {
  items: ItemSummary[];
  loading: boolean;
  error: string | null;
}

export function ItemList({ items, loading, error }: ItemListProps) {
  return (
    <section className="flex min-h-80 flex-1 flex-col bg-paper p-6 md:p-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">02 / Archive</p>
          <h2 className="font-display mt-3 text-3xl leading-none tracking-tight">Saved items</h2>
        </div>
        <p className="text-sm text-muted">
          {loading ? "…" : String(items.length).padStart(2, "0")}
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="mt-8 border border-ink/15 px-4 py-10">
          <p className="font-display text-xl tracking-tight">Nothing saved yet.</p>
          <p className="mt-2 text-sm text-muted">Add a note or URL to start the corpus.</p>
        </div>
      ) : (
        <ul className="mt-6 max-h-[32rem] overflow-y-auto">
          {items.map((item, index) => (
            <li key={item.id} className="border-t border-ink/15 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[0.65rem] tracking-[0.18em] text-muted">
                  {String(index + 1).padStart(2, "0")} / {item.sourceType}
                </p>
                <time className="text-[0.65rem] tracking-wide text-muted" dateTime={item.createdAt}>
                  {formatTimestamp(item.createdAt)}
                </time>
              </div>
              <h3 className="mt-2 font-display text-xl leading-tight tracking-tight">
                {item.title || (item.sourceType === "note" ? "Note" : "Untitled page")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.preview}</p>
              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-xs tracking-[0.12em] uppercase"
                >
                  {displayUrl(item.sourceUrl)}
                  <span aria-hidden="true">↗</span>
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function displayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
