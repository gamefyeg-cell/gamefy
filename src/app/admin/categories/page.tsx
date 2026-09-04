import Link from "next/link";
import AddPanel from "@/components/admin/AddPanel";
import { prisma } from "@/lib/prisma";
import { createCategoryAction, deleteCategoryAction } from "@/lib/actions/admin/categories";
import SingleImageUploader from "@/components/admin/SingleImageUploader";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    include: { parent: true },
  });
  const parents = categories.filter((c) => !c.parentId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Categories</h1>
      </div>

      <div className="card divide-y divide-border">
        {categories.length === 0 && <p className="p-4 text-slate-500 text-sm">No categories yet.</p>}
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <span className="text-slate-100">
                {c.parent ? <span className="text-slate-500">{c.parent.name} / </span> : null}
                {c.name}
              </span>
              <span className="text-slate-500 ml-2 text-xs">/{c.slug}</span>
              {!c.visible && <span className="badge bg-surface2 border border-border text-slate-500 ml-2">hidden</span>}
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/admin/categories/${c.id}`} className="text-accent-soft hover:text-accent text-xs">
                Edit
              </Link>
              <form action={deleteCategoryAction}>
                <input type="hidden" name="id" value={c.id} />
                <button className="text-danger text-xs hover:underline">Delete</button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <AddPanel label="Add category">
        <div className="card p-5">
        <form action={createCategoryAction} className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input name="name" required className="input" />
          </div>
          <div>
            <label className="label">Slug (optional — derived from name)</label>
            <input name="slug" className="input" />
          </div>
          <div>
            <label className="label">Parent category</label>
            <select name="parentId" className="input">
              <option value="">— None (top-level) —</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Icon (emoji, optional — shown if there's no photo)</label>
            <input name="icon" className="input" placeholder="🎮" />
          </div>
          <div>
            <label className="label">Sort order</label>
            <input name="sortOrder" type="number" defaultValue={0} className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Photo (optional)</label>
            <SingleImageUploader name="bannerUrl" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="visible" defaultChecked className="h-4 w-4" />
            <span className="text-sm text-slate-300">Visible on storefront</span>
          </div>
          <div className="md:col-span-2">
            <label className="label">Default "Before You Buy" notice (inherited by new products in this category)</label>
            <textarea name="defaultBuyerNotice" rows={2} className="input" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Create category
            </button>
          </div>
        </form>
      </div>
      </AddPanel>
    </div>
  );
}
