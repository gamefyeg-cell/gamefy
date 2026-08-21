import { getSession } from "@/lib/session";
import { ADMIN_ROLES, type UserRole } from "@/lib/enums";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminMobileChrome from "@/components/admin/AdminMobileChrome";
import "@/app/globals.css";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const isAdmin = session && ADMIN_ROLES.includes(session.role as UserRole);

  // /admin/login (and any unauthenticated hit — middleware already redirects
  // real page loads, but this keeps the layout safe standalone too) renders
  // without the sidebar chrome.
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center p-4">{children}</div>;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <AdminMobileChrome>
        <AdminSidebar email={session.email} role={session.role} />
      </AdminMobileChrome>
      <main className="flex-1 min-w-0 p-4 md:p-8 max-w-6xl">{children}</main>
    </div>
  );
}
