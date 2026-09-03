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
import { Field, Stepper, WizardNav, useStepper } from "@/components/admin/wizard-ui";

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
 * One product option's full fieldset, as a 3-step mini-wizard with ⓘ help
 * on every field. Shared by "Add option" (create) and the single-variant
 * edit page. All field names match variantFieldsFrom() in
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

  // Keep the saved value selectable even if it's outside the "sensible" set.
  const deliveryOpts = useMemo(() => {
    const base = deliveryOptionsFor(saleMode, productType);
    return base.includes(deliveryMethod) ? base : [deliveryMethod, ...base];
  }, [saleMode, productType, deliveryMethod]);

  const stepKeys = ["option", "pricing", "region"];
  const { step, maxVisited, currentKey, isLast, next, back, jump, onSubmit } = useStepper(formRef, stepKeys);

  return (
    <form ref={formRef} action={action} onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="productId" value={productId} />
      {mode === "edit" && variantId && <input type="hidden" name="id" value={variantId} />}

      <Stepper
        stepKeys={stepKeys}
        labels={["Option", "Price & stock", "Region & notes"]}
        step={step}
        maxVisited={maxVisited}
        onJump={jump}
      />

      <div className="a-card" style={{ padding: "1.25rem" }}>
        {/* ---------- Option ---------- */}
        <div data-stepkey="option" hidden={currentKey !== "option"} className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU" tip="Your internal code for this exact option. Must be unique across the whole store." required>
            <input
              name="sku"
              required
              className="a-input"
              defaultValue={defaults.sku ?? skuSuggestion ?? ""}
              placeholder="e.g. fifa-25-pc"
            />
          </Field>
          <Field label="Platform" tip="Which platform this option is for. Set it whenever the product is sold for more than one platform — the storefront then shows a platform picker.">
            <select name="platform" className="a-select" defaultValue={defaults.platform ?? ""}>
              <option value="">— Not set —</option>
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sale mode" tip="Key = buyer redeems a code themselves. Full / Shared Account = you deliver login credentials. Direct Top-Up = you credit their game account.">
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
          <Field label="Delivery method" tip="How this reaches the buyer once payment is verified — automatically from uploaded stock, or manually by your team.">
            <select
              name="deliveryMethod"
              className="a-select"
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value)}
            >
              {deliveryOpts.map((d) => (
                <option key={d} value={d}>
                  {labelFor(DELIVERY_METHODS, d)}
                </option>
              ))}
            </select>
          </Field>

          {isGame && (
            <Field label="Edition" tip="Only if you sell more than one edition (Standard / Deluxe / …).">
              <input name="edition" className="a-input" defaultValue={defaults.edition ?? ""} placeholder="Standard / Deluxe" />
            </Field>
          )}
          {isSub && (
            <Field label="Plan length" tip="The subscription length this option grants. Add one option per length — they show as a plan picker on the product page.">
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
          {!isGame && !isSub && <input type="hidden" name="edition" value={defaults.edition ?? ""} />}
        </div>

        {/* ---------- Price & stock ---------- */}
        <div data-stepkey="pricing" hidden={currentKey !== "pricing"} className="grid gap-4 sm:grid-cols-2">
          <Field label="Price" tip="What the buyer pays for this option, before any discount." required>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              className="a-input"
              defaultValue={defaults.price ?? ""}
            />
          </Field>
          <Field label="Cost" tip="Optional — your supplier cost, used only for your own margin reporting. Never shown to buyers.">
            <input name="cost" type="number" step="0.01" min="0" className="a-input" defaultValue={defaults.cost ?? ""} />
          </Field>
          <Field label="Currency" tip="Shown next to the price on the storefront.">
            <select name="currency" className="a-select" defaultValue={defaults.currency ?? DEFAULT_CURRENCY} required>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Stock mode" tip="Manual = you track an exact count and upload keys/credentials. Unlimited = never runs out. Provider-synced = pulled from a supplier API.">
            <select name="stockMode" className="a-select" value={stockMode} onChange={(e) => setStockMode(e.target.value)}>
              {STOCK_MODES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          {stockMode === "MANUAL" && (
            <Field label="Stock quantity" tip="Current count. For auto-delivered options, upload the actual keys / credentials below after saving.">
              <input name="stockQty" type="number" min="0" className="a-input" defaultValue={defaults.stockQty ?? ""} />
            </Field>
          )}
          {stockMode === "MANUAL" && (
            <Field label="Sold-out message" tip="Optional — shown instead of the default “Out of stock” once stock hits 0." full>
              <input
                name="outOfStockMessage"
                className="a-input"
                defaultValue={defaults.outOfStockMessage ?? ""}
                placeholder='e.g. "Restocking Sunday"'
              />
            </Field>
          )}
        </div>

        {/* ---------- Region & notes ---------- */}
        <div data-stepkey="region" hidden={currentKey !== "region"} className="grid gap-4 sm:grid-cols-2">
          <Field label="Activation region" tip="Where this key / account actually works — Global, a zone (Europe, MENA…), or one country. Separate from the price currency.">
            <ActivationRegionSelect
              name="activationRegionId"
              regions={activationRegions}
              defaultValue={defaults.activationRegionId ?? ""}
            />
          </Field>
          <Field label="Region lock" tip="How strict the activation region is — “works anywhere, may need a VPN” vs. strictly tied to that region.">
            <select name="regionLockType" className="a-select" defaultValue={defaults.regionLockType ?? "NONE"}>
              {REGION_LOCK_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>

          {accountFields && (
            <Field label="Warranty (days)" tip="How long you'll replace this account if it stops working. Leave blank for none.">
              <input name="warrantyDays" type="number" min="0" className="a-input" defaultValue={defaults.warrantyDays ?? ""} />
            </Field>
          )}
          {accountFields && (
            <Field label="Account access" tip="Full = buyer may change email / password / everything. Login only = shared or rental, buyer must not change anything.">
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
            <Field label="Account delivery note" tip="Shown with the delivered credentials — e.g. “do not change the email or enable 2FA”." full>
              <input
                name="accountDeliveryNote"
                className="a-input"
                defaultValue={defaults.accountDeliveryNote ?? ""}
                placeholder="e.g. do not change email / region / 2FA"
              />
            </Field>
          )}

          <Field label="Activation instructions" tip="Optional note shown near the price — e.g. “requires a VPN set to Turkey during activation”." full>
            <input name="activationInstructions" className="a-input" defaultValue={defaults.activationInstructions ?? ""} />
          </Field>
          <Field label="Redemption instructions" tip="Optional — how the buyer actually uses what they bought, e.g. “Steam → Games → Activate a Product”." full>
            <input name="redemptionInstructions" className="a-input" defaultValue={defaults.redemptionInstructions ?? ""} />
          </Field>

          <label className="flex items-start gap-2 sm:col-span-2">
            <input type="checkbox" name="active" defaultChecked={defaults.active ?? true} className="mt-0.5" />
            <span>
              <span style={{ color: "var(--a-text)" }}>Active</span>
              <span className="a-hint !mt-0 block">Uncheck to hide just this option from the storefront, without deleting it.</span>
            </span>
          </label>
        </div>

        <WizardNav step={step} isLast={isLast} submitLabel={submitLabel} onBack={back} onNext={next} />
      </div>
    </form>
  );
}
