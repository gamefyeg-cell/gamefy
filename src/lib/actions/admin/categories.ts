"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { logAudit } from "@/lib/actions/admin/audit";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function fieldsFrom(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  return {
    name,
    slug: slugify(slugRaw || name),
    parentId: String(formData.get("parentId") ?? "") || null,
    icon: String(formData.get("icon") ?? "") || null,
    bannerUrl: String(formData.get("bannerUrl") ?? "") || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0),
    visible: formData.get("visible") === "on",
    defaultBuyerNotice: String(formData.get("defaultBuyerNotice") ?? "") || null,
  };
}

export async function createCategoryAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const data = fieldsFrom(formData);
  if (!data.name) throw new Error("Name is required.");

  const created = await prisma.category.create({ data });
  await logAudit(session.userId, "category.create", `Category:${created.id}`, null, created);

  revalidatePath("/admin/categories");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function updateCategoryAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing category id.");

  const before = await prisma.category.findUnique({ where: { id } });
  const data = fieldsFrom(formData);
  const updated = await prisma.category.update({ where: { id }, data });
  await logAudit(session.userId, "category.update", `Category:${id}`, before, updated);

  revalidatePath("/admin/categories");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing category id.");

  const before = await prisma.category.findUnique({ where: { id } });
  await prisma.category.delete({ where: { id } });
  await logAudit(session.userId, "category.delete", `Category:${id}`, before, null);

  revalidatePath("/admin/categories");
  revalidatePath("/");
}
