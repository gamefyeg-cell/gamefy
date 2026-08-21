"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

/// The admin sidebar was a fixed 240px column with no mobile treatment at
/// all — on a phone that eats most of the viewport and leaves the actual
/// page content squeezed into a sliver. This wraps it into a proper
/// off-canvas drawer below md: a slim top bar with a hamburger toggle,
/// a tap-to-close backdrop, and the sidebar itself (passed as children,
/// unchanged) sliding in over the content. At md+ it's inert — the
/// sidebar renders in its normal static position exactly as before.
export default function AdminMobileChrome({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close on navigation — App Router keeps this layout mounted across
  // admin subpages, so without this the drawer would stay open covering
  // the page after tapping a link.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-surface sticky top-0 z-30">
        <Link href="/admin" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="Gamefy" className="h-7 w-7" />
          <span className="text-sm font-extrabold text-white">
            Game<span className="text-logo-gradient">fy</span> <span className="text-slate-500 font-normal">admin</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-border bg-surface2 text-slate-200"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-40"
        />
      )}

      <div
        className={`fixed md:static inset-y-0 left-0 z-50 transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {children}
      </div>
    </>
  );
}
