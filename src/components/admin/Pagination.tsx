import Link from "next/link";

/// Server-rendered pager for admin list pages. Drives off a `?page=` query
/// param and preserves any other query params passed in `extraQuery`.
export default function Pagination({
  page,
  pageCount,
  basePath,
  extraQuery = {},
  totalLabel,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  extraQuery?: Record<string, string | undefined>;
  totalLabel?: string;
}) {
  if (pageCount <= 1) {
    return totalLabel ? <p className="a-sub">{totalLabel}</p> : null;
  }

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(extraQuery)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  // Compact window: 1 … (p-1) p (p+1) … last
  const pages: (number | "gap")[] = [];
  const add = (n: number) => pages.push(n);
  add(1);
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) pages.push("gap");
  for (let i = start; i <= end; i++) add(i);
  if (end < pageCount - 1) pages.push("gap");
  if (pageCount > 1) add(pageCount);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      {totalLabel ? <p className="a-sub">{totalLabel}</p> : <span />}
      <nav className="a-pager" aria-label="Pagination">
        <Link
          href={href(page - 1)}
          className={page <= 1 ? "is-disabled" : ""}
          aria-disabled={page <= 1}
          rel="prev"
        >
          ‹
        </Link>
        {pages.map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className="is-gap">
              …
            </span>
          ) : (
            <Link key={p} href={href(p)} className={p === page ? "is-current" : ""} aria-current={p === page ? "page" : undefined}>
              {p}
            </Link>
          )
        )}
        <Link
          href={href(page + 1)}
          className={page >= pageCount ? "is-disabled" : ""}
          aria-disabled={page >= pageCount}
          rel="next"
        >
          ›
        </Link>
      </nav>
    </div>
  );
}
