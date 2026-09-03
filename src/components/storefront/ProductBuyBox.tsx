"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { formatMoney } from "@/lib/format";
import { labelFor, REGION_LOCK_TYPES, ACCOUNT_ACCESS_LEVELS, PLATFORMS } from "@/lib/enums";
import { addToCartAction } from "@/lib/actions/site";
import { springs, tapFeedback } from "@/lib/motion";

interface Variant {
  id: string;
  sku: string;
  platform: string | null;
  edition: string | null;
  durationLabel: string | null;
  price: number;
  currency: string;
  saleMode: string;
  deliveryMethod?: string | null;
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
  options: string;
}

const PLATFORM_ICON: Record<string, string> = {
  PC: "🖥️",
  PlayStation: "🎮",
  Xbox: "🎮",
  "Nintendo Switch": "🕹️",
  Mobile: "📱",
  Mac: "🖥️",
  Linux: "🐧",
  "Cross-Platform": "🌐",
};
const SALE_MODE_SHORT: Record<string, string> = {
  KEY: "Key",
  FULL_ACCOUNT: "Full account",
  SHARED_ACCOUNT: "Shared account",
  TOPUP_DIRECT: "Top-up",
};

function deliveryLine(v: Variant): { icon: string; text: string } {
  const d = v.deliveryMethod ?? "";
  if (d === "AUTO_KEY" || d === "SUBSCRIPTION_CODE" || v.saleMode === "KEY")
    return { icon: "⚡", text: "Instant delivery — a code you redeem yourself" };
  if (d === "CREDENTIAL_DELIVERY" || d === "SUBSCRIPTION_SHARED_ACCOUNT" || v.saleMode === "FULL_ACCOUNT" || v.saleMode === "SHARED_ACCOUNT")
    return { icon: "🔐", text: "Login details delivered the moment we verify" };
  if (d === "TOPUP_API" || v.saleMode === "TOPUP_DIRECT")
    return { icon: "🎮", text: "Credited straight to your game account" };
  return { icon: "👤", text: "Delivered by our team right after verification" };
}

function regionIcon(kind?: string) {
  return kind === "GLOBAL" ? "🌍" : kind === "ZONE" ? "🗺️" : "📍";
}

