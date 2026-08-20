import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/json";
import { getActiveDiscounts, buildCollectionIdsMap, pickBestDiscountForCard } from "@/lib/discounts";
import ProductCard from "@/components/storefront/ProductCard";
import FlashCountdown from "@/components/storefront/FlashCountdown";
import MagneticLink from "@/components/motion/MagneticLink";
import HeroBackdrop from "@/components/storefront/HeroBackdrop";
import HeroPosterFan from "@/components/storefront/HeroPosterFan";
import { TRUST_SIGNALS } from "@/lib/trust-signals";

type Block = {
  id: string;
  type: string;
  config: string;
  rankingMode: string | null;
};

const productSelect = {
  id: true,
  slug: true,
  title: true,
  type: true,
  categoryId: true,
  images: true,
  variants: { where: { active: true }, select: { price: true, currency: true } },
};

type GridProduct = {
  id: string;
  slug: string;
  title: string;
  type: string;
  categoryId: string;
  images: string;
  variants: { price: number; currency: string }[];
};

/// Fetches active discounts once and renders a responsive product grid with
/// each card's best-matching discount attached — shared by every block type
/// below so "run a sale on X" shows up everywhere X appears on the homepage.
async function ProductGrid({ products }: { products: GridProduct[] }) {
  const [activeDiscounts, collectionIdsMap] = await Promise.all([
    getActiveDiscounts(),
    buildCollectionIdsMap(products.map((p) => p.id)),
  ]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
      {products.map((p) => {
        const match = pickBestDiscountForCard(activeDiscounts, p, collectionIdsMap.get(p.id) ?? []);
        return (
          <ProductCard
            key={p.id}
            product={p}
            discount={match ? { name: match.discount.name, amount: match.amount } : null}
          />
        );
      })}
    </div>
  );
}

