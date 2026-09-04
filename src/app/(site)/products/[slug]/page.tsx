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
import HowItWorks from "@/components/storefront/HowItWorks";
import ProductFaq from "@/components/storefront/ProductFaq";
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
      take: 5,
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

  // Distinct platforms this listing is sold for (the buy box has the real
  // per-platform picker; this is just the sub-title line).
  const variantPlatforms = Array.from(
    new Set(product.variants.map((v) => v.platform).filter((p): p is string => Boolean(p)))
  );
  const platformText = product.platform
    ? labelFor(PLATFORMS, product.platform)
    : variantPlatforms.map((p) => labelFor(PLATFORMS, p)).join(" · ");

  const typeWord = product.type === "GAME" ? "game" : product.type === "SUBSCRIPTION" ? "subscription" : "product";

  const maxWarranty = Math.max(0, ...product.variants.map((v) => v.warrantyDays ?? 0)) || null;
  const regionNames = Array.from(
    new Set(product.variants.map((v) => v.activationRegion?.name).filter((n): n is string => Boolean(n)))
  );
  const regionText = regionNames.length ? regionNames.join(" · ") : null;
  const hasAccountVariant = product.variants.some(
    (v) => v.saleMode === "FULL_ACCOUNT" || v.saleMode === "SHARED_ACCOUNT"
  );
  const soldCount = product.purchaseCount;

  return (
    <div className="flex flex-col gap-12 pb-24 lg:pb-0">
      <div className="flex flex-col gap-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">
            Home
          </Link>
          <span className="text-slate-700">/</span>
          <Link href={`/categories/${product.category.slug}`} className="hover:text-slate-300 transition-colors">
            {product.category.name}
          </Link>
          <span className="text-slate-700">/</span>
          <span className="max-w-[220px] truncate text-slate-400">{product.title}</span>
        </nav>

        {/* Title block — full width, above the split */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
            {product.category.name} · {labelFor(PRODUCT_TYPES, product.type)}
          </span>
          <h1 className="font-heading text-2xl font-semibold leading-tight tracking-tight text-white md:text-[30px]">
            {product.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-400">
            {product.publisher && <span>{product.publisher}</span>}
            {product.publisher && platformText && <span className="text-slate-700">•</span>}
            {platformText && <span>{platformText}</span>}
            {(product.publisher || platformText) && <span className="text-slate-700">•</span>}
            <span className="inline-flex items-center gap-1 text-accent-soft">⚡ Instant after verification</span>
            {soldCount > 0 && (
              <span className="inline-flex items-center gap-1 text-slate-500">· {soldCount.toLocaleString()} sold</span>
            )}
          </div>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-6">
            <Reveal>
              <ProductGallery images={images} videoId={product.videoUrl} title={product.title} />
            </Reveal>

            {product.description && (
              <Reveal>
                <section className="flex flex-col gap-3">
                  <h2 className="font-heading text-lg font-semibold text-white">About this {typeWord}</h2>
                  <div className="max-w-[68ch] space-y-1 text-sm leading-7 text-slate-300">
                    {renderLiteMarkdown(product.description)}
                  </div>
                </section>
              </Reveal>
            )}
          </div>

          <div>
            <Reveal delay={0.1} className="lg:sticky lg:top-24">
              <ProductBuyBox variants={variantsWithDiscount} customFields={product.customFields} />
            </Reveal>
          </div>
        </div>

        {/* Long-form sections — full width so they don't crowd a column */}
        <Reveal>
          <HowItWorks />
        </Reveal>

        <Reveal>
          <div className={`grid items-start gap-6 ${buyerNotice ? "lg:grid-cols-2" : "max-w-3xl"}`}>
            {buyerNotice && (
              <section className="flex flex-col gap-3">
                <h2 className="font-heading text-lg font-semibold text-white">Before you buy</h2>
                <div className="rounded-xl border border-warn/30 bg-warn/[0.06] p-4 text-[13px] leading-relaxed text-slate-300">
                  {renderLiteMarkdown(buyerNotice)}
                </div>
              </section>
            )}
            <ProductFaq warrantyDays={maxWarranty} regionText={regionText} hasAccountVariant={hasAccountVariant} />
          </div>
        </Reveal>
      </div>

      {related.length > 0 && (
        <Reveal>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold tracking-tight text-white">More in {product.category.name}</h2>
            <Link href={`/categories/${product.category.slug}`} className="text-sm text-accent-soft hover:text-accent">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
