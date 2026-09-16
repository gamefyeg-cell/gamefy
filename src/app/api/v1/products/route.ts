import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";
import { parseJson, toJson } from "@/lib/json";
import { PRODUCT_TYPES, labelFor } from "@/lib/enums";

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function uniqueSku(candidate: string, excludeId?: string): Promise<string> {
  const existing = await prisma.productVariant.findUnique({ where: { sku: candidate } });
  if (!existing || existing.id === excludeId) return candidate;
  return `${candidate}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseYoutubeId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) return m[1];
  }
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

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
          select: {
            id: true,
            sku: true,
            price: true,
            cost: true,
            currency: true,
            platform: true,
            edition: true,
            durationLabel: true,
            saleMode: true,
            deliveryMethod: true,
            stockMode: true,
            stockQty: true,
            regionLockType: true,
            active: true,
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
      active: p.active,
      category: p.category,
      coverUrl: p.coverUrl,
      images: parseJson<string[]>(p.images, []),
      videoUrl: p.videoUrl,
      description: p.description,
      publisher: p.publisher,
      platform: p.platform,
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

export async function POST(req: Request) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const {
    title: rawTitle,
    categoryId,
    type = "GAME",
    slug: rawSlug,
    description = null,
    buyerNotice = null,
    requiresNoticeAck = false,
    publisher = null,
    platform = null,
    coverUrl = null,
    images = [],
    videoUrl: rawVideoUrl = null,
    active = true,
    variants = [],
    customFields = [],
  } = body;

  const title = (rawTitle || "").trim();
  if (!title) {
    return NextResponse.json({ error: "Product title is required." }, { status: 400 });
  }
  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required." }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  const baseSlug = slugify(rawSlug || title);
  let slug = baseSlug;
  const existingSlug = await prisma.product.findUnique({ where: { slug } });
  if (existingSlug) {
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const videoUrl = rawVideoUrl ? parseYoutubeId(rawVideoUrl) : null;
  const imagesJson = Array.isArray(images) ? toJson(images) : toJson([]);

  const words = title.toLowerCase().split(/[^a-z0-9]+/).filter((w: string) => w.length > 2);
  const tagsSet = new Set<string>([type.toLowerCase(), ...words]);
  if (publisher) tagsSet.add(publisher.toLowerCase());
  const tags = toJson(Array.from(tagsSet).slice(0, 10));

  const seoTitle = publisher ? `${title} by ${publisher} — Gamefy` : `${title} — Gamefy`;
  const seoDescription = description
    ? description.slice(0, 157).trimEnd()
    : `Buy ${title} instantly on Gamefy — verified ${labelFor(PRODUCT_TYPES, type).toLowerCase()}, delivered fast, paid your way.`;

  try {
    const product = await prisma.product.create({
      data: {
        title,
        slug,
        categoryId,
        type,
        description,
        buyerNotice,
        requiresNoticeAck: Boolean(requiresNoticeAck),
        publisher,
        platform,
        coverUrl,
        images: imagesJson,
        videoUrl,
        tags,
        seoTitle,
        seoDescription,
        active: Boolean(active),
      },
    });

    // Create optional variants
    if (Array.isArray(variants) && variants.length > 0) {
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const skuBase = v.sku ? slugify(v.sku) : `${slug}-${v.platform ? slugify(v.platform) : `opt${i + 1}`}`;
        const sku = await uniqueSku(skuBase);

        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku,
            price: Number(v.price) || 0,
            cost: v.cost ? Number(v.cost) : null,
            currency: v.currency || "EGP",
            platform: v.platform || null,
            edition: v.edition || null,
            durationLabel: v.durationLabel || null,
            saleMode: v.saleMode || "KEY",
            deliveryMethod: v.deliveryMethod || "AUTO_KEY",
            stockMode: v.stockMode || "MANUAL",
            stockQty: v.stockQty !== undefined && v.stockQty !== null ? Number(v.stockQty) : null,
            outOfStockMessage: v.outOfStockMessage || null,
            regionLockType: v.regionLockType || "NONE",
            activationRegionId: v.activationRegionId || null,
            warrantyDays: v.warrantyDays ? Number(v.warrantyDays) : null,
            accountAccessLevel: v.accountAccessLevel || null,
            accountDeliveryNote: v.accountDeliveryNote || null,
            activationInstructions: v.activationInstructions || null,
            redemptionInstructions: v.redemptionInstructions || null,
            active: v.active !== false,
          },
        });
      }
    }

    // Create optional custom fields
    if (Array.isArray(customFields) && customFields.length > 0) {
      for (let i = 0; i < customFields.length; i++) {
        const f = customFields[i];
        const fieldKey = slugify(f.fieldKey || f.label || `field_${i + 1}`).replace(/-/g, "_");
        await prisma.customField.create({
          data: {
            productId: product.id,
            fieldKey,
            label: f.label || fieldKey,
            type: f.type || "TEXT",
            required: f.required !== false,
            options: Array.isArray(f.options) ? toJson(f.options) : toJson([]),
            sortOrder: Number(f.sortOrder) || i,
          },
        });
      }
    }

    const fullProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        variants: true,
        customFields: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: fullProduct,
    }, { status: 201 });
  } catch (err) {
    console.error("[api/v1/products POST] Error:", err);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
