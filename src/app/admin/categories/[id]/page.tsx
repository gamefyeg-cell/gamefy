import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateCategoryAction, deleteCategoryAction } from "@/lib/actions/admin/categories";
import SingleImageUploader from "@/components/admin/SingleImageUploader";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [category, parents] = await Promise.all([
    prisma.category.findUnique({ where: { id } }),
    prisma.category.findMany({ where: { parentId: null, NOT: { id } }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!category) notFound();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Edit category</h1>

      <form action={updateCategoryAction} className="card p-5 grid md:grid-cols-2 gap-4">
        <input type="hidden" name="id" value={category.id} />
        <div>
          <label className="label">Name</label>
          <input name="name" defaultValue={category.name} required className="input" />
        </div>
        <div>
          <label className="label">Slug</label>
          <input name="slug" defaultValue={category.slug} className="input" />
        </div>
        <div>
          <label className="label">Parent category</label>
          <select name="parentId" defaultValue={category.parentId ?? ""} className="input">
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
          <input name="icon" defaultValue={category.icon ?? ""} className="input" placeholder="🎮" />
        </div>
        <div>
          <label className="label">Sort order</label>
          <input name="sortOrder" type="number" defaultValue={category.sortOrder} className="input" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Photo (optional)</label>
          <SingleImageUploader name="bannerUrl" initialUrl={category.bannerUrl} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="visible" defaultChecked={category.visible} className="h-4 w-4" />
          <span className="text-sm text-slate-300">Visible on storefront</span>
        </div>
        <div className="md:col-span-2">
          <label className="label">Default "Before You Buy" notice</label>
          <textarea name="defaultBuyerNotice" rows={3} defaultValue={category.defaultBuyerNotice ?? ""} className="input" />
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </div>
      </form>

      <form action={deleteCategoryAction}>
        <input type="hidden" name="id" value={category.id} />
        <button className="btn-danger">Delete category</button>
      </form>
    </div>
  );
}
