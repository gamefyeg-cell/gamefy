import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { labelFor, ORDER_STATUSES } from "@/lib/enums";
import { ORDER_STATUS_COLOR } from "@/lib/orderStatusColors";
import type { OrderStatus } from "@/lib/enums";

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/account/login?next=/orders");

  const orders = await prisma.order.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">My Orders</h1>
        <p className="text-sm text-slate-500">{session.email}</p>
      </div>

      {orders.length === 0 ? (
        <div className="card p-8 text-center flex flex-col items-center gap-3">
          <span className="text-4xl">🛒</span>
          <p className="text-slate-400">You haven&apos;t placed any orders yet.</p>
          <Link href="/" className="btn-primary mt-1">
            Browse the store
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-border">
          {orders.map((o) => {
            const statusColor =
              ORDER_STATUS_COLOR[o.status as OrderStatus]?.badgeClass ??
              "bg-slate-500/10 text-slate-400 border-slate-500/30";
            return (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex justify-between items-center p-4 hover:bg-surface2 transition-colors gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-200 font-mono">
                    #{o.id.slice(-8).toUpperCase()}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {formatDate(o.createdAt)} · {o.items.length} item{o.items.length === 1 ? "" : "s"}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5 font-mono truncate">{o.id}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-sm text-slate-200">{formatMoney(o.total, o.currency)}</span>
                  <span className={`badge border text-xs ${statusColor}`}>
                    {labelFor(ORDER_STATUSES, o.status)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Link href="/account" className="text-sm text-slate-500 hover:text-slate-300 self-start transition-colors">
        ← Back to account
      </Link>
    </div>
  );
}
