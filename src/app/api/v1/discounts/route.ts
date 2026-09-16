import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";
import { ensureDiscountSchema } from "@/lib/discounts";

export async function GET(req: Request) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  await ensureDiscountSchema();

  const url = new URL(req.url);
  const activeOnly = url.searchParams.get("active") === "true";
  const code = url.searchParams.get("code")?.trim().toUpperCase();
  const scope = url.searchParams.get("scope")?.trim().toUpperCase();

  try {
    const discounts = await prisma.discount.findMany({
      where: {
        ...(activeOnly ? { active: true } : {}),
        ...(code ? { code } : {}),
        ...(scope ? { scope } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: discounts,
    });
  } catch (err) {
    console.error("[api/v1/discounts GET] Error:", err);
    return NextResponse.json({ error: "Failed to fetch discounts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  await ensureDiscountSchema();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const {
    name: rawName,
    code: rawCode,
    type = "PERCENT",
    value: rawValue,
    scope = "ALL",
    scopeId = null,
    variantId = null,
    platform = null,
    activationRegionId = null,
    startsAt = null,
    endsAt = null,
    active = true,
  } = body;

  const name = (rawName || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Discount name is required." }, { status: 400 });
  }

  const value = Number(rawValue);
  if (isNaN(value) || value <= 0) {
    return NextResponse.json({ error: "Discount value must be greater than 0." }, { status: 400 });
  }

  if (scope !== "ALL" && !scopeId) {
    return NextResponse.json(
      { error: "scopeId is required when scope is CATEGORY, COLLECTION, or PRODUCT." },
      { status: 400 }
    );
  }

  const code = rawCode ? String(rawCode).trim().toUpperCase() : null;
  if (code) {
    const existing = await prisma.discount.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: `Discount with code '${code}' already exists.` }, { status: 409 });
    }
  }

  const data = {
    name,
    code,
    type: type === "FLAT" ? "FLAT" : "PERCENT",
    value,
    scope,
    scopeId: scope === "ALL" ? null : scopeId,
    variantId: scope === "PRODUCT" ? variantId : null,
    platform: scope === "PRODUCT" ? platform : null,
    activationRegionId: scope === "PRODUCT" ? activationRegionId : null,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    active: Boolean(active),
  };

  try {
    const created = await prisma.discount.create({ data });
    return NextResponse.json({
      success: true,
      data: created,
    }, { status: 201 });
  } catch (err) {
    console.error("[api/v1/discounts POST] Error:", err);
    return NextResponse.json({ error: "Failed to create discount" }, { status: 500 });
  }
}
