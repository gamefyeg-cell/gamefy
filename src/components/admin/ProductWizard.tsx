"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PRODUCT_TYPES,
  SALE_MODES,
  DELIVERY_METHODS,
  STOCK_MODES,
  REGION_LOCK_TYPES,
  ACCOUNT_ACCESS_LEVELS,
  PLATFORMS,
  labelFor,
} from "@/lib/enums";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currencies";
import { createProductWizardAction } from "@/lib/actions/admin/products";
import ActivationRegionSelect from "@/components/admin/ActivationRegionSelect";
import ImageUploader from "@/components/admin/ImageUploader";
import SingleImageUploader from "@/components/admin/SingleImageUploader";
import RichTextArea from "@/components/admin/RichTextArea";
import { Field, Stepper, WizardNav, useStepper } from "@/components/admin/wizard-ui";
import { DURATION_PRESETS, deliveryOptionsFor, defaultSaleModeFor } from "@/lib/variant-options";

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

type VUI = {
  saleMode: string;
  deliveryMethod: string;
  stockMode: string;
  durationPreset: string;
  durationCustom: string;
};
function makeVUI(type: string): VUI {
  const sm = defaultSaleModeFor(type);
  return { saleMode: sm, deliveryMethod: deliveryOptionsFor(sm, type)[0], stockMode: "MANUAL", durationPreset: "1 Month", durationCustom: "" };
}

/* ---------- wizard ---------- */

