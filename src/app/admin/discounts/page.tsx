import Link from "next/link";
import AddPanel from "@/components/admin/AddPanel";
import { prisma } from "@/lib/prisma";
import { createDiscountAction, deleteDiscountAction } from "@/lib/actions/admin/discounts";
import { DISCOUNT_TYPES } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import DiscountScopeFields from "@/components/admin/DiscountScopeFields";

import { ensureDiscountSchema } from "@/lib/discounts";

export default async function AdminDiscountsPage() {
  await ensureDiscountSchema();

  const [categories, collections, products, activationRegions] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.collection.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      include: {
        variants: {
          include: { activationRegion: true },
          orderBy: { price: "asc" },
        },
      },
      orderBy: { title: "asc" },
    }),
    prisma.activationRegion.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }),
  ]);

  let discounts: any[] = [];
  try {
    discounts = await prisma.discount.findMany({
      include: {
        variant: true,
        activationRegion: true,
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    discounts = await prisma.discount.findMany({
      orderBy: { createdAt: "desc" },
    }).catch(() => []);
  }

  const namesById = new Map<string, string>([
    ...categories.map((c) => [c.id, c.name] as const),
    ...collections.map((c) => [c.id, c.name] as const),
    ...products.map((p) => [p.id, p.title] as const),
  ]);

  const targetLabelFor = (d: (typeof discounts)[number]) => {
    if (d.scope === "ALL" || !d.scopeId) return "whole website";
    if (d.scope === "CATEGORY") return `category: ${namesById.get(d.scopeId) ?? d.scopeId}`;
    if (d.scope === "COLLECTION") return `collection: ${namesById.get(d.scopeId) ?? d.scopeId}`;
    if (d.scope === "PRODUCT") {
      const prodName = namesById.get(d.scopeId) ?? d.scopeId;
      const specs: string[] = [];
      if (d.variant) {
        const vDesc = [d.variant.platform, d.variant.edition, d.variant.durationLabel].filter(Boolean).join(" · ") || d.variant.sku;
        specs.push(`option: ${vDesc}`);
      } else {
        if (d.platform) specs.push(`platform: ${d.platform}`);
        if (d.activationRegion) specs.push(`region: ${d.activationRegion.name}`);
      }
      return specs.length > 0 ? `product: ${prodName} (${specs.join(" · ")})` : `product: ${prodName}`;
    }
    return d.scope.toLowerCase();
  };

  const productData = products.map((p) => ({
    id: p.id,
    name: p.title,
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      platform: v.platform,
      edition: v.edition,
      durationLabel: v.durationLabel,
      price: v.price,
      currency: v.currency,
      activationRegionId: v.activationRegionId,
      activationRegionName: v.activationRegion?.name ?? null,
    })),
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Discounts &amp; Offers</h1>
        <p className="text-sm text-slate-500 mt-1">
          Run a sale on one product (or specific platform/region/variant), a whole category/collection, or the entire storefront.
          Leave "Code" blank for it to apply automatically — set a code to make it a coupon buyers must enter at checkout.
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
                {targetLabelFor(d)}
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

      <AddPanel label="Add discount">
        <div className="card p-5">
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
            products={productData}
            activationRegions={activationRegions}
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
      </AddPanel>
    </div>
  );
}
