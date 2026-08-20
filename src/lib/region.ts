import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const REGION_COOKIE = "gamefy_region";

/// Resolves the visitor's active Region record (plan §2: region-aware
/// content driven entirely by admin data, not code). Falls back to the
/// first active region if no cookie is set or the cookie value is stale.
export async function getSelectedRegion() {
  const cookieStore = await cookies();
  const code = cookieStore.get(REGION_COOKIE)?.value;

  const regions = await prisma.region.findMany({ where: { active: true }, orderBy: { code: "asc" } });
  if (regions.length === 0) return null;

  return regions.find((r) => r.code === code) ?? regions[0];
}

export async function getAllActiveRegions() {
  return prisma.region.findMany({ where: { active: true }, orderBy: { code: "asc" } });
}
