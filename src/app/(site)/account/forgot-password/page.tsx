import Link from "next/link";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import ForgotPasswordForm from "@/components/storefront/ForgotPasswordForm";
import Reveal from "@/components/storefront/Reveal";

export default function ForgotPasswordPage() {
  return (
    <Reveal className="flex flex-col items-center gap-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="Gamefy" className="h-14 w-14" />
        <div>
          <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-white">Forgot your password?</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">Enter your email and we&rsquo;ll send you a 6-digit code to reset it.</p>
        </div>
      </div>

      <ForgotPasswordForm action={requestPasswordResetAction} />

      <p className="text-sm text-slate-500">
        Remembered it?{" "}
        <Link href="/account/login" className="text-accent-soft hover:text-accent font-medium">
          Sign in
        </Link>
      </p>
    </Reveal>
  );
}
