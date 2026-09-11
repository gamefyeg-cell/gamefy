"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatMoney } from "@/lib/format";
import { regionIcon } from "@/lib/region-display";
import { parseGiftCardValue } from "@/lib/giftcard-value";
import { springs, tapFeedback } from "@/lib/motion";

interface GiftCardVariant {
  id: string;
  edition: string | null; // denomination, e.g. "50"
  price: number;
  currency: string;
  stockMode: string;
  stockQty: number | null;
  activationRegion: { name: string; kind: string } | null;
  discount?: { name: string; amount: number } | null;
}

const GLOBAL_KEY = "__global__";

/// Deterministic but varied accent gradient per card so a row of denominations
/// doesn't read as one flat repeated block — cycles through the brand palette.
const FACE_GRADIENTS = [
  "from-accent-deep/60 via-accent/20 to-transparent",
  "from-gold/30 via-accent-soft/15 to-transparent",
  "from-accent-soft/35 via-accent-deep/20 to-transparent",
];

export default function GiftCardOptionGrid({
  variants,
  value,
  onChange,
}: {
  variants: GiftCardVariant[];
  value: string;
  onChange: (id: string) => void;
}) {
  const regions = useMemo(() => {
    const map = new Map<string, { label: string; kind: string }>();
    for (const v of variants) {
      const key = v.activationRegion?.name ?? GLOBAL_KEY;
      if (!map.has(key)) map.set(key, { label: v.activationRegion?.name ?? "Global", kind: v.activationRegion?.kind ?? "GLOBAL" });
    }
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
  }, [variants]);

  const selectedVariant = variants.find((v) => v.id === value);
  const [region, setRegion] = useState(() => selectedVariant?.activationRegion?.name ?? regions[0]?.key ?? GLOBAL_KEY);

  // If the picked value ever falls outside the current region list (e.g.
  // variants reload), fall back to the first region instead of showing
  // nothing.
  useEffect(() => {
    if (!regions.some((r) => r.key === region) && regions[0]) setRegion(regions[0].key);
  }, [regions, region]);

  const inRegion = variants.filter((v) => (v.activationRegion?.name ?? GLOBAL_KEY) === region);

  function pickRegion(key: string) {
    setRegion(key);
    const first = variants.find((v) => (v.activationRegion?.name ?? GLOBAL_KEY) === key);
    if (first) onChange(first.id);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-lg font-semibold text-white">Choose your card</h2>
        <span className="text-xs text-slate-500">Pick a region, then a value</span>
      </div>

      {regions.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {regions.map((r) => {
            const active = r.key === region;
            return (
              <motion.button
                key={r.key}
                type="button"
                whileTap={tapFeedback}
                onClick={() => pickRegion(r.key)}
                className={`relative flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-accent/70 bg-accent/10 text-white"
                    : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/25 hover:text-slate-200"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="regionGlow"
                    transition={springs.snappy}
                    className="pointer-events-none absolute -inset-px rounded-full ring-1 ring-accent/60"
                  />
                )}
                <span aria-hidden>{regionIcon(r.kind)}</span>
                {r.label}
              </motion.button>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="popLayout">
        <motion.div
          key={region}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={springs.smooth}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {inRegion.map((v, i) => {
            const selected = v.id === value;
            const outOfStock = v.stockMode === "MANUAL" && (v.stockQty ?? 0) <= 0;
            const net = v.price - (v.discount?.amount ?? 0);
            const face = parseGiftCardValue(v.edition ?? "");
            return (
              <motion.button
                key={v.id}
                type="button"
                disabled={outOfStock}
                whileTap={outOfStock ? undefined : tapFeedback}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springs.bouncy, delay: i * 0.035 }}
                onClick={() => onChange(v.id)}
                className={`group relative flex flex-col items-center gap-1 overflow-hidden rounded-2xl border px-3 py-4 text-center transition-colors ${
                  selected
                    ? "border-accent bg-accent/[0.08]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/25"
                } ${outOfStock ? "opacity-40" : ""}`}
              >
                {/* Gift-card face — a corner-punched notch on each side plus a
                    dashed tear-off line below the value, so the tile reads as
                    an actual card/voucher rather than a generic price row. */}
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${FACE_GRADIENTS[i % FACE_GRADIENTS.length]}`} />
                <span className="pointer-events-none absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg" />
                <span className="pointer-events-none absolute left-1/2 bottom-0 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-bg" />
                <div className="pointer-events-none absolute inset-x-3 top-[68%] border-t border-dashed border-white/15" />

                {selected && (
                  <motion.span
                    layoutId="valueGlow"
                    transition={springs.snappy}
                    className="pointer-events-none absolute -inset-px rounded-2xl ring-2 ring-accent/70"
                  />
                )}
                {selected && (
                  <span className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-accent text-[9px] text-white">✓</span>
                )}
                {v.discount && (
                  <span className="absolute left-2 top-2 rounded-md bg-danger/20 px-1.5 py-0.5 text-[9px] font-bold text-danger">
                    SALE
                  </span>
                )}

                <span className="relative font-heading text-2xl font-bold leading-none text-white">{face.amount || "—"}</span>
                {/* The face currency (if the admin specified one) — never
                    `v.currency`, which is what the buyer *pays* in, not what
                    the card's balance is denominated in. See
                    src/lib/giftcard-value.ts for why these two differ. */}
                <span className="relative text-[10px] uppercase tracking-wide text-slate-500">
                  {face.currency ? `${face.currency} value` : "card value"}
                </span>
                <span className="relative mt-1.5 text-sm font-bold text-gold">{formatMoney(net, v.currency)}</span>
                {v.discount && (
                  <span className="relative text-[10px] text-slate-500 line-through">{formatMoney(v.price, v.currency)}</span>
                )}
                {outOfStock && <span className="relative text-[10px] font-medium text-danger">Sold out</span>}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
