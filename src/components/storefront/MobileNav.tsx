"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface Category {
  id: string;
  name: string;
  slug: string;
}

/// The storefront had no mobile navigation at all — the category links
/// were `hidden md:flex` with nothing standing in for them below that
/// breakpoint, so a phone visitor had no way to browse categories except
/// the homepage. This is the missing piece: a hamburger toggle (mobile
/// only) opening a slide-down panel with the same links, full-width and
/// thumb-sized.
export default function MobileNav({ categories, email }: { categories: Category[]; email?: string }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-surface2 text-slate-200"
      >
        <span className="relative w-4 h-3 flex flex-col justify-between">
          <motion.span
            animate={open ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2 }}
            className="block h-[1.5px] w-full bg-current origin-center"
          />
          <motion.span
            animate={open ? { opacity: 0 } : { opacity: 1 }}
            transition={reduced ? { duration: 0 } : { duration: 0.15 }}
            className="block h-[1.5px] w-full bg-current"
          />
          <motion.span
            animate={open ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2 }}
            className="block h-[1.5px] w-full bg-current origin-center"
          />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduced ? { opacity: 1 } : { height: 0, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="absolute left-0 right-0 top-16 overflow-hidden border-b border-white/[0.08] bg-bg/95 backdrop-blur-xl"
          >
            <nav className="flex flex-col px-4 py-3">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/categories/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="px-2 py-3 text-base text-slate-200 border-b border-border/60 last:border-0 hover:text-accent-soft transition-colors"
                >
                  {c.name}
                </Link>
              ))}
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="px-2 py-3 text-sm text-slate-400 hover:text-white transition-colors"
              >
                {email ?? "Account"}
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
