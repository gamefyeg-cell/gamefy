import { loginAction } from "@/lib/actions/auth";
import AuthForm from "@/components/storefront/AuthForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-3 text-center mb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="Gamefy" className="h-14 w-14" />
        <div>
          <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-white">Admin sign in</h1>
          <p className="text-sm text-slate-500 mt-1">Restricted to staff accounts.</p>
        </div>
      </div>
      <AuthForm action={loginAction} submitLabel="Sign in" next={next ?? "/admin"} />
      <p className="text-xs text-slate-600">
        Demo admin: <span className="text-slate-400">admin@gamefy.dev / Admin123!</span>
      </p>
    </div>
  );
}
