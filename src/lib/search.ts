/// Shared relevance scoring for product search — used by the live
/// search-bar API (src/app/api/search/route.ts) and the "see all results"
/// fallback on /products, so both agree on what counts as a match.
///
/// The whole point: a single stray letter like "f" must not read as
/// "relevant" to every title that happens to contain an f (e.g. "FC 27") —
/// a match is scored by how much of the query aligns with the start of the
/// title or a whole word in it, not just "does it appear somewhere". Very
/// short queries are refused outright (MIN_QUERY_LENGTH) since a single
/// character can never be "relevant" to anything.
export const MIN_QUERY_LENGTH = 2;

export function normalizeSearch(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

// Strips everything but letters/digits, so "fc-27", "fc 27" and "fc27" all
// collapse to the same key — lets a buyer type "fc27" and still find "FC 27".
function tight(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/// Higher is better; 0 means "not a match, don't show it".
export function searchScore(title: string, rawQuery: string): number {
  const query = normalizeSearch(rawQuery);
  if (query.length < MIN_QUERY_LENGTH) return 0;

  const t = title.toLowerCase();
  if (t === query) return 100;
  if (t.startsWith(query)) return 90;

  const words = t.split(/\s+/);
  if (words.some((w) => w === query)) return 85;
  if (words.some((w) => w.startsWith(query))) return 70;

  const tq = tight(query);
  const tt = tight(title);
  if (tq.length >= MIN_QUERY_LENGTH) {
    if (tt === tq) return 65;
    if (tt.startsWith(tq)) return 55;
    if (tt.includes(tq)) return 40;
  }

  if (t.includes(query)) return 25;

  return 0;
}

export function matchesSearch(title: string, query: string): boolean {
  return searchScore(title, query) > 0;
}
