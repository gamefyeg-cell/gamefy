import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PRODUCT_TYPES, labelFor } from "@/lib/enums";
import ProductWizard from "@/components/admin/ProductWizard";
import Pagination from "@/components/admin/Pagination";
import AddPanel from "@/components/admin/AddPanel";

const PER_PAGE = 20;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const [total, products, categories, activationRegions] = await Promise.all([
    prisma.product.count(),
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { category: true, _count: { select: { variants: true } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.activationRegion.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const to = Math.min(page * PER_PAGE, total);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="a-h1">Products</h1>
        <span className="a-badge">{total} total</span>
      </div>

      {categories.length === 0 ? (
        <p style={{ color: "var(--a-warn)" }}>Create a category first — products need one.</p>
      ) : (
        <AddPanel label="Add product">
          <p className="a-sub" style={{ marginBottom: "1rem" }}>
            A short guided flow — shared info first, then a step per platform, each with its own price and stock.
          </p>
          <ProductWizard categories={categories} activationRegions={activationRegions} />
        </AddPanel>
      )}

      <div className="a-list">
        {products.length === 0 ? (
          <p className="a-list-empty">No products yet — add your first below.</p>
        ) : (
          products.map((p) => (
            <Link key={p.id} href={`/admin/products/${p.id}`} className="a-list-row">
              <div className="min-w-0">
                <div className="truncate" style={{ color: "var(--a-text)", fontWeight: 550 }}>
                  {p.title}
                </div>
                <div className="a-sub truncate">
                  {p.category.name} · {labelFor(PRODUCT_TYPES, p.type)} · {p._count.variants} option
                  {p._count.variants === 1 ? "" : "s"}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!p.active && <span className="a-badge">inactive</span>}
                <span style={{ color: "var(--a-accent)", fontWeight: 600 }}>Edit ›</span>
              </div>
            </Link>
          ))
        )}
      </div>

      <Pagination
        page={page}
        pageCount={pageCount}
        basePath="/admin/products"
        totalLabel={total > 0 ? `Showing ${from}–${to} of ${total}` : undefined}
      />
    </div>
  );
}
