import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { DEFAULT_CURRENCY } from "@/lib/currencies";

/// Per-product analytics — separate from the general /admin dashboard on
/// purpose (that one answers "how's the business doing"; this one answers
/// "what's actually getting browsed, added to cart, and bought, product by
/// product"). Reads Product's denormalized counters (kept in sync by
/// src/lib/analytics.ts on every view/add-to-cart/purchase) rather than
/// aggregating the raw event log, so this stays a cheap single query even
/// with a large catalog.
export default async function ProductAnalyticsPage() {
  const [products, revenueByProduct] = await Promise.all([
    prisma.product.findMany({
      orderBy: { popularityScore: "desc" },
      select: {
        id: true,
        title: true,
        viewCount: true,
        cartAddCount: true,
        purchaseCount: true,
        popularityScore: true,
        category: { select: { name: true } },
      },
    }),
    // Real revenue per product, from the event log — the denormalized
    // counters track *counts*, not money, so this one query does need the
    // log. NOTE: sums across all variant currencies as if they were one —
    // an acceptable simplification for a single-operating-currency store;
    // see README. Formatted using the storefront's default currency.
    prisma.productAnalyticsEvent.groupBy({
      by: ["productId"],
      where: { type: "PURCHASE" },
      _sum: { revenue: true },
    }),
  ]);

  const revenueMap = new Map(revenueByProduct.map((r) => [r.productId, r._sum.revenue ?? 0]));

  const totals = products.reduce(
    (acc, p) => ({
      views: acc.views + p.viewCount,
      cartAdds: acc.cartAdds + p.cartAddCount,
      purchases: acc.purchases + p.purchaseCount,
    }),
    { views: 0, cartAdds: 0, purchases: 0 }
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Product Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Views, add-to-carts, and sales per product. Sorted by popularity score (views + 5×cart-adds + 20×purchases) — the
          same score "AUTO_POPULARITY" homepage blocks rank by.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-3xl font-extrabold text-white">{totals.views.toLocaleString()}</div>
          <div className="text-sm text-slate-400">Total product views</div>
        </div>
        <div className="card p-5">
          <div className="text-3xl font-extrabold text-white">{totals.cartAdds.toLocaleString()}</div>
          <div className="text-sm text-slate-400">Added to cart</div>
          {totals.views > 0 && (
            <div className="text-xs text-accent-soft mt-1">{((totals.cartAdds / totals.views) * 100).toFixed(1)}% of views</div>
          )}
        </div>
        <div className="card p-5">
          <div className="text-3xl font-extrabold text-white">{totals.purchases.toLocaleString()}</div>
          <div className="text-sm text-slate-400">Purchased (units)</div>
          {totals.cartAdds > 0 && (
            <div className="text-xs text-accent-soft mt-1">{((totals.purchases / totals.cartAdds) * 100).toFixed(1)}% of cart adds</div>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-slate-500 border-b border-border">
              <th className="p-3 font-medium">Product</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium text-right">Views</th>
              <th className="p-3 font-medium text-right">Cart adds</th>
              <th className="p-3 font-medium text-right">Purchases</th>
              <th className="p-3 font-medium text-right">Conversion</th>
              <th className="p-3 font-medium text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No products yet.
                </td>
              </tr>
            )}
            {products.map((p) => {
              const conversion = p.viewCount > 0 ? (p.purchaseCount / p.viewCount) * 100 : null;
              const revenue = revenueMap.get(p.id) ?? 0;
              return (
                <tr key={p.id} className="hover:bg-surface2">
                  <td className="p-3">
                    <Link href={`/admin/products/${p.id}`} className="text-slate-200 hover:text-accent-soft font-medium">
                      {p.title}
                    </Link>
                  </td>
                  <td className="p-3 text-slate-500">{p.category.name}</td>
                  <td className="p-3 text-right text-slate-300">{p.viewCount.toLocaleString()}</td>
                  <td className="p-3 text-right text-slate-300">{p.cartAddCount.toLocaleString()}</td>
                  <td className="p-3 text-right text-slate-300">{p.purchaseCount.toLocaleString()}</td>
                  <td className="p-3 text-right text-slate-400">{conversion !== null ? `${conversion.toFixed(1)}%` : "—"}</td>
                  <td className="p-3 text-right text-slate-200">{revenue > 0 ? formatMoney(revenue, DEFAULT_CURRENCY) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