async function HeroSlider({ block }: { block: Block }) {
  const config = parseJson<{
    slides?: { imageUrl: string; linkUrl?: string; ctaText?: string; title?: string; eyebrow?: string }[];
  }>(block.config, {});
  const slides = config.slides ?? [];
  if (slides.length === 0) return null;
  const slide = slides[0];
  const titleLines = (slide.title ?? "").split("\n").filter(Boolean);

  // A game marketplace's hero should show off games, not abstract shapes —
  // feature a handful of real products (preferring ones with real cover
  // art) in a tilted poster fan alongside the admin's headline/CTA.
  let fanProducts = await prisma.product.findMany({
    where: { active: true, images: { not: "[]" } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: productSelect,
  });
  if (fanProducts.length === 0) {
    fanProducts = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: productSelect,
    });
  }

  return (
    <section className="card overflow-hidden relative bg-surface2">
      <HeroBackdrop imageUrl={slide.imageUrl} alt={slide.title} />
      {/* Content-driven height, not a fixed min-height — a fixed height
          plus justify-between was reserving space for the poster fan even
          when it was hidden below md, producing a large dead void on
          narrow screens. The fan now always renders (smaller, centered,
          stacked below the text on mobile; side-by-side on desktop), so
          there's no gap left needing to be manufactured. */}
      <div className="relative flex flex-col md:flex-row md:items-end justify-center md:justify-between gap-5 md:gap-8 px-5 md:px-10 py-8 md:py-14">
        <div className="flex flex-col gap-3 md:gap-4 max-w-xl items-center md:items-start text-center md:text-left">
          {slide.eyebrow && <span className="eyebrow-badge">{slide.eyebrow}</span>}

          {titleLines.length > 0 && (
            <h2 className="font-display uppercase leading-[0.95] text-4xl md:text-7xl drop-shadow-lg">
              {titleLines.map((line, i) =>
                i % 2 === 1 ? (
                  <span
                    key={i}
                    className="block bg-gradient-to-r from-accent to-gold bg-clip-text text-transparent"
                  >
                    {line}
                  </span>
                ) : (
                  <span key={i} className="block text-white">
                    {line}
                  </span>
                )
              )}
            </h2>
          )}

          {slide.linkUrl && (
            <MagneticLink href={slide.linkUrl} className="btn-hero text-base !px-7 !py-3.5">
              ⚡ {slide.ctaText ?? "Shop now"}
            </MagneticLink>
          )}

          {/* Desktop: full icon + title + subtitle, as before. Mobile has
              its own compact single-row version below instead of just
              shrinking this one — three stacked two-line rows ate a third
              of the mobile hero's height for content that's repeated
              again lower on the page (product/cart pages all carry the
              same trust strip). */}
          <div className="hidden md:flex flex-wrap items-center justify-start gap-x-5 gap-y-3 pt-1">
            {TRUST_SIGNALS.map((t) => (
              <div key={t.title} className="flex items-center gap-2 text-left">
                <span className="flex items-center justify-center w-9 h-9 rounded-full border border-accent/50 bg-accent/10 text-sm shrink-0">
                  {t.icon}
                </span>
                <div className="leading-tight">
                  <div className="text-xs font-semibold text-slate-200">{t.title}</div>
                  <div className="text-[11px] text-slate-500">{t.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex md:hidden items-center justify-center gap-2 pt-1">
            {TRUST_SIGNALS.map((t) => (
              <span
                key={t.title}
                className="badge bg-accent/10 border border-accent/30 text-slate-200 gap-1 !py-1.5"
              >
                {t.icon} {t.title}
              </span>
            ))}
          </div>
        </div>

        <div className="flex justify-center shrink-0">
          <HeroPosterFan products={fanProducts} />
        </div>
      </div>
    </section>
  );
}

async function CategoryGrid({ block }: { block: Block }) {
  const config = parseJson<{ categoryIds?: string[] }>(block.config, {});
  if (!config.categoryIds?.length) return null;

  const categories = await prisma.category.findMany({
    where: { id: { in: config.categoryIds }, visible: true },
  });
  const ordered = config.categoryIds.map((id) => categories.find((c) => c.id === id)).filter(Boolean);
  if (ordered.length === 0) return null;

  return (
    <section>
      {/* auto-fit instead of a fixed column count per breakpoint — a fixed
          md:grid-cols-5 still reserves 5 equal slots even with only 4
          categories, leaving a visible empty gap on the right. This sizes
          as many ~150px+ tiles as fit the row, then stretches them (1fr)
          to fill whatever's left, for any category count. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
        {ordered.map((c) => (
          <CategoryTile key={c!.id} category={c!} />
        ))}
      </div>
    </section>
  );
}

function CategoryTile({ category }: { category: { slug: string; name: string; icon: string | null; bannerUrl: string | null } }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="card card-hover group relative aspect-square overflow-hidden flex items-end p-4"
    >
      {category.bannerUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={category.bannerUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-surface2 to-surface flex items-center justify-center text-4xl">
          {category.icon || "🎮"}
        </div>
      )}
      <span className="relative text-sm font-semibold text-white drop-shadow">{category.name}</span>
    </Link>
  );
}

async function FeaturedCollections({ block }: { block: Block }) {
  const config = parseJson<{ collectionIds?: string[] }>(block.config, {});
  if (!config.collectionIds?.length) return null;

  const collections = await prisma.collection.findMany({
    where: { id: { in: config.collectionIds }, active: true },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        take: 6,
        include: { product: { select: productSelect } },
      },
    },
  });

  return (
    <>
      {config.collectionIds.map((id) => {
        const collection = collections.find((c) => c.id === id);
        if (!collection || collection.products.length === 0) return null;
        return (
          <section key={collection.id}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-heading font-bold uppercase tracking-wide text-white">{collection.name}</h2>
              <Link href={`/collections/${collection.slug}`} className="text-sm text-accent-soft hover:text-accent">
                See all →
              </Link>
            </div>
            <ProductGrid products={collection.products.map((cp) => cp.product)} />
          </section>
        );
      })}
    </>
  );
}

async function TrendingBlock({ block }: { block: Block }) {
  const config = parseJson<{ limit?: number; productIds?: string[]; title?: string }>(block.config, {});
  const limit = config.limit ?? 12;
  const mode = block.rankingMode ?? "MANUAL";

  let products;
  if (mode === "AUTO_POPULARITY") {
    // Ranked by the same popularityScore the admin's Product Analytics
    // page shows (views + 5×cart-adds + 20×purchases) — this is the
    // literal "what people are actually engaging with" ranking, not just
    // completed sales like AUTO_SALES below.
    products = await prisma.product.findMany({
      where: { active: true, popularityScore: { gt: 0 } },
      orderBy: { popularityScore: "desc" },
      take: limit,
      select: productSelect,
    });
    if (products.length === 0) {
      products = await prisma.product.findMany({ where: { active: true }, take: limit, select: productSelect });
    }
  } else if (mode === "AUTO_SALES") {
    const grouped = await prisma.orderItem.groupBy({
      by: ["variantId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit * 2,
    });
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: grouped.map((g) => g.variantId) } },
      select: { productId: true },
    });
    const productIds = Array.from(new Set(variants.map((v) => v.productId))).slice(0, limit);
    products = await prisma.product.findMany({ where: { id: { in: productIds }, active: true }, select: productSelect });
    // Fallback when there's no sales history yet (fresh install)
    if (products.length === 0) {
      products = await prisma.product.findMany({ where: { active: true }, take: limit, select: productSelect });
    }
  } else {
    products = await prisma.product.findMany({
      where: { id: { in: config.productIds ?? [] }, active: true },
      select: productSelect,
    });
  }

  if (products.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-heading font-bold uppercase tracking-wide text-white mb-4">{config.title ?? "Trending Now"}</h2>
      <ProductGrid products={products} />
    </section>
  );
}

async function FlashDeals({ block }: { block: Block }) {
  const config = parseJson<{ collectionId?: string; endsAt?: string; title?: string }>(block.config, {});
  if (!config.collectionId) return null;

  const collection = await prisma.collection.findUnique({
    where: { id: config.collectionId },
    include: { products: { include: { product: { select: productSelect } }, take: 8 } },
  });
  if (!collection || collection.products.length === 0) return null;

  return (
    <section className="card p-5 border-warn/30">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-warn">{config.title ?? "⚡ Flash Deals"}</h2>
        {config.endsAt && <FlashCountdown endsAt={config.endsAt} />}
      </div>
      <ProductGrid products={collection.products.map((cp) => cp.product)} />
    </section>
  );
}

async function CustomBanner({ block }: { block: Block }) {
  const config = parseJson<{ imageUrl?: string; linkUrl?: string; title?: string; subtitle?: string }>(
    block.config,
    {}
  );
  return (
    <Link
      href={config.linkUrl ?? "#"}
      className="card card-hover relative overflow-hidden flex items-center min-h-[140px] p-6"
    >
      {config.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={config.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
      )}
      <div className="relative">
        {config.title && <h3 className="text-2xl font-heading font-bold uppercase tracking-wide text-white">{config.title}</h3>}
        {config.subtitle && <p className="text-slate-300 text-sm mt-1">{config.subtitle}</p>}
      </div>
    </Link>
  );
}

export default function HomepageBlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "HERO_SLIDER":
      return <HeroSlider block={block} />;
    case "CATEGORY_GRID":
      return <CategoryGrid block={block} />;
    case "FEATURED_COLLECTIONS":
      return <FeaturedCollections block={block} />;
    case "TRENDING":
      return <TrendingBlock block={block} />;
    case "FLASH_DEALS":
      return <FlashDeals block={block} />;
    case "CUSTOM_BANNER":
      return <CustomBanner block={block} />;
    default:
      return null;
  }
}
