import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function uniqueSku(candidate: string, excludeId?: string): Promise<string> {
  const existing = await prisma.productVariant.findUnique({ where: { sku: candidate } });
  if (!existing || existing.id === excludeId) return candidate;
  return `${candidate}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const { id: productId } = await context.params;

  const product = await prisma.product.findFirst({
    where: { OR: [{ id: productId }, { slug: productId }] },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const {
    sku: rawSku,
    price = 0,
    cost = null,
    currency = "EGP",
    platform = null,
    edition = null,
    durationLabel = null,
    saleMode = "KEY",
    deliveryMethod = "AUTO_KEY",
    stockMode = "MANUAL",
    stockQty = null,
    outOfStockMessage = null,
    regionLockType = "NONE",
    activationRegionId = null,
    warrantyDays = null,
    accountAccessLevel = null,
    accountDeliveryNote = null,
    activationInstructions = null,
    redemptionInstructions = null,
    active = true,
  } = body;

  const skuBase = rawSku ? slugify(rawSku) : `${product.slug}-${platform ? slugify(platform) : "variant"}`;
  const sku = await uniqueSku(skuBase);

  try {
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku,
        price: Number(price) || 0,
        cost: cost !== null ? Number(cost) : null,
        currency,
        platform,
        edition,
        durationLabel,
        saleMode,
        deliveryMethod,
        stockMode,
        stockQty: stockQty !== null ? Number(stockQty) : null,
        outOfStockMessage,
        regionLockType,
        activationRegionId,
        warrantyDays: warrantyDays !== null ? Number(warrantyDays) : null,
        accountAccessLevel,
        accountDeliveryNote,
        activationInstructions,
        redemptionInstructions,
        active: Boolean(active),
      },
      include: {
        activationRegion: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: variant,
    }, { status: 201 });
  } catch (err) {
    console.error(`[api/v1/products/${productId}/variants POST] Error:`, err);
    return NextResponse.json({ error: "Failed to create variant" }, { status: 500 });
  }
}
