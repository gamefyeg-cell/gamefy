import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getCart } from "@/lib/cart";
import { logoutAction } from "@/lib/actions/auth";
import HeaderShrinkWrapper from "@/components/storefront/HeaderShrinkWrapper";
import MobileNav from "@/components/storefront/MobileNav";

export default async function Header() {
  const [categories, session, cart] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null, visible: true },
      orderBy: { sortOrder: "asc" },
      take: 8,
    }),
    getSession(),
    getCart(),
  ]);

  const cartCount = cart.reduce((sum, l) => sum + l.qty, 0);
  const initial = session?.email?.trim()?.[0]?.toUpperCase() ?? "U";

  return (
    // Liquid Glass "Regular" material — the nav layer, translucent and
    // adaptive over any content scrolling under it. Everything sitting ON
    // this bar (cart/sign-in buttons) stays a solid fill per the "never
    // glass on glass" rule — see apple-design/liquid-glass.
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-bg/70 backdrop-blur-xl relative">
      <HeaderShrinkWrapper>
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center gap-4">
            <div className="flex flex-1 items-center">
              <Link href="/" className="flex items-center gap-2.5 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-mark.png" alt="Gamefy" className="h-9 w-9" />
                <span className="text-xl font-extrabold tracking-tight text-white">
                  Game<span className="text-logo-gradient">fy</span>
                </span>
              </Link>
            </div>

            <nav className="hidden md:flex items-center justify-center gap-1">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/categories/${c.slug}`}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-surface2 transition-colors"
                >
                  {c.name}
                </Link>
              ))}
            </nav>

            <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
              <MobileNav categories={categories} email={session?.email} />

              <Link
                href="/cart"
                aria-label={`Cart${cartCount > 0 ? ` (${cartCount} item${cartCount === 1 ? "" : "s"})` : ""}`}
                className="relative inline-flex items-center gap-2 rounded-lg border border-border bg-surface2 px-3 py-1.5 text-sm font-medium text-slate-100 hover:border-accent/60 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-semibold leading-none flex items-center justify-center ring-2 ring-bg tabular-nums">
                    {cartCount}
                  </span>
                )}
              </Link>

              {session ? (
                <>
                  <span className="hidden sm:block w-px h-6 bg-border mx-1" aria-hidden="true" />
                  <Link
                    href="/account"
                    className="group inline-flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-surface2 transition-colors"
                    title={session.email}
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-accent to-gold text-[11px] font-bold text-white">
                      {initial}
                    </span>
                    <span className="hidden lg:block max-w-[160px] truncate text-sm text-slate-300 group-hover:text-white">
                      {session.email}
                    </span>
                  </Link>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      aria-label="Log out"
                      title="Log out"
                      className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:text-white hover:bg-surface2 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <path d="m16 17 5-5-5-5" />
                        <path d="M21 12H9" />
                      </svg>
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/account/login" className="btn-primary !px-3.5 !py-1.5">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </HeaderShrinkWrapper>
    </header>
  );
}
