import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import Pagination from "@/components/admin/Pagination";

const PER_PAGE = 30;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const [total, banned, users] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", bannedAt: { not: null } } }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        email: true,
        createdAt: true,
        bannedAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="a-h1">Customers</h1>
        <div className="flex gap-2">
          <span className="a-badge">{total} total</span>
          {banned > 0 && <span className="a-badge a-badge-danger">{banned} suspended</span>}
          <Link href="/admin/blocked-ips" className="a-btn a-btn-ghost a-btn-sm">
            Blocked IPs
          </Link>
        </div>
      </div>
      <p className="a-sub">Everyone who has registered or checked out. Open one to see their activity, suspend the account, or block an IP.</p>

      <div className="a-list">
        {users.length === 0 ? (
          <p className="a-list-empty">No customers yet.</p>
        ) : (
          users.map((u) => (
            <Link key={u.id} href={`/admin/customers/${u.id}`} className="a-list-row">
              <div className="min-w-0">
                <div style={{ color: "var(--a-text)", fontWeight: 550 }} className="truncate">
                  {u.email}
                </div>
                <div className="a-sub">
                  joined {formatDate(u.createdAt)} · {u._count.orders} order{u._count.orders === 1 ? "" : "s"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {u.bannedAt && <span className="a-badge a-badge-danger">suspended</span>}
                <span style={{ color: "var(--a-accent)", fontWeight: 600 }}>View ›</span>
              </div>
            </Link>
          ))
        )}
      </div>

      <Pagination page={page} pageCount={pageCount} basePath="/admin/customers" />
    </div>
  );
}
