"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { logAudit } from "@/lib/actions/admin/audit";

const MOD_ROLES = ["SUPER_ADMIN", "SUPPORT_AGENT", "FINANCE"] as const;

export async function banUserAction(formData: FormData) {
  const session = await requireAdmin([...MOD_ROLES]);
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!userId) throw new Error("Missing user id.");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("User not found.");
  if (target.role !== "CUSTOMER") throw new Error("Only customer accounts can be suspended here.");

  await prisma.user.update({ where: { id: userId }, data: { bannedAt: new Date(), banReason: reason } });
  await logAudit(session.userId, "user.ban", `User:${userId}`, { bannedAt: target.bannedAt }, { bannedAt: new Date(), reason });

  revalidatePath(`/admin/customers/${userId}`);
  revalidatePath("/admin/customers");
}

export async function unbanUserAction(formData: FormData) {
  const session = await requireAdmin([...MOD_ROLES]);
  const userId = String(formData.get("userId") ?? "");
  if (!userId) throw new Error("Missing user id.");

  await prisma.user.update({ where: { id: userId }, data: { bannedAt: null, banReason: null } });
  await logAudit(session.userId, "user.unban", `User:${userId}`, null, { unbannedAt: new Date() });

  revalidatePath(`/admin/customers/${userId}`);
  revalidatePath("/admin/customers");
}

export async function blockIpAction(formData: FormData) {
  const session = await requireAdmin([...MOD_ROLES]);
  const ip = String(formData.get("ip") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || null;
  if (!ip) throw new Error("Enter an IP address.");

  await prisma.blockedIp.upsert({
    where: { ip },
    update: { reason, createdBy: session.userId },
    create: { ip, reason, createdBy: session.userId },
  });
  await logAudit(session.userId, "ip.block", `BlockedIp:${ip}`, null, { ip, reason });

  revalidatePath("/admin/blocked-ips");
  const fromUser = String(formData.get("userId") ?? "");
  if (fromUser) revalidatePath(`/admin/customers/${fromUser}`);
}

export async function unblockIpAction(formData: FormData) {
  const session = await requireAdmin([...MOD_ROLES]);
  const ip = String(formData.get("ip") ?? "").trim();
  if (!ip) throw new Error("Missing IP.");

  await prisma.blockedIp.deleteMany({ where: { ip } });
  await logAudit(session.userId, "ip.unblock", `BlockedIp:${ip}`, { ip }, null);

  revalidatePath("/admin/blocked-ips");
}
