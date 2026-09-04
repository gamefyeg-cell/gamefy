import Link from "next/link";
import AddPanel from "@/components/admin/AddPanel";
import { prisma } from "@/lib/prisma";
import { createCollectionAction, deleteCollectionAction } from "@/lib/actions/admin/collections";
import { COLLECTION_TYPES } from "@/lib/enums";

export default async function AdminCollectionsPage() {
  const collections = await prisma.collection.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-white">Collections</h1>

      <div className="card divide-y divide-border">
        {collections.length === 0 && <p className="p-4 text-slate-500 text-sm">No collections yet.</p>}
        {collections.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <span className="text-slate-100">{c.name}</span>
              <span className="text-slate-500 ml-2 text-xs">
                /{c.slug} · {c._count.products} products · {c.type}
              </span>
              {!c.active && <span className="badge bg-surface2 border border-border text-slate-500 ml-2">inactive</span>}
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/admin/collections/${c.id}`} className="text-accent-soft hover:text-accent text-xs">
                Manage
              </Link>
              <form action={deleteCollectionAction}>
                <input type="hidden" name="id" value={c.id} />
                <button className="text-danger text-xs hover:underline">Delete</button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <AddPanel label="Add collection">
        <div className="card p-5">
        <form action={createCollectionAction} className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input name="name" required className="input" />
          </div>
          <div>
            <label className="label">Slug (optional)</label>
            <input name="slug" className="input" />
          </div>
          <div>
            <label className="label">Type</label>
            <select name="type" className="input">
              {COLLECTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Sort order</label>
            <input name="sortOrder" type="number" defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label">Schedule start (optional)</label>
            <input name="scheduleStart" type="datetime-local" className="input" />
          </div>
          <div>
            <label className="label">Schedule end (optional)</label>
            <input name="scheduleEnd" type="datetime-local" className="input" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4" />
            <span className="text-sm text-slate-300">Active</span>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Create collection
            </button>
          </div>
        </form>
      </div>
      </AddPanel>
    </div>
  );
}
