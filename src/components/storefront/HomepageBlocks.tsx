import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/json";
import { getActiveDiscounts, buildCollectionIdsMap, pickBestDiscountForCard } from "@/lib/discounts";
import ProductCard from "@/components/storefront/ProductCard";
import FlashCountdown from "@/components/storefront/FlashCountdown";
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
  coverUrl: true,
  images: true,
  variants: { where: { active: true }, select: { price: true, currency: true } },
};

type GridProduct = {
  id: string;
  slug: string;
  title: string;
  type: string;
  categoryId: string;
  coverUrl: string | null;
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
    slides?: { imageUrl?: string; linkUrl?: string; ctaText?: string; title?: string; eyebrow?: string; subtitle?: string }[];
  }>(block.config, {});
  const slides = config.slides ?? [];
  if (slides.length === 0) return null;
  const slide = slides[0];
  const titleLines = (slide.title ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  let fanProducts = await prisma.product.findMany({
    where: { active: true, OR: [{ coverUrl: { not: null } }, { images: { not: "[]" } }] },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: productSelect,
  });
  if (fanProducts.length === 0) {
    fanProducts = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: productSelect,
    });
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-surface2 via-surface to-bg">
      {/* Soft ambient light — contained in the panel, never behind the copy. */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-gold/10 blur-[120px]" />

      <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:gap-10">
        {/* Copy sits on the solid panel — always legible. */}
        <div className="flex flex-col items-start gap-5">
          {slide.eyebrow && <span className="eyebrow-badge">{slide.eyebrow}</span>}

          <h2 className="font-display text-[34px] leading-[1.03] text-white sm:text-5xl lg:text-[56px]">
            {(titleLines.length ? titleLines : ["Your games,", "delivered in seconds"]).map((line, i, arr) => (
              <span key={i} className={`block ${arr.length > 1 && i === arr.length - 1 ? "text-accent-soft" : ""}`}>
                {line}
              </span>
            ))}
          </h2>

          {slide.subtitle && <p className="max-w-md text-sm leading-relaxed text-slate-400">{slide.subtitle}</p>}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <Link href={slide.linkUrl ?? "/"} className="btn-primary !rounded-xl !px-6 !py-3 text-[15px]">
              {slide.ctaText ?? "Shop now"}
            </Link>
            <Link href="/" className="text-sm font-medium text-slate-400 transition-colors hover:text-white">
              Browse everything →
            </Link>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-3 text-xs text-slate-500">
            {TRUST_SIGNALS.map((t) => (
              <span key={t.title} className="inline-flex items-center gap-1.5">
                <span className="text-sm">{t.icon}</span>
                <span className="text-slate-300">{t.title}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Visual has its own space. */}
        <div className="relative flex min-h-[220px] items-center justify-center lg:min-h-[320px]">
          {slide.imageUrl ? (
            <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slide.imageUrl} alt={slide.title ?? ""} className="h-full w-full object-cover" />
            </div>
          ) : (
            <HeroPosterFan products={fanProducts} />
          )}
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
      className="card card-hover group relative aspect-video overflow-hidden flex items-end p-4"
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
              <h2 className="text-xl md:text-2xl font-heading font-semibold tracking-tight text-white">{collection.name}</h2>
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
      <h2 className="text-xl md:text-2xl font-heading font-semibold tracking-tight text-white mb-4">{config.title ?? "Trending Now"}</h2>
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
        {config.title && <h3 className="text-xl md:text-2xl font-heading font-semibold tracking-tight text-white">{config.title}</h3>}
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
