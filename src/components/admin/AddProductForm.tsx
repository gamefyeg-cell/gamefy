"use client";

import { useState } from "react";
import {
  PRODUCT_TYPES,
  SALE_MODES,
  DELIVERY_METHODS,
  STOCK_MODES,
  PLATFORMS,
  labelFor,
} from "@/lib/enums";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currencies";
import { createProductAction } from "@/lib/actions/admin/products";
import ActivationRegionSelect from "@/components/admin/ActivationRegionSelect";
import ImageUploader from "@/components/admin/ImageUploader";
import SingleImageUploader from "@/components/admin/SingleImageUploader";
import RichTextArea from "@/components/admin/RichTextArea";

interface Category {
  id: string;
  name: string;
}
interface ActivationRegion {
  id: string;
  name: string;
  kind: string;
  code: string | null;
  zoneId: string | null;
}

const DURATION_PRESETS = [
  "1 Day",
  "3 Days",
  "7 Days",
  "1 Month",
  "2 Months",
  "3 Months",
  "6 Months",
  "12 Months",
  "Lifetime",
];

/// Which delivery methods make sense for a given sale mode + product type.
function deliveryOptionsFor(saleMode: string, type: string): string[] {
  const isSub = type === "SUBSCRIPTION";
  if (saleMode === "TOPUP_DIRECT") return ["TOPUP_API", "MANUAL_FULFILLMENT"];
  if (saleMode === "FULL_ACCOUNT" || saleMode === "SHARED_ACCOUNT") {
    return isSub
      ? ["SUBSCRIPTION_SHARED_ACCOUNT", "CREDENTIAL_DELIVERY", "MANUAL_FULFILLMENT"]
      : ["CREDENTIAL_DELIVERY", "MANUAL_FULFILLMENT"];
  }
  // KEY
  return isSub ? ["SUBSCRIPTION_CODE", "AUTO_KEY", "MANUAL_FULFILLMENT"] : ["AUTO_KEY", "MANUAL_FULFILLMENT"];
}

function defaultSaleModeFor(type: string): string {
  if (type === "TOPUP") return "TOPUP_DIRECT";
  if (type === "ACCOUNT") return "FULL_ACCOUNT";
  return "KEY";
}

