import { prisma } from "@/lib/prisma";

export interface ActiveDiscount {
  id: string;
  name: string;
  code: string | null;
  type: string; // "PERCENT" | "FLAT"
  value: number;
  scope: string; // "ALL" | "CATEGORY" | "COLLECTION" | "PRODUCT"
  scopeId: string | null;
}

export interface DiscountMatch {
  discount: ActiveDiscount;
  amount: number; // absolute amount off, in the variant's currency, per unit
}

/// All discounts currently in their active schedule window — fetch once
/// per request/page and reuse across every product on it.
export async function getActiveDiscounts(): Promise<ActiveDiscount[]> {
  const now = new Date();
  return prisma.discount.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
  });
}

function amountFor(discount: ActiveDiscount, price: number): number {
  if (discount.type === "PERCENT") return (price * discount.value) / 100;
  return Math.min(discount.value, price); // FLAT — never discount below 0
}

/// Picks the single best-matching discount for one line (no stacking —
/// simplest to reason about for both admin and buyer). Automatic discounts
/// (code === null) are always eligible; a code-based discount only counts
/// if the buyer entered that exact code.
export function pickBestDiscount(
  activeDiscounts: ActiveDiscount[],
  params: { productId: string; categoryId: string; collectionIds: string[]; price: number; code?: string | null }
): DiscountMatch | null {
  const enteredCode = params.code?.trim().toUpperCase() || null;

  const eligible = activeDiscounts.filter((d) => {
    const scopeMatches =
      d.scope === "ALL" ||
      (d.scope === "CATEGORY" && d.scopeId === params.categoryId) ||
      (d.scope === "COLLECTION" && d.scopeId != null && params.collectionIds.includes(d.scopeId)) ||
      (d.scope === "PRODUCT" && d.scopeId === params.productId);
    if (!scopeMatches) return false;

    if (d.code == null) return true; // automatic
    return enteredCode !== null && d.code.toUpperCase() === enteredCode;
  });

  if (eligible.length === 0) return null;

  let best: DiscountMatch | null = null;
  for (const d of eligible) {
    const amount = amountFor(d, params.price);
    if (!best || amount > best.amount) best = { discount: d, amount };
  }
  return best;
}

/// Batch helper for product listing pages/blocks — one query instead of one
/// per card. Returns productId -> collectionId[].
export async function buildCollectionIdsMap(productIds: string[]): Promise<Map<string, string[]>> {
  if (productIds.length === 0) return new Map();
  const rows = await prisma.collectionProduct.findMany({
    where: { productId: { in: productIds } },
    select: { productId: true, collectionId: true },
  });
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.productId) ?? [];
    list.push(row.collectionId);
    map.set(row.productId, list);
  }
  return map;
}

/// For a ProductCard: picks the discount that applies to the product's
/// cheapest variant (matching how the card's "from $X" price is computed).
export function pickBestDiscountForCard(
  activeDiscounts: ActiveDiscount[],
  product: { id: string; categoryId: string; variants: { price: number }[] },
  collectionIds: string[]
): DiscountMatch | null {
  if (product.variants.length === 0) return null;
  const cheapest = product.variants.reduce((min, v) => (v.price < min.price ? v : min));
  return pickBestDiscount(activeDiscounts, {
    productId: product.id,
    categoryId: product.categoryId,
    collectionIds,
    price: cheapest.price,
  });
}

/// Convenience for a single product/variant — fetches its collection ids
/// and the active discount list itself. Prefer getActiveDiscounts() +
/// pickBestDiscount() directly when rendering a list of many products.
export async function computeDiscountForProduct(
  productId: string,
  categoryId: string,
  price: number,
  code?: string | null
): Promise<DiscountMatch | null> {
  const [activeDiscounts, memberships] = await Promise.all([
    getActiveDiscounts(),
    prisma.collectionProduct.findMany({ where: { productId }, select: { collectionId: true } }),
  ]);
  return pickBestDiscount(activeDiscounts, {
    productId,
    categoryId,
    collectionIds: memberships.map((m) => m.collectionId),
    price,
    code,
  });
}
