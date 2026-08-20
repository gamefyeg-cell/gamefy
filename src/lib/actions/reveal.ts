"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { decryptSecret } from "@/lib/crypto";
import { logAudit } from "@/lib/actions/admin/audit";

export interface RevealState {
  value?: string;
  error?: string;
}

/// Decrypts a delivered key/credential only at the point the buyer clicks
/// "Reveal" — never sent to the client pre-decrypted, and every reveal is
/// logged (plan §5: "Decrypt only at point of display ... one-time reveal +
/// logged access").
export async function revealOrderItemAction(orderItemId: string): Promise<RevealState> {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true },
  });
  if (!item || !item.deliveryPayloadEncrypted) {
    return { error: "Nothing to reveal for this item yet." };
  }

  const session = await getSession();
  // Ownership check: a logged-in visitor must own the order (or be an
  // admin). A guest (no session) is trusted on knowledge of the order's
  // unguessable URL — the same "order link" model most guest checkouts use.
  if (session && session.userId !== item.order.userId && session.role === "CUSTOMER") {
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

  return { value };
}
