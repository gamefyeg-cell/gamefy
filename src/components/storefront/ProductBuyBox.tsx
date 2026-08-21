"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/format";
import { labelFor, SALE_MODES, REGION_LOCK_TYPES, ACCOUNT_ACCESS_LEVELS } from "@/lib/enums";
import { addToCartAction } from "@/lib/actions/site";
import { springs, tapFeedback } from "@/lib/motion";
import { TRUST_SIGNALS } from "@/lib/trust-signals";

interface Variant {
  id: string;
  sku: string;
  platform: string | null;
  edition: string | null;
  price: number;
  currency: string;
  saleMode: string;
  stockMode: string;
  stockQty: number | null;
  regionLockType: string;
  activationInstructions: string | null;
  redemptionInstructions: string | null;
  warrantyDays: number | null;
  accountAccessLevel: string | null;
  accountDeliveryNote: string | null;
  active: boolean;
  outOfStockMessage: string | null;
  activationRegion: { name: string; kind: string } | null;
  discount?: { name: string; amount: number } | null;
}

interface CustomField {
  id: string;
  fieldKey: string;
  label: string;
  type: string;
  required: boolean;
  options: string; // JSON array
}

const SALE_MODE_TAB_LABEL: Record<string, string> = {
  KEY: "Buy as Key",
  FULL_ACCOUNT: "Buy as Account",
  SHARED_ACCOUNT: "Buy as Shared Account",
  TOPUP_DIRECT: "Top Up",
};

