import type { ItemSummary } from "../api/client";

interface ItemListProps {
  items: ItemSummary[];
  loading: boolean;
  error: string | null;
}

export function ItemList({ items, loading, error }: ItemListProps) {
  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Saved items</h2>
        <p className="mt-1 text-sm text-muted">
          {loading ? "Loading…" : `${items.length} item${items.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-paper px-4 py-8 text-center">
          <p className="font-medium">You haven't saved anything yet.</p>
          <p className="mt-1 text-sm text-muted">Add a note or URL to get started.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-medium">
                  {item.title || (item.sourceType === "note" ? "Note" : "Untitled page")}
                </h3>
                <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 text-xs uppercase tracking-wide text-muted">
                  {item.sourceType}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted">{item.preview}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <time dateTime={item.createdAt}>{formatTimestamp(item.createdAt)}</time>
                {item.sourceUrl ? (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline"
                  >
                    {displayUrl(item.sourceUrl)}
                  </a>
                ) : null}
              </div>
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
  return date.toLocaleString();
}

function displayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname + parsed.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
}
