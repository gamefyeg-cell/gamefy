import Link from "next/link";
import { getCart } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { parseStringArray } from "@/lib/json";
import { removeFromCartAction } from "@/lib/actions/site";
import { getActiveDiscounts, buildCollectionIdsMap, pickBestDiscount } from "@/lib/discounts";
import { TRUST_SIGNALS } from "@/lib/trust-signals";
import CartQtyInput from "@/components/storefront/CartQtyInput";
import Reveal from "@/components/storefront/Reveal";

export default async function CartPage() {
  const cart = await getCart();

  if (cart.length === 0) {
    return (
      <Reveal className="flex flex-col items-center gap-4 text-center py-24">
        <span className="flex items-center justify-center w-16 h-16 rounded-full border border-accent/40 bg-accent/10 text-3xl">
          🛒
        </span>
        <h1 className="text-2xl font-bold text-white">Your cart is empty</h1>
        <p className="text-sm text-slate-500 max-w-xs">
          Browse games, gift cards, top-ups, and accounts — everything delivers instantly once your
          payment's verified.
        </p>
        <Link href="/" className="btn-cta !px-6">
          Start shopping →
        </Link>
      </Reveal>
    );
  }

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: cart.map((l) => l.variantId) } },
    include: { product: true },
  });

  const [activeDiscounts, collectionIdsMap] = await Promise.all([
    getActiveDiscounts(),
    buildCollectionIdsMap(variants.map((v) => v.productId)),
  ]);

  const lines = cart
    .map((line) => ({ line, variant: variants.find((v) => v.id === line.variantId) }))
    .filter((l) => l.variant);

  const itemCount = lines.reduce((sum, l) => sum + l.line.qty, 0);

  let subtotal = 0;
  let savings = 0;
  const rows = lines.map(({ line, variant }) => {
    const match = pickBestDiscount(activeDiscounts, {
      productId: variant!.productId,
      categoryId: variant!.product.categoryId,
      collectionIds: collectionIdsMap.get(variant!.productId) ?? [],
      price: variant!.price,
    });
    const unit = Math.max(0, variant!.price - (match?.amount ?? 0));
    subtotal += variant!.price * line.qty;
    savings += (match?.amount ?? 0) * line.qty;
    const cover = parseStringArray(variant!.product.images)[0];
    return { line, variant: variant!, match, unit, cover };
  });

  const total = subtotal - savings;
  const currency = rows[0]?.variant.currency ?? "USD";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading font-bold text-3xl uppercase tracking-wide text-white">Your Cart</h1>
        <p className="text-sm text-slate-500 mt-1">
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Reveal className="lg:col-span-2 flex flex-col gap-3">
          {rows.map(({ line, variant, match, unit, cover }) => (
            <div key={line.variantId} className="card flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-surface2 border border-border shrink-0">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt={variant.product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold text-white/20 bg-gradient-to-br from-accent-deep to-surface2">
                    {variant.product.title.slice(0, 1)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-[120px]">
                <div className="text-sm font-medium text-slate-100 truncate">{variant.product.title}</div>
                <div className="text-xs text-slate-500">
                  {[variant.platform, variant.edition].filter(Boolean).join(" · ") || variant.sku}
                </div>
                {match && <div className="text-xs text-danger mt-0.5">🏷 {match.discount.name}</div>}
                {line.customFieldValues && (
                  <div className="text-xs text-slate-500 mt-1">
                    {Object.entries(line.customFieldValues).map(([k, v]) => (
                      <span key={k} className="mr-2">
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Qty/price/remove: one group so it wraps as a unit onto its
                  own line on mobile (right-aligned via ml-auto) instead of
                  the row's fixed-width pieces individually forcing the
                  whole card wider than the viewport. sm:contents dissolves
                  the wrapper back into plain siblings at desktop sizes,
                  restoring the original single-row layout exactly. */}
              <div className="flex items-center gap-3 sm:gap-4 ml-auto sm:ml-0 sm:contents">
                <CartQtyInput variantId={line.variantId} qty={line.qty} />

                <div className="w-16 sm:w-24 text-right text-sm shrink-0">
                  <div className="text-slate-200">{formatMoney(unit * line.qty, variant.currency)}</div>
                  {match && (
                    <div className="text-xs text-slate-500 line-through">
                      {formatMoney(variant.price * line.qty, variant.currency)}
                    </div>
                  )}
                </div>

                <form action={removeFromCartAction}>
                  <input type="hidden" name="variantId" value={line.variantId} />
                  <button
                    aria-label="Remove item"
                    className="w-7 h-7 rounded-full bg-surface2 border border-border text-slate-400 hover:border-danger/60 hover:text-danger transition-colors shrink-0"
                  >
                    ×
                  </button>
                </form>
              </div>
            </div>
          ))}
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card p-5 flex flex-col gap-4 relative overflow-hidden lg:sticky lg:top-20">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent-soft to-gold" />

            <h2 className="text-sm font-semibold text-slate-200">Order Summary</h2>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal, currency)}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-danger">
                  <span>Savings</span>
                  <span>−{formatMoney(savings, currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 mt-1">
                <span className="text-slate-300 font-medium">Total</span>
                <span className="font-heading font-bold text-gold text-2xl">{formatMoney(total, currency)}</span>
              </div>
            </div>

            <Link href="/checkout" className="btn-cta w-full !py-3 text-base justify-center">
              Proceed to Checkout →
            </Link>

            <div className="flex flex-col gap-2.5 border-t border-border pt-4">
              {TRUST_SIGNALS.map((t) => (
                <div key={t.title} className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full border border-accent/50 bg-accent/10 text-xs shrink-0">
                    {t.icon}
                  </span>
                  <span className="text-xs text-slate-400">
                    <span className="text-slate-200 font-medium">{t.title}</span> · {t.subtitle}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
