import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createDiscountAction, deleteDiscountAction } from "@/lib/actions/admin/discounts";
import { DISCOUNT_TYPES, labelFor } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import DiscountScopeFields from "@/components/admin/DiscountScopeFields";

export default async function AdminDiscountsPage() {
  const [discounts, categories, collections, products] = await Promise.all([
    prisma.discount.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.collection.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: { title: "asc" } }),
  ]);

  const namesById = new Map<string, string>([
    ...categories.map((c) => [c.id, c.name] as const),
    ...collections.map((c) => [c.id, c.name] as const),
    ...products.map((p) => [p.id, p.title] as const),
  ]);
  const nameFor = (scope: string, scopeId: string | null) =>
    scope === "ALL" || !scopeId ? "Whole website" : namesById.get(scopeId) ?? scopeId;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Discounts &amp; Offers</h1>
        <p className="text-sm text-slate-500 mt-1">
          Run a sale on one product, a whole category/collection, or the entire storefront. Leave "Code"
          blank for it to apply automatically — set a code to make it a coupon buyers must enter at
          checkout.
        </p>
      </div>

      <div className="card divide-y divide-border">
        {discounts.length === 0 && <p className="p-4 text-slate-500 text-sm">No discounts yet — add one below.</p>}
        {discounts.map((d) => (
          <div key={d.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <span className="text-slate-100">{d.name}</span>
              <span className="text-slate-500 ml-2 text-xs">
                {d.type === "PERCENT" ? `${d.value}% off` : `${d.value} off`} ·{" "}
                {nameFor(d.scope, d.scopeId) === "Whole website"
                  ? "whole website"
                  : `${d.scope.toLowerCase()}: ${nameFor(d.scope, d.scopeId)}`}
                {d.code ? ` · code ${d.code}` : " · automatic"}
                {d.endsAt ? ` · ends ${formatDate(d.endsAt)}` : ""}
              </span>
              {!d.active && <span className="badge bg-surface2 border border-border text-slate-500 ml-2">inactive</span>}
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/admin/discounts/${d.id}`} className="text-accent-soft hover:text-accent text-xs">
                Edit
              </Link>
              <form action={deleteDiscountAction}>
                <input type="hidden" name="id" value={d.id} />
                <button className="text-danger text-xs hover:underline">Delete</button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Add discount</h2>
        <form action={createDiscountAction} className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Name (shown to buyers)</label>
            <input name="name" required className="input" placeholder="Ramadan Sale" />
          </div>
          <div>
            <label className="label">Code (optional — blank = automatic)</label>
            <input name="code" className="input" placeholder="RAMADAN20" />
          </div>
          <div>
            <label className="label">Type</label>
            <select name="type" className="input">
              {DISCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Value (% or flat amount)</label>
            <input name="value" type="number" step="0.01" required className="input" placeholder="20" />
          </div>
          <DiscountScopeFields
            categories={categories}
            collections={collections}
            products={products.map((p) => ({ id: p.id, name: p.title }))}
          />
          <div>
            <label className="label">Starts (optional)</label>
            <input name="startsAt" type="datetime-local" className="input" />
          </div>
          <div>
            <label className="label">Ends (optional)</label>
            <input name="endsAt" type="datetime-local" className="input" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4" />
            <span className="text-sm text-slate-300">Active</span>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Create discount
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
