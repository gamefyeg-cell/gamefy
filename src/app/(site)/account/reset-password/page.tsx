import Link from "next/link";
import { resetPasswordAction } from "@/lib/actions/auth";
import ResetPasswordForm from "@/components/storefront/ResetPasswordForm";
import Reveal from "@/components/storefront/Reveal";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <Reveal className="flex flex-col items-center gap-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="Gamefy" className="h-14 w-14" />
        <div>
          <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-white">Enter your reset code</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">
            If an account exists for that email, we sent it a 6-digit code. It expires in 15 minutes.
          </p>
        </div>
      </div>

      <ResetPasswordForm action={resetPasswordAction} email={email ?? ""} />

      <p className="text-sm text-slate-500">
        <Link href="/account/forgot-password" className="text-accent-soft hover:text-accent font-medium">
          Didn&rsquo;t get a code? Request another
        </Link>
      </p>
    </Reveal>
  );
}
