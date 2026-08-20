import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateDiscountAction, deleteDiscountAction } from "@/lib/actions/admin/discounts";
import { DISCOUNT_TYPES } from "@/lib/enums";
import DiscountScopeFields from "@/components/admin/DiscountScopeFields";

function toLocalInput(date: Date | null) {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default async function EditDiscountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [discount, categories, collections, products] = await Promise.all([
    prisma.discount.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.collection.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: { title: "asc" } }),
  ]);
  if (!discount) notFound();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Edit discount</h1>
      <form action={updateDiscountAction} className="card p-5 grid md:grid-cols-2 gap-4">
        <input type="hidden" name="id" value={discount.id} />
        <div>
          <label className="label">Name</label>
          <input name="name" defaultValue={discount.name} required className="input" />
        </div>
        <div>
          <label className="label">Code (optional)</label>
          <input name="code" defaultValue={discount.code ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Type</label>
          <select name="type" defaultValue={discount.type} className="input">
            {DISCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Value</label>
          <input name="value" type="number" step="0.01" defaultValue={discount.value} required className="input" />
        </div>
        <DiscountScopeFields
          categories={categories}
          collections={collections}
          products={products.map((p) => ({ id: p.id, name: p.title }))}
          defaultScope={discount.scope}
          defaultScopeId={discount.scopeId}
        />
        <div>
          <label className="label">Starts</label>
          <input name="startsAt" type="datetime-local" defaultValue={toLocalInput(discount.startsAt)} className="input" />
        </div>
        <div>
          <label className="label">Ends</label>
          <input name="endsAt" type="datetime-local" defaultValue={toLocalInput(discount.endsAt)} className="input" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={discount.active} className="h-4 w-4" />
          <span className="text-sm text-slate-300">Active</span>
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </div>
      </form>
      <form action={deleteDiscountAction}>
        <input type="hidden" name="id" value={discount.id} />
        <button className="btn-danger">Delete discount</button>
      </form>
    </div>
  );
}