export default function ProductBuyBox({
  variants,
  customFields,
}: {
  variants: Variant[];
  customFields: CustomField[];
}) {
  const router = useRouter();
  const saleModes = useMemo(() => Array.from(new Set(variants.map((v) => v.saleMode))), [variants]);
  const [activeSaleMode, setActiveSaleMode] = useState(saleModes[0]);
  const variantsForMode = variants.filter((v) => v.saleMode === activeSaleMode);
  const [variantId, setVariantId] = useState(variantsForMode[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);

  const variant = variants.find((v) => v.id === variantId) ?? variantsForMode[0];

  function switchMode(mode: string) {
    setActiveSaleMode(mode);
    const first = variants.find((v) => v.saleMode === mode);
    setVariantId(first?.id ?? "");
    setAdded(false);
  }

  const outOfStock =
    variant && variant.stockMode === "MANUAL" && (variant.stockQty ?? 0) <= 0;

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!variant) return;
    setPending(true);
    const fd = new FormData(e.currentTarget);
    fd.set("variantId", variant.id);
    fd.set("qty", String(qty));
    await addToCartAction(fd);
    setPending(false);
    setAdded(true);
    router.refresh();
  }

  if (!variant) {
    return <p className="text-slate-500">No purchasable variants yet.</p>;
  }

  return (
    <div className="card p-5 flex flex-col gap-4 relative overflow-hidden">
      {/* Thin gradient accent along the top edge — the same purple→gold
          language as the hero CTA and poster-card frames, so the buy box
          reads as the page's premium focal point rather than a plain form. */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent-soft to-gold" />

      {saleModes.length > 1 && (
        <div className="flex gap-1 border-b border-border pb-3">
          {saleModes.map((mode) => (
            <motion.button
              key={mode}
              type="button"
              onClick={() => switchMode(mode)}
              whileTap={tapFeedback}
              className={`relative btn !px-3 !py-1.5 text-xs ${activeSaleMode === mode ? "text-white" : "bg-surface2 text-slate-300 border border-border"}`}
            >
              {activeSaleMode === mode && (
                <motion.span
                  layoutId="saleModeTabPill"
                  transition={springs.snappy}
                  className="absolute inset-0 bg-accent rounded-lg -z-10"
                />
              )}
              {SALE_MODE_TAB_LABEL[mode] ?? labelFor(SALE_MODES, mode)}
            </motion.button>
          ))}
        </div>
      )}

      {variantsForMode.length > 1 && (
        <div>
          <label className="label">Choose option</label>
          <select
            className="input"
            value={variantId}
            onChange={(e) => {
              setVariantId(e.target.value);
              setAdded(false);
            }}
          >
            {variantsForMode.map((v) => (
              <option key={v.id} value={v.id}>
                {[v.platform, v.edition, v.activationRegion?.name].filter(Boolean).join(" · ") || v.sku}
                {" — "}
                {formatMoney(v.price, v.currency)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-baseline gap-3">
        <div className="font-heading font-bold text-4xl text-gold drop-shadow-[0_0_18px_rgba(237,175,89,0.35)]">
          {formatMoney(variant.price - (variant.discount?.amount ?? 0), variant.currency)}
        </div>
        {variant.discount && (
          <div className="text-lg text-slate-500 line-through">{formatMoney(variant.price, variant.currency)}</div>
        )}
      </div>
      {variant.discount && (
        <span className="badge bg-danger/10 text-danger border border-danger/30 self-start">
          🏷 {variant.discount.name}
        </span>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {variant.activationRegion && (
          <span className="badge bg-accent/10 text-accent-soft border border-accent/30">
            {variant.activationRegion.kind === "GLOBAL" ? "🌍" : variant.activationRegion.kind === "ZONE" ? "🗺️" : "📍"}{" "}
            Activates in: {variant.activationRegion.name}
          </span>
        )}
        {variant.regionLockType !== "NONE" && (
          <span className="badge bg-warn/10 text-warn border border-warn/30">
            {labelFor(REGION_LOCK_TYPES, variant.regionLockType)}
          </span>
        )}
        {variant.warrantyDays != null && (
          <span className="badge bg-success/10 text-success border border-success/30">
            {variant.warrantyDays}-day warranty
          </span>
        )}
        {variant.accountAccessLevel && (
          <span className="badge bg-surface2 border border-border text-slate-300">
            {labelFor(ACCOUNT_ACCESS_LEVELS, variant.accountAccessLevel)}
          </span>
        )}
        {variant.stockMode === "MANUAL" && (
          <span className={`badge border ${outOfStock ? "text-danger border-danger/40 bg-danger/10" : "text-slate-300 border-border bg-surface2"}`}>
            {outOfStock ? variant.outOfStockMessage || "Out of stock" : `${variant.stockQty} in stock`}
          </span>
        )}
        {variant.stockMode === "UNLIMITED" && (
          <span className="badge bg-surface2 border border-border text-slate-300">In stock</span>
        )}
      </div>

      {variant.activationInstructions && (
        <p className="text-xs text-slate-400">
          <span className="text-slate-300 font-medium">Activation: </span>
          {variant.activationInstructions}
        </p>
      )}
      {variant.redemptionInstructions && (
        <p className="text-xs text-slate-400">
          <span className="text-slate-300 font-medium">How to redeem: </span>
          {variant.redemptionInstructions}
        </p>
      )}
      {variant.accountDeliveryNote && (
        <p className="text-xs text-slate-400">
          <span className="text-slate-300 font-medium">Account note: </span>
          {variant.accountDeliveryNote}
        </p>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-3">
        {customFields.map((field) => {
          const options: string[] = (() => {
            try {
              return JSON.parse(field.options);
            } catch {
              return [];
            }
          })();
          return (
            <div key={field.id}>
              <label className="label">
                {field.label}
                {field.required && <span className="text-danger"> *</span>}
              </label>
              {field.type === "SELECT" ? (
                <select name={`cf_${field.fieldKey}`} required={field.required} className="input">
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : field.type === "CHECKBOX" ? (
                <input type="checkbox" name={`cf_${field.fieldKey}`} className="h-4 w-4" />
              ) : (
                <input
                  type={field.type === "NUMBER" ? "number" : field.type === "EMAIL" ? "email" : "text"}
                  name={`cf_${field.fieldKey}`}
                  required={field.required}
                  className="input"
                />
              )}
            </div>
          );
        })}

        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            className="input !w-20"
          />
          <motion.button
            type="submit"
            disabled={pending || outOfStock}
            whileTap={tapFeedback}
            animate={added ? { scale: [1, 1.05, 1] } : {}}
            transition={springs.snappy}
            className="btn-cta flex-1 !py-3 text-base"
          >
            {outOfStock
              ? variant.outOfStockMessage || "Out of stock"
              : pending
                ? "Adding…"
                : added
                  ? "Added ✓ — add more"
                  : "⚡ Add to Cart"}
          </motion.button>
        </div>
      </form>

      <div className="flex flex-col gap-2.5 border-t border-border pt-4">
        {TRUST_SIGNALS.map((t) => (
          <div key={t.title} className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-full border border-accent/50 bg-accent/10 text-xs shrink-0">
              {t.icon}
            </span>
            <span className="text-xs text-slate-400">
              <span className="text-slate-200 font-medium">{t.title}</span> · {t.subtitle}
            </span>
          </div>
        ))}
      </div>

      {/* How payment actually works here — InstaPay/Telda transfer +
          screenshot, verified by an admin, no card/gateway involved. */}
      <div className="flex items-center justify-between text-center gap-1 border-t border-border pt-4 text-[11px] text-slate-500">
        <div className="flex-1">
          <div className="text-lg">📲</div>Pay via InstaPay/Telda
        </div>
        <div className="text-slate-700">→</div>
        <div className="flex-1">
          <div className="text-lg">🧾</div>Upload receipt
        </div>
        <div className="text-slate-700">→</div>
        <div className="flex-1">
          <div className="text-lg">✅</div>Delivered once verified
        </div>
      </div>
    </div>
  );
}
