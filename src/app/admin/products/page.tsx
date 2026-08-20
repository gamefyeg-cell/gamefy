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

      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-200 mb-1">Add product</h2>
        <p className="text-xs text-slate-500 mb-4">
          Fill in the "Price" section below to create this product ready to sell in one step. Skip it
          to create a bare listing and add purchase options (e.g. a Key version <em>and</em> an Account
          version) afterward from the product page — either way works.
        </p>
        {categories.length === 0 ? (
          <p className="text-sm text-warn">Create a category first — products need one.</p>
        ) : (
          <form action={createProductAction} className="flex flex-col gap-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Title</label>
                <input name="title" required className="input" placeholder="FIFA 25" />
              </div>
              <div>
                <label className="label">Slug (optional)</label>
                <input name="slug" className="input" placeholder="auto-generated from title" />
                <p className="text-xs text-slate-600 mt-1">
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
              </div>
            </div>

            <div>
              <label className="label">Images (multiple — first one becomes the cover; add just one if that's all you need)</label>
              <ImageUploader name="images" />
            </div>

            <div>
              <label className="label">YouTube trailer (optional)</label>
              <input name="videoUrl" className="input" placeholder="https://www.youtube.com/watch?v=..." />
              <p className="text-xs text-slate-600 mt-1">Paste any YouTube link — watch, share, or shorts. Shown as a video tile in the product gallery.</p>
            </div>

            <div>
              <label className="label">
                Description — supports **bold**, "- " bullet points, and emoji/icons typed directly (🎮 ⚡ 🔑)
              </label>
              <textarea
                name="description"
                rows={4}
                className="input"
                placeholder={"Standard Edition, PC.\n- Full game, latest squads\n- **Instant delivery**"}
              />
            </div>

            <div>
              <label className="label">
                "Before You Buy" notice — shown as its own highlighted box on the product page (same
                **bold** / "- " bullet formatting supported)
              </label>
              <textarea name="buyerNotice" rows={3} className="input" placeholder='e.g. "- Requires a VPN set to Turkey during activation"' />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="requiresNoticeAck" className="h-4 w-4" />
                <span className="text-sm text-slate-300">Require checkout acknowledgement of the notice</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="active" defaultChecked className="h-4 w-4" />
                <span className="text-sm text-slate-300">Active</span>
              </label>
            </div>

            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-1">Price &amp; availability (optional)</h3>
              <p className="text-xs text-slate-500 mb-4">
                Sets up the first purchase option for this product — its price, currency, how it's
                delivered, and where it can be activated (Global, a zone like Europe, or a specific
                country like Egypt).
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Price</label>
                  <input name="price" type="number" step="0.01" className="input" placeholder="1200" />
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
                </div>
                <div>
                  <label className="label">Stock qty (manual mode)</label>
                  <input name="stockQty" type="number" className="input" />
                </div>
                <div>
                  <label className="label">Activation region</label>
                  <ActivationRegionSelect name="activationRegionId" regions={activationRegions} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Sold-out message (optional)</label>
                  <input name="outOfStockMessage" className="input" placeholder='e.g. "Restocking Sunday"' />
                </div>
              </div>
            </div>

            <div>
              <button type="submit" className="btn-primary">
                Create product
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
