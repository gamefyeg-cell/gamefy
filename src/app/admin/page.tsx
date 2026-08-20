import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { labelFor, ORDER_STATUSES } from "@/lib/enums";
import { DEFAULT_CURRENCY } from "@/lib/currencies";

// Statuses that represent money actually collected — excludes PENDING
// (not yet paid), CANCELLED, REFUNDED, DISPUTED.
const REVENUE_STATUSES = ["PAID", "FULFILLED", "PARTIALLY_FULFILLED"] as const;

export default async function AdminDashboard() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    productCount,
    categoryCount,
    orderCount,
    pendingOrders,
    recentOrders,
    recentAudit,
    revenueAgg,
    revenueThisWeekAgg,
    topProducts,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ["PAID", "PARTIALLY_FULFILLED"] } } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { user: true } }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { admin: true } }),
    prisma.order.aggregate({ where: { status: { in: [...REVENUE_STATUSES] } }, _sum: { total: true } }),
    prisma.order.aggregate({
      where: { status: { in: [...REVENUE_STATUSES] }, createdAt: { gte: sevenDaysAgo } },
      _sum: { total: true },
    }),
    prisma.product.findMany({
      where: { popularityScore: { gt: 0 } },
      orderBy: { popularityScore: "desc" },
      take: 5,
      select: { id: true, title: true, viewCount: true, cartAddCount: true, purchaseCount: true },
    }),
  ]);

  const stats = [
    { label: "Total revenue", value: formatMoney(revenueAgg._sum.total ?? 0, DEFAULT_CURRENCY), href: "/admin/orders" },
    { label: "Revenue (7d)", value: formatMoney(revenueThisWeekAgg._sum.total ?? 0, DEFAULT_CURRENCY), href: "/admin/orders" },
    { label: "Orders", value: orderCount, href: "/admin/orders" },
    { label: "Awaiting fulfillment", value: pendingOrders, href: "/admin/orders" },
    { label: "Products", value: productCount, href: "/admin/products" },
    { label: "Categories", value: categoryCount, href: "/admin/categories" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card card-hover p-5">
            <div className="text-3xl font-extrabold text-white">{s.value}</div>
            <div className="text-sm text-slate-400">{s.label}</div>
          </Link>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-200">Top products</h2>
          <Link href="/admin/analytics" className="text-sm text-accent-soft hover:text-accent">
            Full product analytics →
          </Link>
        </div>
        <div className="card divide-y divide-border">
          {topProducts.length === 0 && (
            <p className="p-4 text-slate-500 text-sm">No activity yet — views/cart-adds/sales will show up here as they happen.</p>
          )}
          {topProducts.map((p, i) => (
            <Link key={p.id} href={`/admin/products/${p.id}`} className="flex items-center justify-between p-3 text-sm hover:bg-surface2">
              <div className="flex items-center gap-3">
                <span className="text-slate-600 font-mono text-xs w-4">{i + 1}</span>
                <span className="text-slate-200">{p.title}</span>
              </div>
              <div className="text-xs text-slate-500">
                {p.viewCount.toLocaleString()} views · {p.cartAddCount.toLocaleString()} cart adds ·{" "}
                <span className="text-accent-soft">{p.purchaseCount.toLocaleString()} sold</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Recent orders</h2>
          <div className="card divide-y divide-border">
            {recentOrders.length === 0 && <p className="p-4 text-slate-500 text-sm">No orders yet.</p>}
            {recentOrders.map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex justify-between p-3 text-sm hover:bg-surface2">
                <div>
                  <div className="text-slate-200">{o.user.email}</div>
                  <div className="text-xs text-slate-500">{formatDate(o.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-200">{formatMoney(o.total, o.currency)}</div>
                  <div className="text-xs text-slate-500">{labelFor(ORDER_STATUSES, o.status)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Recent admin activity</h2>
          <div className="card divide-y divide-border">
            {recentAudit.length === 0 && <p className="p-4 text-slate-500 text-sm">No activity yet.</p>}
            {recentAudit.map((a) => (
              <div key={a.id} className="p-3 text-sm">
                <div className="text-slate-200">
                  {a.admin.email} · <span className="text-accent-soft">{a.action}</span>
                </div>
                <div className="text-xs text-slate-500">
                  {a.entity} · {formatDate(a.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
