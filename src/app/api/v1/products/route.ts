import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";
import { parseJson } from "@/lib/json";

export async function GET(req: Request) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim();
  const categorySlug = url.searchParams.get("category")?.trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10), 1), 100);

  try {
    const products = await prisma.product.findMany({
      where: {
        active: true,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      take: limit,
      orderBy: { popularityScore: "desc" },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        customFields: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            fieldKey: true,
            label: true,
            type: true,
            required: true,
            options: true,
          },
        },
        variants: {
          where: { active: true },
          select: {
            id: true,
            sku: true,
            price: true,
            currency: true,
            platform: true,
            edition: true,
            durationLabel: true,
            saleMode: true,
            deliveryMethod: true,
            stockMode: true,
            stockQty: true,
            regionLockType: true,
            activationRegion: {
              select: { id: true, name: true, kind: true, code: true },
            },
          },
        },
      },
    });

    const formatted = products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      type: p.type,
      category: p.category,
      coverUrl: p.coverUrl,
      requiresNoticeAck: p.requiresNoticeAck,
      buyerNotice: p.buyerNotice,
      customFields: p.customFields.map((f) => ({
        ...f,
        options: parseJson<string[]>(f.options, []),
      })),
      variants: p.variants,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    console.error("[api/v1/products] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
