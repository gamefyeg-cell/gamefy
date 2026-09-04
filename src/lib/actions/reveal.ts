"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { decryptSecret } from "@/lib/crypto";
import { logAudit } from "@/lib/actions/admin/audit";
import { countRecentEvents, getRequestIp, logCustomerEvent } from "@/lib/moderation";

export interface RevealState {
  value?: string;
  error?: string;
}

/// Decrypts a delivered key/credential only at the point the buyer clicks
/// "Reveal" — never sent to the client pre-decrypted, and every reveal is
/// logged (plan §5: "Decrypt only at point of display ... one-time reveal +
/// logged access").
export async function revealOrderItemAction(orderItemId: string): Promise<RevealState> {
  const ip = await getRequestIp();
  const session = await getSession();

  // Throttle order-link / item-id probing.
  if ((await countRecentEvents({ types: ["reveal_failed"], minutes: 15, ip, userId: session?.userId })) >= 20) {
    return { error: "Too many attempts. Please try again later." };
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true },
  });
  if (!item || !item.deliveryPayloadEncrypted) {
    await logCustomerEvent({ userId: session?.userId ?? null, ip, type: "reveal_failed", detail: `OrderItem:${orderItemId} (not ready)` });
    return { error: "Nothing to reveal for this item yet." };
  }

  // Ownership check: a logged-in visitor must own the order (or be an
  // admin). A guest (no session) is trusted on knowledge of the order's
  // unguessable URL — the same "order link" model most guest checkouts use.
  if (session && session.userId !== item.order.userId && session.role === "CUSTOMER") {
    await logCustomerEvent({ userId: session.userId, ip, type: "reveal_failed", detail: `OrderItem:${orderItemId} (denied)` });
    return { error: "You don't have access to this item." };
  }

  const value = decryptSecret(item.deliveryPayloadEncrypted);

  await logAudit(
    item.order.userId,
    "order_item.reveal",
    `OrderItem:${orderItemId}`,
    null,
    { revealedBy: session?.email ?? "guest (order link)" }
  );
  await logCustomerEvent({
    userId: item.order.userId,
    ip,
    type: "reveal",
    detail: `OrderItem:${orderItemId}`,
  });

  return { value };
}
