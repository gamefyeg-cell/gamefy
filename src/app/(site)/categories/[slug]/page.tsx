import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveDiscounts, buildCollectionIdsMap, pickBestDiscountForCard } from "@/lib/discounts";
import ProductCard from "@/components/storefront/ProductCard";
import CategorySortSelect from "@/components/storefront/CategorySortSelect";
import Reveal from "@/components/storefront/Reveal";

type SortKey = "newest" | "popular" | "price_asc" | "price_desc";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { slug } = await params;
  const { sort: sortRaw } = await searchParams;
  const sort: SortKey = (["popular", "price_asc", "price_desc"] as const).includes(sortRaw as never)
    ? (sortRaw as SortKey)
    : "newest";

  const category = await prisma.category.findUnique({
    where: { slug },
    include: { children: { where: { visible: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!category) notFound();

  const categoryIds = [category.id, ...category.children.map((c) => c.id)];
  const products = await prisma.product.findMany({
    where: { categoryId: { in: categoryIds }, active: true },
    include: { variants: { where: { active: true }, select: { price: true, currency: true } } },
    orderBy: { createdAt: "desc" },
  });

  const cheapestPrice = (p: (typeof products)[number]) =>
    p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : Infinity;

  const sorted = [...products].sort((a, b) => {
    if (sort === "popular") return b.popularityScore - a.popularityScore;
    if (sort === "price_asc") return cheapestPrice(a) - cheapestPrice(b);
    if (sort === "price_desc") return cheapestPrice(b) - cheapestPrice(a);
    return 0; // "newest" — already the query's order
  });

  const [activeDiscounts, collectionIdsMap] = await Promise.all([
    getActiveDiscounts(),
    buildCollectionIdsMap(products.map((p) => p.id)),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-300 transition-colors">
          Home
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-400">{category.name}</span>
      </nav>

      <Reveal>
        {category.bannerUrl ? (
          <div className="rounded-2xl p-[3px] bg-gradient-to-br from-accent via-accent-soft to-gold shadow-glow">
            <div className="relative h-48 md:h-56 rounded-[13px] overflow-hidden flex items-end p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={category.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="relative">
                <h1 className="font-heading font-bold text-3xl md:text-5xl uppercase tracking-wide text-white drop-shadow">
                  {category.name}
                </h1>
                <p className="text-sm text-slate-300 mt-1">
                  {products.length} product{products.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card relative overflow-hidden p-6 md:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent-soft to-gold" />
            <div className="flex items-center gap-4">
              {category.icon && (
                <span className="flex items-center justify-center w-14 h-14 rounded-2xl border border-accent/40 bg-accent/10 text-3xl shrink-0">
                  {category.icon}
                </span>
              )}
              <div>
                <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-wide text-white">{category.name}</h1>
                <p className="text-sm text-slate-500 mt-1">
                  {products.length} product{products.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>
        )}
      </Reveal>

      {category.defaultBuyerNotice && <p className="text-sm text-slate-400">{category.defaultBuyerNotice}</p>}

      {category.children.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {category.children.map((c) => (
            <Link
              key={c.id}
              href={`/categories/${c.slug}`}
              className="badge bg-surface2 border border-border text-slate-300 hover:border-accent/60 hover:text-white transition-colors"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-slate-500">No products in this category yet.</p>
      ) : (
        <>
          <div className="flex justify-end">
            <CategorySortSelect current={sort} />
          </div>

          <Reveal delay={0.05}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {sorted.map((p) => {
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
          </Reveal>
        </>
      )}
    </div>
  );
}
