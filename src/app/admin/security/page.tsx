import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { blockIpAction } from "@/lib/actions/admin/moderation";
import { THREAT_EVENT_TYPES } from "@/lib/moderation";

const LOGIN_TYPES = ["login_failed", "login_blocked"];
const CHECKOUT_TYPES = ["coupon_failed", "checkout_throttled", "reveal_failed"];

const REASON_LABEL: Record<string, string> = {
  "unknown email": "Unknown email",
  "wrong password": "Wrong password",
  "rate limited": "Rate-limited",
  "register: rate limited": "Register flood",
  "register: blocked IP": "Blocked IP (register)",
  "checkout blocked": "Blocked at checkout",
  "coupon guessing": "Promo-code guessing",
  "order flood": "Order flood",
};

const TYPE_LABEL: Record<string, string> = {
  login_failed: "Failed login",
  login_blocked: "Blocked login",
  coupon_failed: "Bad promo code",
  checkout_throttled: "Checkout throttled",
  reveal_failed: "Reveal probe",
};

function Feed({
  events,
}: {
  events: { id: string; type: string; email: string | null; ip: string | null; detail: string | null; createdAt: Date }[];
}) {
  return (
    <div className="a-list">
      {events.length === 0 ? (
        <p className="a-list-empty">Nothing recorded.</p>
      ) : (
        events.map((e) => (
          <div key={e.id} className="a-list-row">
            <div className="min-w-0">
              <div style={{ color: "var(--a-text)" }} className="truncate">
                <span style={{ fontWeight: 550 }}>{TYPE_LABEL[e.type] ?? e.type}</span>
                <span className="a-sub">
                  {e.email ? ` · ${e.email}` : ""}
                  {e.detail ? ` · ${REASON_LABEL[e.detail] ?? e.detail}` : ""}
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
  );
}

export default async function SecurityPage() {
  const since24h = new Date(Date.now() - 24 * 3600 * 1000);

  const [topIps, loginFeed, checkoutFeed, count24h, topCodes] = await Promise.all([
    prisma.customerEvent.groupBy({
      by: ["ip"],
      where: { type: { in: THREAT_EVENT_TYPES }, createdAt: { gte: since24h }, ip: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { ip: "desc" } },
      take: 20,
    }),
    prisma.customerEvent.findMany({
      where: { type: { in: LOGIN_TYPES } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.customerEvent.findMany({
      where: { type: { in: CHECKOUT_TYPES } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.customerEvent.count({ where: { type: { in: THREAT_EVENT_TYPES }, createdAt: { gte: since24h } } }),
    prisma.customerEvent.groupBy({
      by: ["detail"],
      where: { type: "coupon_failed", createdAt: { gte: since24h }, detail: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { detail: "desc" } },
      take: 10,
    }),
  ]);

  const ipList = topIps.map((t) => t.ip).filter((v): v is string => Boolean(v));
  const blocked = new Set(
    ipList.length ? (await prisma.blockedIp.findMany({ where: { ip: { in: ipList } } })).map((b) => b.ip) : []
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="a-h1">Security</h1>
        <div className="flex gap-2">
          <span className={`a-badge ${count24h > 0 ? "a-badge-warn" : ""}`}>{count24h} threat events · 24h</span>
          <Link href="/admin/blocked-ips" className="a-btn a-btn-ghost a-btn-sm">
            Blocked IPs
          </Link>
        </div>
      </div>
      <p className="a-sub">
        Failed logins, promo-code guessing, checkout floods and order-link probing. Attempts are throttled
        automatically per IP and per account; block an address here to cut it off entirely. Order totals and
        discounts are always recomputed server-side, and nothing is delivered until an admin verifies payment —
        so this is about abuse volume, not bypass.
      </p>

      {/* Worst IPs across all abuse types */}
      <section className="flex flex-col gap-3">
        <h2 className="a-h2">Most flagged IPs (last 24h)</h2>
        <div className="a-list">
          {topIps.length === 0 ? (
            <p className="a-list-empty">No suspicious activity in the last 24h.</p>
          ) : (
            topIps.map((t) => (
              <div key={t.ip} className="a-list-row">
                <div className="min-w-0">
                  <div style={{ fontFamily: "monospace", color: "var(--a-text)", fontWeight: 550 }}>{t.ip}</div>
                  <div className="a-sub">
                    {t._count._all} event{t._count._all === 1 ? "" : "s"}
                  </div>
                </div>
                {blocked.has(t.ip!) ? (
                  <span className="a-badge a-badge-danger">blocked</span>
                ) : (
                  <form action={blockIpAction}>
                    <input type="hidden" name="ip" value={t.ip ?? ""} />
                    <input type="hidden" name="reason" value="flagged on security page" />
                    <button className="a-btn a-btn-danger a-btn-sm">Block</button>
                  </form>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {topCodes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="a-h2">Promo codes being guessed (24h)</h2>
          <div className="a-list">
            {topCodes.map((c) => (
              <div key={c.detail} className="a-list-row">
                <span style={{ fontFamily: "monospace", color: "var(--a-text)" }}>{c.detail}</span>
                <span className="a-sub">{c._count._all} tries</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="a-h2">Login attempts</h2>
        <Feed events={loginFeed} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="a-h2">Promo &amp; checkout abuse</h2>
        <Feed events={checkoutFeed} />
      </section>
    </div>
  );
}
