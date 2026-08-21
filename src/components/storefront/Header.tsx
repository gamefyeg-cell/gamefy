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

  return (
    // Liquid Glass "Regular" material — the nav layer, translucent and
    // adaptive over any content scrolling under it. Everything sitting ON
    // this bar (cart/sign-in buttons) stays a solid fill per the "never
    // glass on glass" rule — see apple-design/liquid-glass.
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-bg/70 backdrop-blur-xl relative">
      <HeaderShrinkWrapper>
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-16 items-center gap-4 sm:gap-6">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" alt="Gamefy" className="h-9 w-9" />
              <span className="text-xl font-extrabold tracking-tight text-white">
                Game<span className="text-logo-gradient">fy</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-5 text-sm text-slate-300 flex-1">
              {categories.map((c) => (
                <Link key={c.id} href={`/categories/${c.slug}`} className="hover:text-white transition-colors">
                  {c.name}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <MobileNav categories={categories} email={session?.email} />

              <Link href="/cart" className="relative btn-secondary !px-3 !py-1.5">
                Cart
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              {session ? (
                <div className="flex items-center gap-2">
                  <Link href="/account" className="text-sm text-slate-300 hover:text-white hidden sm:inline">
                    {session.email}
                  </Link>
                  <form action={logoutAction}>
                    <button className="btn-secondary !px-3 !py-1.5">Log out</button>
                  </form>
                </div>
              ) : (
                <Link href="/account/login" className="btn-primary !px-3 !py-1.5">
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
