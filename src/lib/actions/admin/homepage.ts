"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { logAudit } from "@/lib/actions/admin/audit";

function fieldsFrom(formData: FormData) {
  const scheduleStart = String(formData.get("scheduleStart") ?? "");
  const scheduleEnd = String(formData.get("scheduleEnd") ?? "");
  let config = String(formData.get("config") ?? "{}").trim() || "{}";
  try {
    JSON.parse(config);
  } catch {
    throw new Error("Block config must be valid JSON.");
  }
  return {
    type: String(formData.get("type") ?? "CUSTOM_BANNER"),
    config,
    rankingMode: String(formData.get("rankingMode") ?? "") || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0),
    targetRegionId: String(formData.get("targetRegionId") ?? "") || null,
    scheduleStart: scheduleStart ? new Date(scheduleStart) : null,
    scheduleEnd: scheduleEnd ? new Date(scheduleEnd) : null,
    active: formData.get("active") === "on",
  };
}

export async function createHomepageBlockAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const created = await prisma.homepageBlock.create({ data: fieldsFrom(formData) });
  await logAudit(session.userId, "homepage_block.create", `HomepageBlock:${created.id}`, null, created);

  revalidatePath("/admin/homepage-blocks");
  revalidatePath("/");
  redirect("/admin/homepage-blocks");
}

export async function updateHomepageBlockAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing block id.");

  const before = await prisma.homepageBlock.findUnique({ where: { id } });
  const updated = await prisma.homepageBlock.update({ where: { id }, data: fieldsFrom(formData) });
  await logAudit(session.userId, "homepage_block.update", `HomepageBlock:${id}`, before, updated);

  revalidatePath("/admin/homepage-blocks");
  revalidatePath("/");
  redirect("/admin/homepage-blocks");
}

export async function deleteHomepageBlockAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing block id.");

  const before = await prisma.homepageBlock.findUnique({ where: { id } });
  await prisma.homepageBlock.delete({ where: { id } });
  await logAudit(session.userId, "homepage_block.delete", `HomepageBlock:${id}`, before, null);

  revalidatePath("/admin/homepage-blocks");
  revalidatePath("/");
}

export async function moveHomepageBlockAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "PRODUCT_MANAGER"]);
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id) throw new Error("Missing block id.");

  const blocks = await prisma.homepageBlock.findMany({ orderBy: { sortOrder: "asc" } });
  const index = blocks.findIndex((b) => b.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= blocks.length) return;

  const a = blocks[index];
  const b = blocks[swapWith];
  await prisma.$transaction([
    prisma.homepageBlock.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.homepageBlock.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);
  await logAudit(session.userId, "homepage_block.reorder", `HomepageBlock:${id}`, { sortOrder: a.sortOrder }, { sortOrder: b.sortOrder });

  revalidatePath("/admin/homepage-blocks");
  revalidatePath("/");
}
