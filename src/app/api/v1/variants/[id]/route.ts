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

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const { id } = await context.params;

  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: true,
        activationRegion: true,
      },
    });

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: variant });
  } catch (err) {
    console.error(`[api/v1/variants/${id} GET] Error:`, err);
    return NextResponse.json({ error: "Failed to fetch variant" }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  return handleUpdate(req, context);
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  return handleUpdate(req, context);
}

async function handleUpdate(req: Request, context: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const { id } = await context.params;

  const existing = await prisma.productVariant.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const updateData: any = {};

  if (body.price !== undefined) updateData.price = Number(body.price) || 0;
  if (body.cost !== undefined) updateData.cost = body.cost !== null ? Number(body.cost) : null;
  if (body.currency !== undefined) updateData.currency = body.currency;
  if (body.platform !== undefined) updateData.platform = body.platform;
  if (body.edition !== undefined) updateData.edition = body.edition;
  if (body.durationLabel !== undefined) updateData.durationLabel = body.durationLabel;
  if (body.saleMode !== undefined) updateData.saleMode = body.saleMode;
  if (body.deliveryMethod !== undefined) updateData.deliveryMethod = body.deliveryMethod;
  if (body.stockMode !== undefined) updateData.stockMode = body.stockMode;
  if (body.stockQty !== undefined) updateData.stockQty = body.stockQty !== null ? Number(body.stockQty) : null;
  if (body.outOfStockMessage !== undefined) updateData.outOfStockMessage = body.outOfStockMessage;
  if (body.regionLockType !== undefined) updateData.regionLockType = body.regionLockType;
  if (body.activationRegionId !== undefined) updateData.activationRegionId = body.activationRegionId;
  if (body.warrantyDays !== undefined) updateData.warrantyDays = body.warrantyDays !== null ? Number(body.warrantyDays) : null;
  if (body.accountAccessLevel !== undefined) updateData.accountAccessLevel = body.accountAccessLevel;
  if (body.accountDeliveryNote !== undefined) updateData.accountDeliveryNote = body.accountDeliveryNote;
  if (body.activationInstructions !== undefined) updateData.activationInstructions = body.activationInstructions;
  if (body.redemptionInstructions !== undefined) updateData.redemptionInstructions = body.redemptionInstructions;
  if (body.active !== undefined) updateData.active = Boolean(body.active);

  if (body.sku !== undefined) {
    const rawSku = slugify(body.sku);
    updateData.sku = await uniqueSku(rawSku, existing.id);
  }

  try {
    const updated = await prisma.productVariant.update({
      where: { id },
      data: updateData,
      include: {
        activationRegion: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(`[api/v1/variants/${id} UPDATE] Error:`, err);
    return NextResponse.json({ error: "Failed to update variant" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const { id } = await context.params;

  const existing = await prisma.productVariant.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  }

  try {
    await prisma.productVariant.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Variant '${existing.sku}' (${existing.id}) deleted successfully.`,
    });
  } catch (err) {
    console.error(`[api/v1/variants/${id} DELETE] Error:`, err);
    return NextResponse.json({ error: "Failed to delete variant" }, { status: 500 });
  }
}
