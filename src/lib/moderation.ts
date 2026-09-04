import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

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
  | "login_blocked"
  | "order_placed"
  | "order_verified"
  | "reveal";

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
