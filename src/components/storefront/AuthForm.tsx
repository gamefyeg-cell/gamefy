"use client";

import { useState } from "react";
import { useActionState } from "react";
import type { AuthActionState } from "@/lib/actions/auth";

export default function AuthForm({
  action,
  submitLabel,
  next,
}: {
  action: (prev: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  submitLabel: string;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(action, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="card p-6 sm:p-8 flex flex-col gap-5 max-w-sm w-full relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent-soft to-gold" />

      {next && <input type="hidden" name="next" value={next} />}

      <div>
        <label className="label">Email</label>
        <input type="email" name="email" required autoComplete="email" className="input" placeholder="you@example.com" />
      </div>

      <div>
        <label className="label">Password</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="input !pr-16"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {state.error && <p className="text-danger text-sm">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-cta w-full !py-3 text-base justify-center">
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
