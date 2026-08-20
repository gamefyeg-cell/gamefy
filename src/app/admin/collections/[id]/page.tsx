import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  updateCollectionAction,
  deleteCollectionAction,
  addProductToCollectionAction,
  removeProductFromCollectionAction,
} from "@/lib/actions/admin/collections";
import { COLLECTION_TYPES } from "@/lib/enums";

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [collection, allProducts] = await Promise.all([
    prisma.collection.findUnique({
      where: { id },
      include: { products: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
    }),
    prisma.product.findMany({ orderBy: { title: "asc" } }),
  ]);
  if (!collection) notFound();

  const assignedIds = new Set(collection.products.map((p) => p.productId));
  const available = allProducts.filter((p) => !assignedIds.has(p.id));

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-white">Manage collection</h1>

      <form action={updateCollectionAction} className="card p-5 grid md:grid-cols-2 gap-4">
        <input type="hidden" name="id" value={collection.id} />
        <div>
          <label className="label">Name</label>
          <input name="name" defaultValue={collection.name} required className="input" />
        </div>
        <div>
          <label className="label">Slug</label>
          <input name="slug" defaultValue={collection.slug} className="input" />
        </div>
        <div>
          <label className="label">Type</label>
          <select name="type" defaultValue={collection.type} className="input">
            {COLLECTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sort order</label>
          <input name="sortOrder" type="number" defaultValue={collection.sortOrder} className="input" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={collection.active} className="h-4 w-4" />
          <span className="text-sm text-slate-300">Active</span>
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </div>
      </form>

      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Products in this collection</h2>
        <div className="card divide-y divide-border">
          {collection.products.length === 0 && <p className="p-4 text-slate-500 text-sm">No products added yet.</p>}
          {collection.products.map((cp) => (
            <div key={cp.productId} className="flex justify-between items-center p-3 text-sm">
              <span className="text-slate-200">{cp.product.title}</span>
              <form action={removeProductFromCollectionAction}>
                <input type="hidden" name="collectionId" value={collection.id} />
                <input type="hidden" name="productId" value={cp.productId} />
                <button className="text-danger text-xs hover:underline">Remove</button>
              </form>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Add a product</h2>
        <form action={addProductToCollectionAction} className="flex gap-3">
          <input type="hidden" name="collectionId" value={collection.id} />
          <select name="productId" required className="input flex-1">
            <option value="">Select a product…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      </div>

      <form action={deleteCollectionAction}>
        <input type="hidden" name="id" value={collection.id} />
        <button className="btn-danger">Delete collection</button>
      </form>
    </div>
  );
}
