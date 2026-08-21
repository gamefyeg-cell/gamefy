"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/lib/actions/auth";

export default function ForgotPasswordForm({
  action,
}: {
  action: (prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
}) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(action, {});

  return (
    <form action={formAction} className="card p-6 sm:p-8 flex flex-col gap-5 max-w-sm w-full relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent-soft to-gold" />

      <div>
        <label className="label">Email</label>
        <input type="email" name="email" required autoComplete="email" className="input" placeholder="you@example.com" />
      </div>

      {state.error && <p className="text-danger text-sm">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-cta w-full !py-3 text-base justify-center">
        {pending ? "Sending…" : "Send reset code"}
      </button>
    </form>
  );
}
