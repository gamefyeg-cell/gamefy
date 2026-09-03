import { getSession } from "@/lib/session";
import { ADMIN_ROLES, type UserRole } from "@/lib/enums";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminMobileChrome from "@/components/admin/AdminMobileChrome";
import { AdminThemeProvider } from "@/components/admin/AdminTheme";
import "@/app/globals.css";
import "./admin.css";

// Sets the admin colour scheme before first paint so a hard load never
// flashes the wrong theme. AdminThemeProvider keeps it in sync afterwards.
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('gamefy_admin_theme');document.documentElement.setAttribute('data-admin-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-admin-theme','light');}})();`;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const isAdmin = session && ADMIN_ROLES.includes(session.role as UserRole);

  return (
    <AdminThemeProvider>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <div className="admin-root">
        {!isAdmin ? (
          <div className="min-h-screen flex items-center justify-center p-4">{children}</div>
        ) : (
          <div className="flex flex-col md:flex-row min-h-screen items-stretch">
            <AdminMobileChrome>
              <AdminSidebar email={session.email} role={session.role} />
            </AdminMobileChrome>
            <main className="flex-1 min-w-0 p-4 md:p-8">
              <div className="mx-auto max-w-5xl">{children}</div>
            </main>
          </div>
        )}
      </div>
    </AdminThemeProvider>
  );
}
