import { notFound } from "next/navigation";
import { after } from "next/server";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseStringArray } from "@/lib/json";
import { labelFor, PRODUCT_TYPES, PLATFORMS } from "@/lib/enums";
import { renderLiteMarkdown } from "@/lib/richtext";
import { getActiveDiscounts, pickBestDiscount, pickBestDiscountForCard, buildCollectionIdsMap } from "@/lib/discounts";
import { trackProductEvent } from "@/lib/analytics";
import ProductBuyBox from "@/components/storefront/ProductBuyBox";
import ProductGallery from "@/components/storefront/ProductGallery";
import ProductCard from "@/components/storefront/ProductCard";
import Reveal from "@/components/storefront/Reveal";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      customFields: { orderBy: { sortOrder: "asc" } },
      variants: { where: { active: true }, include: { activationRegion: true } },
    },
  });
  if (!product || !product.active) notFound();

  // Fire-and-forget view tracking — after() runs it once the response has
  // been sent, so it never adds latency to the page itself but (unlike a
  // bare un-awaited call) is still guaranteed to finish on Vercel instead
  // of getting killed the moment the response completes.
  after(() => trackProductEvent(product.id, "VIEW"));

  const [activeDiscounts, memberships, related] = await Promise.all([
    getActiveDiscounts(),
    prisma.collectionProduct.findMany({ where: { productId: product.id }, select: { collectionId: true } }),
    prisma.product.findMany({
      where: { active: true, categoryId: product.categoryId, id: { not: product.id } },
      orderBy: { popularityScore: "desc" },
      take: 6,
      select: { id: true, slug: true, title: true, type: true, coverUrl: true, images: true, categoryId: true, variants: { select: { price: true, currency: true } } },
    }),
  ]);
  const collectionIds = memberships.map((m) => m.collectionId);

  const variantsWithDiscount = product.variants.map((v) => {
    const match = pickBestDiscount(activeDiscounts, {
      productId: product.id,
      categoryId: product.categoryId,
      collectionIds,
      price: v.price,
    });
    return { ...v, discount: match ? { name: match.discount.name, amount: match.amount } : null };
  });

  const relatedCollectionIds = await buildCollectionIdsMap(related.map((p) => p.id));

  const images = parseStringArray(product.images);
  const buyerNotice = product.buyerNotice ?? product.category.defaultBuyerNotice;
  const cheapest = product.variants.length ? product.variants.reduce((min, v) => (v.price < min.price ? v : min)) : null;

  return (
    <div className="flex flex-col gap-14">
      <div>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
          <Link href="/" className="hover:text-slate-300 transition-colors">
            Home
          </Link>
          <span className="text-slate-700">/</span>
          <Link href={`/categories/${product.category.slug}`} className="hover:text-slate-300 transition-colors">
            {product.category.name}
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-slate-400 truncate max-w-[200px]">{product.title}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-10">
          <Reveal className="flex flex-col gap-5">
            <ProductGallery images={images} videoId={product.videoUrl} title={product.title} />

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge bg-accent/10 text-accent-soft border border-accent/30">
                  {labelFor(PRODUCT_TYPES, product.type)}
                </span>
                {product.platform && (
                  <span className="badge bg-surface2 border border-border text-slate-300">
                    {labelFor(PLATFORMS, product.platform)}
                  </span>
                )}
                {cheapest && (
                  <span className="badge bg-gold/10 text-gold border border-gold/30">
                    from {new Intl.NumberFormat("en-US", { style: "currency", currency: cheapest.currency, currencyDisplay: "narrowSymbol" }).format(cheapest.price)}
                  </span>
                )}
              </div>

              <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase leading-[1.05] tracking-wide text-white">
                {product.title}
              </h1>
              {product.publisher && <p className="text-sm text-slate-500">by {product.publisher}</p>}
            </div>

            {buyerNotice && (
              <div className="notice-box">
                <div className="text-warn font-semibold text-sm mb-1">⚠ Before You Buy</div>
                <div className="text-sm text-slate-200">{renderLiteMarkdown(buyerNotice)}</div>
              </div>
            )}

            {product.description && (
              <div className="card p-5 text-sm text-slate-300 leading-relaxed">
                {renderLiteMarkdown(product.description)}
              </div>
            )}
          </Reveal>

          <div>
            <Reveal delay={0.1} className="md:sticky md:top-20">
              <ProductBuyBox variants={variantsWithDiscount} customFields={product.customFields} />
            </Reveal>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <Reveal>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-heading font-bold uppercase tracking-wide text-white">You might also like</h2>
            <Link href={`/categories/${product.category.slug}`} className="text-sm text-accent-soft hover:text-accent">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {related.map((p) => {
              const match = pickBestDiscountForCard(activeDiscounts, p, relatedCollectionIds.get(p.id) ?? []);
              return (
                <ProductCard key={p.id} product={p} discount={match ? { name: match.discount.name, amount: match.amount } : null} />
              );
            })}
          </div>
        </Reveal>
      )}
    </div>
  );
}
