import Link from "next/link";

/// Server-rendered pager for storefront listing pages, driven by a
/// `?page=` query param. Preserves any other query params passed in
/// `extraQuery` (e.g. `sort`).
export default function Pagination({
  page,
  pageCount,
  basePath,
  extraQuery = {},
}: {
  page: number;
  pageCount: number;
  basePath: string;
  extraQuery?: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(extraQuery)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const pages: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) pages.push("gap");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < pageCount - 1) pages.push("gap");
  if (pageCount > 1) pages.push(pageCount);

  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Pagination">
      <Link
        href={href(page - 1)}
        aria-disabled={page <= 1}
        className={`badge border border-border bg-surface2 text-slate-300 !px-2.5 !py-1.5 hover:border-accent/60 hover:text-white transition-colors ${
          page <= 1 ? "pointer-events-none opacity-30" : ""
        }`}
      >
        ‹
      </Link>
      {pages.map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-slate-600">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={`badge !px-3 !py-1.5 border transition-colors ${
              p === page
                ? "border-accent bg-accent text-white font-semibold"
                : "border-border bg-surface2 text-slate-300 hover:border-accent/60 hover:text-white"
            }`}
          >
            {p}
          </Link>
        )
      )}
      <Link
        href={href(page + 1)}
        aria-disabled={page >= pageCount}
        className={`badge border border-border bg-surface2 text-slate-300 !px-2.5 !py-1.5 hover:border-accent/60 hover:text-white transition-colors ${
          page >= pageCount ? "pointer-events-none opacity-30" : ""
        }`}
      >
        ›
      </Link>
    </nav>
  );
}
