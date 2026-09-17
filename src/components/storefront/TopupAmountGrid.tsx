"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatMoney } from "@/lib/format";
import { regionIcon } from "@/lib/region-display";
import { springs, tapFeedback } from "@/lib/motion";

interface TopupVariant {
  id: string;
  sku: string;
  edition: string | null; // Top-up amount / value, e.g. "100", "500"
  price: number;
  currency: string;
  stockMode: string;
  stockQty: number | null;
  activationRegion: { name: string; kind: string } | null;
  discount?: { name: string; amount: number } | null;
}

const GLOBAL_KEY = "__global__";

export default function TopupAmountGrid({
  variants,
  value,
  onChange,
}: {
  variants: TopupVariant[];
  value: string;
  onChange: (id: string) => void;
}) {
  const regions = useMemo(() => {
    const map = new Map<string, { label: string; kind: string }>();
    for (const v of variants) {
      const key = v.activationRegion?.name ?? GLOBAL_KEY;
      if (!map.has(key)) {
        map.set(key, {
          label: v.activationRegion?.name ?? "Global",
          kind: v.activationRegion?.kind ?? "GLOBAL",
        });
      }
    }
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
  }, [variants]);

  const selectedVariant = variants.find((v) => v.id === value);
  const [region, setRegion] = useState(
    () => selectedVariant?.activationRegion?.name ?? regions[0]?.key ?? GLOBAL_KEY
  );

  useEffect(() => {
    if (!regions.some((r) => r.key === region) && regions[0]) {
      setRegion(regions[0].key);
    }
  }, [regions, region]);

  const inRegion = useMemo(() => {
    const filtered = variants.filter((v) => (v.activationRegion?.name ?? GLOBAL_KEY) === region);
    return [...filtered].sort((a, b) => a.price - b.price);
  }, [variants, region]);

  function pickRegion(key: string) {
    setRegion(key);
    const first = variants.find((v) => (v.activationRegion?.name ?? GLOBAL_KEY) === key);
    if (first) onChange(first.id);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-lg font-semibold text-white">Select Amount</h2>
        {regions.length > 1 && (
          <span className="text-xs text-slate-500">Pick a region, then select amount</span>
        )}
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
                    layoutId="topupRegionGlow"
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
          className="grid grid-cols-2 gap-3 sm:gap-3.5"
        >
          {inRegion.map((v, i) => {
            const selected = v.id === value;
            const outOfStock = v.stockMode === "MANUAL" && (v.stockQty ?? 0) <= 0;
            const net = v.price - (v.discount?.amount ?? 0);
            const amountLabel = v.edition || v.sku;

            return (
              <motion.button
                key={v.id}
                type="button"
                disabled={outOfStock}
                whileTap={outOfStock ? undefined : tapFeedback}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springs.bouncy, delay: i * 0.025 }}
                onClick={() => onChange(v.id)}
                className={`group relative flex flex-col items-center justify-center gap-1 rounded-2xl border px-4 py-5 text-center transition-all ${
                  selected
                    ? "border-accent bg-accent/[0.08] shadow-[0_0_20px_rgba(255,87,34,0.15)] ring-1 ring-accent/60"
                    : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
                } ${outOfStock ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`block text-lg sm:text-xl font-bold tracking-tight transition-colors ${
                    selected ? "text-accent" : "text-white group-hover:text-white"
                  }`}
                >
                  {amountLabel}
                </span>
                <span className="block text-xs sm:text-sm font-medium text-slate-400">
                  {formatMoney(net, v.currency)}
                </span>
                {v.discount && (
                  <span className="text-[10px] text-slate-500 line-through">
                    {formatMoney(v.price, v.currency)}
                  </span>
                )}
                {outOfStock && (
                  <span className="mt-1 text-[10px] font-semibold text-danger">Out of stock</span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
