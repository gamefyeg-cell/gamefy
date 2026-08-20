import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ADMIN_ROLES, type UserRole } from "@/lib/enums";

/// Server-side gate re-checked inside every admin action, independent of
/// middleware (plan §5: "every admin endpoint checks role/permission
/// server-side, not just hidden UI").
export async function requireAdmin(allowedRoles?: UserRole[]) {
  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role as UserRole)) {
    redirect("/admin/login");
  }
  if (allowedRoles && !allowedRoles.includes(session.role as UserRole)) {
    throw new Error("Forbidden: your role does not permit this action.");
  }
  return session;
}
