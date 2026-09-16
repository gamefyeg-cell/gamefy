import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";
import { toJson } from "@/lib/json";
import { roundMoney } from "@/lib/format";
import { getActiveDiscounts, buildCollectionIdsMap, pickBestDiscount } from "@/lib/discounts";
import { BLOCKED_MESSAGE, countRecentEvents, getRequestIp, isIpBlocked, logCustomerEvent } from "@/lib/moderation";
import { getAllActiveRegions } from "@/lib/region";

interface CheckoutItemPayload {
  variantId: string;
  quantity: number;
  customFieldValues?: Record<string, string>;
}

interface CheckoutPayload {
  email: string;
  buyerName: string;
  buyerPhone: string;
  buyerCity: string;
  paymentMethodId: string;
  paymentProofUrl: string;
  couponCode?: string;
  regionCode?: string;
  ackNotice?: boolean;
  items: CheckoutItemPayload[];
}

async function getOrCreateGuestUser(email: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({ data: { email, role: "CUSTOMER" } });
}

export async function POST(req: Request) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  let body: CheckoutPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const {
    email: rawEmail,
    buyerName: rawBuyerName,
    buyerPhone: rawBuyerPhone,
    buyerCity: rawBuyerCity,
    paymentMethodId: rawPaymentMethodId,
    paymentProofUrl: rawPaymentProofUrl,
    couponCode: rawCouponCode,
    regionCode,
    ackNotice,
    items,
  } = body;

  const email = (rawEmail || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const buyerName = (rawBuyerName || "").trim();
  const buyerPhone = (rawBuyerPhone || "").trim();
  const buyerCity = (rawBuyerCity || "").trim();
  if (!buyerName || !buyerPhone || !buyerCity) {
    return NextResponse.json({ error: "Full name, phone number, and city are required." }, { status: 400 });
  }

  const paymentMethodId = (rawPaymentMethodId || "").trim();
  const paymentProofUrl = (rawPaymentProofUrl || "").trim();
  if (!paymentMethodId) {
    return NextResponse.json({ error: "paymentMethodId is required." }, { status: 400 });
  }
  if (!paymentProofUrl) {
    return NextResponse.json({ error: "paymentProofUrl is required." }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items array cannot be empty." }, { status: 400 });
  }

  const ip = await getRequestIp();

  if (await isIpBlocked(ip)) {
    await logCustomerEvent({ email, ip, type: "checkout_throttled", detail: "blocked IP" });
    return NextResponse.json({ error: BLOCKED_MESSAGE }, { status: 403 });
  }

  // Region resolution
  const activeRegions = await getAllActiveRegions();
  if (activeRegions.length === 0) {
    return NextResponse.json({ error: "No active region configured." }, { status: 500 });
  }
  const region = (regionCode ? activeRegions.find((r) => r.code === regionCode) : null) ?? activeRegions[0];

  // Verify payment method
  const paymentMethod = await prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } });
  if (!paymentMethod || !paymentMethod.active) {
    return NextResponse.json({ error: "Payment method is invalid or inactive." }, { status: 400 });
  }

  // Fetch variants & validate
  const variantIds = items.map((i) => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds }, active: true },
    include: { product: { include: { customFields: true } } },
  });

  if (variants.length !== new Set(variantIds).size) {
    return NextResponse.json({ error: "One or more variant IDs are invalid or inactive." }, { status: 400 });
  }

  // Validate notice acknowledgement if required
  const needsAck = variants.some((v) => v.product.requiresNoticeAck);
  if (needsAck && !ackNotice) {
    return NextResponse.json(
      { error: "Product requires acknowledgement of buyerNotice. Please pass 'ackNotice: true'." },
      { status: 400 }
    );
  }

  // Validate custom fields
  for (const item of items) {
    if (!item.quantity || item.quantity < 1) {
      return NextResponse.json({ error: `Invalid quantity for variant ${item.variantId}` }, { status: 400 });
    }
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant) continue;
    for (const field of variant.product.customFields) {
      if (field.required && !item.customFieldValues?.[field.fieldKey]) {
        return NextResponse.json(
          { error: `"${field.label}" (${field.fieldKey}) is required for ${variant.product.title}.` },
          { status: 400 }
        );
      }
    }
  }

  // Discounts
  const couponCode = (rawCouponCode || "").trim() || null;
  const [activeDiscounts, collectionIdsMap] = await Promise.all([
    getActiveDiscounts(),
    buildCollectionIdsMap(variants.map((v) => v.productId)),
  ]);

  if (couponCode) {
    const badTries = await countRecentEvents({ types: ["coupon_failed"], minutes: 15, ip, email });
    if (badTries >= 8) {
      await logCustomerEvent({ email, ip, type: "checkout_throttled", detail: "coupon guessing" });
      return NextResponse.json(
        { error: "Too many invalid coupon attempts. Please wait a few minutes." },
        { status: 429 }
      );
    }
    const codeExists = activeDiscounts.some((d) => d.code?.toUpperCase() === couponCode.toUpperCase());
    if (!codeExists) {
      await logCustomerEvent({ email, ip, type: "coupon_failed", detail: couponCode.slice(0, 32) });
      return NextResponse.json({ error: `Coupon "${couponCode}" is invalid or expired.` }, { status: 400 });
    }
    await logCustomerEvent({ email, ip, type: "coupon_used", detail: couponCode.slice(0, 32) });
  }

  const lineDiscounts = new Map<string, { amount: number; name: string } | null>();
  for (const item of items) {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant) continue;
    const match = pickBestDiscount(activeDiscounts, {
      productId: variant.productId,
      categoryId: variant.product.categoryId,
      collectionIds: collectionIdsMap.get(variant.productId) ?? [],
      price: variant.price,
      code: couponCode,
      variantId: variant.id,
      platform: variant.platform,
      activationRegionId: variant.activationRegionId,
    });
    lineDiscounts.set(item.variantId, match ? { amount: match.amount, name: match.discount.name } : null);
  }

  const total = roundMoney(
    items.reduce((sum, item) => {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant) return sum;
      const discount = lineDiscounts.get(item.variantId);
      const unit = roundMoney(Math.max(0, variant.price - (discount?.amount ?? 0)));
      return sum + roundMoney(unit * item.quantity);
    }, 0)
  );

  const user = await getOrCreateGuestUser(email);
  if (user.bannedAt) {
    await logCustomerEvent({ userId: user.id, email, ip, type: "checkout_throttled", detail: "suspended account" });
    return NextResponse.json({ error: BLOCKED_MESSAGE }, { status: 403 });
  }

  // Create order transaction
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

    for (const item of items) {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant) continue;
      const discount = lineDiscounts.get(item.variantId);

      await tx.orderItem.create({
        data: {
          orderId: created.id,
          variantId: variant.id,
          quantity: item.quantity,
          unitPrice: roundMoney(variant.price),
          discountAmount: roundMoney((discount?.amount ?? 0) * item.quantity),
          discountName: discount?.name ?? null,
          customFieldValues: item.customFieldValues ? toJson(item.customFieldValues) : null,
        },
      });
    }

    return created;
  });

  await logCustomerEvent({ userId: user.id, email, ip, type: "order_placed", detail: `Order:${order.id}` });

  return NextResponse.json({
    success: true,
    data: {
      id: order.id,
      status: order.status,
      total: order.total,
      currency: order.currency,
      buyerName: order.buyerName,
      email: user.email,
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        label: paymentMethod.label,
        handle: paymentMethod.handle,
      },
      createdAt: order.createdAt,
    },
  });
}
