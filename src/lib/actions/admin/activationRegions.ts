"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { logAudit } from "@/lib/actions/admin/audit";

function fieldsFrom(formData: FormData) {
  const kind = String(formData.get("kind") ?? "ZONE");
  return {
    name: String(formData.get("name") ?? "").trim(),
    kind,
    code: kind === "COUNTRY" ? String(formData.get("code") ?? "").trim().toUpperCase() || null : null,
    zoneId: kind === "COUNTRY" ? String(formData.get("zoneId") ?? "") || null : null,
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };
}

export async function createActivationRegionAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const data = fieldsFrom(formData);
  if (!data.name) throw new Error("Name is required.");
  if (data.kind === "COUNTRY" && !data.zoneId) throw new Error("A country needs a parent zone.");
  if (data.kind === "GLOBAL") {
    const existingGlobal = await prisma.activationRegion.findFirst({ where: { kind: "GLOBAL" } });
    if (existingGlobal) throw new Error("A Global activation region already exists.");
  }

  const created = await prisma.activationRegion.create({ data });
  await logAudit(session.userId, "activation_region.create", `ActivationRegion:${created.id}`, null, created);

  revalidatePath("/admin/activation-regions");
  redirect("/admin/activation-regions");
}

export async function updateActivationRegionAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id.");

  const before = await prisma.activationRegion.findUnique({ where: { id } });
  const data = fieldsFrom(formData);
  if (data.kind === "COUNTRY" && data.zoneId === id) throw new Error("A zone can't be its own parent.");

  const updated = await prisma.activationRegion.update({ where: { id }, data });
  await logAudit(session.userId, "activation_region.update", `ActivationRegion:${id}`, before, updated);

  revalidatePath("/admin/activation-regions");
  redirect("/admin/activation-regions");
}

export async function deleteActivationRegionAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id.");

  const before = await prisma.activationRegion.findUnique({ where: { id } });
  await prisma.activationRegion.delete({ where: { id } });
  await logAudit(session.userId, "activation_region.delete", `ActivationRegion:${id}`, before, null);

  revalidatePath("/admin/activation-regions");
}
