import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/json";

/// Every admin mutation should call this — plan §2/§5: "Full audit log:
/// every admin action ... logged with who/when/what/old value → new value".
export async function logAudit(
  adminId: string,
  action: string,
  entity: string,
  before: unknown,
  after: unknown
) {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      entity,
      before: before === undefined ? null : toJson(before),
      after: after === undefined ? null : toJson(after),
    },
  });
}
