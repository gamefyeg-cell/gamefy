"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/admin/AdminTheme";

const NAV_GROUPS: { label: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: "▚" },
      { href: "/admin/analytics", label: "Product Analytics", icon: "▤" },
      { href: "/admin/audit-log", label: "Audit Log", icon: "☰" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: "▦" },
      { href: "/admin/categories", label: "Categories", icon: "❏" },
      { href: "/admin/collections", label: "Collections", icon: "❐" },
      { href: "/admin/activation-regions", label: "Activation Regions", icon: "◈" },
    ],
  },
  {
    label: "Selling",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "▧" },
      { href: "/admin/discounts", label: "Discounts & Offers", icon: "%" },
      { href: "/admin/payment-methods", label: "Payment Methods", icon: "▭" },
      { href: "/admin/providers", label: "Providers", icon: "◧" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/customers", label: "Customers", icon: "◍" },
      { href: "/admin/security", label: "Login security", icon: "⚠" },
      { href: "/admin/blocked-ips", label: "Blocked IPs", icon: "⦸" },
    ],
  },
  {
    label: "Storefront",
    items: [{ href: "/admin/homepage-blocks", label: "Homepage Builder", icon: "◱" }],
  },
];

export default function AdminSidebar({ email, role }: { email: string; role: string }) {
  const pathname = usePathname();

  return (
    <aside className="a-sidebar">
      <div className="p-4" style={{ borderBottom: "1px solid var(--a-border)" }}>
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="Gamefy" className="h-8 w-8" />
          <span className="text-lg font-extrabold" style={{ color: "var(--a-text)" }}>
            Game<span className="text-logo-gradient">fy</span>
          </span>
          <span className="text-xs font-normal" style={{ color: "var(--a-faint)" }}>
            admin
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="a-nav-group">{group.label}</div>
            {group.items.map((item) => {
              const active =
                item.href === "/admin" ? pathname === item.href : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`a-nav-link ${active ? "is-active" : ""}`}
                >
                  <span aria-hidden="true" className="w-4 text-center opacity-70">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3" style={{ borderTop: "1px solid var(--a-border)" }}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="truncate text-xs" style={{ color: "var(--a-text)" }}>
              {email}
            </div>
            <div className="text-xs" style={{ color: "var(--a-faint)" }}>
              {role}
            </div>
          </div>
          <ThemeToggle />
        </div>
        <form action={logoutAction}>
          <button type="submit" className="a-btn a-btn-ghost a-btn-sm w-full">
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
