"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { formatMoney } from "@/lib/format";
import { springs } from "@/lib/motion";
import { MIN_QUERY_LENGTH } from "@/lib/search";

interface SearchResult {
  id: string;
  slug: string;
  title: string;
  type: string;
  cover: string | null;
  price: number | null;
  currency: string | null;
  categoryName: string;
}

const TYPE_ICON: Record<string, string> = {
  GAME: "🎮",
  GIFTCARD: "🎁",
  TOPUP: "⚡",
  ACCOUNT: "🔑",
  SUBSCRIPTION: "⏳",
};

/// Bolds the slice of `title` that actually matched `query` so a buyer sees
/// at a glance *why* a result showed up instead of just trusting a list.
function Highlighted({ title, query }: { title: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{title}</>;
  const idx = title.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{title}</>;
  return (
    <>
      {title.slice(0, idx)}
      <span className="text-gold">{title.slice(idx, idx + q.length)}</span>
      {title.slice(idx + q.length)}
    </>
  );
}

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActive(0);
  }, []);

  // Cmd/Ctrl+K opens it from anywhere; "/" too, unless the buyer is already
  // typing into some other field on the page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = !!target && ["INPUT", "TEXTAREA"].includes(target.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, close]);

  // Debounced fetch — waits for a short pause in typing before hitting the
  // API, and never fires below MIN_QUERY_LENGTH (matches src/lib/search.ts).
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setActive(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  function go(slug: string) {
    close();
    router.push(`/products/${slug}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(results[active].slug);
      else if (query.trim().length >= MIN_QUERY_LENGTH) {
        close();
        router.push(`/products?q=${encodeURIComponent(query.trim())}`);
      }
    }
  }

  return (
    <>
      <button
        aria-label="Search"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface2 px-3 py-1.5 text-sm text-slate-400 hover:border-accent/60 hover:text-slate-200 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="hidden lg:inline">Search</span>
        <kbd className="hidden lg:inline-flex items-center rounded border border-border/80 bg-bg/60 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex justify-center px-4 pt-[10vh] sm:pt-[14vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              ref={panelRef}
              className="w-full max-w-xl h-fit rounded-2xl border border-white/10 bg-surface shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={springs.smooth}
            >
              <div className="flex items-center gap-3 px-4 border-b border-border">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 shrink-0" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search games, gift cards, top-ups…"
                  className="flex-1 bg-transparent py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
                {loading && (
                  <motion.span
                    className="w-3.5 h-3.5 rounded-full border-2 border-accent/30 border-t-accent shrink-0"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                  />
                )}
                <button onClick={close} className="text-xs text-slate-500 hover:text-slate-300 shrink-0">
                  Esc
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto py-2">
                {query.trim().length < MIN_QUERY_LENGTH ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">
                    Keep typing — at least {MIN_QUERY_LENGTH} characters.
                  </p>
                ) : !loading && results.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">No matches for &ldquo;{query}&rdquo;.</p>
                ) : (
                  <ul>
                    {results.map((r, i) => (
                      <motion.li
                        key={r.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02, duration: 0.15 }}
                      >
                        <Link
                          href={`/products/${r.slug}`}
                          onMouseEnter={() => setActive(i)}
                          onClick={close}
                          className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${active === i ? "bg-surface2" : ""}`}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface2 border border-border shrink-0 grid place-items-center text-base">
                            {r.cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.cover} alt="" className="w-full h-full object-cover" />
                            ) : (
                              TYPE_ICON[r.type] ?? "🛒"
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-100 truncate">
                              <Highlighted title={r.title} query={query} />
                            </div>
                            <div className="text-xs text-slate-500 truncate">{r.categoryName}</div>
                          </div>
                          {r.price != null && (
                            <div className="text-sm font-medium text-gold shrink-0">
                              {formatMoney(r.price, r.currency ?? "USD")}
                            </div>
                          )}
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </div>

              {query.trim().length >= MIN_QUERY_LENGTH && results.length > 0 && (
                <Link
                  href={`/products?q=${encodeURIComponent(query.trim())}`}
                  onClick={close}
                  className="flex items-center justify-between px-4 py-3 text-xs text-slate-400 border-t border-border hover:text-white hover:bg-surface2 transition-colors group"
                >
                  <span>See all results for &ldquo;{query.trim()}&rdquo;</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
