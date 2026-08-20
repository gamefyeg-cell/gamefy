import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { labelFor, ORDER_STATUSES } from "@/lib/enums";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-slate-500/10 text-slate-300 border-slate-500/30",
  AWAITING_VERIFICATION: "bg-warn/10 text-warn border-warn/30",
  PAID: "bg-accent/10 text-accent-soft border-accent/30",
  FULFILLED: "bg-success/10 text-success border-success/30",
  PARTIALLY_FULFILLED: "bg-warn/10 text-warn border-warn/30",
  CANCELLED: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  REFUNDED: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  DISPUTED: "bg-danger/10 text-danger border-danger/30",
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, items: true },
    take: 100,
  });
  const awaitingVerification = orders.filter((o) => o.status === "AWAITING_VERIFICATION").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        {awaitingVerification > 0 && (
          <span className="badge bg-warn/10 text-warn border border-warn/30">
            {awaitingVerification} awaiting payment verification
          </span>
        )}
      </div>
      <div className="card divide-y divide-border">
        {orders.length === 0 && <p className="p-4 text-slate-500 text-sm">No orders yet.</p>}
        {orders.map((o) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm hover:bg-surface2">
            <div className="min-w-0">
              <span className="text-slate-100">#{o.id.slice(-8).toUpperCase()}</span>
              <span className="text-slate-500 ml-2 text-xs break-words">
                {o.user.email} · {formatDate(o.createdAt)} · {o.items.length} item(s)
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-slate-200">{formatMoney(o.total, o.currency)}</span>
              <span className={`badge border ${STATUS_COLOR[o.status] ?? "bg-surface2 border-border text-slate-300"}`}>
                {labelFor(ORDER_STATUSES, o.status)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
