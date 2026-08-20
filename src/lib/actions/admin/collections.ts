"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { logAudit } from "@/lib/actions/admin/audit";

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function fieldsFrom(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const scheduleStart = String(formData.get("scheduleStart") ?? "");
  const scheduleEnd = String(formData.get("scheduleEnd") ?? "");
  return {
    name,
    slug: slugify(slugRaw || name),
    type: String(formData.get("type") ?? "MANUAL"),
    iconUrl: String(formData.get("iconUrl") ?? "") || null,
    bannerUrl: String(formData.get("bannerUrl") ?? "") || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0),
    active: formData.get("active") === "on",
    scheduleStart: scheduleStart ? new Date(scheduleStart) : null,
    scheduleEnd: scheduleEnd ? new Date(scheduleEnd) : null,
  };
}

export async function createCollectionAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const data = fieldsFrom(formData);
  if (!data.name) throw new Error("Name is required.");

  const created = await prisma.collection.create({ data });
  await logAudit(session.userId, "collection.create", `Collection:${created.id}`, null, created);

  revalidatePath("/admin/collections");
  revalidatePath("/");
  redirect("/admin/collections");
}

export async function updateCollectionAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing collection id.");

  const before = await prisma.collection.findUnique({ where: { id } });
  const updated = await prisma.collection.update({ where: { id }, data: fieldsFrom(formData) });
  await logAudit(session.userId, "collection.update", `Collection:${id}`, before, updated);

  revalidatePath("/admin/collections");
  revalidatePath("/");
  redirect("/admin/collections");
}

export async function deleteCollectionAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing collection id.");

  const before = await prisma.collection.findUnique({ where: { id } });
  await prisma.collection.delete({ where: { id } });
  await logAudit(session.userId, "collection.delete", `Collection:${id}`, before, null);

  revalidatePath("/admin/collections");
  revalidatePath("/");
}

export async function addProductToCollectionAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const collectionId = String(formData.get("collectionId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  if (!collectionId || !productId) throw new Error("Missing collection or product id.");

  const created = await prisma.collectionProduct.upsert({
    where: { collectionId_productId: { collectionId, productId } },
    update: {},
    create: { collectionId, productId },
  });
  await logAudit(session.userId, "collection.add_product", `Collection:${collectionId}`, null, created);

  revalidatePath(`/admin/collections/${collectionId}`);
  revalidatePath("/");
}

export async function removeProductFromCollectionAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const collectionId = String(formData.get("collectionId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  if (!collectionId || !productId) throw new Error("Missing collection or product id.");

  await prisma.collectionProduct.delete({
    where: { collectionId_productId: { collectionId, productId } },
  });
  await logAudit(session.userId, "collection.remove_product", `Collection:${collectionId}`, { productId }, null);

  revalidatePath(`/admin/collections/${collectionId}`);
  revalidatePath("/");
}
