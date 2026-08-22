"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { logAudit } from "@/lib/actions/admin/audit";
import { toJson } from "@/lib/json";
import { encryptSecret } from "@/lib/crypto";

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function csvToJsonArray(raw: string) {
  return toJson(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

/// The ImageUploader component submits a JSON array string of URLs
/// (already uploaded to /uploads or pasted). Falls back to comma-splitting
/// for any caller that still sends a plain string.
function parseImagesField(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return toJson(parsed.filter((u) => typeof u === "string" && u));
  } catch {
    /* not JSON — fall through to CSV */
  }
  return csvToJsonArray(raw);
}

/// Accepts a full YouTube URL in any common shape (watch?v=, youtu.be/,
/// shorts/, or an already-bare embed URL) and normalizes it down to the
/// video id, or null if the field was empty / not recognizably YouTube.
/// Stored as just the id so the storefront can build a clean embed URL
/// itself rather than trusting an admin-pasted iframe/query string.
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
  // Bare 11-char id pasted directly.
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

function productFieldsFrom(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  return {
    categoryId: String(formData.get("categoryId") ?? ""),
    type: String(formData.get("type") ?? "GAME"),
    title,
    slug: slugify(slugRaw || title),
    description: String(formData.get("description") ?? "") || null,
    buyerNotice: String(formData.get("buyerNotice") ?? "") || null,
    requiresNoticeAck: formData.get("requiresNoticeAck") === "on",
    publisher: String(formData.get("publisher") ?? "") || null,
    platform: String(formData.get("platform") ?? "") || null,
    tags: csvToJsonArray(String(formData.get("tags") ?? "")),
    images: parseImagesField(String(formData.get("images") ?? "[]")),
    videoUrl: parseYoutubeId(String(formData.get("videoUrl") ?? "")),
    seoTitle: String(formData.get("seoTitle") ?? "") || null,
    seoDescription: String(formData.get("seoDescription") ?? "") || null,
    active: formData.get("active") === "on",
  };
}

export async function createProductAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const data = productFieldsFrom(formData);
  if (!data.title || !data.categoryId) throw new Error("Title and category are required.");

  // Optional "quick variant" — lets the admin set price/stock/region right
  // on the Add Product form instead of a mandatory second step. Skipped
  // entirely if no price was entered; more variants (e.g. Key vs Account)
  // can always be added afterward from the product page.
  const priceRaw = String(formData.get("price") ?? "").trim();
  const wantsQuickVariant = priceRaw !== "";

  const created = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data });

    if (wantsQuickVariant) {
      const stockQtyRaw = String(formData.get("stockQty") ?? "");
      let sku = `${data.slug}-default`;
      // SKUs are unique — fall back to a short random suffix on collision.
      if (await tx.productVariant.findUnique({ where: { sku } })) {
        sku = `${data.slug}-${Math.random().toString(36).slice(2, 7)}`;
      }
      await tx.productVariant.create({
        data: {
          productId: product.id,
          sku,
          price: Number(priceRaw) || 0,
          currency: String(formData.get("currency") ?? "EGP"),
          durationLabel: String(formData.get("durationLabel") ?? "").trim() || null,
          saleMode: String(formData.get("saleMode") ?? "KEY"),
          deliveryMethod: String(formData.get("deliveryMethod") ?? "AUTO_KEY"),
          stockMode: String(formData.get("stockMode") ?? "MANUAL"),
          stockQty: stockQtyRaw ? Number(stockQtyRaw) : null,
          outOfStockMessage: String(formData.get("outOfStockMessage") ?? "") || null,
          activationRegionId: String(formData.get("activationRegionId") ?? "") || null,
          active: true,
        },
      });
    }

    return product;
  });

  await logAudit(session.userId, "product.create", `Product:${created.id}`, null, {
    ...created,
    quickVariantCreated: wantsQuickVariant,
  });

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect(`/admin/products/${created.id}`);
}

export async function updateProductAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing product id.");

  const before = await prisma.product.findUnique({ where: { id } });
  const updated = await prisma.product.update({ where: { id }, data: productFieldsFrom(formData) });
  await logAudit(session.userId, "product.update", `Product:${id}`, before, updated);

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/");
  redirect(`/admin/products/${id}`);
}

export async function deleteProductAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing product id.");

  const before = await prisma.product.findUnique({ where: { id } });
  await prisma.product.delete({ where: { id } });
  await logAudit(session.userId, "product.delete", `Product:${id}`, before, null);

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}

// --- Variants -----------------------------------------------------------

