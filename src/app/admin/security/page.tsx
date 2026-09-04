import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { blockIpAction } from "@/lib/actions/admin/moderation";

const LOGIN_EVENT_TYPES = ["login_failed", "login_blocked"];

const REASON_LABEL: Record<string, string> = {
  "unknown email": "Unknown email",
  "wrong password": "Wrong password",
  "rate limited": "Rate-limited",
  "register: rate limited": "Register flood",
  "register: blocked IP": "Blocked IP (register)",
  "checkout blocked": "Blocked at checkout",
};

export default async function SecurityPage() {
  const since24h = new Date(Date.now() - 24 * 3600 * 1000);

  const [topIps, recent, failed24h] = await Promise.all([
    prisma.customerEvent.groupBy({
      by: ["ip"],
      where: { type: { in: LOGIN_EVENT_TYPES }, createdAt: { gte: since24h }, ip: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { ip: "desc" } },
      take: 20,
    }),
    prisma.customerEvent.findMany({
      where: { type: { in: LOGIN_EVENT_TYPES } },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    prisma.customerEvent.count({ where: { type: { in: LOGIN_EVENT_TYPES }, createdAt: { gte: since24h } } }),
  ]);

  const ipList = topIps.map((t) => t.ip).filter((v): v is string => Boolean(v));
  const blocked = new Set(
    ipList.length
      ? (await prisma.blockedIp.findMany({ where: { ip: { in: ipList } } })).map((b) => b.ip)
      : []
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="a-h1">Login security</h1>
        <div className="flex gap-2">
          <span className="a-badge a-badge-warn">{failed24h} failed / blocked · 24h</span>
          <Link href="/admin/blocked-ips" className="a-btn a-btn-ghost a-btn-sm">
            Blocked IPs
          </Link>
        </div>
      </div>
      <p className="a-sub">
        Failed passwords, unknown-email probes and rate-limited attempts. Logins are throttled automatically
        (15 tries / IP or 6 / account per 15&nbsp;min); block an address here to cut it off entirely.
      </p>

      {/* Worst IPs in the last 24h */}
      <div className="flex flex-col gap-2">
        <h2 className="a-h2">Most attempts (last 24h)</h2>
        <div className="a-list">
          {topIps.length === 0 ? (
            <p className="a-list-empty">No failed or blocked logins in the last 24h.</p>
          ) : (
            topIps.map((t) => (
              <div key={t.ip} className="a-list-row">
                <div className="min-w-0">
                  <div style={{ fontFamily: "monospace", color: "var(--a-text)", fontWeight: 550 }}>{t.ip}</div>
                  <div className="a-sub">{t._count._all} attempt{t._count._all === 1 ? "" : "s"}</div>
                </div>
                {blocked.has(t.ip!) ? (
                  <span className="a-badge a-badge-danger">blocked</span>
                ) : (
                  <form action={blockIpAction}>
                    <input type="hidden" name="ip" value={t.ip ?? ""} />
                    <input type="hidden" name="reason" value="repeated failed logins" />
                    <button className="a-btn a-btn-danger a-btn-sm">Block</button>
                  </form>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Raw feed */}
      <div className="flex flex-col gap-2">
        <h2 className="a-h2">Recent attempts</h2>
        <div className="a-list">
          {recent.length === 0 ? (
            <p className="a-list-empty">Nothing yet.</p>
          ) : (
            recent.map((e) => (
              <div key={e.id} className="a-list-row">
                <div className="min-w-0">
                  <div style={{ color: "var(--a-text)" }} className="truncate">
                    {e.email || <span className="a-sub">no email</span>}
                    <span className="a-sub">
                      {" · "}
                      {e.type === "login_blocked" ? "blocked" : REASON_LABEL[e.detail ?? ""] ?? e.detail ?? "failed"}
                    </span>
                  </div>
                  <div className="a-sub" style={{ fontFamily: "monospace" }}>
                    {e.ip ?? "no IP"}
                  </div>
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
