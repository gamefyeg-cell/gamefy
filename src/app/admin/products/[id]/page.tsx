import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateProductAction, deleteProductAction, createVariantAction, createCustomFieldAction, deleteCustomFieldAction } from "@/lib/actions/admin/products";
import { PRODUCT_TYPES, SALE_MODES, DELIVERY_METHODS, STOCK_MODES, REGION_LOCK_TYPES, ACCOUNT_ACCESS_LEVELS, CUSTOM_FIELD_TYPES, PLATFORMS, labelFor } from "@/lib/enums";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currencies";
import { parseStringArray } from "@/lib/json";
import { formatMoney } from "@/lib/format";
import ActivationRegionSelect from "@/components/admin/ActivationRegionSelect";
import ImageUploader from "@/components/admin/ImageUploader";
import RichTextArea from "@/components/admin/RichTextArea";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, activationRegions] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        variants: { include: { activationRegion: true }, orderBy: { createdAt: "asc" } },
        customFields: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.activationRegion.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }),
  ]);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{product.title}</h1>
        <Link href={`/products/${product.slug}`} target="_blank" className="text-accent-soft hover:text-accent text-sm">
          View on storefront →
        </Link>
      </div>

      <form action={updateProductAction} className="card p-5 grid md:grid-cols-2 gap-4">
        <input type="hidden" name="id" value={product.id} />
        <div>
          <label className="label">Title</label>
          <input name="title" defaultValue={product.title} required className="input" />
        </div>
        <div>
          <label className="label">Slug</label>
          <input name="slug" defaultValue={product.slug} className="input" />
          <p className="text-xs text-slate-600 mt-1">This product's web address: /products/{product.slug}</p>
        </div>
        <div>
          <label className="label">Category</label>
          <select name="categoryId" defaultValue={product.categoryId} required className="input">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select name="type" defaultValue={product.type} className="input">
            {PRODUCT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Publisher</label>
          <input name="publisher" defaultValue={product.publisher ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Platform</label>
          <select name="platform" defaultValue={product.platform ?? ""} className="input">
            <option value="">— Not set —</option>
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label">Tags (comma-separated)</label>
          <input name="tags" defaultValue={parseStringArray(product.tags).join(", ")} className="input" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Images (first = cover — multiple supported, one is fine too)</label>
          <ImageUploader name="images" initialUrls={parseStringArray(product.images)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">YouTube trailer (optional)</label>
          <input
            name="videoUrl"
            defaultValue={product.videoUrl ? `https://www.youtube.com/watch?v=${product.videoUrl}` : ""}
            className="input"
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p className="text-xs text-slate-600 mt-1">Paste any YouTube link — watch, share, or shorts. Shown as a video tile in the product gallery.</p>
        </div>
        <div className="md:col-span-2">
          <label className="label">Description</label>
          <RichTextArea name="description" rows={4} defaultValue={product.description ?? ""} />
          <p className="hint">Use the B / • List buttons above, or type emoji/icons directly (🎮 ⚡ 🔑).</p>
        </div>
        <div className="md:col-span-2">
          <label className="label">"Before You Buy" notice (overrides category default)</label>
          <RichTextArea name="buyerNotice" rows={3} defaultValue={product.buyerNotice ?? ""} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="requiresNoticeAck" defaultChecked={product.requiresNoticeAck} className="h-4 w-4" />
          <span className="text-sm text-slate-300">Require checkout acknowledgement</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={product.active} className="h-4 w-4" />
          <span className="text-sm text-slate-300">Active</span>
        </div>
        <div>
          <label className="label">SEO title</label>
          <input name="seoTitle" defaultValue={product.seoTitle ?? ""} className="input" />
        </div>
        <div>
          <label className="label">SEO description</label>
          <input name="seoDescription" defaultValue={product.seoDescription ?? ""} className="input" />
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </div>
      </form>

      {/* --- Variants --- */}
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-3">
          Variants — Key vs. Full Account sale modes live here (plan §1)
        </h2>
        <div className="card divide-y divide-border">
          {product.variants.length === 0 && <p className="p-4 text-slate-500 text-sm">No variants yet.</p>}
          {product.variants.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <span className="badge bg-accent/10 text-accent-soft border border-accent/30 mr-2">
                  {labelFor(SALE_MODES, v.saleMode)}
                </span>
                <span className="text-slate-200">{v.sku}</span>
                <span className="text-slate-500 ml-2 text-xs">
                  {[v.durationLabel, v.platform, v.edition].filter(Boolean).join(" · ")} ·{" "}
                  {v.activationRegion ? `activates: ${v.activationRegion.name}` : "activation region not set"} ·{" "}
                  {formatMoney(v.price, v.currency)} ·{" "}
                  {v.stockMode === "MANUAL" ? `${v.stockQty ?? 0} in stock` : v.stockMode}
                </span>
              </div>
              <Link href={`/admin/products/${product.id}/variants/${v.id}`} className="text-accent-soft hover:text-accent text-xs">
                Manage →
              </Link>
            </div>
          ))}
        </div>

        <form action={createVariantAction} className="card p-6 mt-4 flex flex-col gap-6">
          <input type="hidden" name="productId" value={product.id} />

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">What is this option</p>
            <div className="grid md:grid-cols-3 gap-5">
              <div>
                <label className="label">SKU</label>
                <input name="sku" required className="input" placeholder={`${product.slug}-...`} />
                <p className="hint">Your own internal code for this exact option — must be unique across the whole store.</p>
              </div>
              <div>
                <label className="label">Sale mode</label>
                <select name="saleMode" className="input">
                  {SALE_MODES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <p className="hint">Key = buyer redeems a code themselves. Full/Shared Account = you deliver login credentials.</p>
              </div>
              <div>
                <label className="label">Delivery method</label>
                <select name="deliveryMethod" className="input">
                  {DELIVERY_METHODS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <p className="hint">How this reaches the buyer after payment — automatically from stock, or manually by you.</p>
              </div>
              <div>
                <label className="label">Platform</label>
                <select name="platform" className="input" defaultValue="">
                  <option value="">— Not set —</option>
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="hint">Only needed if this same product also has other-platform variants.</p>
              </div>
              <div>
                <label className="label">Edition</label>
                <input name="edition" className="input" placeholder="Standard / Deluxe" />
                <p className="hint">Only needed if this product sells more than one edition.</p>
              </div>
              <div>
                <label className="label">Duration / plan (subscriptions)</label>
                <input name="durationLabel" className="input" placeholder="1 Month / 3 Months / Lifetime" />
                <p className="hint">Add one variant per length, same as this one — they'll show as a plan picker on the product page.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Price &amp; stock</p>
            <div className="grid md:grid-cols-3 gap-5">
              <div>
                <label className="label">Price</label>
                <input name="price" type="number" step="0.01" required className="input" />
                <p className="hint">What the buyer pays for this option, before any discount.</p>
              </div>
              <div>
                <label className="label">Currency</label>
                <select name="currency" defaultValue={DEFAULT_CURRENCY} required className="input">
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
                <p className="hint">Shown next to the price on the storefront.</p>
              </div>
              <div>
                <label className="label">Stock mode</label>
                <select name="stockMode" className="input">
                  {STOCK_MODES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <p className="hint">Manual = you track an exact count. Unlimited = never runs out.</p>
              </div>
              <div>
                <label className="label">Stock qty</label>
                <input name="stockQty" type="number" className="input" />
                <p className="hint">Only used when Stock mode above is "Manual count".</p>
              </div>
              <div className="md:col-span-2">
                <label className="label">Sold-out message (optional)</label>
                <input name="outOfStockMessage" className="input" placeholder='e.g. "Restocking Sunday"' />
                <p className="hint">Shown instead of the default "Out of stock" text once stock hits 0.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Where it works</p>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="label">Activation region</label>
                <ActivationRegionSelect name="activationRegionId" regions={activationRegions} />
                <p className="hint">Where this key/account actually works — Global, a zone, or one country.</p>
              </div>
              <div>
                <label className="label">Region lock type</label>
                <select name="regionLockType" className="input">
                  {REGION_LOCK_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <p className="hint">How strict the region above is — e.g. "works anywhere but needs a VPN" vs. strictly locked.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Account-sale details (Full/Shared Account only)</p>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="label">Account access</label>
                <select name="accountAccessLevel" className="input">
                  <option value="">—</option>
                  {ACCOUNT_ACCESS_LEVELS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                <p className="hint">Full = buyer can change everything. Login only = shared/rental, buyer never changes it.</p>
              </div>
              <div>
                <label className="label">Warranty days</label>
                <input name="warrantyDays" type="number" className="input" />
                <p className="hint">How many days you'll replace this account if it stops working. Leave blank for none.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Notes shown to the buyer</p>
            <div className="flex flex-col gap-5">
              <div>
                <label className="label">Activation instructions</label>
                <input name="activationInstructions" className="input" placeholder="e.g. requires a VPN set to Turkey during activation" />
                <p className="hint">Shown on the product page as a small note next to the price.</p>
              </div>
              <div>
                <label className="label">Redemption instructions</label>
                <input name="redemptionInstructions" className="input" placeholder="e.g. Steam > Games > Activate a Product" />
                <p className="hint">Shown on the product page — how the buyer actually uses/redeems what they bought.</p>
              </div>
              <div>
                <label className="label">Account delivery note</label>
                <input name="accountDeliveryNote" className="input" placeholder="e.g. do not change email or enable 2FA" />
                <p className="hint">Shown together with the delivered credentials, e.g. rules for a shared/rental account.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-5 flex items-center justify-between">
            <label className="flex items-start gap-2">
              <input type="checkbox" name="active" defaultChecked className="h-4 w-4 mt-0.5" />
              <span className="flex flex-col">
                <span className="text-sm text-slate-300">Active</span>
                <span className="hint !mt-0">Unchecking hides just this option from the storefront, without deleting it.</span>
              </span>
            </label>
            <button type="submit" className="btn-primary !px-6 !py-2.5">
              Add variant
            </button>
          </div>
        </form>
      </div>

      {/* --- Custom fields --- */}
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Custom checkout fields (e.g. Player ID)</h2>
        <div className="card divide-y divide-border">
          {product.customFields.length === 0 && <p className="p-4 text-slate-500 text-sm">None yet.</p>}
          {product.customFields.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-3 text-sm">
              <span className="text-slate-200">
                {f.label} <span className="text-slate-500 text-xs">({f.fieldKey}, {f.type}{f.required ? ", required" : ""})</span>
              </span>
              <form action={deleteCustomFieldAction}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="productId" value={product.id} />
                <button className="text-danger text-xs hover:underline">Delete</button>
              </form>
            </div>
          ))}
        </div>
        <form action={createCustomFieldAction} className="card p-5 mt-4 grid md:grid-cols-3 gap-4">
          <input type="hidden" name="productId" value={product.id} />
          <div>
            <label className="label">Field key</label>
            <input name="fieldKey" required className="input" placeholder="player_id" />
          </div>
          <div>
            <label className="label">Label</label>
            <input name="label" required className="input" placeholder="Player ID / UID" />
          </div>
          <div>
            <label className="label">Type</label>
            <select name="type" className="input">
              {CUSTOM_FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Options (SELECT type, comma-separated)</label>
            <input name="options" className="input" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="required" defaultChecked className="h-4 w-4" />
            <span className="text-sm text-slate-300">Required</span>
          </div>
          <div>
            <label className="label">Sort order</label>
            <input name="sortOrder" type="number" defaultValue={0} className="input" />
          </div>
          <div className="md:col-span-3">
            <button type="submit" className="btn-primary">
              Add field
            </button>
          </div>
        </form>
      </div>

      <form action={deleteProductAction}>
        <input type="hidden" name="id" value={product.id} />
        <button className="btn-danger">Delete product</button>
      </form>
    </div>
  );
}
