import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  updateProductAction,
  deleteProductAction,
  createVariantAction,
  createCustomFieldAction,
  deleteCustomFieldAction,
} from "@/lib/actions/admin/products";
import { PRODUCT_TYPES, SALE_MODES, CUSTOM_FIELD_TYPES, PLATFORMS, labelFor } from "@/lib/enums";
import { parseStringArray } from "@/lib/json";
import { formatMoney } from "@/lib/format";
import ImageUploader from "@/components/admin/ImageUploader";
import SingleImageUploader from "@/components/admin/SingleImageUploader";
import RichTextArea from "@/components/admin/RichTextArea";
import VariantForm from "@/components/admin/VariantForm";
import { Field } from "@/components/admin/wizard-ui";

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
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="a-h1">{product.title}</h1>
        <Link href={`/products/${product.slug}`} target="_blank" style={{ color: "var(--a-accent)" }} className="text-sm">
          View on storefront ↗
        </Link>
      </div>

      {/* ---------------- Edit product ---------------- */}
      <form action={updateProductAction} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={product.id} />

        <details className="a-section" open>
          <summary>
            Basics <span className="a-section-note">— name, category, type</span>
          </summary>
          <div className="a-section-body grid gap-4 sm:grid-cols-2">
            <Field label="Product name" tip="Shown on the storefront, cart and receipt. Shared across every platform." required>
              <input name="title" defaultValue={product.title} required className="a-input" />
            </Field>
            <Field label="Slug" tip="The product's web address: /products/<slug>. Changing it breaks old links.">
              <input name="slug" defaultValue={product.slug} className="a-input" />
            </Field>
            <Field label="Category" tip="Which shelf this shows under on the storefront." required>
              <select name="categoryId" defaultValue={product.categoryId} required className="a-select">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type" tip="For your own organising / filtering. Doesn't limit which sale modes you can add.">
              <select name="type" defaultValue={product.type} className="a-select">
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Publisher" tip="Optional — shown as “by …” under the title.">
              <input name="publisher" defaultValue={product.publisher ?? ""} className="a-input" />
            </Field>
            <Field label="Platform badge" tip="A single platform badge for the product. Leave unset when the product has several platform options — the storefront shows a picker from those instead.">
              <select name="platform" defaultValue={product.platform ?? ""} className="a-select">
                <option value="">— Not set —</option>
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </details>

        <details className="a-section" open>
          <summary>
            Media <span className="a-section-note">— shared by every option</span>
          </summary>
          <div className="a-section-body flex flex-col gap-4">
            <Field label="Cover (box art)" tip="Portrait ~2:3. Shown on cards and listings. Falls back to the first gallery image when blank.">
              <SingleImageUploader name="coverUrl" initialUrl={product.coverUrl} portrait />
            </Field>
            <Field label="Gallery images" tip="Landscape shots on the product page. Drag to reorder. One is fine.">
              <ImageUploader name="images" initialUrls={parseStringArray(product.images)} />
            </Field>
            <Field label="YouTube trailer" tip="Any YouTube link — watch, share, or shorts. Shown as a video tile in the gallery.">
              <input
                name="videoUrl"
                defaultValue={product.videoUrl ? `https://www.youtube.com/watch?v=${product.videoUrl}` : ""}
                className="a-input"
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </Field>
          </div>
        </details>

        <details className="a-section" open>
          <summary>
            Details <span className="a-section-note">— description &amp; policies</span>
          </summary>
          <div className="a-section-body flex flex-col gap-4">
            <Field label="Description" tip="Use the B / • List buttons, or type emoji directly.">
              <RichTextArea name="description" rows={4} defaultValue={product.description ?? ""} />
            </Field>
            <Field label="“Before you buy” notice" tip="Highlighted warning box on the product page. Overrides the category default.">
              <RichTextArea name="buyerNotice" rows={3} defaultValue={product.buyerNotice ?? ""} />
            </Field>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="requiresNoticeAck" defaultChecked={product.requiresNoticeAck} className="mt-0.5" />
              <span>
                <span style={{ color: "var(--a-text)" }}>Require checkout acknowledgement</span>
                <span className="a-hint !mt-0 block">Buyer must tick a box confirming they read the notice.</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="active" defaultChecked={product.active} className="mt-0.5" />
              <span>
                <span style={{ color: "var(--a-text)" }}>Active</span>
                <span className="a-hint !mt-0 block">Uncheck to hide from the storefront without deleting.</span>
              </span>
            </label>
          </div>
        </details>

        <details className="a-section">
          <summary>
            Tags &amp; SEO <span className="a-section-note">— optional</span>
          </summary>
          <div className="a-section-body grid gap-4 sm:grid-cols-2">
            <Field label="Tags" tip="Comma-separated. Used for search and filtering." full>
              <input name="tags" defaultValue={parseStringArray(product.tags).join(", ")} className="a-input" />
            </Field>
            <Field label="SEO title" tip="Overrides the page <title>. Leave blank to use the product name.">
              <input name="seoTitle" defaultValue={product.seoTitle ?? ""} className="a-input" />
            </Field>
            <Field label="SEO description" tip="The search-result snippet. Leave blank to derive it from the description.">
              <input name="seoDescription" defaultValue={product.seoDescription ?? ""} className="a-input" />
            </Field>
          </div>
        </details>

        <div className="flex justify-end">
          <button type="submit" className="a-btn a-btn-primary">
            Save changes
          </button>
        </div>
      </form>

      {/* ---------------- Purchase options ---------------- */}
      <div className="flex flex-col gap-3">
        <h2 className="a-h2">Purchase options</h2>
        <p className="a-sub">One row per platform / edition / plan. Each is priced and stocked on its own.</p>
        <div className="a-list">
          {product.variants.length === 0 ? (
            <p className="a-list-empty">No options yet — add one below.</p>
          ) : (
            product.variants.map((v) => (
              <Link key={v.id} href={`/admin/products/${product.id}/variants/${v.id}`} className="a-list-row">
                <div className="min-w-0">
                  <div style={{ color: "var(--a-text)", fontWeight: 550 }}>
                    {[v.platform, v.durationLabel, v.edition].filter(Boolean).join(" · ") || v.sku}
                  </div>
                  <div className="a-sub truncate">
                    {labelFor(SALE_MODES, v.saleMode)} · {formatMoney(v.price, v.currency)} ·{" "}
                    {v.stockMode === "MANUAL" ? `${v.stockQty ?? 0} in stock` : v.stockMode.toLowerCase()} ·{" "}
                    {v.activationRegion ? v.activationRegion.name : "region not set"}
                    {!v.active && " · inactive"}
                  </div>
                </div>
                <span style={{ color: "var(--a-accent)", fontWeight: 600 }} className="shrink-0">
                  Manage ›
                </span>
              </Link>
            ))
          )}
        </div>

        <div>
          <h3 className="a-h2" style={{ fontSize: "0.9rem", margin: "0.5rem 0" }}>
            Add an option
          </h3>
          <VariantForm
            mode="create"
            action={createVariantAction}
            productId={product.id}
            productType={product.type}
            activationRegions={activationRegions}
            skuSuggestion={`${product.slug}-`}
            submitLabel="Add option"
          />
        </div>
      </div>

      {/* ---------------- Custom checkout fields ---------------- */}
      <div className="flex flex-col gap-3">
        <h2 className="a-h2">Custom checkout fields</h2>
        <p className="a-sub">Extra inputs the buyer fills at checkout — e.g. a Player ID for top-ups.</p>
        <div className="a-list">
          {product.customFields.length === 0 ? (
            <p className="a-list-empty">None yet.</p>
          ) : (
            product.customFields.map((f) => (
              <div key={f.id} className="a-list-row">
                <span style={{ color: "var(--a-text)" }}>
                  {f.label}{" "}
                  <span className="a-sub">
                    ({f.fieldKey}, {f.type}
                    {f.required ? ", required" : ""})
                  </span>
                </span>
                <form action={deleteCustomFieldAction}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="productId" value={product.id} />
                  <button className="a-btn a-btn-danger a-btn-sm">Delete</button>
                </form>
              </div>
            ))
          )}
        </div>

        <form action={createCustomFieldAction} className="a-card" style={{ padding: "1rem" }}>
          <input type="hidden" name="productId" value={product.id} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Field key" tip="The stored key, e.g. player_id. Lowercase, no spaces." required>
              <input name="fieldKey" required className="a-input" placeholder="player_id" />
            </Field>
            <Field label="Label" tip="What the buyer sees next to the input." required>
              <input name="label" required className="a-input" placeholder="Player ID / UID" />
            </Field>
            <Field label="Type" tip="Input type. Use Select for a fixed list of choices.">
              <select name="type" className="a-select">
                {CUSTOM_FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Options" tip="For the Select type only — comma-separated choices." full>
              <input name="options" className="a-input" placeholder="NA, EU, ASIA" />
            </Field>
            <Field label="Sort order" tip="Lower numbers show first when there are several fields.">
              <input name="sortOrder" type="number" defaultValue={0} className="a-input" />
            </Field>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="required" defaultChecked />
              <span style={{ color: "var(--a-text)" }}>Required</span>
            </label>
          </div>
          <div className="flex justify-end mt-4">
            <button type="submit" className="a-btn a-btn-primary">
              Add field
            </button>
          </div>
        </form>
      </div>

      <form action={deleteProductAction}>
        <input type="hidden" name="id" value={product.id} />
        <button className="a-btn a-btn-danger">Delete product</button>
      </form>
    </div>
  );
}
