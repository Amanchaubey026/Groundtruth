import type { ItemSummary } from "../api/client";

interface ItemListProps {
  items: ItemSummary[];
  loading: boolean;
  error: string | null;
}

export function ItemList({ items, loading, error }: ItemListProps) {
  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">Saved</h2>
        <p className="text-sm text-muted">{loading ? "Loading…" : `${items.length}`}</p>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && items.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-muted">
          Nothing here yet. Add a note or a link above.
        </p>
      ) : (
        <ul className="mt-3 max-h-[28rem] divide-y divide-line overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="py-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium">
                  {item.title || (item.sourceType === "note" ? "Note" : "Untitled page")}
                </h3>
                <span className="text-xs text-muted">{item.sourceType === "url" ? "Link" : "Note"}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">{item.preview}</p>
              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-ink underline underline-offset-2"
                >
                  {displayUrl(item.sourceUrl)}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function displayUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
