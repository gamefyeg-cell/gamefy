"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/actions/admin/guard";
import { logAudit } from "@/lib/actions/admin/audit";
import { encryptSecret } from "@/lib/crypto";
import { toJson } from "@/lib/json";

// NOTE: this registers provider records and stores their API key encrypted
// at rest — it does NOT perform live stock/price sync or webhook handling.
// Wiring a real provider (Kinguin/Eneba/a top-up API/etc.) means writing an
// integration against that provider's actual API, which needs real
// credentials this environment doesn't have. See README "What's stubbed".

function fieldsFrom(formData: FormData) {
  const markupType = String(formData.get("markupType") ?? "");
  const markupValue = String(formData.get("markupValue") ?? "");
  return {
    name: String(formData.get("name") ?? "").trim(),
    apiBaseUrl: String(formData.get("apiBaseUrl") ?? "") || null,
    syncMode: String(formData.get("syncMode") ?? "OFF"),
    syncFrequencyMinutes: formData.get("syncFrequencyMinutes")
      ? Number(formData.get("syncFrequencyMinutes"))
      : null,
    markupRule: markupType ? toJson({ type: markupType, value: Number(markupValue || 0) }) : null,
    active: formData.get("active") === "on",
  };
}

export async function createProviderAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN"]);
  const apiKey = String(formData.get("apiKey") ?? "");
  const data = {
    ...fieldsFrom(formData),
    apiKeyEncrypted: apiKey ? encryptSecret(apiKey) : null,
  };
  if (!data.name) throw new Error("Provider name is required.");

  const created = await prisma.provider.create({ data });
  await logAudit(session.userId, "provider.create", `Provider:${created.id}`, null, {
    ...created,
    apiKeyEncrypted: created.apiKeyEncrypted ? "[redacted]" : null,
  });

  revalidatePath("/admin/providers");
  redirect("/admin/providers");
}

export async function updateProviderAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing provider id.");

  const apiKey = String(formData.get("apiKey") ?? "");
  const before = await prisma.provider.findUnique({ where: { id } });
  const updated = await prisma.provider.update({
    where: { id },
    data: {
      ...fieldsFrom(formData),
      ...(apiKey ? { apiKeyEncrypted: encryptSecret(apiKey) } : {}),
    },
  });
  await logAudit(session.userId, "provider.update", `Provider:${id}`, before ? { ...before, apiKeyEncrypted: "[redacted]" } : null, {
    ...updated,
    apiKeyEncrypted: updated.apiKeyEncrypted ? "[redacted]" : null,
  });

  revalidatePath("/admin/providers");
  redirect("/admin/providers");
}

export async function deleteProviderAction(formData: FormData) {
  const session = await requireAdmin(["SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing provider id.");

  await prisma.provider.delete({ where: { id } });
  await logAudit(session.userId, "provider.delete", `Provider:${id}`, null, null);

  revalidatePath("/admin/providers");
}
