import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import AuthForm from "@/components/storefront/AuthForm";
import Reveal from "@/components/storefront/Reveal";
import { TRUST_SIGNALS } from "@/lib/trust-signals";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <Reveal className="flex flex-col items-center gap-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="Gamefy" className="h-14 w-14" />
        <div>
          <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-white">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to track your orders and reveal your keys.</p>
        </div>
      </div>

      <AuthForm action={loginAction} submitLabel="Sign in" next={next} />

      <p className="text-sm text-slate-500">
        No account?{" "}
        <Link href="/account/register" className="text-accent-soft hover:text-accent font-medium">
          Create one
        </Link>
      </p>

      <div className="flex items-center gap-4 pt-2">
        {TRUST_SIGNALS.map((t) => (
          <span key={t.title} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="text-sm">{t.icon}</span>
            {t.title}
          </span>
        ))}
      </div>
    </Reveal>
  );
}