function variantFieldsFrom(formData: FormData) {
  const stockQtyRaw = String(formData.get("stockQty") ?? "");
  const warrantyRaw = String(formData.get("warrantyDays") ?? "");
  return {
    productId: String(formData.get("productId") ?? ""),
    regionId: String(formData.get("regionId") ?? "") || null,
    activationRegionId: String(formData.get("activationRegionId") ?? "") || null,
    platform: String(formData.get("platform") ?? "") || null,
    edition: String(formData.get("edition") ?? "") || null,
    durationLabel: String(formData.get("durationLabel") ?? "").trim() || null,
    sku: String(formData.get("sku") ?? "").trim(),
    price: Number(formData.get("price") ?? 0),
    cost: formData.get("cost") ? Number(formData.get("cost")) : null,
    currency: String(formData.get("currency") ?? "EGP"),
    saleMode: String(formData.get("saleMode") ?? "KEY"),
    deliveryMethod: String(formData.get("deliveryMethod") ?? "AUTO_KEY"),
    stockMode: String(formData.get("stockMode") ?? "MANUAL"),
    stockQty: stockQtyRaw ? Number(stockQtyRaw) : null,
    outOfStockMessage: String(formData.get("outOfStockMessage") ?? "") || null,
    regionLockType: String(formData.get("regionLockType") ?? "NONE"),
    activationInstructions: String(formData.get("activationInstructions") ?? "") || null,
    redemptionInstructions: String(formData.get("redemptionInstructions") ?? "") || null,
    warrantyDays: warrantyRaw ? Number(warrantyRaw) : null,
    accountAccessLevel: String(formData.get("accountAccessLevel") ?? "") || null,
    accountDeliveryNote: String(formData.get("accountDeliveryNote") ?? "") || null,
    active: formData.get("active") === "on",
  };
}

export async function createVariantAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const data = variantFieldsFrom(formData);
  if (!data.productId || !data.sku) throw new Error("Product and SKU are required.");

  const created = await prisma.productVariant.create({ data });
  await logAudit(session.userId, "variant.create", `ProductVariant:${created.id}`, null, created);

  revalidatePath(`/admin/products/${data.productId}`);
  revalidatePath("/");
  redirect(`/admin/products/${data.productId}`);
}

export async function updateVariantAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing variant id.");

  const before = await prisma.productVariant.findUnique({ where: { id } });
  const data = variantFieldsFrom(formData);
  const updated = await prisma.productVariant.update({ where: { id }, data });
  await logAudit(session.userId, "variant.update", `ProductVariant:${id}`, before, updated);

  revalidatePath(`/admin/products/${data.productId}`);
  revalidatePath("/");
  redirect(`/admin/products/${data.productId}`);
}

export async function deleteVariantAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  const productId = String(formData.get("productId") ?? "");
  if (!id) throw new Error("Missing variant id.");

  const before = await prisma.productVariant.findUnique({ where: { id } });
  await prisma.productVariant.delete({ where: { id } });
  await logAudit(session.userId, "variant.delete", `ProductVariant:${id}`, before, null);

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/");
}

// --- Custom fields --------------------------------------------------------

export async function createCustomFieldAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const productId = String(formData.get("productId") ?? "");
  const fieldKey = String(formData.get("fieldKey") ?? "").trim();
  if (!productId || !fieldKey) throw new Error("Product and field key are required.");

  const created = await prisma.customField.create({
    data: {
      productId,
      fieldKey,
      label: String(formData.get("label") ?? fieldKey),
      type: String(formData.get("type") ?? "TEXT"),
      required: formData.get("required") === "on",
      options: csvToJsonArray(String(formData.get("options") ?? "")),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
    },
  });
  await logAudit(session.userId, "custom_field.create", `CustomField:${created.id}`, null, created);

  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}`);
}

export async function deleteCustomFieldAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  const productId = String(formData.get("productId") ?? "");
  if (!id) throw new Error("Missing custom field id.");

  const before = await prisma.customField.findUnique({ where: { id } });
  await prisma.customField.delete({ where: { id } });
  await logAudit(session.userId, "custom_field.delete", `CustomField:${id}`, before, null);

  revalidatePath(`/admin/products/${productId}`);
}

// --- Key/credential stock ---------------------------------------------------

export async function addKeyStockAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const variantId = String(formData.get("variantId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const codesRaw = String(formData.get("codes") ?? "");
  if (!variantId) throw new Error("Missing variant id.");

  const lines = codesRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) throw new Error("Enter at least one code/credential line.");

  await prisma.keyStockItem.createMany({
    data: lines.map((line) => ({ variantId, codeEncrypted: encryptSecret(line) })),
  });
  await logAudit(session.userId, "key_stock.add", `ProductVariant:${variantId}`, null, { count: lines.length });

  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}`);
}
