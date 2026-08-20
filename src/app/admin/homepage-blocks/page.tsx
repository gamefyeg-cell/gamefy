import { prisma } from "@/lib/prisma";
import {
  createHomepageBlockAction,
  deleteHomepageBlockAction,
  moveHomepageBlockAction,
} from "@/lib/actions/admin/homepage";
import { HOMEPAGE_BLOCK_TYPES, labelFor } from "@/lib/enums";
import HomepageBlockFields from "@/components/admin/HomepageBlockFields";

export default async function AdminHomepageBlocksPage() {
  const [blocks, regions, categories, collections, products] = await Promise.all([
    prisma.homepageBlock.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.region.findMany({ orderBy: { code: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.collection.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: { title: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-white">Homepage Builder</h1>

      <div className="card divide-y divide-border">
        {blocks.length === 0 && <p className="p-4 text-slate-500 text-sm">No blocks yet — add one below.</p>}
        {blocks.map((b, i) => (
          <div key={b.id} className="flex items-center justify-between p-3 text-sm gap-3">
            <div className="flex-1">
              <span className="badge bg-surface2 border border-border text-slate-300 mr-2">
                {labelFor(HOMEPAGE_BLOCK_TYPES, b.type)}
              </span>
              <span className="text-slate-500 text-xs">order {b.sortOrder}</span>
              {!b.active && <span className="badge bg-surface2 border border-border text-slate-500 ml-2">inactive</span>}
            </div>
            <div className="flex items-center gap-2">
              <form action={moveHomepageBlockAction}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="direction" value="up" />
                <button disabled={i === 0} className="btn-secondary !px-2 !py-1 disabled:opacity-30">
                  ↑
                </button>
              </form>
              <form action={moveHomepageBlockAction}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="direction" value="down" />
                <button disabled={i === blocks.length - 1} className="btn-secondary !px-2 !py-1 disabled:opacity-30">
                  ↓
                </button>
              </form>
              <form action={deleteHomepageBlockAction}>
                <input type="hidden" name="id" value={b.id} />
                <button className="text-danger text-xs hover:underline">Delete</button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Add block</h2>
        <form action={createHomepageBlockAction} className="grid md:grid-cols-2 gap-4">
          <HomepageBlockFields
            categories={categories}
            collections={collections}
            products={products.map((p) => ({ id: p.id, name: p.title }))}
          />
          <div>
            <label className="label">Sort order</label>
            <input name="sortOrder" type="number" defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label">Target region (optional — blank = all regions)</label>
            <select name="targetRegionId" className="input">
              <option value="">— All regions —</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
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
              Create block
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
