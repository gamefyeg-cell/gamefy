import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getActiveDiscounts, buildCollectionIdsMap, pickBestDiscountForCard } from "@/lib/discounts";
import { searchScore } from "@/lib/search";
import ProductCard from "@/components/storefront/ProductCard";
import CategorySortSelect from "@/components/storefront/CategorySortSelect";
import Pagination from "@/components/storefront/Pagination";
import Reveal from "@/components/storefront/Reveal";

export const metadata: Metadata = {
  title: "All Products",
  description: "Every game, gift card, top-up, account and subscription on Gamefy — instant delivery, paid your way.",
};

type SortKey = "newest" | "popular" | "price_asc" | "price_desc";
const PER_PAGE = 24;

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; page?: string; q?: string }>;
}) {
  const { sort: sortRaw, page: pageRaw, q: qRaw } = await searchParams;
  const q = (qRaw ?? "").trim();
  const sort: SortKey = (["popular", "price_asc", "price_desc"] as const).includes(sortRaw as never)
    ? (sortRaw as SortKey)
    : "newest";
  const page = Math.max(1, Number(pageRaw) || 1);

  const allProducts = await prisma.product.findMany({
    where: { active: true },
    include: { variants: { where: { active: true }, select: { price: true, currency: true, platform: true } } },
    orderBy: { createdAt: "desc" },
  });

  // A search query filters to relevant titles and always ranks by
  // relevance first — same scoring the live search-bar dropdown uses (see
  // src/lib/search.ts), so a stray letter can't surface everything and
  // the strongest match always leads.
  const products = q
    ? allProducts
        .map((p) => ({ p, score: searchScore(p.title, q) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((s) => s.p)
    : allProducts;

  const cheapestPrice = (p: (typeof products)[number]) =>
    p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : Infinity;

  const sorted = q
    ? products // relevance order, already sorted above
    : [...products].sort((a, b) => {
        if (sort === "popular") return b.popularityScore - a.popularityScore;
        if (sort === "price_asc") return cheapestPrice(a) - cheapestPrice(b);
        if (sort === "price_desc") return cheapestPrice(b) - cheapestPrice(a);
        return 0; // "newest" — already the query's order
      });

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const pageItems = sorted.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const [activeDiscounts, collectionIdsMap] = await Promise.all([
    getActiveDiscounts(),
    buildCollectionIdsMap(pageItems.map((p) => p.id)),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-300 transition-colors">
          Home
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-400">{q ? `Search results` : "All Products"}</span>
      </nav>

      <div>
        <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-wide text-white">
          {q ? (
            <>
              Results for &ldquo;<span className="text-gold">{q}</span>&rdquo;
            </>
          ) : (
            "All Products"
          )}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {total} product{total === 1 ? "" : "s"}
          {q && (
            <>
              {" · "}
              <Link href="/products" className="text-accent hover:text-accent-soft transition-colors">
                Clear search
              </Link>
            </>
          )}
        </p>
      </div>

      {products.length === 0 ? (
        <p className="text-slate-500">
          {q ? <>No products match &ldquo;{q}&rdquo;. Try a different word or check the spelling.</> : "No products yet — check back soon."}
        </p>
      ) : (
        <>
          {!q && (
            <div className="flex justify-end">
              <CategorySortSelect current={sort} />
            </div>
          )}

          <Reveal delay={0.05}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {pageItems.map((p) => {
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

          <Pagination page={safePage} pageCount={pageCount} basePath="/products" extraQuery={{ sort: sortRaw, q: q || undefined }} />
        </>
      )}
    </div>
  );
}
