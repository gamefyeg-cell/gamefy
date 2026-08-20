import Link from "next/link";
import { prisma } from "@/lib/prisma";

/// Real category links (not fabricated pages) — same top-level list the
/// header nav uses, so "Shop" in the footer actually goes somewhere useful
/// instead of just Home/Cart. The old "Admin" column was removed on
/// purpose: there's no reason to advertise the admin panel to customers in
/// a public footer — anyone who needs it already knows the URL.
export default async function Footer() {
  const categories = await prisma.category.findMany({
    where: { parentId: null, visible: true },
    orderBy: { sortOrder: "asc" },
    take: 5,
  });

  return (
    <footer className="mt-20 border-t border-border bg-surface relative">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-accent via-accent-soft to-gold" />

      <div className="mx-auto max-w-7xl px-4 py-12 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-10 text-sm">
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="Gamefy" className="h-7 w-7" />
            <span className="text-white font-bold">
              Game<span className="text-logo-gradient">fy</span>
            </span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
            Instant delivery on games, gift cards, top-ups, and accounts —
            with real warranty on account sales.
          </p>
        </div>

        <div>
          <div className="text-slate-200 font-medium mb-3">Shop</div>
          <ul className="space-y-2 text-slate-400">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/categories/${c.slug}`} className="hover:text-white transition-colors">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-slate-200 font-medium mb-3">Account</div>
          <ul className="space-y-2 text-slate-400">
            <li>
              <Link href="/cart" className="hover:text-white transition-colors">
                Cart
              </Link>
            </li>
            <li>
              <Link href="/account" className="hover:text-white transition-colors">
                My orders
              </Link>
            </li>
            <li>
              <Link href="/account/login" className="hover:text-white transition-colors">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/account/register" className="hover:text-white transition-colors">
                Create account
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-slate-200 font-medium mb-3">We Accept</div>
          <div className="flex flex-col gap-2">
            <span className="badge bg-surface2 border border-border text-slate-300 self-start">📲 InstaPay</span>
            <span className="badge bg-surface2 border border-border text-slate-300 self-start">💳 Telda</span>
          </div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            Every transfer is verified by hand before delivery — see checkout for details.
          </p>
        </div>
      </div>

      <div className="border-t border-border py-4 px-4">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} Gamefy. All rights reserved.</p>
          <p className="text-xs text-slate-600">
            Demo storefront — no live payment gateway is connected. See project README.
          </p>
        </div>
      </div>
    </footer>
  );
}
