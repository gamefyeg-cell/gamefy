"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { REGION_COOKIE } from "@/lib/region";
import { addToCart, removeFromCart, updateCartQty, clearCart } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { trackProductEvent } from "@/lib/analytics";

export async function setRegionAction(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  if (!code) return;
  const cookieStore = await cookies();
  cookieStore.set(REGION_COOKIE, code, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/");
}

export async function addToCartAction(formData: FormData) {
  const variantId = String(formData.get("variantId") ?? "");
  const qty = Math.max(1, Number(formData.get("qty") ?? 1));
  if (!variantId) return;

  const customFieldValues: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("cf_")) {
      customFieldValues[key.slice(3)] = String(value);
    }
  }

  await addToCart(variantId, qty, Object.keys(customFieldValues).length ? customFieldValues : undefined);

  // Best-effort: look up which product this variant belongs to so
  // "add to cart" counts toward its analytics/popularity. Never let a
  // lookup failure block the actual cart write above.
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, select: { productId: true } });
  if (variant) await trackProductEvent(variant.productId, "ADD_TO_CART", { quantity: qty });

  revalidatePath("/cart");
}

export async function updateCartQtyAction(formData: FormData) {
  const variantId = String(formData.get("variantId") ?? "");
  const qty = Number(formData.get("qty") ?? 0);
  if (!variantId) return;
  await updateCartQty(variantId, qty);
  revalidatePath("/cart");
}

export async function removeFromCartAction(formData: FormData) {
  const variantId = String(formData.get("variantId") ?? "");
  if (!variantId) return;
  await removeFromCart(variantId);
  revalidatePath("/cart");
}

export async function clearCartAction() {
  await clearCart();
  revalidatePath("/cart");
}
