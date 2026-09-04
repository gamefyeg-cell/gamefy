import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { labelFor, ORDER_STATUSES } from "@/lib/enums";
import { banUserAction, unbanUserAction, blockIpAction } from "@/lib/actions/admin/moderation";

const EVENT_LABEL: Record<string, string> = {
  register: "Registered",
  login: "Logged in",
  login_failed: "Failed login",
  login_blocked: "Blocked attempt",
  order_placed: "Placed an order",
  order_verified: "Order verified",
  reveal: "Revealed a key",
};

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, events] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 25,
          select: { id: true, total: true, currency: true, status: true, createdAt: true, ipAddress: true },
        },
      },
    }),
    prisma.customerEvent.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 80 }),
  ]);
  if (!user) notFound();

  const ips = Array.from(
    new Set([
      ...events.map((e) => e.ip).filter((v): v is string => Boolean(v)),
      ...user.orders.map((o) => o.ipAddress).filter((v): v is string => Boolean(v)),
    ])
  );
  const blockedIps = ips.length
    ? new Set((await prisma.blockedIp.findMany({ where: { ip: { in: ips } } })).map((b) => b.ip))
    : new Set<string>();

  const spend = user.orders
    .filter((o) => ["PAID", "FULFILLED", "PARTIALLY_FULFILLED"].includes(o.status))
    .reduce((s, o) => s + o.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="a-h1">{user.email}</h1>
          <p className="a-sub">
            Joined {formatDate(user.createdAt)} · {user.orders.length} order{user.orders.length === 1 ? "" : "s"} ·
            {" "}
            {formatMoney(spend, user.orders[0]?.currency ?? "EGP")} spent
          </p>
        </div>
        <Link href="/admin/customers" className="a-btn a-btn-ghost a-btn-sm">
          ‹ All customers
        </Link>
      </div>

      {/* Suspend / restore */}
      <div className="a-card" style={{ padding: "1rem" }}>
        {user.bannedAt ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="a-badge a-badge-danger">Suspended</span>
              <span className="a-sub" style={{ marginLeft: 8 }}>
                {formatDate(user.bannedAt)}
                {user.banReason ? ` — ${user.banReason}` : ""}
              </span>
            </div>
            <form action={unbanUserAction}>
              <input type="hidden" name="userId" value={user.id} />
              <button className="a-btn a-btn-ghost a-btn-sm">Restore access</button>
            </form>
          </div>
        ) : (
          <form action={banUserAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="userId" value={user.id} />
            <div className="flex-1" style={{ minWidth: 220 }}>
              <label className="a-label">Reason (optional)</label>
              <input name="reason" className="a-input" placeholder="e.g. chargeback fraud" />
            </div>
            <button className="a-btn a-btn-danger">Suspend account</button>
          </form>
        )}
      </div>

      {/* IPs seen */}
      <div className="flex flex-col gap-2">
        <h2 className="a-h2">IP addresses seen</h2>
        {ips.length === 0 ? (
          <p className="a-sub">No IPs recorded yet.</p>
        ) : (
          <div className="a-list">
            {ips.map((ip) => (
              <div key={ip} className="a-list-row">
                <span style={{ fontFamily: "monospace", color: "var(--a-text)" }}>{ip}</span>
                {blockedIps.has(ip) ? (
                  <span className="a-badge a-badge-danger">blocked</span>
                ) : (
                  <form action={blockIpAction}>
                    <input type="hidden" name="ip" value={ip} />
                    <input type="hidden" name="userId" value={user.id} />
                    <button className="a-btn a-btn-danger a-btn-sm">Block this IP</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders */}
      <div className="flex flex-col gap-2">
        <h2 className="a-h2">Orders</h2>
        <div className="a-list">
          {user.orders.length === 0 ? (
            <p className="a-list-empty">No orders.</p>
          ) : (
            user.orders.map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="a-list-row">
                <div className="min-w-0">
                  <div style={{ color: "var(--a-text)", fontWeight: 550 }}>#{o.id.slice(-8).toUpperCase()}</div>
                  <div className="a-sub">
                    {formatDate(o.createdAt)}
                    {o.ipAddress ? ` · ${o.ipAddress}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span style={{ color: "var(--a-text)" }}>{formatMoney(o.total, o.currency)}</span>
                  <span className="a-badge">{labelFor(ORDER_STATUSES, o.status)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Activity */}
      <div className="flex flex-col gap-2">
        <h2 className="a-h2">Activity</h2>
        <div className="a-list">
          {events.length === 0 ? (
            <p className="a-list-empty">No recorded activity.</p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="a-list-row">
                <div className="min-w-0">
                  <div style={{ color: "var(--a-text)" }}>
                    {EVENT_LABEL[e.type] ?? e.type}
                    {e.detail ? <span className="a-sub"> · {e.detail}</span> : null}
                  </div>
                  <div className="a-sub">{e.ip ? <span style={{ fontFamily: "monospace" }}>{e.ip}</span> : "no IP"}</div>
                </div>
                <span className="a-sub shrink-0">{formatDate(e.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
