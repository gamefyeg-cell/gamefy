"use client";

import { useMemo, useRef, useState } from "react";
import {
  SALE_MODES,
  DELIVERY_METHODS,
  STOCK_MODES,
  REGION_LOCK_TYPES,
  ACCOUNT_ACCESS_LEVELS,
  PLATFORMS,
  labelFor,
} from "@/lib/enums";
import { CURRENCIES, DEFAULT_CURRENCY } from "@/lib/currencies";
import { DURATION_PRESETS, deliveryOptionsFor, defaultSaleModeFor, splitDuration } from "@/lib/variant-options";
import ActivationRegionSelect from "@/components/admin/ActivationRegionSelect";
import { Field, StepHead, WizardProgress, WizardNav, useStepper } from "@/components/admin/wizard-ui";

interface ActivationRegion {
  id: string;
  name: string;
  kind: string;
  code: string | null;
  zoneId: string | null;
}

export interface VariantDefaults {
  sku?: string;
  platform?: string | null;
  edition?: string | null;
  durationLabel?: string | null;
  saleMode?: string;
  deliveryMethod?: string;
  price?: number;
  cost?: number | null;
  currency?: string;
  stockMode?: string;
  stockQty?: number | null;
  outOfStockMessage?: string | null;
  activationRegionId?: string | null;
  regionLockType?: string;
  warrantyDays?: number | null;
  accountAccessLevel?: string | null;
  accountDeliveryNote?: string | null;
  activationInstructions?: string | null;
  redemptionInstructions?: string | null;
  active?: boolean;
}

/**
 * One purchase option's fieldset as a calm 3-step flow — essentials first,
 * the rest behind their own steps. Shared by "Add an option" (create) and
 * the single-option edit page. Field names match variantFieldsFrom() in
 * src/lib/actions/admin/products.ts.
 */
