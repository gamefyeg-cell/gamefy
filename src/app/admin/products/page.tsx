import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createProductAction } from "@/lib/actions/admin/products";
import {
  PRODUCT_TYPES,
  SALE_MODES,
  DELIVERY_METHODS,
  STOCK_MODES,
  PLATFORMS,
  labelFor,
} from "@/lib/enums";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currencies";
import ActivationRegionSelect from "@/components/admin/ActivationRegionSelect";
import ImageUploader from "@/components/admin/ImageUploader";
import SingleImageUploader from "@/components/admin/SingleImageUploader";
import RichTextArea from "@/components/admin/RichTextArea";

export default async function AdminProductsPage() {
  const [products, categories, activationRegions] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: true, variants: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.activationRegion.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-white">Products</h1>

      <div className="card divide-y divide-border">
        {products.length === 0 && <p className="p-4 text-slate-500 text-sm">No products yet.</p>}
        {products.map((p) => (
          <Link key={p.id} href={`/admin/products/${p.id}`} className="flex items-center justify-between p-3 text-sm hover:bg-surface2">
            <div>
              <span className="text-slate-100">{p.title}</span>
              <span className="text-slate-500 ml-2 text-xs">
                {p.category.name} · {labelFor(PRODUCT_TYPES, p.type)} · {p.variants.length} variant(s)
              </span>
              {!p.active && <span className="badge bg-surface2 border border-border text-slate-500 ml-2">inactive</span>}
            </div>
            <span className="text-accent-soft text-xs">Edit →</span>
          </Link>
        ))}
      </div>

      <div className="card p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-white mb-1">Add product</h2>
        <p className="text-sm text-slate-500 mb-8 max-w-2xl">
          Fill in <strong className="text-slate-400">Step 4 — Price &amp; availability</strong> to create this
          product ready to sell in one step. Skip it to create a bare listing and add purchase options (e.g. a
          Key version <em>and</em> an Account version) afterward from the product page — either way works.
        </p>
        {categories.length === 0 ? (
          <p className="text-sm text-warn">Create a category first — products need one.</p>
        ) : (
          <form action={createProductAction} className="flex flex-col gap-9">
            {/* --- Step 1: Basics --- */}
            <div className="flex flex-col gap-4">
              <div className="form-section-heading">
                <span className="text-base">🧩</span>
                <span>1. Basics</span>
                <span className="badge bg-danger/10 text-danger border border-danger/30 ml-1 text-[10px]">Required</span>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="label">Title</label>
                  <input name="title" required className="input" placeholder="FIFA 25" />
                  <p className="hint">The product's name — shown on the storefront, in the cart, and on the buyer's receipt.</p>
                </div>
                <div>
                  <label className="label">Slug (optional)</label>
                  <input name="slug" className="input" placeholder="auto-generated from title" />
                  <p className="hint">
                    The web address for this product, e.g. "FIFA 25" → <code>/products/fifa-25</code>. Leave
                    blank and it's generated for you — only change it if you want a specific URL.
                  </p>
                </div>
                <div>
                  <label className="label">Category</label>
                  <select name="categoryId" required className="input">
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="hint">Which shelf this shows under on the storefront (e.g. Games, Gift Cards).</p>
                </div>
                <div>
                  <label className="label">Type</label>
                  <select name="type" className="input">
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <p className="hint">For your own organization/filtering only — it doesn't limit which sale modes you can add below.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => (
                      <label
                        key={p.value}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface2 px-3 py-1.5 text-sm text-slate-300 cursor-pointer transition-colors has-[:checked]:border-accent has-[:checked]:text-white"
                      >
                        <input type="checkbox" name="platforms" value={p.value} className="h-3.5 w-3.5" />
                        {p.label}
                      </label>
                    ))}
                  </div>
                  <p className="hint">
                    Tick every platform this game is sold for. Pick more than one (e.g. PC + PlayStation) and
                    Step&nbsp;4 creates one purchase option per platform — same cover, description and gallery,
                    each independently priced and stocked. Buyers pick the platform on the product page. Leave
                    all unticked if platform doesn't apply.
                  </p>
                </div>
              </div>
            </div>

            {/* --- Step 2: Media --- */}
            <div className="flex flex-col gap-4 border-t border-border pt-8">
              <div className="form-section-heading">
                <span className="text-base">🖼️</span>
                <span>2. Media</span>
              </div>
              <div>
                <label className="label">Cover (box art)</label>
                <SingleImageUploader name="coverUrl" portrait />
                <p className="hint">Portrait box art (roughly 2:3, like a game case) — this is what shows on cards and listings across the site. Optional: leave blank and the first image below is used instead.</p>
              </div>
              <div>
                <label className="label">Images</label>
                <ImageUploader name="images" />
                <p className="hint">The landscape gallery on the product page — screenshots, key art, wide shots. One photo is fine.</p>
              </div>
              <div>
                <label className="label">YouTube trailer (optional)</label>
                <input name="videoUrl" className="input" placeholder="https://www.youtube.com/watch?v=..." />
                <p className="hint">Paste any YouTube link — watch, share, or shorts. Shown as a video tile alongside the photos.</p>
              </div>
            </div>

            {/* --- Step 3: Description & policies --- */}
            <div className="flex flex-col gap-4 border-t border-border pt-8">
              <div className="form-section-heading">
                <span className="text-base">📝</span>
                <span>3. Description &amp; policies</span>
              </div>
              <div>
                <label className="label">Description</label>
                <RichTextArea
                  name="description"
                  rows={4}
                  placeholder={"Standard Edition, PC.\n- Full game, latest squads\n- Instant delivery"}
                />
                <p className="hint">Use the B / • List buttons above, or type emoji/icons directly (🎮 ⚡ 🔑).</p>
              </div>
              <div>
                <label className="label">"Before You Buy" notice</label>
                <RichTextArea name="buyerNotice" rows={3} placeholder='e.g. "Requires a VPN set to Turkey during activation"' />
                <p className="hint">
                  Shown as its own highlighted warning box on the product page — for anything a buyer must know
                  before purchasing (region locks, activation steps).
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                <label className="flex items-start gap-2">
                  <input type="checkbox" name="requiresNoticeAck" className="h-4 w-4 mt-0.5" />
                  <span className="flex flex-col">
                    <span className="text-sm text-slate-300">Require checkout acknowledgement</span>
                    <span className="hint !mt-0">Buyer must tick a box confirming they read the notice above before they can pay.</span>
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input type="checkbox" name="active" defaultChecked className="h-4 w-4 mt-0.5" />
                  <span className="flex flex-col">
                    <span className="text-sm text-slate-300">Active</span>
                    <span className="hint !mt-0">Unchecking hides this product from the storefront immediately, without deleting it.</span>
                  </span>
                </label>
              </div>
            </div>

            {/* --- Step 4: Price & availability --- */}
            <div className="flex flex-col gap-4 border-t border-border pt-8">
              <div className="form-section-heading">
                <span className="text-base">💰</span>
                <span>4. Price &amp; availability</span>
                <span className="badge bg-surface2 border border-border text-slate-500 ml-1 text-[10px]">Optional</span>
              </div>
              <p className="text-xs text-slate-500 -mt-2">
                Sets up the first purchase option for this product — its price, currency, how it's delivered, and
                where it can be activated. Leave "Price" blank to create a bare listing with no purchase option yet.
                If you ticked more than one platform above, these values seed one option per platform — adjust each
                one's price and stock afterward from the product page.
              </p>
              <div className="grid md:grid-cols-3 gap-5">
                <div>
                  <label className="label">Price</label>
                  <input name="price" type="number" step="0.01" className="input" placeholder="1200" />
                  <p className="hint">What the buyer pays, before any discount is applied.</p>
                </div>
                <div>
                  <label className="label">Currency</label>
                  <select name="currency" defaultValue={DEFAULT_CURRENCY} className="input">
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="hint">Shown next to the price everywhere on the storefront.</p>
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
                  <label className="label">Duration / plan (subscriptions)</label>
                  <input name="durationLabel" className="input" placeholder="1 Month / 3 Months / Lifetime" />
                  <p className="hint">
                    Selling multiple lengths? Add this product once, then add one variant per length from the
                    product page afterward — they'll show as a plan picker.
                  </p>
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
                  <p className="hint">How this reaches the buyer after payment is verified — automatically from stock, or manually by you.</p>
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
                  <p className="hint">Manual = you track an exact count. Unlimited = never runs out (e.g. generated on demand).</p>
                </div>
                <div>
                  <label className="label">Stock qty</label>
                  <input name="stockQty" type="number" className="input" />
                  <p className="hint">Only used when Stock mode above is "Manual count".</p>
                </div>
                <div>
                  <label className="label">Activation region</label>
                  <ActivationRegionSelect name="activationRegionId" regions={activationRegions} />
                  <p className="hint">Where this key/account actually works. Leave as Global unless it's region-locked.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Sold-out message (optional)</label>
                  <input name="outOfStockMessage" className="input" placeholder='e.g. "Restocking Sunday"' />
                  <p className="hint">Shown instead of the default "Out of stock" text once stock hits 0.</p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <button type="submit" className="btn-primary !px-6 !py-2.5">
                Create product
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
