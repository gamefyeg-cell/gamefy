import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateVariantAction, deleteVariantAction, addKeyStockAction } from "@/lib/actions/admin/products";
import { SALE_MODES, DELIVERY_METHODS, STOCK_MODES, REGION_LOCK_TYPES, ACCOUNT_ACCESS_LEVELS, PLATFORMS } from "@/lib/enums";
import { CURRENCIES } from "@/lib/currencies";
import ActivationRegionSelect from "@/components/admin/ActivationRegionSelect";

export default async function EditVariantPage({
  params,
}: {
  params: Promise<{ id: string; variantId: string }>;
}) {
  const { id, variantId } = await params;
  const [variant, activationRegions, stockCounts] = await Promise.all([
    prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: true } }),
    prisma.activationRegion.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    prisma.keyStockItem.groupBy({
      by: ["used"],
      where: { variantId },
      _count: { _all: true },
    }),
  ]);
  if (!variant || variant.productId !== id) notFound();

  const available = stockCounts.find((s) => s.used === false)?._count._all ?? 0;
  const used = stockCounts.find((s) => s.used === true)?._count._all ?? 0;

  const needsStock = ["AUTO_KEY", "CREDENTIAL_DELIVERY", "SUBSCRIPTION_CODE", "SUBSCRIPTION_SHARED_ACCOUNT"].includes(
    variant.deliveryMethod
  );

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-white">
        Variant · <span className="text-slate-400 font-normal">{variant.product.title}</span>
      </h1>

      <form action={updateVariantAction} className="card p-5 grid md:grid-cols-3 gap-4">
        <input type="hidden" name="id" value={variant.id} />
        <input type="hidden" name="productId" value={variant.productId} />
        <div>
          <label className="label">SKU</label>
          <input name="sku" defaultValue={variant.sku} required className="input" />
        </div>
        <div>
          <label className="label">Sale mode</label>
          <select name="saleMode" defaultValue={variant.saleMode} className="input">
            {SALE_MODES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Delivery method</label>
          <select name="deliveryMethod" defaultValue={variant.deliveryMethod} className="input">
            {DELIVERY_METHODS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Platform</label>
          <select name="platform" defaultValue={variant.platform ?? ""} className="input">
            <option value="">— Not set —</option>
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Edition</label>
          <input name="edition" defaultValue={variant.edition ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Price</label>
          <input name="price" type="number" step="0.01" defaultValue={variant.price} required className="input" />
        </div>
        <div>
          <label className="label">Cost</label>
          <input name="cost" type="number" step="0.01" defaultValue={variant.cost ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Currency</label>
          <select name="currency" defaultValue={variant.currency} required className="input">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Stock mode</label>
          <select name="stockMode" defaultValue={variant.stockMode} className="input">
            {STOCK_MODES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Stock qty (manual mode)</label>
          <input name="stockQty" type="number" defaultValue={variant.stockQty ?? ""} className="input" />
        </div>
        <div className="md:col-span-3">
          <label className="label">Sold-out message (shown instead of "Out of stock" when stock hits 0)</label>
          <input
            name="outOfStockMessage"
            defaultValue={variant.outOfStockMessage ?? ""}
            className="input"
            placeholder='e.g. "Restocking Sunday" — leave blank for the default "Out of stock"'
          />
        </div>
        <div>
          <label className="label">Activation region — where this can be used</label>
          <ActivationRegionSelect
            name="activationRegionId"
            regions={activationRegions}
            defaultValue={variant.activationRegionId}
          />
        </div>
        <div>
          <label className="label">Region lock type (how strict the activation region is)</label>
          <select name="regionLockType" defaultValue={variant.regionLockType} className="input">
            {REGION_LOCK_TYPES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Account access</label>
          <select name="accountAccessLevel" defaultValue={variant.accountAccessLevel ?? ""} className="input">
            <option value="">—</option>
            {ACCOUNT_ACCESS_LEVELS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Warranty days</label>
          <input name="warrantyDays" type="number" defaultValue={variant.warrantyDays ?? ""} className="input" />
        </div>
        <div className="md:col-span-3">
          <label className="label">Activation instructions</label>
          <input name="activationInstructions" defaultValue={variant.activationInstructions ?? ""} className="input" />
        </div>
        <div className="md:col-span-3">
          <label className="label">Redemption instructions</label>
          <input name="redemptionInstructions" defaultValue={variant.redemptionInstructions ?? ""} className="input" />
        </div>
        <div className="md:col-span-3">
          <label className="label">Account delivery note</label>
          <input name="accountDeliveryNote" defaultValue={variant.accountDeliveryNote ?? ""} className="input" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={variant.active} className="h-4 w-4" />
          <span className="text-sm text-slate-300">Active</span>
        </div>
        <div className="md:col-span-3">
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </div>
      </form>

      {needsStock && (
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Key / credential stock</h2>
          <div className="card p-4 flex gap-4 text-sm mb-4">
            <span className="text-success">{available} available</span>
            <span className="text-slate-500">{used} delivered</span>
          </div>
          <form action={addKeyStockAction} className="card p-5 flex flex-col gap-3">
            <input type="hidden" name="variantId" value={variant.id} />
            <input type="hidden" name="productId" value={variant.productId} />
            <label className="label">
              Add codes / credentials (one per line — for accounts, e.g. "email:password"; each line is
              AES-256-GCM encrypted before being stored)
            </label>
            <textarea name="codes" rows={6} className="input font-mono text-xs" placeholder={"XXXXX-XXXXX-XXXXX\nemail@example.com:P@ssw0rd!"} />
            <button type="submit" className="btn-primary self-start">
              Add to stock
            </button>
          </form>
        </div>
      )}

      <form action={deleteVariantAction}>
        <input type="hidden" name="id" value={variant.id} />
        <input type="hidden" name="productId" value={variant.productId} />
        <button className="btn-danger">Delete variant</button>
      </form>
    </div>
  );
}
