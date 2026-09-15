"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { logAudit } from "@/lib/actions/admin/audit";
import { ensureDiscountSchema } from "@/lib/discounts";

function fieldsFrom(formData: FormData) {
  const scope = String(formData.get("scope") ?? "ALL");
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const variantId = String(formData.get("variantId") ?? "").trim() || null;
  const platform = String(formData.get("platform") ?? "").trim() || null;
  const activationRegionId = String(formData.get("activationRegionId") ?? "").trim() || null;

  return {
    name: String(formData.get("name") ?? "").trim(),
    code: code || null,
    type: String(formData.get("type") ?? "PERCENT"),
    value: Number(formData.get("value") ?? 0),
    scope,
    scopeId: scope === "ALL" ? null : String(formData.get("scopeId") ?? "") || null,
    variantId: scope === "PRODUCT" ? variantId : null,
    platform: scope === "PRODUCT" ? platform : null,
    activationRegionId: scope === "PRODUCT" ? activationRegionId : null,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    active: formData.get("active") === "on",
  };
}

export async function createDiscountAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  await ensureDiscountSchema();
  const data = fieldsFrom(formData);
  if (!data.name) throw new Error("Name is required.");
  if (data.scope !== "ALL" && !data.scopeId) throw new Error("Pick what this discount applies to.");
  if (data.value <= 0) throw new Error("Discount value must be greater than 0.");

  let created;
  try {
    created = await prisma.discount.create({ data });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error?.code === "P2022" || String(error?.message).includes("variantId")) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "variantId" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "platform" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "activationRegionId" TEXT`);
        created = await prisma.discount.create({ data });
      } catch {
        const rawId = `disc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await prisma.$executeRawUnsafe(
          `INSERT INTO "discounts" ("id", "name", "code", "type", "value", "scope", "scopeId", "startsAt", "endsAt", "active", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
          rawId,
          data.name,
          data.code,
          data.type,
          data.value,
          data.scope,
          data.scopeId,
          data.startsAt,
          data.endsAt,
          data.active
        );
        created = { id: rawId, ...data };
      }
    } else {
      throw err;
    }
  }

  await logAudit(session.userId, "discount.create", `Discount:${created.id}`, null, created);

  revalidatePath("/admin/discounts");
  revalidatePath("/");
  redirect("/admin/discounts");
}

export async function updateDiscountAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  await ensureDiscountSchema();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing discount id.");

  const before = await prisma.discount.findUnique({ where: { id } }).catch(() => null);
  const data = fieldsFrom(formData);
  let updated;
  try {
    updated = await prisma.discount.update({ where: { id }, data });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error?.code === "P2022" || String(error?.message).includes("variantId")) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "variantId" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "platform" TEXT`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "discounts" ADD COLUMN IF NOT EXISTS "activationRegionId" TEXT`);
        updated = await prisma.discount.update({ where: { id }, data });
      } catch {
        await prisma.$executeRawUnsafe(
          `UPDATE "discounts"
           SET "name" = $1, "code" = $2, "type" = $3, "value" = $4, "scope" = $5, "scopeId" = $6,
               "startsAt" = $7, "endsAt" = $8, "active" = $9, "updatedAt" = NOW()
           WHERE "id" = $10`,
          data.name,
          data.code,
          data.type,
          data.value,
          data.scope,
          data.scopeId,
          data.startsAt,
          data.endsAt,
          data.active,
          id
        );
        updated = { id, ...data };
      }
    } else {
      throw err;
    }
  }
  await logAudit(session.userId, "discount.update", `Discount:${id}`, before, updated);

  revalidatePath("/admin/discounts");
  revalidatePath("/");
  redirect("/admin/discounts");
}

export async function deleteDiscountAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing discount id.");

  const before = await prisma.discount.findUnique({ where: { id } });
  await prisma.discount.delete({ where: { id } });
  await logAudit(session.userId, "discount.delete", `Discount:${id}`, before, null);

  revalidatePath("/admin/discounts");
  revalidatePath("/");
}
