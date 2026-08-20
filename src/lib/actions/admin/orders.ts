"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { logAudit } from "@/lib/actions/admin/audit";
import { encryptSecret } from "@/lib/crypto";
import { STOCK_BACKED_DELIVERY } from "@/lib/delivery";
import { trackProductEvent } from "@/lib/analytics";

async function recomputeOrderStatus(orderId: string) {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  const allDelivered = items.every((i) => i.deliveredAt);
  const anyDelivered = items.some((i) => i.deliveredAt);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === "REFUNDED" || order.status === "CANCELLED") return;
  const status = allDelivered ? "FULFILLED" : anyDelivered ? "PARTIALLY_FULFILLED" : order.status;
  await prisma.order.update({ where: { id: orderId }, data: { status } });
}

/// Manual fulfillment path for MANUAL_FULFILLMENT / TOPUP_API items, or
/// out-of-stock AUTO_KEY items — an admin/support agent supplies the
/// delivered key/credential/confirmation text by hand.
export async function manualFulfillAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER", "SUPPORT_AGENT"]);
  const orderItemId = String(formData.get("orderItemId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  const payload = String(formData.get("payload") ?? "").trim();
  if (!orderItemId || !payload) throw new Error("Missing order item or payload.");

  const before = await prisma.orderItem.findUnique({ where: { id: orderItemId } });
  const updated = await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { deliveryPayloadEncrypted: encryptSecret(payload), deliveredAt: new Date() },
  });
  await logAudit(session.userId, "order.manual_fulfill", `OrderItem:${orderItemId}`, before, {
    deliveredAt: updated.deliveredAt,
  });

  await recomputeOrderStatus(orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/orders/${orderId}`);
}

/// The other half of the manual InstaPay/Telda flow (see checkout.ts): an
/// admin has looked at the uploaded screenshot, confirmed the transfer
/// actually landed in the real account, and is now releasing the order —
/// this is where stock actually gets consumed, keys actually get
/// delivered, and the sale actually counts in analytics. Nothing in
/// placeOrderAction does any of that; it all happens here, once, so a
/// buyer who never really paid can never end up with delivered goods or a
/// counted sale.
export async function verifyPaymentAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "FINANCE"]);
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) throw new Error("Missing order id.");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { variant: true } } },
  });
  if (!order) throw new Error("Order not found.");
  if (order.status !== "AWAITING_VERIFICATION") {
    throw new Error("This order isn't awaiting payment verification.");
  }

  await prisma.$transaction(async (tx) => {
    let allDelivered = true;
    let anyDelivered = false;

    for (const item of order.items) {
      const variant = item.variant;
      const lineTotal = item.unitPrice * item.quantity - item.discountAmount;
      await trackProductEvent(variant.productId, "PURCHASE", { quantity: item.quantity, revenue: lineTotal, db: tx });

      if (STOCK_BACKED_DELIVERY.has(variant.deliveryMethod)) {
        const stockItem = await tx.keyStockItem.findFirst({
          where: { variantId: variant.id, used: false },
          orderBy: { createdAt: "asc" },
        });

        if (stockItem) {
          await tx.keyStockItem.update({
            where: { id: stockItem.id },
            data: { used: true, usedAt: new Date(), orderItemId: item.id },
          });
          await tx.orderItem.update({
            where: { id: item.id },
            data: { deliveryPayloadEncrypted: stockItem.codeEncrypted, deliveredAt: new Date() },
          });
          if (variant.stockMode === "MANUAL" && variant.stockQty != null) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { stockQty: Math.max(0, variant.stockQty - item.quantity) },
            });
          }
          anyDelivered = true;
        } else {
          // Out of stock — falls back to manual fulfillment from the order page.
          allDelivered = false;
        }
      } else {
        // TOPUP_API / MANUAL_FULFILLMENT — always needs a human afterward.
        allDelivered = false;
      }
    }

    const status = allDelivered ? "FULFILLED" : anyDelivered ? "PARTIALLY_FULFILLED" : "PAID";
    await tx.order.update({
      where: { id: orderId },
      data: { status, verifiedAt: new Date(), verifiedById: session.userId },
    });
  });

  await logAudit(session.userId, "order.verify_payment", `Order:${orderId}`, { status: order.status }, { status: "verified" });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${orderId}`);
}

export async function refundOrderAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "FINANCE"]);
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) throw new Error("Missing order id.");

  const before = await prisma.order.findUnique({ where: { id: orderId } });
  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
  await logAudit(session.userId, "order.refund", `Order:${orderId}`, before, updated);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

export async function cancelOrderAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "FINANCE", "SUPPORT_AGENT"]);
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) throw new Error("Missing order id.");

  const before = await prisma.order.findUnique({ where: { id: orderId } });
  const updated = await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  await logAudit(session.userId, "order.cancel", `Order:${orderId}`, before, updated);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}
