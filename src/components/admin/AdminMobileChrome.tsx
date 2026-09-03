"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/admin/AdminTheme";

/// Wraps the admin sidebar into an off-canvas drawer below md: a slim top
/// bar with a hamburger toggle, a tap-to-close backdrop, and the sidebar
/// sliding in over the content. At md+ it's inert — the sidebar renders in
/// its normal static column.
export default function AdminMobileChrome({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <div
        className="md:hidden flex items-center justify-between px-4 h-14 sticky top-0 z-30"
        style={{ background: "var(--a-panel)", borderBottom: "1px solid var(--a-border)" }}
      >
        <Link href="/admin" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="Gamefy" className="h-7 w-7" />
          <span className="text-sm font-extrabold" style={{ color: "var(--a-text)" }}>
            Game<span className="text-logo-gradient">fy</span>{" "}
            <span className="font-normal" style={{ color: "var(--a-faint)" }}>
              admin
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="w-9 h-9 flex items-center justify-center rounded-lg a-btn-ghost"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-black/50 z-40"
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
