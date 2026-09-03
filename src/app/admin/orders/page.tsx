import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { labelFor, ORDER_STATUSES } from "@/lib/enums";
import { ORDER_STATUS_COLOR } from "@/lib/orderStatusColors";
import Pagination from "@/components/admin/Pagination";

const PER_PAGE = 25;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const [total, orders, awaitingVerification] = await Promise.all([
    prisma.order.count(),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { user: true, _count: { select: { items: true } } },
    }),
    prisma.order.count({ where: { status: "AWAITING_VERIFICATION" } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="a-h1">Orders</h1>
        {awaitingVerification > 0 && (
          <span className="a-badge a-badge-warn">{awaitingVerification} awaiting verification</span>
        )}
      </div>

      <div className="a-list">
        {orders.length === 0 ? (
          <p className="a-list-empty">No orders yet.</p>
        ) : (
          orders.map((o) => {
            const color =
              ORDER_STATUS_COLOR[o.status as keyof typeof ORDER_STATUS_COLOR]?.badgeClass ?? "";
            return (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="a-list-row">
                <div className="min-w-0">
                  <div style={{ color: "var(--a-text)", fontWeight: 550 }}>
                    #{o.id.slice(-8).toUpperCase()}
                  </div>
                  <div className="a-sub truncate">
                    {o.user.email} · {formatDate(o.createdAt)} · {o._count.items} item
                    {o._count.items === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span style={{ color: "var(--a-text)" }}>{formatMoney(o.total, o.currency)}</span>
                  <span className={`badge border ${color}`}>{labelFor(ORDER_STATUSES, o.status)}</span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <Pagination
        page={page}
        pageCount={pageCount}
        basePath="/admin/orders"
        totalLabel={total > 0 ? `Showing ${from}–${to} of ${total}` : undefined}
      />
    </div>
  );
}
