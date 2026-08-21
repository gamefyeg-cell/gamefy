"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { logAudit } from "@/lib/actions/admin/audit";

function fieldsFrom(formData: FormData) {
  const scope = String(formData.get("scope") ?? "ALL");
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  return {
    name: String(formData.get("name") ?? "").trim(),
    code: code || null,
    type: String(formData.get("type") ?? "PERCENT"),
    value: Number(formData.get("value") ?? 0),
    scope,
    scopeId: scope === "ALL" ? null : String(formData.get("scopeId") ?? "") || null,
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    active: formData.get("active") === "on",
  };
}

export async function createDiscountAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const data = fieldsFrom(formData);
  if (!data.name) throw new Error("Name is required.");
  if (data.scope !== "ALL" && !data.scopeId) throw new Error("Pick what this discount applies to.");
  if (data.value <= 0) throw new Error("Discount value must be greater than 0.");

  const created = await prisma.discount.create({ data });
  await logAudit(session.userId, "discount.create", `Discount:${created.id}`, null, created);

  revalidatePath("/admin/discounts");
  revalidatePath("/");
  redirect("/admin/discounts");
}

export async function updateDiscountAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing discount id.");

  const before = await prisma.discount.findUnique({ where: { id } });
  const updated = await prisma.discount.update({ where: { id }, data: fieldsFrom(formData) });
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
