import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/session";
import { ADMIN_ROLES, type UserRole } from "@/lib/enums";

// Guards every /admin/* route except /admin/login. Real RBAC (per-action
// permission checks, not just "is this an admin") still happens server-side
// in each action per plan §5 ("every admin endpoint checks role/permission
// server-side, not just hidden UI") — this is the coarse front gate.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session || !ADMIN_ROLES.includes(session.role as UserRole)) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
