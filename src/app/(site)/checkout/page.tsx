import Link from "next/link";
import { getCart } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { parseStringArray } from "@/lib/json";
import { getActiveDiscounts, buildCollectionIdsMap, pickBestDiscount } from "@/lib/discounts";
import CheckoutForm from "@/components/storefront/CheckoutForm";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ coupon?: string }>;
}) {
  const { coupon } = await searchParams;
  const cart = await getCart();
  const session = await getSession();

  if (cart.length === 0) {
    return (
      <div className="text-center py-24">
        <h1 className="text-2xl font-bold text-white mb-2">Your cart is empty</h1>
        <Link href="/" className="text-accent-soft hover:text-accent">
          Continue shopping →
        </Link>
      </div>
    );
  }

  const [variants, paymentMethods] = await Promise.all([
    prisma.productVariant.findMany({
      where: { id: { in: cart.map((l) => l.variantId) } },
      include: { product: { include: { category: true } } },
    }),
    prisma.paymentMethod.findMany({ where: { active: true }, orderBy: [{ type: "asc" }, { sortOrder: "asc" }] }),
  ]);

  const [activeDiscounts, collectionIdsMap] = await Promise.all([
    getActiveDiscounts(),
    buildCollectionIdsMap(variants.map((v) => v.productId)),
  ]);

  const couponMatchedAnything =
    !coupon || activeDiscounts.some((d) => d.code?.toUpperCase() === coupon.toUpperCase());

  const lines = cart
    .map((line) => {
      const variant = variants.find((v) => v.id === line.variantId);
      if (!variant) return null;
      const match = pickBestDiscount(activeDiscounts, {
        productId: variant.productId,
        categoryId: variant.product.categoryId,
        collectionIds: collectionIdsMap.get(variant.productId) ?? [],
        price: variant.price,
        code: coupon,
      });
      return {
        variantId: line.variantId,
        qty: line.qty,
        title: variant.product.title,
        variantLabel: [variant.platform, variant.edition].filter(Boolean).join(" · ") || variant.sku,
        price: variant.price,
        currency: variant.currency,
        discountAmount: match?.amount ?? 0,
        discountName: match?.discount.name ?? null,
        cover: variant.product.coverUrl || parseStringArray(variant.product.images)[0] || null,
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  const total = lines.reduce((sum, l) => sum + Math.max(0, l.price - l.discountAmount) * l.qty, 0);
  const currency = lines[0]?.currency ?? "USD";

  const needsAck = variants.some((v) => v.product.requiresNoticeAck);
  const notices = Array.from(
    new Set(
      variants
        .map((v) => v.product.buyerNotice ?? v.product.category.defaultBuyerNotice)
        .filter((n): n is string => Boolean(n))
    )
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading font-bold text-3xl uppercase tracking-wide text-white">Checkout</h1>

      <CheckoutForm
        lines={lines}
        total={total}
        currency={currency}
        needsAck={needsAck}
        notices={notices}
        loggedInEmail={session?.email}
        couponCode={coupon ?? ""}
        couponStatus={!coupon ? null : couponMatchedAnything ? (lines.some((l) => l.discountAmount > 0) ? "applied" : "valid") : "invalid"}
        paymentMethods={paymentMethods}
      />
    </div>
  );
}