export default function AddProductForm({
  categories,
  activationRegions,
}: {
  categories: Category[];
  activationRegions: ActivationRegion[];
}) {
  const [type, setType] = useState("GAME");
  const [addOption, setAddOption] = useState(true);
  const [saleMode, setSaleMode] = useState("KEY");
  const [deliveryMethod, setDeliveryMethod] = useState("AUTO_KEY");
  const [stockMode, setStockMode] = useState("MANUAL");
  const [durationPreset, setDurationPreset] = useState("1 Month");
  const [durationCustom, setDurationCustom] = useState("");

  const showPlatforms = type === "GAME" || type === "ACCOUNT";
  const showEdition = type === "GAME";
  const isSubscription = type === "SUBSCRIPTION";
  const accountFields = saleMode === "FULL_ACCOUNT" || saleMode === "SHARED_ACCOUNT";
  const isTopup = type === "TOPUP" || saleMode === "TOPUP_DIRECT";
  const deliveryOptions = deliveryOptionsFor(saleMode, type);
  const durationValue = durationPreset === "__custom__" ? durationCustom : durationPreset;

  function onTypeChange(next: string) {
    setType(next);
    const sm = defaultSaleModeFor(next);
    setSaleMode(sm);
    setDeliveryMethod(deliveryOptionsFor(sm, next)[0]);
  }
  function onSaleModeChange(next: string) {
    setSaleMode(next);
    setDeliveryMethod(deliveryOptionsFor(next, type)[0]);
  }

  return (
    <form action={createProductAction} className="flex flex-col gap-3">
      {/* ---------- 1. Basics ---------- */}
      <details className="a-section" open>
        <summary>
          1. Basics <span className="a-section-note">— name, category, what it is</span>
        </summary>
        <div className="a-section-body grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="a-label">
              Title <span className="a-req">*</span>
            </label>
            <input name="title" required className="a-input" placeholder="e.g. EA SPORTS FC 25" />
          </div>

          <div>
            <label className="a-label">
              Category <span className="a-req">*</span>
            </label>
            <select name="categoryId" required className="a-select" defaultValue={categories[0]?.id}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="a-label">Type</label>
            <select name="type" className="a-select" value={type} onChange={(e) => onTypeChange(e.target.value)}>
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="a-hint">Changes which fields below apply — subscriptions get a plan picker, games get platforms, etc.</p>
          </div>

          {showPlatforms && (
            <div className="sm:col-span-2">
              <label className="a-label">Platforms</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <label key={p.value} className="a-chip">
                    <input type="checkbox" name="platforms" value={p.value} />
                    {p.label}
                  </label>
                ))}
              </div>
              <p className="a-hint">
                Tick every platform this is sold for. Pick more than one and step&nbsp;4 creates one purchase
                option per platform — same media &amp; description, each priced and stocked on its own. Buyers pick
                the platform on the product page.
              </p>
            </div>
          )}
        </div>
      </details>

      {/* ---------- 2. Media ---------- */}
      <details className="a-section" open>
        <summary>
          2. Media <span className="a-section-note">— cover art, gallery, trailer</span>
        </summary>
        <div className="a-section-body flex flex-col gap-4">
          <div>
            <label className="a-label">Cover (box art)</label>
            <SingleImageUploader name="coverUrl" portrait />
            <p className="a-hint">Portrait ~2:3, like a game case. Shown on cards and listings. Optional — the first gallery image is used if blank.</p>
          </div>
          <div>
            <label className="a-label">Gallery images</label>
            <ImageUploader name="images" />
            <p className="a-hint">Landscape shots on the product page. One is fine.</p>
          </div>
          <div>
            <label className="a-label">YouTube trailer</label>
            <input name="videoUrl" className="a-input" placeholder="https://www.youtube.com/watch?v=…" />
            <p className="a-hint">Optional. Any YouTube link — watch, share, or shorts.</p>
          </div>
        </div>
      </details>

      {/* ---------- 3. Description & policies ---------- */}
      <details className="a-section" open>
        <summary>
          3. Description &amp; policies <span className="a-section-note">— what buyers read</span>
        </summary>
        <div className="a-section-body flex flex-col gap-4">
          <div>
            <label className="a-label">Description</label>
            <RichTextArea name="description" rows={4} placeholder={"Standard edition.\n- Full game, latest content\n- Instant delivery"} />
            <p className="a-hint">Use the B / • List buttons, or type emoji directly (🎮 ⚡ 🔑).</p>
          </div>
          <div>
            <label className="a-label">&ldquo;Before you buy&rdquo; notice</label>
            <RichTextArea name="buyerNotice" rows={3} placeholder='e.g. "Requires a VPN set to Turkey during activation"' />
            <p className="a-hint">Shown as a highlighted warning box — region locks, activation steps, anything critical.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-8">
            <label className="flex items-start gap-2">
              <input type="checkbox" name="requiresNoticeAck" className="mt-0.5" />
              <span>
                <span style={{ color: "var(--a-text)" }}>Require checkout acknowledgement</span>
                <span className="a-hint !mt-0 block">Buyer must tick a box confirming they read the notice.</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="active" defaultChecked className="mt-0.5" />
              <span>
                <span style={{ color: "var(--a-text)" }}>Active</span>
                <span className="a-hint !mt-0 block">Uncheck to keep it off the storefront for now.</span>
              </span>
            </label>
          </div>
        </div>
      </details>

      {/* ---------- 4. First purchase option ---------- */}
      <details className="a-section" open>
        <summary>
          4. Price &amp; availability <span className="a-section-note">— the first purchase option</span>
        </summary>
        <div className="a-section-body flex flex-col gap-4">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={addOption}
              onChange={(e) => setAddOption(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span style={{ color: "var(--a-text)" }}>Add a purchase option now</span>
              <span className="a-hint !mt-0 block">
                Uncheck to save a bare listing and add options later from the product page.
              </span>
            </span>
          </label>

          {addOption && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="a-label">
                  Price <span className="a-req">*</span>
                </label>
                <input name="price" type="number" step="0.01" min="0" className="a-input" placeholder="1200" />
              </div>
              <div>
                <label className="a-label">Currency</label>
                <select name="currency" defaultValue={DEFAULT_CURRENCY} className="a-select">
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="a-label">Sale mode</label>
                <select name="saleMode" className="a-select" value={saleMode} onChange={(e) => onSaleModeChange(e.target.value)}>
                  {SALE_MODES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="a-label">Delivery method</label>
                <select
                  name="deliveryMethod"
                  className="a-select"
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                >
                  {deliveryOptions.map((d) => (
                    <option key={d} value={d}>
                      {labelFor(DELIVERY_METHODS, d)}
                    </option>
                  ))}
                </select>
              </div>

              {isSubscription && (
                <div>
                  <label className="a-label">Plan length</label>
                  <select
                    className="a-select"
                    value={durationPreset}
                    onChange={(e) => setDurationPreset(e.target.value)}
                  >
                    {DURATION_PRESETS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                    <option value="__custom__">Custom…</option>
                  </select>
                  {durationPreset === "__custom__" && (
                    <input
                      className="a-input mt-2"
                      placeholder="e.g. 2 Weeks"
                      value={durationCustom}
                      onChange={(e) => setDurationCustom(e.target.value)}
                    />
                  )}
                  <p className="a-hint">Add more lengths afterward from the product page — they show as a plan picker.</p>
                </div>
              )}
              {/* durationLabel always submitted; empty for non-subscriptions */}
              <input type="hidden" name="durationLabel" value={isSubscription ? durationValue : ""} />

              {showEdition && (
                <div>
                  <label className="a-label">Edition</label>
                  <input name="edition" className="a-input" placeholder="Standard / Deluxe" />
                  <p className="a-hint">Only if you sell more than one edition.</p>
                </div>
              )}

              <div>
                <label className="a-label">Stock mode</label>
                <select name="stockMode" className="a-select" value={stockMode} onChange={(e) => setStockMode(e.target.value)}>
                  {STOCK_MODES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              {stockMode === "MANUAL" && (
                <div>
                  <label className="a-label">Stock quantity</label>
                  <input name="stockQty" type="number" min="0" className="a-input" placeholder="0" />
                  <p className="a-hint">Add the actual keys/credentials from the product page after saving.</p>
                </div>
              )}
              {stockMode === "MANUAL" && (
                <div className="sm:col-span-2">
                  <label className="a-label">Sold-out message</label>
                  <input name="outOfStockMessage" className="a-input" placeholder='e.g. "Restocking Sunday"' />
                  <p className="a-hint">Optional — shown instead of the default &ldquo;Out of stock&rdquo; once stock hits 0.</p>
                </div>
              )}

              <div className={accountFields ? "" : "sm:col-span-2"}>
                <label className="a-label">Activation region</label>
                <ActivationRegionSelect name="activationRegionId" regions={activationRegions} />
                <p className="a-hint">Where the key/account actually works. Leave Global unless it's region-locked.</p>
              </div>

              {accountFields && (
                <div>
                  <label className="a-label">Warranty (days)</label>
                  <input name="warrantyDays" type="number" min="0" className="a-input" placeholder="e.g. 30" />
                  <p className="a-hint">How long you'll replace a dead account. Blank = none.</p>
                </div>
              )}

              {isTopup && (
                <p className="sm:col-span-2 a-hint" style={{ color: "var(--a-warn)" }}>
                  Top-up products usually need a &ldquo;Player ID&rdquo; field at checkout — add one under
                  <strong> Custom checkout fields</strong> on the product page after saving.
                </p>
              )}
            </div>
          )}
        </div>
      </details>

      {/* ---------- Advanced ---------- */}
      <details className="a-section">
        <summary>
          Advanced <span className="a-section-note">— URL, tags, SEO (all optional)</span>
        </summary>
        <div className="a-section-body grid gap-4 sm:grid-cols-2">
          <div>
            <label className="a-label">Slug</label>
            <input name="slug" className="a-input" placeholder="auto-generated from title" />
            <p className="a-hint">The URL: /products/&lt;slug&gt;. Leave blank to auto-generate.</p>
          </div>
          <div>
            <label className="a-label">Tags</label>
            <input name="tags" className="a-input" placeholder="fps, multiplayer, 2025" />
            <p className="a-hint">Comma-separated. Used for search and filtering.</p>
          </div>
          <div>
            <label className="a-label">SEO title</label>
            <input name="seoTitle" className="a-input" />
          </div>
          <div>
            <label className="a-label">SEO description</label>
            <input name="seoDescription" className="a-input" />
          </div>
        </div>
      </details>

      <div className="flex justify-end pt-1">
        <button type="submit" className="a-btn a-btn-primary">
          Create product
        </button>
      </div>
    </form>
  );
}