export default function VariantForm({
  action,
  productId,
  productType,
  activationRegions,
  mode,
  variantId,
  defaults = {},
  skuSuggestion,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  productId: string;
  productType: string;
  activationRegions: ActivationRegion[];
  mode: "create" | "edit";
  variantId?: string;
  defaults?: VariantDefaults;
  skuSuggestion?: string;
  submitLabel: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const initialSaleMode = defaults.saleMode ?? defaultSaleModeFor(productType);
  const [saleMode, setSaleMode] = useState(initialSaleMode);
  const [deliveryMethod, setDeliveryMethod] = useState(
    defaults.deliveryMethod ?? deliveryOptionsFor(initialSaleMode, productType)[0]
  );
  const [stockMode, setStockMode] = useState(defaults.stockMode ?? "MANUAL");

  const initialDuration = splitDuration(defaults.durationLabel);
  const [durationPreset, setDurationPreset] = useState(initialDuration.preset);
  const [durationCustom, setDurationCustom] = useState(initialDuration.custom);

  const isGame = productType === "GAME";
  const isSub = productType === "SUBSCRIPTION";
  const accountFields = saleMode === "FULL_ACCOUNT" || saleMode === "SHARED_ACCOUNT";
  const durationValue = durationPreset === "__custom__" ? durationCustom : durationPreset;

  const deliveryOpts = useMemo(() => {
    const base = deliveryOptionsFor(saleMode, productType);
    return base.includes(deliveryMethod) ? base : [deliveryMethod, ...base];
  }, [saleMode, productType, deliveryMethod]);

  const stepKeys = ["basics", "delivery", "region"];
  const { step, maxVisited, currentKey, isLast, next, back, jump, onSubmit } = useStepper(formRef, stepKeys);

  return (
    <form ref={formRef} action={action} onSubmit={onSubmit} className="a-wizard flex flex-col gap-5">
      <input type="hidden" name="productId" value={productId} />
      {mode === "edit" && variantId && <input type="hidden" name="id" value={variantId} />}

      <WizardProgress labels={["Basics", "Delivery & stock", "Region & notes"]} step={step} maxVisited={maxVisited} onJump={jump} />

      <div className="a-card">
        {/* -------- Basics -------- */}
        <div data-stepkey="basics" hidden={currentKey !== "basics"} className="a-step-panel">
          <StepHead title="The essentials">Price and how it's sold. Everything else has a default on the next steps.</StepHead>

          <Field label="SKU" tip="Your internal code for this exact option. Must be unique across the store." required>
            <input
              name="sku"
              required
              className="a-input"
              defaultValue={defaults.sku ?? skuSuggestion ?? ""}
              placeholder="e.g. fifa-25-pc"
            />
          </Field>
          <Field label="Platform" hint="Set it when the product is sold for more than one platform.">
            <select name="platform" className="a-select" defaultValue={defaults.platform ?? ""}>
              <option value="">— Not set —</option>
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="a-pair">
            <Field label="Price" required>
              <input name="price" type="number" step="0.01" min="0" required className="a-input" defaultValue={defaults.price ?? ""} />
            </Field>
            <Field label="Currency">
              <select name="currency" className="a-select" defaultValue={defaults.currency ?? DEFAULT_CURRENCY} required>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="How it's sold" tip="Key = buyer redeems a code. Full / Shared Account = you hand over login details. Direct Top-Up = you credit their game account.">
            <select
              name="saleMode"
              className="a-select"
              value={saleMode}
              onChange={(e) => {
                setSaleMode(e.target.value);
                setDeliveryMethod(deliveryOptionsFor(e.target.value, productType)[0]);
              }}
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
              <select className="a-select" value={durationPreset} onChange={(e) => setDurationPreset(e.target.value)}>
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
            </Field>
          )}
          <input type="hidden" name="durationLabel" value={isSub ? durationValue : defaults.durationLabel ?? ""} />

          {stockMode === "MANUAL" && (
            <Field label="How many in stock?" hint="Upload the actual keys / credentials below after saving.">
              <input name="stockQty" type="number" min="0" className="a-input" defaultValue={defaults.stockQty ?? ""} />
            </Field>
          )}

          {mode === "edit" && (
            <details className="a-more">
              <summary>Supplier cost (for your margin only)</summary>
              <div className="a-more-body">
                <Field label="Cost" hint="Never shown to buyers.">
                  <input name="cost" type="number" step="0.01" min="0" className="a-input" defaultValue={defaults.cost ?? ""} />
                </Field>
              </div>
            </details>
          )}
          {mode === "create" && <input type="hidden" name="cost" value="" />}
          {!isGame && !isSub && <input type="hidden" name="edition" value={defaults.edition ?? ""} />}
        </div>

        {/* -------- Delivery & stock -------- */}
        <div data-stepkey="delivery" hidden={currentKey !== "delivery"} className="a-step-panel">
          <StepHead title="Delivery &amp; stock">These are pre-filled — change only what you need to.</StepHead>

          <Field label="Delivery method" tip="Usually matches “How it's sold”. Change only if you deliver a different way.">
            <select name="deliveryMethod" className="a-select" value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)}>
              {deliveryOpts.map((d) => (
                <option key={d} value={d}>
                  {labelFor(DELIVERY_METHODS, d)}
                </option>
              ))}
            </select>
          </Field>

          {isGame && (
            <Field label="Edition" hint="Only if you sell more than one (Standard / Deluxe …).">
              <input name="edition" className="a-input" defaultValue={defaults.edition ?? ""} placeholder="Standard" />
            </Field>
          )}

          <Field label="Stock type" tip="Manual = you track a count. Unlimited = never runs out. Provider-synced = pulled from a supplier API.">
            <select name="stockMode" className="a-select" value={stockMode} onChange={(e) => setStockMode(e.target.value)}>
              {STOCK_MODES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          {stockMode === "MANUAL" && (
            <Field label="Sold-out message" hint='Optional — shown instead of "Out of stock" at 0.'>
              <input
                name="outOfStockMessage"
                className="a-input"
                defaultValue={defaults.outOfStockMessage ?? ""}
                placeholder='e.g. "Restocking Sunday"'
              />
            </Field>
          )}
        </div>

        {/* -------- Region & notes -------- */}
        <div data-stepkey="region" hidden={currentKey !== "region"} className="a-step-panel">
          <StepHead title="Region &amp; notes">All optional. Skip straight to save if none apply.</StepHead>

          <Field label="Where it works" tip="Global, a zone (Europe, MENA…), or one country. Separate from the price currency.">
            <ActivationRegionSelect name="activationRegionId" regions={activationRegions} defaultValue={defaults.activationRegionId ?? ""} />
          </Field>
          <Field label="Region strictness" tip="How strict the region above is — “works anywhere, may need a VPN” vs. strictly locked.">
            <select name="regionLockType" className="a-select" defaultValue={defaults.regionLockType ?? "NONE"}>
              {REGION_LOCK_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>

          {accountFields && (
            <Field label="Warranty (days)" hint="Days you'll replace a dead account. Blank = none.">
              <input name="warrantyDays" type="number" min="0" className="a-input" defaultValue={defaults.warrantyDays ?? ""} />
            </Field>
          )}
          {accountFields && (
            <Field label="Account access" tip="Full = buyer may change everything. Login only = shared / rental, no changes.">
              <select name="accountAccessLevel" className="a-select" defaultValue={defaults.accountAccessLevel ?? ""}>
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
            <Field label="Account note" hint="Shown with the credentials, e.g. “don't change the email or 2FA”.">
              <input name="accountDeliveryNote" className="a-input" defaultValue={defaults.accountDeliveryNote ?? ""} />
            </Field>
          )}

          <Field label="Activation instructions" hint="Optional note near the price.">
            <input name="activationInstructions" className="a-input" defaultValue={defaults.activationInstructions ?? ""} />
          </Field>
          <Field label="Redemption instructions" hint="Optional — how to redeem what they bought.">
            <input name="redemptionInstructions" className="a-input" defaultValue={defaults.redemptionInstructions ?? ""} />
          </Field>

          <label className="flex items-start gap-2">
            <input type="checkbox" name="active" defaultChecked={defaults.active ?? true} className="mt-0.5" />
            <span>
              <span style={{ color: "var(--a-text)" }}>Show on the storefront</span>
              <span className="a-hint !mt-0 block">Uncheck to hide just this option.</span>
            </span>
          </label>
        </div>

        <WizardNav step={step} isLast={isLast} submitLabel={submitLabel} onBack={back} onNext={next} />
      </div>
    </form>
  );
}
