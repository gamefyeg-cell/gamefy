"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/homepage-blocks", label: "Homepage Builder" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/analytics", label: "Product Analytics" },
  { href: "/admin/discounts", label: "Discounts & Offers" },
  { href: "/admin/payment-methods", label: "Payment Methods" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/activation-regions", label: "Activation Regions" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

export default function AdminSidebar({ email, role }: { email: string; role: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-surface min-h-screen flex flex-col">
      <div className="p-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="Gamefy" className="h-8 w-8" />
          <span className="text-lg font-extrabold text-white">
            Game<span className="text-logo-gradient">fy</span>
          </span>
          <span className="text-slate-500 text-xs font-normal">admin</span>
        </Link>
      </div>
      <nav className="flex-1 p-2 flex flex-col gap-1">
        {NAV.map((item) => {
          // Dashboard ("/admin") only matches exactly — every other route
          // would otherwise match its prefix too and stay lit at the same time.
          const active = item.href === "/admin" ? pathname === item.href : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-accent/15 text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-accent before:to-gold"
                  : "text-slate-300 hover:bg-surface2 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border text-xs text-slate-500">
        <div className="text-slate-300">{email}</div>
        <div className="mb-2">{role}</div>
        <form action={logoutAction}>
          <button className="text-danger hover:underline">Log out</button>
        </form>
      </div>
    </aside>
  );
}
