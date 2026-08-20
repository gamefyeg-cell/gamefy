"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, clearSession } from "@/lib/session";
import { ADMIN_ROLES, type UserRole } from "@/lib/enums";

export interface AuthActionState {
  error?: string;
}

export async function registerAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password || password.length < 8) {
    return { error: "Enter a valid email and a password of at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, role: "CUSTOMER", emailVerified: false },
  });

  await createSession({ userId: user.id, email: user.email, role: user.role as UserRole });
  redirect("/account");
}

export async function loginAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return { error: "Invalid email or password." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password." };
  }

  await createSession({ userId: user.id, email: user.email, role: user.role as UserRole });

  if (next && next.startsWith("/")) redirect(next);
  redirect(ADMIN_ROLES.includes(user.role as UserRole) && user.role !== "CUSTOMER" ? "/admin" : "/account");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}
