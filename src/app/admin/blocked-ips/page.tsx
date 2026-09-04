import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { blockIpAction, unblockIpAction } from "@/lib/actions/admin/moderation";
import AddPanel from "@/components/admin/AddPanel";

export default async function BlockedIpsPage() {
  const blocked = await prisma.blockedIp.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="a-h1">Blocked IPs</h1>
        <Link href="/admin/customers" className="a-btn a-btn-ghost a-btn-sm">
          ‹ Customers
        </Link>
      </div>
      <p className="a-sub">
        Requests from these addresses are refused at login, registration and checkout. Enforcement lives in the
        server actions — not middleware — so a blocked visitor can still browse but can't act.
      </p>

      <AddPanel label="Block an IP">
        <form action={blockIpAction} className="a-card flex flex-wrap items-end gap-3" style={{ padding: "1rem" }}>
          <div>
            <label className="a-label">IP address</label>
            <input name="ip" required className="a-input" placeholder="203.0.113.42" style={{ fontFamily: "monospace" }} />
          </div>
          <div className="flex-1" style={{ minWidth: 200 }}>
            <label className="a-label">Reason (optional)</label>
            <input name="reason" className="a-input" placeholder="e.g. repeated fraud" />
          </div>
          <button className="a-btn a-btn-danger">Block</button>
        </form>
      </AddPanel>

      <div className="a-list">
        {blocked.length === 0 ? (
          <p className="a-list-empty">Nothing blocked.</p>
        ) : (
          blocked.map((b) => (
            <div key={b.ip} className="a-list-row">
              <div className="min-w-0">
                <div style={{ fontFamily: "monospace", color: "var(--a-text)", fontWeight: 550 }}>{b.ip}</div>
                <div className="a-sub">
                  {formatDate(b.createdAt)}
                  {b.reason ? ` — ${b.reason}` : ""}
                </div>
              </div>
              <form action={unblockIpAction}>
                <input type="hidden" name="ip" value={b.ip} />
                <button className="a-btn a-btn-ghost a-btn-sm">Unblock</button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
