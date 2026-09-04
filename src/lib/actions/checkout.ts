"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCart, clearCart } from "@/lib/cart";
import { getSession } from "@/lib/session";
import { getSelectedRegion } from "@/lib/region";
import { toJson } from "@/lib/json";
import { getActiveDiscounts, buildCollectionIdsMap, pickBestDiscount } from "@/lib/discounts";
import { countRecentEvents, getRequestIp, isIpBlocked, logCustomerEvent } from "@/lib/moderation";

export interface CheckoutState {
  error?: string;
}

async function getOrCreateGuestUser(email: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({ data: { email, role: "CUSTOMER" } });
}

/// There's no payment gateway wired up (see README "What's stubbed") — the
/// store is paid via manual InstaPay/Telda transfer instead. This action's
/// job is just to record the order and the buyer's claim that they paid;
/// nothing is delivered and no stock is touched here. An admin reviews the
/// uploaded proof against the real InstaPay/Telda account and only then
/// calls verifyPaymentAction (src/lib/actions/admin/orders.ts), which is
/// what actually consumes stock, delivers, and counts the sale in
/// analytics — so a fake/rejected "payment" can never show up as a sale.
export async function placeOrderAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const cart = await getCart();
  if (cart.length === 0) {
    return { error: "Your cart is empty." };
  }

  const region = await getSelectedRegion();
  if (!region) {
    return { error: "No active region configured — an admin needs to add one." };
  }

  const session = await getSession();
  const email = session?.email ?? String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { error: "Enter an email address to receive your order." };
  }

  const ip = await getRequestIp();

  const buyerName = String(formData.get("buyerName") ?? "").trim();
  const buyerPhone = String(formData.get("buyerPhone") ?? "").trim();
  const buyerCity = String(formData.get("buyerCity") ?? "").trim();
  if (!buyerName || !buyerPhone || !buyerCity) {
    return { error: "Full name, phone number, and city are required." };
  }

  const paymentMethodId = String(formData.get("paymentMethodId") ?? "");
  const paymentProofUrl = String(formData.get("paymentProofUrl") ?? "").trim();
  if (!paymentMethodId) {
    return { error: "Choose an InstaPay or Telda account to pay to." };
  }
  if (!paymentProofUrl) {
    return { error: "Upload a screenshot showing your transfer went through." };
  }
  const paymentMethod = await prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } });
  if (!paymentMethod || !paymentMethod.active) {
    return { error: "That payment method is no longer available — pick another." };
  }

  const couponCode = String(formData.get("couponCode") ?? "").trim() || null;

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: cart.map((l) => l.variantId) } },
    include: { product: { include: { customFields: true } } },
  });

  // Validate required custom fields (e.g. Player ID / UID) and required
  // notice acknowledgement (plan §2 — checkout-time proof buyers saw it).
  const needsAck = variants.some((v) => v.product.requiresNoticeAck);
  if (needsAck && formData.get("ack") !== "on") {
    return { error: "Please confirm you've read the notes above for the applicable items." };
  }

  for (const line of cart) {
    const variant = variants.find((v) => v.id === line.variantId);
    if (!variant) continue;
    for (const field of variant.product.customFields) {
      if (field.required && !line.customFieldValues?.[field.fieldKey]) {
        return { error: `"${field.label}" is required for ${variant.product.title}.` };
      }
    }
  }

  // Discounts are always recomputed server-side here — never trust a
  // client-supplied total. A coupon code is only honored if it actually
  // matches a live, in-scope Discount for at least one line.
  const [activeDiscounts, collectionIdsMap] = await Promise.all([
    getActiveDiscounts(),
    buildCollectionIdsMap(variants.map((v) => v.productId)),
  ]);
  if (couponCode) {
    // Throttle promo-code guessing (per IP + per email, 15-min window).
    const badTries = await countRecentEvents({ types: ["coupon_failed"], minutes: 15, ip, email });
    if (badTries >= 8) {
      await logCustomerEvent({ email, ip, type: "checkout_throttled", detail: "coupon guessing" });
      return { error: "Too many invalid codes. Please wait a few minutes and try again." };
    }
    const codeExists = activeDiscounts.some((d) => d.code?.toUpperCase() === couponCode.toUpperCase());
    if (!codeExists) {
      await logCustomerEvent({ email, ip, type: "coupon_failed", detail: couponCode.slice(0, 32) });
      return { error: `Coupon "${couponCode}" is invalid or expired.` };
    }
    await logCustomerEvent({ email, ip, type: "coupon_used", detail: couponCode.slice(0, 32) });
  }

  const lineDiscounts = new Map<string, { amount: number; name: string } | null>();
  for (const line of cart) {
    const variant = variants.find((v) => v.id === line.variantId);
    if (!variant) continue;
    const match = pickBestDiscount(activeDiscounts, {
      productId: variant.productId,
      categoryId: variant.product.categoryId,
      collectionIds: collectionIdsMap.get(variant.productId) ?? [],
      price: variant.price,
      code: couponCode,
    });
    lineDiscounts.set(line.variantId, match ? { amount: match.amount, name: match.discount.name } : null);
  }

  const total = cart.reduce((sum, line) => {
    const variant = variants.find((v) => v.id === line.variantId);
    if (!variant) return sum;
    const discount = lineDiscounts.get(line.variantId);
    const unit = Math.max(0, variant.price - (discount?.amount ?? 0));
    return sum + unit * line.qty;
  }, 0);

  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : await getOrCreateGuestUser(email);
  if (!user) return { error: "Could not resolve account." };

  if (user.bannedAt || (await isIpBlocked(ip))) {
    await logCustomerEvent({ userId: user.id, email, ip, type: "login_blocked", detail: "checkout blocked" });
    return { error: "We can't process this order. Contact support if you think this is a mistake." };
  }

  // Order-flood throttle — 8 per IP or account per hour.
  const recentOrders = await countRecentEvents({ types: ["order_placed"], minutes: 60, ip, userId: user.id });
  if (recentOrders >= 8) {
    await logCustomerEvent({ userId: user.id, email, ip, type: "checkout_throttled", detail: "order flood" });
    return { error: "You've placed several orders in a short time. Please wait a bit before placing another." };
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId: user.id,
        regionId: region.id,
        status: "AWAITING_VERIFICATION",
        total,
        currency: region.currency,
        paymentProvider: paymentMethod.type.toLowerCase(),
        paymentMethodId: paymentMethod.id,
        paymentProofUrl,
        buyerName,
        buyerPhone,
        buyerCity,
        ipAddress: ip,
      },
    });

    for (const line of cart) {
      const variant = variants.find((v) => v.id === line.variantId);
      if (!variant) continue;
      const discount = lineDiscounts.get(line.variantId);

      await tx.orderItem.create({
        data: {
          orderId: created.id,
          variantId: variant.id,
          quantity: line.qty,
          unitPrice: variant.price,
          discountAmount: (discount?.amount ?? 0) * line.qty,
          discountName: discount?.name ?? null,
          customFieldValues: line.customFieldValues ? toJson(line.customFieldValues) : null,
        },
      });
      // Deliberately no stock consumption / delivery / analytics here —
      // see the doc comment above. That all happens in verifyPaymentAction
      // once an admin confirms the transfer actually came through.
    }

    return created;
  });

  await logCustomerEvent({ userId: user.id, email, ip, type: "order_placed", detail: `Order:${order.id}` });

  await clearCart();
  redirect(`/orders/${order.id}`);
}
