"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { logAudit } from "@/lib/actions/admin/audit";

function fieldsFrom(formData: FormData) {
  return {
    type: String(formData.get("type") ?? "INSTAPAY"),
    label: String(formData.get("label") ?? "").trim(),
    handle: String(formData.get("handle") ?? "").trim(),
    instructions: String(formData.get("instructions") ?? "") || null,
    sortOrder: Number(formData.get("sortOrder") ?? 0),
    active: formData.get("active") === "on",
  };
}

export async function createPaymentMethodAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "FINANCE"]);
  const data = fieldsFrom(formData);
  if (!data.label || !data.handle) throw new Error("Label and handle/number are required.");

  const created = await prisma.paymentMethod.create({ data });
  await logAudit(session.userId, "payment_method.create", `PaymentMethod:${created.id}`, null, created);

  revalidatePath("/admin/payment-methods");
  revalidatePath("/checkout");
  redirect("/admin/payment-methods");
}

export async function updatePaymentMethodAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "FINANCE"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing payment method id.");

  const before = await prisma.paymentMethod.findUnique({ where: { id } });
  const updated = await prisma.paymentMethod.update({ where: { id }, data: fieldsFrom(formData) });
  await logAudit(session.userId, "payment_method.update", `PaymentMethod:${id}`, before, updated);

  revalidatePath("/admin/payment-methods");
  revalidatePath("/checkout");
  redirect("/admin/payment-methods");
}

export async function deletePaymentMethodAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN", "FINANCE"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing payment method id.");

  // Orders that already used this method keep their paymentMethodId as
  // null rather than blocking the delete — the order still has its own
  // paymentProvider/paymentProofUrl snapshot, so history isn't lost.
  await prisma.order.updateMany({ where: { paymentMethodId: id }, data: { paymentMethodId: null } });
  await prisma.paymentMethod.delete({ where: { id } });
  await logAudit(session.userId, "payment_method.delete", `PaymentMethod:${id}`, null, null);

  revalidatePath("/admin/payment-methods");
  revalidatePath("/checkout");
}