export default function ProductBuyBox({
  variants,
  customFields,
}: {
  variants: Variant[];
  customFields: CustomField[];
}) {
  const router = useRouter();
  const usable = useMemo(() => variants.filter((v) => v.active), [variants]);
  const [variantId, setVariantId] = useState(usable[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const variant = usable.find((v) => v.id === variantId) ?? usable[0];

  const stockLeft = variant && variant.stockMode === "MANUAL" ? variant.stockQty ?? 0 : null;
  const outOfStock = stockLeft !== null && stockLeft <= 0;
  const low = stockLeft !== null && stockLeft > 0 && stockLeft <= 5;

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!variant || outOfStock) return;
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
    return (
      <div className="rounded-2xl border border-white/10 bg-surface p-6 text-sm text-slate-500">
        No purchase options yet.
      </div>
    );
  }

  const net = variant.price - (variant.discount?.amount ?? 0);
  const save = variant.discount?.amount ?? 0;
  const pct = save > 0 ? Math.round((save / variant.price) * 100) : 0;

  function primary(v: Variant) {
    if (v.platform) return `${PLATFORM_ICON[v.platform] ?? "🎮"} ${labelFor(PLATFORMS, v.platform)}`;
    if (v.durationLabel) return `⏳ ${v.durationLabel}`;
    return SALE_MODE_SHORT[v.saleMode] ?? v.saleMode;
  }
  function secondary(v: Variant) {
    return [v.platform && v.durationLabel ? v.durationLabel : null, v.edition, v.platform ? SALE_MODE_SHORT[v.saleMode] : null]
      .filter(Boolean)
      .join(" · ");
  }

  const cta = outOfStock
    ? variant.outOfStockMessage || "Out of stock"
    : pending
      ? "Adding…"
      : added
        ? "Added ✓  ·  add another"
        : "⚡  Add to cart";

  const del = deliveryLine(variant);

  return (
    <div id="buybox" className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-surface to-bg shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent via-accent-soft to-gold" />

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        {/* Option picker */}
        {usable.length > 1 && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Choose your version</span>
            <div className="flex flex-col gap-2">
              {usable.map((v) => {
                const selected = v.id === variantId;
                const vOut = v.stockMode === "MANUAL" && (v.stockQty ?? 0) <= 0;
                const vNet = v.price - (v.discount?.amount ?? 0);
                return (
                  <motion.button
                    key={v.id}
                    type="button"
                    whileTap={tapFeedback}
                    onClick={() => {
                      setVariantId(v.id);
                      setAdded(false);
                    }}
                    className={`relative flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                      selected
                        ? "border-accent/70 bg-accent/[0.07]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/25"
                    } ${vOut ? "opacity-45" : ""}`}
                  >
                    {selected && (
                      <motion.span
                        layoutId="optionGlow"
                        transition={springs.snappy}
                        className="pointer-events-none absolute -inset-px rounded-xl ring-1 ring-accent/60"
                      />
                    )}
                    <span
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                        selected ? "border-accent bg-accent" : "border-slate-500"
                      }`}
                    >
                      {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{primary(v)}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {secondary(v) || v.sku}
                        {v.activationRegion ? ` · ${v.activationRegion.name}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold text-gold">{formatMoney(vNet, v.currency)}</span>
                      {v.discount && (
                        <span className="block text-[11px] text-slate-600 line-through">{formatMoney(v.price, v.currency)}</span>
                      )}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price */}
        <div>
          <AnimatePresence mode="popLayout">
            <motion.div
              key={`${variant.id}-${net}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={springs.smooth}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
            >
              <span className="font-heading text-[40px] font-bold leading-none text-gold drop-shadow-[0_0_22px_rgba(237,175,89,0.28)]">
                {formatMoney(net, variant.currency)}
              </span>
              {save > 0 && (
                <>
                  <span className="text-lg text-slate-600 line-through">{formatMoney(variant.price, variant.currency)}</span>
                  <span className="rounded-md bg-danger/15 px-2 py-0.5 text-xs font-bold text-danger">−{pct}%</span>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {save > 0 && (
              <span className="text-success">You save {formatMoney(save, variant.currency)}{variant.discount?.name ? ` · ${variant.discount.name}` : ""}</span>
            )}
            {stockLeft === null ? (
              <span className="text-slate-500">● In stock</span>
            ) : outOfStock ? (
              <span className="text-danger">● {variant.outOfStockMessage || "Out of stock"}</span>
            ) : low ? (
              <span className="font-medium text-warn">🔥 Only {stockLeft} left</span>
            ) : (
              <span className="text-slate-500">● {stockLeft} in stock</span>
            )}
          </div>
        </div>

        {/* What you get */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">What you get</span>
          <ul className="mt-2.5 flex flex-col gap-2 text-[13px] text-slate-300">
            <li className="flex gap-2.5">
              <span className="shrink-0">{del.icon}</span>
              <span>{del.text}</span>
            </li>
            {variant.activationRegion && (
              <li className="flex gap-2.5">
                <span className="shrink-0">{regionIcon(variant.activationRegion.kind)}</span>
                <span>
                  Works in <span className="text-white">{variant.activationRegion.name}</span>
                  {variant.regionLockType !== "NONE" && (
                    <span className="text-slate-500"> · {labelFor(REGION_LOCK_TYPES, variant.regionLockType)}</span>
                  )}
                </span>
              </li>
            )}
            {variant.warrantyDays != null && (
              <li className="flex gap-2.5">
                <span className="shrink-0">🛡️</span>
                <span>
                  <span className="text-white">{variant.warrantyDays}-day</span> replacement warranty
                </span>
              </li>
            )}
            {variant.accountAccessLevel && (
              <li className="flex gap-2.5">
                <span className="shrink-0">🔑</span>
                <span>{labelFor(ACCOUNT_ACCESS_LEVELS, variant.accountAccessLevel)}</span>
              </li>
            )}
            <li className="flex gap-2.5">
              <span className="shrink-0">🔒</span>
              <span>One-time encrypted reveal — every access is logged</span>
            </li>
          </ul>
          {(variant.redemptionInstructions || variant.activationInstructions || variant.accountDeliveryNote) && (
            <div className="mt-3 flex flex-col gap-1.5 border-t border-white/10 pt-3 text-xs text-slate-400">
              {variant.redemptionInstructions && (
                <p>
                  <span className="font-medium text-slate-300">How to redeem: </span>
                  {variant.redemptionInstructions}
                </p>
              )}
              {variant.activationInstructions && (
                <p>
                  <span className="font-medium text-slate-300">Activation: </span>
                  {variant.activationInstructions}
                </p>
              )}
              {variant.accountDeliveryNote && (
                <p>
                  <span className="font-medium text-slate-300">Note: </span>
                  {variant.accountDeliveryNote}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Buy */}
        <form id="buybox-form" onSubmit={handleAdd} className="flex flex-col gap-3">
          {customFields.map((field) => {
            let options: string[] = [];
            try {
              const parsed = JSON.parse(field.options);
              if (Array.isArray(parsed)) options = parsed;
            } catch {
              /* ignore */
            }
            return (
              <div key={field.id}>
                <label className="mb-1 block text-xs font-medium text-slate-400">
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

          <div className="flex items-stretch gap-2.5">
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-full w-9 place-items-center text-slate-400 hover:text-white"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums text-white">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="grid h-full w-9 place-items-center text-slate-400 hover:text-white"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <motion.button
              type="submit"
              disabled={pending || outOfStock}
              whileHover={outOfStock ? undefined : { scale: 1.01 }}
              whileTap={tapFeedback}
              animate={added ? { scale: [1, 1.04, 1] } : {}}
              transition={springs.snappy}
              className="btn-cta flex-1 !py-3.5 text-[15px]"
            >
              {cta}
            </motion.button>
          </div>
        </form>

        {/* Trust + payment */}
        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center text-[11px] text-slate-500">
          <div>
            <div className="text-base">⚡</div>
            Instant after verify
          </div>
          <div>
            <div className="text-base">🛡️</div>
            Warranty &amp; support
          </div>
          <div>
            <div className="text-base">🔒</div>
            Encrypted delivery
          </div>
        </div>
        <p className="text-center text-[11px] leading-relaxed text-slate-500">
          Pay by <span className="text-slate-300">InstaPay or Telda</span>, upload the receipt, and we release your order
          once the transfer is confirmed — usually within minutes.
        </p>
      </div>

      {/* Mobile pinned buy bar — portalled to <body> so no transformed
          ancestor (framer-motion Reveal, sticky wrapper) breaks `fixed`. */}
      {mounted &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-bg/90 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="mx-auto flex max-w-7xl items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold leading-none text-gold">{formatMoney(net, variant.currency)}</div>
                <div className="mt-0.5 truncate text-[11px] text-slate-500">
                  {primary(variant)}
                  {low ? ` · only ${stockLeft} left` : ""}
                </div>
              </div>
              <button
                type="submit"
                form="buybox-form"
                disabled={pending || outOfStock}
                className="btn-cta shrink-0 !px-6 !py-2.5 text-sm"
              >
                {outOfStock ? "Sold out" : added ? "Added ✓" : "Add to cart"}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
