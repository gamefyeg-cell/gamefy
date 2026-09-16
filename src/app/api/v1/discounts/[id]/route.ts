import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";
import { ensureDiscountSchema } from "@/lib/discounts";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  await ensureDiscountSchema();

  const { id } = await context.params;

  try {
    const discount = await prisma.discount.findFirst({
      where: { OR: [{ id }, { code: id.toUpperCase() }] },
    });

    if (!discount) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: discount,
    });
  } catch (err) {
    console.error(`[api/v1/discounts/${id} GET] Error:`, err);
    return NextResponse.json({ error: "Failed to fetch discount" }, { status: 500 });
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

  await ensureDiscountSchema();

  const { id } = await context.params;

  const existing = await prisma.discount.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Discount not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const updateData: any = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Discount name cannot be empty." }, { status: 400 });
    updateData.name = name;
  }

  if (body.value !== undefined) {
    const val = Number(body.value);
    if (isNaN(val) || val <= 0) return NextResponse.json({ error: "Discount value must be greater than 0." }, { status: 400 });
    updateData.value = val;
  }

  if (body.type !== undefined) updateData.type = body.type === "FLAT" ? "FLAT" : "PERCENT";
  if (body.scope !== undefined) updateData.scope = body.scope;
  if (body.scopeId !== undefined) updateData.scopeId = body.scopeId;
  if (body.variantId !== undefined) updateData.variantId = body.variantId;
  if (body.platform !== undefined) updateData.platform = body.platform;
  if (body.activationRegionId !== undefined) updateData.activationRegionId = body.activationRegionId;
  if (body.startsAt !== undefined) updateData.startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (body.endsAt !== undefined) updateData.endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (body.active !== undefined) updateData.active = Boolean(body.active);

  if (body.code !== undefined) {
    const code = body.code ? String(body.code).trim().toUpperCase() : null;
    if (code && code !== existing.code) {
      const codeConflict = await prisma.discount.findUnique({ where: { code } });
      if (codeConflict) {
        return NextResponse.json({ error: `Discount with code '${code}' already exists.` }, { status: 409 });
      }
    }
    updateData.code = code;
  }

  try {
    const updated = await prisma.discount.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error(`[api/v1/discounts/${id} UPDATE] Error:`, err);
    return NextResponse.json({ error: "Failed to update discount" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  await ensureDiscountSchema();

  const { id } = await context.params;

  const existing = await prisma.discount.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Discount not found" }, { status: 404 });
  }

  try {
    await prisma.discount.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Discount '${existing.name}' (${existing.id}) deleted successfully.`,
    });
  } catch (err) {
    console.error(`[api/v1/discounts/${id} DELETE] Error:`, err);
    return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 });
  }
}
