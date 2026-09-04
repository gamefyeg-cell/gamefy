import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/// The ONE message shown whenever a blocked IP or suspended account tries
/// to do anything (login, register, checkout, reveal, password reset).
/// Never fall through to "invalid credentials" or a vague "can't process"
/// error for a blocked actor — it just tells them to switch machines.
export const BLOCKED_MESSAGE =
  "Blocked: suspicious activity detected. Please contact support if you believe this is a mistake.";

/// True when this request must be refused outright — the IP is on the
/// block list, or the (optional) account is suspended.
export async function isBlockedActor(opts: {
  ip: string | null;
  bannedAt?: Date | null;
}): Promise<boolean> {
  if (opts.bannedAt) return true;
  return isIpBlocked(opts.ip);
}

/// Best-effort client IP from the proxy headers Vercel / most hosts set.
export async function getRequestIp(): Promise<string | null> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]!.trim() || null;
    return h.get("x-real-ip") || null;
  } catch {
    return null;
  }
}

export type CustomerEventType =
  | "register"
  | "login"
  | "login_failed"
  | "login_blocked"
  | "order_placed"
  | "order_verified"
  | "reveal"
  | "reveal_failed"
  | "coupon_failed"
  | "coupon_used"
  | "checkout_throttled";

/// Abuse-signal event types — what the admin Security page watches and the
/// throttles count.
export const THREAT_EVENT_TYPES: CustomerEventType[] = [
  "login_failed",
  "login_blocked",
  "reveal_failed",
  "coupon_failed",
  "checkout_throttled",
];

/// Generic sliding-window counter over customer_events, matched on ANY of
/// the identity dimensions given (ip / userId / email) so rotating one
/// doesn't defeat it.
export async function countRecentEvents(opts: {
  types: CustomerEventType[];
  minutes: number;
  ip?: string | null;
  userId?: string | null;
  email?: string | null;
}): Promise<number> {
  const idOr: Array<Record<string, string>> = [];
  if (opts.ip) idOr.push({ ip: opts.ip });
  if (opts.userId) idOr.push({ userId: opts.userId });
  if (opts.email) idOr.push({ email: opts.email });
  if (idOr.length === 0) return 0;
  try {
    return await prisma.customerEvent.count({
      where: {
        type: { in: opts.types },
        createdAt: { gte: new Date(Date.now() - opts.minutes * 60_000) },
        OR: idOr,
      },
    });
  } catch {
    return 0;
  }
}

/// Count recent failed logins for rate-limiting. Cheap — hits the
/// customer_events index on (ip) / (email) + a createdAt range.
export async function recentLoginFailures(opts: {
  ip: string | null;
  email?: string | null;
  minutes: number;
}): Promise<{ byIp: number; byEmail: number }> {
  const since = new Date(Date.now() - opts.minutes * 60_000);
  try {
    const [byIp, byEmail] = await Promise.all([
      opts.ip
        ? prisma.customerEvent.count({
            where: { type: "login_failed", ip: opts.ip, createdAt: { gte: since } },
          })
        : Promise.resolve(0),
      opts.email
        ? prisma.customerEvent.count({
            where: { type: "login_failed", email: opts.email, createdAt: { gte: since } },
          })
        : Promise.resolve(0),
    ]);
    return { byIp, byEmail };
  } catch {
    return { byIp: 0, byEmail: 0 };
  }
}

/// Count recent registrations from an IP — a burst is account-farming.
export async function recentRegistrations(ip: string | null, minutes: number): Promise<number> {
  if (!ip) return 0;
  try {
    return await prisma.customerEvent.count({
      where: { type: "register", ip, createdAt: { gte: new Date(Date.now() - minutes * 60_000) } },
    });
  } catch {
    return 0;
  }
}

/// Append a customer activity row. Never throws — activity logging must not
/// break auth or checkout.
export async function logCustomerEvent(input: {
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  type: CustomerEventType;
  detail?: string | null;
}): Promise<void> {
  try {
    await prisma.customerEvent.create({
      data: {
        userId: input.userId ?? null,
        email: input.email ?? null,
        ip: input.ip ?? null,
        type: input.type,
        detail: input.detail ?? null,
      },
    });
  } catch (err) {
    console.error("[logCustomerEvent]", err);
  }
}

export async function isIpBlocked(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  try {
    return Boolean(await prisma.blockedIp.findUnique({ where: { ip } }));
  } catch {
    return false;
  }
}
