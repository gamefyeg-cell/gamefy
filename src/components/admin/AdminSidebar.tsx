import Link from "next/link";
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
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-surface2 hover:text-white transition-colors"
          >
            {item.label}
          </Link>
        ))}
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
