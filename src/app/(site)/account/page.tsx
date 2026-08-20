import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { labelFor, ORDER_STATUSES } from "@/lib/enums";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/account/login?next=/account");

  const orders = await prisma.order.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">My Account</h1>
        <p className="text-sm text-slate-500">{session.email}</p>
      </div>

      <h2 className="text-lg font-semibold text-slate-200">Order history</h2>
      {orders.length === 0 ? (
        <p className="text-slate-500">No orders yet.</p>
      ) : (
        <div className="card divide-y divide-border">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="flex justify-between items-center p-4 hover:bg-surface2">
              <div>
                <div className="text-sm text-slate-200">#{o.id.slice(-8).toUpperCase()}</div>
                <div className="text-xs text-slate-500">
                  {formatDate(o.createdAt)} · {o.items.length} item(s)
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-300">{formatMoney(o.total, o.currency)}</span>
                <span className="badge bg-surface2 border border-border text-slate-300">
                  {labelFor(ORDER_STATUSES, o.status)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
