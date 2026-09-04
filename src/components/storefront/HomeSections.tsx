import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveDiscounts, buildCollectionIdsMap, pickBestDiscountForCard } from "@/lib/discounts";
import ProductCard from "@/components/storefront/ProductCard";
import HeroBackdrop from "@/components/storefront/HeroBackdrop";
import HeroPosterFan from "@/components/storefront/HeroPosterFan";
import { TRUST_SIGNALS } from "@/lib/trust-signals";

/// The homepage used to be assembled from admin-configured "blocks" (a
/// builder UI under /admin/homepage-blocks). That indirection was more
/// friction than it was worth for a single-store layout, so the page is
/// back to plain code — these are its sections. Everything shown is still
/// live data (products, categories, collections, real popularity); only
/// the *arrangement* of sections is fixed now, not admin-editable.

const productSelect = {
  id: true,
  slug: true,
  title: true,
  type: true,
  categoryId: true,
  coverUrl: true,
  images: true,
  variants: { where: { active: true }, select: { price: true, currency: true, platform: true } },
};

type GridProduct = {
  id: string;
  slug: string;
  title: string;
  type: string;
  categoryId: string;
  coverUrl: string | null;
  images: string;
  variants: { price: number; currency: string; platform: string | null }[];
};

async function ProductGrid({ products, cols = "md:grid-cols-5" }: { products: GridProduct[]; cols?: string }) {
  const [activeDiscounts, collectionIdsMap] = await Promise.all([
    getActiveDiscounts(),
    buildCollectionIdsMap(products.map((p) => p.id)),
  ]);

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 ${cols} gap-4`}>
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

/// ---------------------------------------------------------------- Hero --
export async function Hero() {
  let fanProducts = await prisma.product.findMany({
    where: { active: true, OR: [{ coverUrl: { not: null } }, { images: { not: "[]" } }] },
    orderBy: { popularityScore: "desc" },
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

  const firstCategory = await prisma.category.findFirst({
    where: { parentId: null, visible: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true },
  });
  const ctaHref = firstCategory ? `/categories/${firstCategory.slug}` : "#trending";

  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-surface2 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.75)]">
      <HeroBackdrop />

      <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-6 lg:p-14">
        <div className="max-w-lg [text-shadow:0_2px_12px_rgba(0,0,0,0.55)]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
            ⚡ Instant &amp; Reliable
          </span>

          <h2 className="mt-3 font-heading text-[32px] font-bold leading-[1.06] tracking-tight text-white sm:text-[42px] lg:text-[52px]">
            <span className="block">Instant</span>
            <span className="block">Game Keys</span>
            <span className="block text-accent-soft">&amp; Accounts</span>
          </h2>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
            Keys, full accounts, top-ups and subscriptions — verified and delivered fast, paid your way.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3">
            <Link href={ctaHref} className="btn-primary !rounded-xl !px-7 !py-3.5 text-[15px] font-semibold">
              Shop Best Sellers
            </Link>
            <Link href="#trending" className="text-sm font-medium text-slate-200 transition-colors hover:text-white">
              Browse everything →
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-xs">
            {TRUST_SIGNALS.map((t) => (
              <span key={t.title} className="inline-flex items-center gap-2 text-slate-300">
                <span className="text-sm" aria-hidden>
                  {t.icon}
                </span>
                {t.title}
              </span>
            ))}
          </div>
        </div>

        <div className="flex min-h-[220px] items-center justify-center lg:min-h-[340px]">
          <HeroPosterFan products={fanProducts} />
        </div>
      </div>
    </section>
  );
}

/// ------------------------------------------------------------ Trending --
/// Real analytics only (views + cart-adds + purchases, see
/// src/lib/analytics.ts) — never padded with untouched products unless
/// literally nothing has any activity yet (a brand-new store).
export async function TrendingSection() {
  let products = await prisma.product.findMany({
    where: { active: true, popularityScore: { gt: 0 } },
    orderBy: { popularityScore: "desc" },
    take: 5,
    select: productSelect,
  });
  if (products.length === 0) {
    products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: productSelect,
    });
  }
  if (products.length === 0) return null;

  return (
    <section id="trending">
      <h2 className="text-xl md:text-2xl font-heading font-semibold tracking-tight text-white mb-4">Trending Now</h2>
      <ProductGrid products={products} />
    </section>
  );
}

/// ------------------------------------------------------------ Category --
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

export async function CategorySection() {
  const categories = await prisma.category.findMany({
    where: { parentId: null, visible: true },
    orderBy: { sortOrder: "asc" },
    take: 8,
  });
  if (categories.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl md:text-2xl font-heading font-semibold tracking-tight text-white mb-4">Shop by category</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
        {categories.map((c) => (
          <CategoryTile key={c.id} category={c} />
        ))}
      </div>
    </section>
  );
}

/// --------------------------------------------------------- New arrivals --
export async function NewArrivalsSection() {
  const products = await prisma.product.findMany({
    where: { active: true, type: "GAME" },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: productSelect,
  });
  if (products.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl md:text-2xl font-heading font-semibold tracking-tight text-white mb-4">New Arrivals</h2>
      <ProductGrid products={products} cols="md:grid-cols-6" />
    </section>
  );
}

/// ----------------------------------------------------------- Collections --
/// Every active collection is "featured" — admins curate a collection by
/// adding products to it (or activating/deactivating it); there's no
/// separate "pick which collections show on the homepage" step anymore.
export async function CollectionsSection() {
  const collections = await prisma.collection.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    take: 3,
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        take: 5,
        include: { product: { select: productSelect } },
      },
    },
  });
  const withProducts = collections.filter((c) => c.products.length > 0);
  if (withProducts.length === 0) return null;

  return (
    <>
      {withProducts.map((collection) => (
        <section key={collection.id}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-heading font-semibold tracking-tight text-white">{collection.name}</h2>
            <Link href={`/collections/${collection.slug}`} className="text-sm text-accent-soft hover:text-accent">
              See all →
            </Link>
          </div>
          <ProductGrid products={collection.products.map((cp) => cp.product)} />
        </section>
      ))}
    </>
  );
}