export default function ProductWizard({
  categories,
  activationRegions,
}: {
  categories: Category[];
  activationRegions: ActivationRegion[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const [type, setType] = useState("GAME");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [addPricing, setAddPricing] = useState(true);
  const [vui, setVui] = useState<VUI[]>([makeVUI("GAME")]);

  const showPlatformStep = type === "GAME" || type === "ACCOUNT";
  const variantKeys = useMemo(() => (platforms.length ? platforms : [""]), [platforms]);

  const stepKeys = useMemo(() => {
    const keys = ["basics", "media", "description"];
    if (showPlatformStep) keys.push("platforms");
    if (addPricing) variantKeys.forEach((_, i) => keys.push(`v${i}`));
    keys.push("review");
    return keys;
  }, [showPlatformStep, addPricing, variantKeys]);

  const { step: safeStep, currentKey, maxVisited, isLast, next, back, jump, onSubmit } = useStepper(formRef, stepKeys);

  // Keep per-variant UI state array the same length as the platform list.
  useEffect(() => {
    setVui((prev) => {
      const want = variantKeys.length;
      if (prev.length === want) return prev;
      const nextArr = prev.slice(0, want);
      while (nextArr.length < want) nextArr.push(makeVUI(type));
      return nextArr;
    });
  }, [variantKeys.length, type]);

  const [review, setReview] = useState<{ platform: string; price: string; currency: string; saleMode: string }[]>([]);
  useEffect(() => {
    if (currentKey !== "review") return;
    const f = formRef.current;
    if (!f) return;
    const rows = (addPricing ? variantKeys : []).map((pk, i) => ({
      platform: pk,
      price: (f.elements.namedItem(`v${i}_price`) as HTMLInputElement)?.value ?? "",
      currency: (f.elements.namedItem(`v${i}_currency`) as HTMLSelectElement)?.value ?? "",
      saleMode: (f.elements.namedItem(`v${i}_saleMode`) as HTMLSelectElement)?.value ?? "",
    }));
    setReview(rows);
  }, [currentKey, addPricing, variantKeys]);

  function setVuiAt(i: number, patch: Partial<VUI>) {
    setVui((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function onTypeChange(next: string) {
    setType(next);
    setVui((prev) => prev.map(() => makeVUI(next)));
    if (next !== "GAME" && next !== "ACCOUNT") setPlatforms([]);
  }
  function togglePlatform(value: string, on: boolean) {
    setPlatforms((prev) => (on ? [...prev, value] : prev.filter((p) => p !== value)));
  }

  function stepLabel(key: string) {
    if (key === "basics") return "Basics";
    if (key === "media") return "Media";
    if (key === "description") return "Details";
    if (key === "platforms") return "Platforms";
    if (key === "review") return "Review";
    const i = Number(key.slice(1));
    const pk = variantKeys[i];
    return pk ? labelFor(PLATFORMS, pk) : "Pricing";
  }

  const isSub = type === "SUBSCRIPTION";
  const isGame = type === "GAME";

  return (
    <form ref={formRef} action={createProductWizardAction} onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* always-submitted hidden fields */}
      {platforms.map((p) => (
        <input key={p} type="hidden" name="platforms" value={p} />
      ))}
      <input type="hidden" name="variantCount" value={addPricing ? variantKeys.length : 0} />
      <input type="hidden" name="skipPricing" value={addPricing ? "" : "on"} />

      <Stepper
        stepKeys={stepKeys}
        labels={stepKeys.map(stepLabel)}
        step={safeStep}
        maxVisited={maxVisited}
        onJump={jump}
      />

      <div className="a-card" style={{ padding: "1.25rem" }}>
        {/* ---------- Basics ---------- */}
        <div data-stepkey="basics" hidden={currentKey !== "basics"} className="grid gap-4 sm:grid-cols-2">
          <Field label="Product name" tip="The game / product name buyers see. Shared across every platform." required full>
            <input name="title" required className="a-input" placeholder="e.g. EA SPORTS FC 25" />
          </Field>
          <Field label="Category" tip="Which shelf this shows under on the storefront (Games, Gift Cards, …)." required>
            <select name="categoryId" required className="a-select" defaultValue={categories[0]?.id}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type" tip="Drives which fields appear later — subscriptions get a plan picker, games/accounts get per-platform options.">
            <select name="type" className="a-select" value={type} onChange={(e) => onTypeChange(e.target.value)}>
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Publisher" tip="Optional — shown as “by …” under the title on the product page.">
            <input name="publisher" className="a-input" placeholder="e.g. EA" />
          </Field>
        </div>

        {/* ---------- Media (shared) ---------- */}
        <div data-stepkey="media" hidden={currentKey !== "media"} className="flex flex-col gap-4">
          <p className="a-sub">These are shared by every platform — one cover, one gallery, one trailer.</p>
          <Field label="Cover (box art)" tip="Portrait ~2:3, like a game case. Shown on cards and listings. Optional — the first gallery image is used if left blank.">
            <SingleImageUploader name="coverUrl" portrait />
          </Field>
          <Field label="Gallery images" tip="Landscape screenshots / key art on the product page. One is fine. Drag to reorder.">
            <ImageUploader name="images" />
          </Field>
          <Field label="YouTube trailer" tip="Optional. Paste any YouTube link — watch, share, or shorts. Shown as a video tile in the gallery.">
            <input name="videoUrl" className="a-input" placeholder="https://www.youtube.com/watch?v=…" />
          </Field>
        </div>

        {/* ---------- Details (shared) ---------- */}
        <div data-stepkey="description" hidden={currentKey !== "description"} className="flex flex-col gap-4">
          <Field label="Description" tip="Shared across platforms. Use the B / • List buttons, or type emoji directly (🎮 ⚡ 🔑).">
            <RichTextArea name="description" rows={4} placeholder={"Standard edition.\n- Full game, latest content\n- Instant delivery"} />
          </Field>
          <Field label="“Before you buy” notice" tip="A highlighted warning box on the product page — region locks, activation steps, anything critical.">
            <RichTextArea name="buyerNotice" rows={3} placeholder='e.g. "Requires a VPN set to Turkey during activation"' />
          </Field>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="requiresNoticeAck" className="mt-0.5" />
            <span>
              <span style={{ color: "var(--a-text)" }}>Require checkout acknowledgement</span>
              <span className="a-hint !mt-0 block">Buyer must tick a box confirming they read the notice above before paying.</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="active" defaultChecked className="mt-0.5" />
            <span>
              <span style={{ color: "var(--a-text)" }}>Active</span>
              <span className="a-hint !mt-0 block">Uncheck to keep it off the storefront for now.</span>
            </span>
          </label>
          <hr className="a-divider" />
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={addPricing} onChange={(e) => setAddPricing(e.target.checked)} className="mt-0.5" />
            <span>
              <span style={{ color: "var(--a-text)" }}>Add pricing &amp; availability now</span>
              <span className="a-hint !mt-0 block">
                On = the next steps set price / stock / delivery for each platform. Off = save a bare listing and add
                options later from the product page.
              </span>
            </span>
          </label>
        </div>

        {/* ---------- Platforms ---------- */}
        {showPlatformStep && (
          <div data-stepkey="platforms" hidden={currentKey !== "platforms"} className="flex flex-col gap-3">
            <p className="a-sub">
              Pick every platform this is sold for. Each gets its <strong>own</strong> price, stock, activation region and
              delivery on its own step — only the name, cover, gallery and description are shared. Leave all unticked for
              a single option with no platform.
            </p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <label key={p.value} className="a-chip">
                  <input
                    type="checkbox"
                    checked={platforms.includes(p.value)}
                    onChange={(e) => togglePlatform(p.value, e.target.checked)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
            <p className="a-sub">
              {platforms.length === 0
                ? "→ 1 pricing step"
                : `→ ${platforms.length} platform step${platforms.length === 1 ? "" : "s"}: ${platforms
                    .map((p) => labelFor(PLATFORMS, p))
                    .join(", ")}`}
            </p>
          </div>
        )}

        {/* ---------- Per-platform variant steps ---------- */}
        {addPricing &&
          variantKeys.map((pk, i) => {
            const u = vui[i] ?? makeVUI(type);
            const accountFields = u.saleMode === "FULL_ACCOUNT" || u.saleMode === "SHARED_ACCOUNT";
            const durationValue = u.durationPreset === "__custom__" ? u.durationCustom : u.durationPreset;
            return (
              <div key={i} data-stepkey={`v${i}`} hidden={currentKey !== `v${i}`} className="flex flex-col gap-4">
                <p className="a-sub">
                  {pk ? (
                    <>
                      Data for <strong>{labelFor(PLATFORMS, pk)}</strong> only.
                    </>
                  ) : (
                    "This product's single purchase option."
                  )}
                </p>
                <input type="hidden" name={`v${i}_platform`} value={pk} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Price" tip="What the buyer pays for this platform, before any discount." required>
                    <input name={`v${i}_price`} type="number" step="0.01" min="0" required className="a-input" placeholder="1200" />
                  </Field>
                  <Field label="Currency" tip="Shown next to the price on the storefront.">
                    <select name={`v${i}_currency`} defaultValue={DEFAULT_CURRENCY} className="a-select">
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Sale mode" tip="Key = buyer redeems a code themselves. Full / Shared Account = you deliver login credentials. Direct Top-Up = you credit their game account.">
                    <select
                      name={`v${i}_saleMode`}
                      className="a-select"
                      value={u.saleMode}
                      onChange={(e) => setVuiAt(i, { saleMode: e.target.value, deliveryMethod: deliveryOptionsFor(e.target.value, type)[0] })}
                    >
                      {SALE_MODES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Delivery method" tip="How this reaches the buyer once payment is verified — automatically from uploaded stock, or manually by your team.">
                    <select
                      name={`v${i}_deliveryMethod`}
                      className="a-select"
                      value={u.deliveryMethod}
                      onChange={(e) => setVuiAt(i, { deliveryMethod: e.target.value })}
                    >
                      {deliveryOptionsFor(u.saleMode, type).map((d) => (
                        <option key={d} value={d}>
                          {labelFor(DELIVERY_METHODS, d)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {isGame && (
                    <Field label="Edition" tip="Only if you sell more than one edition of this platform (Standard / Deluxe / …).">
                      <input name={`v${i}_edition`} className="a-input" placeholder="Standard / Deluxe" />
                    </Field>
                  )}
                  {isSub && (
                    <Field label="Plan length" tip="The subscription length this option grants. Add more lengths later from the product page — they show as a plan picker.">
                      <select
                        className="a-select"
                        value={u.durationPreset}
                        onChange={(e) => setVuiAt(i, { durationPreset: e.target.value })}
                      >
                        {DURATION_PRESETS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                        <option value="__custom__">Custom…</option>
                      </select>
                      {u.durationPreset === "__custom__" && (
                        <input
                          className="a-input mt-2"
                          placeholder="e.g. 2 Weeks"
                          value={u.durationCustom}
                          onChange={(e) => setVuiAt(i, { durationCustom: e.target.value })}
                        />
                      )}
                    </Field>
                  )}
                  <input type="hidden" name={`v${i}_durationLabel`} value={isSub ? durationValue : ""} />

                  <Field label="Stock mode" tip="Manual = you track an exact count and upload keys/credentials. Unlimited = never runs out. Provider-synced = pulled from a supplier API.">
                    <select
                      name={`v${i}_stockMode`}
                      className="a-select"
                      value={u.stockMode}
                      onChange={(e) => setVuiAt(i, { stockMode: e.target.value })}
                    >
                      {STOCK_MODES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {u.stockMode === "MANUAL" && (
                    <Field label="Stock quantity" tip="Starting count. Upload the actual keys / credentials from the product page after saving.">
                      <input name={`v${i}_stockQty`} type="number" min="0" className="a-input" placeholder="0" />
                    </Field>
                  )}
                  {u.stockMode === "MANUAL" && (
                    <Field label="Sold-out message" tip="Optional — shown instead of the default “Out of stock” once this platform hits 0." full>
                      <input name={`v${i}_outOfStockMessage`} className="a-input" placeholder='e.g. "Restocking Sunday"' />
                    </Field>
                  )}

                  <Field label="Activation region" tip="Where this key / account actually works — Global, a zone (Europe, MENA…), or one country. Separate from the price currency.">
                    <ActivationRegionSelect name={`v${i}_activationRegionId`} regions={activationRegions} />
                  </Field>
                  <Field label="Region lock" tip="How strict the activation region is — “works anywhere, may need a VPN” vs. strictly tied to that region.">
                    <select name={`v${i}_regionLockType`} className="a-select" defaultValue="NONE">
                      {REGION_LOCK_TYPES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {accountFields && (
                    <Field label="Warranty (days)" tip="How long you'll replace this account if it stops working. Leave blank for none.">
                      <input name={`v${i}_warrantyDays`} type="number" min="0" className="a-input" placeholder="e.g. 30" />
                    </Field>
                  )}
                  {accountFields && (
                    <Field label="Account access" tip="Full = buyer may change email / password / everything. Login only = shared or rental, buyer must not change anything.">
                      <select name={`v${i}_accountAccessLevel`} className="a-select" defaultValue="">
                        <option value="">—</option>
                        {ACCOUNT_ACCESS_LEVELS.map((a) => (
                          <option key={a.value} value={a.value}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {accountFields && (
                    <Field label="Account delivery note" tip="Shown with the delivered credentials — e.g. “do not change the email or enable 2FA”." full>
                      <input name={`v${i}_accountDeliveryNote`} className="a-input" placeholder="e.g. do not change email / region / 2FA" />
                    </Field>
                  )}

                  <Field label="Activation instructions" tip="Optional note shown near the price — e.g. “requires a VPN set to Turkey during activation”." full>
                    <input name={`v${i}_activationInstructions`} className="a-input" />
                  </Field>
                  <Field label="Redemption instructions" tip="Optional — how the buyer actually uses what they bought, e.g. “Steam → Games → Activate a Product”." full>
                    <input name={`v${i}_redemptionInstructions`} className="a-input" />
                  </Field>
                </div>
              </div>
            );
          })}

        {/* ---------- Review ---------- */}
        <div data-stepkey="review" hidden={currentKey !== "review"} className="flex flex-col gap-4">
          <p className="a-sub">Check everything, then create. You can edit any field afterward from the product page.</p>
          <div className="a-card" style={{ padding: "0.9rem", background: "var(--a-panel-2)" }}>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div>
                <span className="a-sub block">Type</span>
                {labelFor(PRODUCT_TYPES, type)}
              </div>
              <div>
                <span className="a-sub block">Platforms</span>
                {platforms.length ? platforms.map((p) => labelFor(PLATFORMS, p)).join(", ") : "Single option"}
              </div>
            </div>
          </div>

          {!addPricing ? (
            <p className="a-badge a-badge-warn" style={{ alignSelf: "flex-start" }}>
              Bare listing — no purchase option yet
            </p>
          ) : (
            <div className="a-list">
              {review.map((r, i) => (
                <div key={i} className="a-list-row">
                  <span style={{ color: "var(--a-text)", fontWeight: 550 }}>
                    {r.platform ? labelFor(PLATFORMS, r.platform) : "Option"}
                  </span>
                  <span className="a-sub">
                    {r.price ? `${r.price} ${r.currency}` : "no price"} · {labelFor(SALE_MODES, r.saleMode)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <WizardNav step={safeStep} isLast={isLast} submitLabel="Create product" onBack={back} onNext={next} />
      </div>
    </form>
  );
}
