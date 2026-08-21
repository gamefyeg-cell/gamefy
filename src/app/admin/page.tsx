import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { labelFor, ORDER_STATUSES } from "@/lib/enums";
import { DEFAULT_CURRENCY } from "@/lib/currencies";
import { ORDER_STATUS_COLOR } from "@/lib/orderStatusColors";
import { GOLD_RAMP, ACCENT_RAMP, STATUS_HEX } from "@/lib/chartColors";
import RevenueTrendChart from "@/components/admin/charts/RevenueTrendChart";
import OrderStatusChart from "@/components/admin/charts/OrderStatusChart";
import TopProductsChart from "@/components/admin/charts/TopProductsChart";

// Statuses that represent money actually collected — excludes PENDING
// (not yet paid), CANCELLED, REFUNDED, DISPUTED.
const REVENUE_STATUSES = ["PAID", "FULFILLED", "PARTIALLY_FULFILLED"] as const;
const TREND_DAYS = 30;

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
    revenueByDay,
    statusGroups,
    revenueByProduct,
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
    // One row per day for the last TREND_DAYS days, zero-filled via
    // generate_series so the chart never shows a gap for a quiet day —
    // Postgres-only (fine now that Supabase is the datasource).
    prisma.$queryRaw<{ day: Date; total: number }[]>(Prisma.sql`
      SELECT d.day AS day, COALESCE(SUM(o.total), 0)::float AS total
      FROM generate_series(
        date_trunc('day', now()) - interval '${Prisma.raw(String(TREND_DAYS - 1))} days',
        date_trunc('day', now()),
        interval '1 day'
      ) AS d(day)
      LEFT JOIN "orders" o
        ON date_trunc('day', o."createdAt") = d.day
        AND o.status IN (${Prisma.join([...REVENUE_STATUSES])})
      GROUP BY d.day
      ORDER BY d.day
    `),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.productAnalyticsEvent.groupBy({
      by: ["productId"],
      where: { type: "PURCHASE" },
      _sum: { revenue: true },
    }),
  ]);

  const stats = [
    { label: "Total revenue", value: formatMoney(revenueAgg._sum.total ?? 0, DEFAULT_CURRENCY), href: "/admin/orders", dot: GOLD_RAMP.DEFAULT },
    { label: "Revenue (7d)", value: formatMoney(revenueThisWeekAgg._sum.total ?? 0, DEFAULT_CURRENCY), href: "/admin/orders", dot: GOLD_RAMP.light },
    { label: "Orders", value: orderCount, href: "/admin/orders", dot: ACCENT_RAMP.DEFAULT },
    { label: "Awaiting fulfillment", value: pendingOrders, href: "/admin/orders", dot: STATUS_HEX.warn },
    { label: "Products", value: productCount, href: "/admin/products", dot: ACCENT_RAMP.light },
    { label: "Categories", value: categoryCount, href: "/admin/categories", dot: STATUS_HEX.neutral },
  ];

  const revenueChartData = revenueByDay.map((r) => ({
    date: r.day.toISOString(),
    label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(r.day),
    total: r.total,
  }));

  const statusCountMap = new Map(statusGroups.map((g) => [g.status, g._count._all]));
  const statusChartData = ORDER_STATUSES.map((s) => ({
    status: s.value,
    label: s.label,
    count: statusCountMap.get(s.value) ?? 0,
    color: ORDER_STATUS_COLOR[s.value].hex,
  }));

  const revenueMap = new Map(revenueByProduct.map((r) => [r.productId, r._sum.revenue ?? 0]));
  const productTitleMap = new Map(topProducts.map((p) => [p.id, p.title]));
  const topByRevenue = [...revenueMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  // Need titles for products that made revenue but weren't in the
  // popularity-sorted topProducts list — fetch any missing ones.
  const missingIds = topByRevenue.map(([id]) => id).filter((id) => !productTitleMap.has(id));
  const missingTitles = missingIds.length
    ? await prisma.product.findMany({ where: { id: { in: missingIds } }, select: { id: true, title: true } })
    : [];
  missingTitles.forEach((p) => productTitleMap.set(p.id, p.title));
  const revenueChartRows = topByRevenue
    .filter(([, revenue]) => revenue > 0)
    .map(([id, revenue]) => ({ id, title: productTitleMap.get(id) ?? "Unknown product", value: revenue }));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card card-hover p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.dot }} />
              <div className="text-sm text-slate-400">{s.label}</div>
            </div>
            <div className="text-3xl font-extrabold text-white">{s.value}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Revenue (last {TREND_DAYS} days)</h2>
          <RevenueTrendChart data={revenueChartData} currency={DEFAULT_CURRENCY} />
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Orders by status</h2>
          <OrderStatusChart data={statusChartData} />
        </div>
      </div>

      {revenueChartRows.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Top products by revenue</h2>
          <TopProductsChart data={revenueChartRows} valueLabel="" format="money" currency={DEFAULT_CURRENCY} />
        </div>
      )}

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
