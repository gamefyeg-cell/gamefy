"use server";

import bcrypt from "bcryptjs";
import { randomInt, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, clearSession } from "@/lib/session";
import { sendMail } from "@/lib/mailer";
import { ADMIN_ROLES, type UserRole } from "@/lib/enums";
import { getRequestIp, isIpBlocked, logCustomerEvent } from "@/lib/moderation";

const BLOCKED_MESSAGE = "We can't process this right now. Contact support if you think this is a mistake.";

export interface AuthActionState {
  error?: string;
}

const RESET_CODE_TTL_MINUTES = 15;
const RESET_CODE_RESEND_COOLDOWN_MS = 60_000;

function generateResetCode(): string {
  // 6 cryptographically random digits, zero-padded (crypto.randomInt, not Math.random).
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashResetCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function registerAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password || password.length < 8) {
    return { error: "Enter a valid email and a password of at least 8 characters." };
  }

  const ip = await getRequestIp();
  if (await isIpBlocked(ip)) {
    await logCustomerEvent({ email, ip, type: "login_blocked", detail: "register: blocked IP" });
    return { error: BLOCKED_MESSAGE };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, role: "CUSTOMER", emailVerified: false },
  });
  await logCustomerEvent({ userId: user.id, email, ip, type: "register" });

  await createSession({ userId: user.id, email: user.email, role: user.role as UserRole });
  redirect("/account");
}

export async function loginAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const ip = await getRequestIp();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return { error: "Invalid email or password." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password." };
  }

  if (user.bannedAt || (await isIpBlocked(ip))) {
    await logCustomerEvent({ userId: user.id, email, ip, type: "login_blocked" });
    return { error: user.bannedAt ? "This account has been suspended. Contact support." : BLOCKED_MESSAGE };
  }
  await logCustomerEvent({ userId: user.id, email, ip, type: "login" });

  await createSession({ userId: user.id, email: user.email, role: user.role as UserRole });

  if (next && next.startsWith("/")) redirect(next);
  redirect(ADMIN_ROLES.includes(user.role as UserRole) && user.role !== "CUSTOMER" ? "/admin" : "/account");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

// Step 1: user submits their email. We always redirect to the same next
// step regardless of whether the account exists, and only ever say "if an
// account exists" in the UI — this endpoint must not let someone probe
// which emails are registered.
export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { error: "Enter your email." };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Cooldown: don't let repeated submits spam a fresh code/email every request.
    const recent = await prisma.passwordResetCode.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESET_CODE_RESEND_COOLDOWN_MS) } },
      orderBy: { createdAt: "desc" },
    });

    if (!recent) {
      const code = generateResetCode();
      await prisma.passwordResetCode.create({
        data: {
          userId: user.id,
          codeHash: hashResetCode(code),
          expiresAt: new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60_000),
        },
      });

      // Never let an email-provider hiccup crash this request — the code
      // already exists in the DB either way; log and move on to the next
      // step so a transient SMTP failure degrades to "no email arrived"
      // instead of a 500 for every visitor hitting this form.
      try {
        await sendMail({
          to: user.email,
          subject: "Your Gamefy password reset code",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="margin-bottom: 4px;">Reset your Gamefy password</h2>
              <p style="color: #555;">Use this code to finish resetting your password. It expires in ${RESET_CODE_TTL_MINUTES} minutes.</p>
              <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; margin: 24px 0; padding: 16px; background: #f4f4f4; border-radius: 8px;">${code}</p>
              <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
            </div>
          `,
        });
      } catch (err) {
        console.error("[requestPasswordResetAction] sendMail failed:", err);
      }
    }
  }

  redirect(`/account/reset-password?email=${encodeURIComponent(email)}`);
}

// Step 2: user submits the code + new password together.
export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !/^\d{6}$/.test(code) || !password || password.length < 8) {
    return { error: "Enter the 6-digit code from your email and a password of at least 8 characters." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "Invalid or expired code." };
  }

  const resetCode = await prisma.passwordResetCode.findFirst({
    where: {
      userId: user.id,
      codeHash: hashResetCode(code),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!resetCode) {
    return { error: "Invalid or expired code." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    // Burn every outstanding code for this user, not just the one used —
    // a stale unused code from an earlier request shouldn't stay valid.
    prisma.passwordResetCode.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  await createSession({ userId: user.id, email: user.email, role: user.role as UserRole });
  redirect("/account");
}
