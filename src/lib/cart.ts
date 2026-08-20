import { cookies } from "next/headers";

// Lightweight cookie-based cart — no DB model needed for an anonymous cart.
// One line per variant; re-adding the same variant updates quantity/custom
// field values rather than creating a duplicate line.

export const CART_COOKIE = "gamefy_cart";
const CART_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export interface CartLine {
  variantId: string;
  qty: number;
  customFieldValues?: Record<string, string>;
}

export async function getCart(): Promise<CartLine[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveCart(lines: CartLine[]) {
  const cookieStore = await cookies();
  cookieStore.set(CART_COOKIE, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CART_MAX_AGE,
  });
}

export async function addToCart(
  variantId: string,
  qty: number,
  customFieldValues?: Record<string, string>
) {
  const lines = await getCart();
  const existing = lines.find((l) => l.variantId === variantId);
  if (existing) {
    existing.qty += qty;
    if (customFieldValues) existing.customFieldValues = customFieldValues;
  } else {
    lines.push({ variantId, qty, customFieldValues });
  }
  await saveCart(lines);
}

export async function updateCartQty(variantId: string, qty: number) {
  const lines = await getCart();
  const next = qty <= 0 ? lines.filter((l) => l.variantId !== variantId) : lines;
  const target = next.find((l) => l.variantId === variantId);
  if (target) target.qty = qty;
  await saveCart(next);
}

export async function removeFromCart(variantId: string) {
  const lines = await getCart();
  await saveCart(lines.filter((l) => l.variantId !== variantId));
}

export async function clearCart() {
  await saveCart([]);
}
