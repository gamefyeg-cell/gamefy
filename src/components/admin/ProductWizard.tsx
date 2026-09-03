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
import { Field, StepHead, WizardProgress, WizardNav, useStepper } from "@/components/admin/wizard-ui";
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
  return {
    saleMode: sm,
    deliveryMethod: deliveryOptionsFor(sm, type)[0],
    stockMode: "MANUAL",
    durationPreset: "1 Month",
    durationCustom: "",
  };
}

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
    setReview(
      (addPricing ? variantKeys : []).map((pk, i) => ({
        platform: pk,
        price: (f.elements.namedItem(`v${i}_price`) as HTMLInputElement)?.value ?? "",
        currency: (f.elements.namedItem(`v${i}_currency`) as HTMLSelectElement)?.value ?? "",
        saleMode: (f.elements.namedItem(`v${i}_saleMode`) as HTMLSelectElement)?.value ?? "",
      }))
    );
  }, [currentKey, addPricing, variantKeys]);

  function setVuiAt(i: number, patch: Partial<VUI>) {
    setVui((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function onTypeChange(nextType: string) {
    setType(nextType);
    setVui((prev) => prev.map(() => makeVUI(nextType)));
    if (nextType !== "GAME" && nextType !== "ACCOUNT") setPlatforms([]);
  }
  function togglePlatform(value: string, on: boolean) {
    setPlatforms((prev) => (on ? [...prev, value] : prev.filter((p) => p !== value)));
  }

  function stepLabel(key: string) {
    if (key === "basics") return "Name";
    if (key === "media") return "Images";
    if (key === "description") return "Description";
    if (key === "platforms") return "Platforms";
    if (key === "review") return "Review";
    const i = Number(key.slice(1));
    const pk = variantKeys[i];
    return pk ? labelFor(PLATFORMS, pk) : "Price";
  }

  const isSub = type === "SUBSCRIPTION";
  const isGame = type === "GAME";

  return (
    <form ref={formRef} action={createProductWizardAction} onSubmit={onSubmit} className="a-wizard flex flex-col gap-5">
      {platforms.map((p) => (
        <input key={p} type="hidden" name="platforms" value={p} />
      ))}
      <input type="hidden" name="variantCount" value={addPricing ? variantKeys.length : 0} />
      <input type="hidden" name="skipPricing" value={addPricing ? "" : "on"} />

      <WizardProgress labels={stepKeys.map(stepLabel)} step={safeStep} maxVisited={maxVisited} onJump={jump} />

      <div className="a-card">
        {/* -------- Name -------- */}
        <div data-stepkey="basics" hidden={currentKey !== "basics"} className="a-step-panel">
          <StepHead title="What are you selling?">Just the name and where it sits in the store.</StepHead>
          <Field label="Product name" required full>
            <input name="title" required className="a-input" placeholder="e.g. EA SPORTS FC 25" />
          </Field>
          <Field label="Category" required>
            <select name="categoryId" required className="a-select" defaultValue={categories[0]?.id}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type" tip="Changes what you're asked next — subscriptions get a plan picker, games/accounts get a step per platform.">
            <select name="type" className="a-select" value={type} onChange={(e) => onTypeChange(e.target.value)}>
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Publisher" hint="Optional.">
            <input name="publisher" className="a-input" placeholder="e.g. EA" />
          </Field>
        </div>

        {/* -------- Images -------- */}
        <div data-stepkey="media" hidden={currentKey !== "media"} className="a-step-panel">
          <StepHead title="Add a picture">Shared by every option — you set this once.</StepHead>
          <Field label="Cover art" hint="Portrait, like a game case. Optional — the first gallery image is used if blank." full>
            <SingleImageUploader name="coverUrl" portrait />
          </Field>
          <Field label="Gallery" hint="Screenshots / wide shots for the product page. One is fine." full>
            <ImageUploader name="images" />
          </Field>
          <details className="a-more">
            <summary>Add a trailer</summary>
            <div className="a-more-body">
              <Field label="YouTube link" hint="Any watch / share / shorts link.">
                <input name="videoUrl" className="a-input" placeholder="https://www.youtube.com/watch?v=…" />
              </Field>
            </div>
          </details>
        </div>

        {/* -------- Description -------- */}
        <div data-stepkey="description" hidden={currentKey !== "description"} className="a-step-panel">
          <StepHead title="Describe it">A short blurb buyers read on the product page.</StepHead>
          <Field label="Description" full>
            <RichTextArea name="description" rows={5} placeholder={"Standard edition.\n- Full game, latest content\n- Instant delivery"} />
          </Field>
          <label className="a-span-2 flex items-start gap-2">
            <input type="checkbox" name="active" defaultChecked className="mt-0.5" />
            <span>
              <span style={{ color: "var(--a-text)" }}>Show on the storefront</span>
              <span className="a-hint !mt-0 block">Uncheck to save it as a draft.</span>
            </span>
          </label>

          <details className="a-more">
            <summary>Add a “before you buy” warning</summary>
            <div className="a-more-body">
              <Field label="Warning text" hint="Shown as a highlighted box — region locks, activation steps, etc.">
                <RichTextArea name="buyerNotice" rows={3} placeholder='e.g. "Requires a VPN set to Turkey during activation"' />
              </Field>
              <label className="flex items-start gap-2">
                <input type="checkbox" name="requiresNoticeAck" className="mt-0.5" />
                <span>
                  <span style={{ color: "var(--a-text)" }}>Make buyers tick “I’ve read this” at checkout</span>
                </span>
              </label>
            </div>
          </details>

          <hr className="a-divider" />
          <label className="a-span-2 flex items-start gap-2">
            <input type="checkbox" checked={addPricing} onChange={(e) => setAddPricing(e.target.checked)} className="mt-0.5" />
            <span>
              <span style={{ color: "var(--a-text)" }}>Set a price now</span>
              <span className="a-hint !mt-0 block">Uncheck to save a draft listing and add prices later.</span>
            </span>
          </label>
        </div>

        {/* -------- Platforms -------- */}
        {showPlatformStep && (
          <div data-stepkey="platforms" hidden={currentKey !== "platforms"} className="a-step-panel">
            <StepHead title="Which platforms?">
              You’ll set a price for each one on its own step. Leave empty for a single option.
            </StepHead>
            <div className="a-span-2 flex flex-wrap gap-2">
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
            <p className="a-span-2 a-hint">
              {platforms.length === 0
                ? "→ one price step"
                : `→ ${platforms.length} step${platforms.length === 1 ? "" : "s"}: ${platforms
                    .map((p) => labelFor(PLATFORMS, p))
                    .join(", ")}`}
            </p>
          </div>
        )}

        {/* -------- Per-platform price -------- */}
        {addPricing &&
          variantKeys.map((pk, i) => {
            const u = vui[i] ?? makeVUI(type);
            const accountFields = u.saleMode === "FULL_ACCOUNT" || u.saleMode === "SHARED_ACCOUNT";
            const durationValue = u.durationPreset === "__custom__" ? u.durationCustom : u.durationPreset;
            return (
              <div key={i} data-stepkey={`v${i}`} hidden={currentKey !== `v${i}`} className="a-step-panel">
                <StepHead title={pk ? `Price — ${labelFor(PLATFORMS, pk)}` : "Price & availability"}>
                  Just the essentials. Everything else has a sensible default under <em>More options</em>.
                </StepHead>
                <input type="hidden" name={`v${i}_platform`} value={pk} />

                <Field label="Price" required>
                  <input name={`v${i}_price`} type="number" step="0.01" min="0" required className="a-input" placeholder="1200" />
                </Field>
                <Field label="Currency">
                  <select name={`v${i}_currency`} defaultValue={DEFAULT_CURRENCY} className="a-select">
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="How it's sold" full tip="Key = buyer redeems a code. Full / Shared Account = you hand over login details. Direct Top-Up = you credit their game account.">
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

                {isSub && (
                  <Field label="Plan length">
                    <select className="a-select" value={u.durationPreset} onChange={(e) => setVuiAt(i, { durationPreset: e.target.value })}>
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

                {u.stockMode === "MANUAL" && (
                  <Field label="How many in stock?" hint="Add the actual keys / credentials from the product page after saving.">
                    <input name={`v${i}_stockQty`} type="number" min="0" className="a-input" placeholder="0" />
                  </Field>
                )}

                <details className="a-more">
                  <summary>More options for this {pk ? "platform" : "option"}</summary>
                  <div className="a-more-body">
                    <Field label="Delivery method" tip="Usually auto-picked from “How it's sold”. Change only if you deliver a different way.">
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
                      <Field label="Edition" hint="Only if you sell more than one (Standard / Deluxe …).">
                        <input name={`v${i}_edition`} className="a-input" placeholder="Standard" />
                      </Field>
                    )}

                    <Field label="Stock type" tip="Manual = you track a count. Unlimited = never runs out. Provider-synced = pulled from a supplier API.">
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
                      <Field label="Sold-out message" hint='Optional — shown instead of "Out of stock" at 0.'>
                        <input name={`v${i}_outOfStockMessage`} className="a-input" placeholder='e.g. "Restocking Sunday"' />
                      </Field>
                    )}

                    <Field label="Where it works" full tip="Global, a zone (Europe, MENA…), or one country. Separate from the price currency.">
                      <ActivationRegionSelect name={`v${i}_activationRegionId`} regions={activationRegions} />
                    </Field>
                    <Field label="Region strictness" tip="How strict the region above is — “works anywhere, may need a VPN” vs. strictly locked.">
                      <select name={`v${i}_regionLockType`} className="a-select" defaultValue="NONE">
                        {REGION_LOCK_TYPES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {accountFields && (
                      <Field label="Warranty (days)" hint="Days you'll replace a dead account. Blank = none.">
                        <input name={`v${i}_warrantyDays`} type="number" min="0" className="a-input" placeholder="e.g. 30" />
                      </Field>
                    )}
                    {accountFields && (
                      <Field label="Account access" tip="Full = buyer may change everything. Login only = shared / rental, no changes.">
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
                      <Field label="Account note" full hint="Shown with the credentials, e.g. “don't change the email or 2FA”.">
                        <input name={`v${i}_accountDeliveryNote`} className="a-input" />
                      </Field>
                    )}

                    <Field label="Activation instructions" full hint="Optional note near the price.">
                      <input name={`v${i}_activationInstructions`} className="a-input" />
                    </Field>
                    <Field label="Redemption instructions" full hint="Optional — how to redeem what they bought.">
                      <input name={`v${i}_redemptionInstructions`} className="a-input" />
                    </Field>
                  </div>
                </details>
              </div>
            );
          })}

        {/* -------- Review -------- */}
        <div data-stepkey="review" hidden={currentKey !== "review"} className="a-step-panel">
          <StepHead title="Ready">Create it now — tweak anything from the product page afterward.</StepHead>
          <div className="a-span-2 grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <span className="a-sub block">Type</span>
              {labelFor(PRODUCT_TYPES, type)}
            </div>
            <div>
              <span className="a-sub block">Platforms</span>
              {platforms.length ? platforms.map((p) => labelFor(PLATFORMS, p)).join(", ") : "Single option"}
            </div>
          </div>

          {!addPricing ? (
            <span className="a-span-2 a-badge a-badge-warn" style={{ justifySelf: "start" }}>
              Draft — no price yet
            </span>
          ) : (
            <div className="a-span-2 a-list">
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
