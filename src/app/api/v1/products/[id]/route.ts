import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-auth";
import { parseJson, toJson } from "@/lib/json";
import { PRODUCT_TYPES, labelFor } from "@/lib/enums";

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const { id } = await context.params;

  try {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        category: true,
        customFields: { orderBy: { sortOrder: "asc" } },
        variants: {
          include: {
            activationRegion: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        images: parseJson<string[]>(product.images, []),
        tags: parseJson<string[]>(product.tags, []),
        customFields: product.customFields.map((f) => ({
          ...f,
          options: parseJson<string[]>(f.options, []),
        })),
      },
    });
  } catch (err) {
    console.error(`[api/v1/products/${id}] Error:`, err);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
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

  const existing = await prisma.product.findFirst({
    where: { OR: [{ id }, { slug: id }] },
  });

  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const updateData: any = {};

  if (body.title !== undefined) updateData.title = String(body.title).trim();
  if (body.categoryId !== undefined) {
    const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
    if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    updateData.categoryId = body.categoryId;
  }
  if (body.slug !== undefined) {
    const newSlug = slugify(body.slug);
    const slugConflict = await prisma.product.findFirst({
      where: { slug: newSlug, id: { not: existing.id } },
    });
    if (slugConflict) {
      return NextResponse.json({ error: "A product with this slug already exists." }, { status: 409 });
    }
    updateData.slug = newSlug;
  }
  if (body.type !== undefined) updateData.type = body.type;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.buyerNotice !== undefined) updateData.buyerNotice = body.buyerNotice;
  if (body.requiresNoticeAck !== undefined) updateData.requiresNoticeAck = Boolean(body.requiresNoticeAck);
  if (body.publisher !== undefined) updateData.publisher = body.publisher;
  if (body.platform !== undefined) updateData.platform = body.platform;
  if (body.coverUrl !== undefined) updateData.coverUrl = body.coverUrl;
  if (body.images !== undefined) updateData.images = Array.isArray(body.images) ? toJson(body.images) : toJson([]);
  if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl ? parseYoutubeId(body.videoUrl) : null;
  if (body.active !== undefined) updateData.active = Boolean(body.active);

  if (body.title || body.type || body.publisher) {
    const title = updateData.title || existing.title;
    const type = updateData.type || existing.type;
    const publisher = updateData.publisher !== undefined ? updateData.publisher : existing.publisher;

    const words = title.toLowerCase().split(/[^a-z0-9]+/).filter((w: string) => w.length > 2);
    const tagsSet = new Set<string>([type.toLowerCase(), ...words]);
    if (publisher) tagsSet.add(publisher.toLowerCase());
    updateData.tags = toJson(Array.from(tagsSet).slice(0, 10));
    updateData.seoTitle = publisher ? `${title} by ${publisher} — Gamefy` : `${title} — Gamefy`;
  }

  try {
    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        category: true,
        variants: true,
        customFields: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error(`[api/v1/products/${id} UPDATE] Error:`, err);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const authError = validateApiKey(req);
  if (authError) return authError;

  const { id } = await context.params;

  const existing = await prisma.product.findFirst({
    where: { OR: [{ id }, { slug: id }] },
  });

  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  try {
    await prisma.product.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      message: `Product '${existing.title}' (${existing.id}) deleted successfully.`,
    });
  } catch (err) {
    console.error(`[api/v1/products/${id} DELETE] Error:`, err);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
