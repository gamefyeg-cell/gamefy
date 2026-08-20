import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveDiscounts, buildCollectionIdsMap, pickBestDiscountForCard } from "@/lib/discounts";
import ProductCard from "@/components/storefront/ProductCard";

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            include: { variants: { where: { active: true }, select: { price: true, currency: true } } },
          },
        },
      },
    },
  });
  if (!collection || !collection.active) notFound();

  const products = collection.products.map((cp) => cp.product);
  const [activeDiscounts, collectionIdsMap] = await Promise.all([
    getActiveDiscounts(),
    buildCollectionIdsMap(products.map((p) => p.id)),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">{collection.name}</h1>
      {collection.products.length === 0 ? (
        <p className="text-slate-500">No products in this collection yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {collection.products.map((cp) => {
            const match = pickBestDiscountForCard(activeDiscounts, cp.product, collectionIdsMap.get(cp.productId) ?? []);
            return (
              <ProductCard
                key={cp.productId}
                product={cp.product}
                discount={match ? { name: match.discount.name, amount: match.amount } : null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
