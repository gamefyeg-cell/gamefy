"use client";

import { useState, useMemo } from "react";
import { DISCOUNT_SCOPES, PLATFORMS } from "@/lib/enums";

export interface VariantData {
  id: string;
  sku: string;
  platform: string | null;
  edition: string | null;
  durationLabel: string | null;
  price: number;
  currency: string;
  activationRegionId: string | null;
  activationRegionName?: string | null;
}

export interface ProductData {
  id: string;
  name: string;
  variants: VariantData[];
}

interface Option {
  id: string;
  name: string;
}

export default function DiscountScopeFields({
  categories,
  collections,
  products,
  activationRegions = [],
  defaultScope = "ALL",
  defaultScopeId,
  defaultVariantId,
  defaultPlatform,
  defaultActivationRegionId,
}: {
  categories: Option[];
  collections: Option[];
  products: ProductData[];
  activationRegions?: { id: string; name: string }[];
  defaultScope?: string;
  defaultScopeId?: string | null;
  defaultVariantId?: string | null;
  defaultPlatform?: string | null;
  defaultActivationRegionId?: string | null;
}) {
  const [scope, setScope] = useState(defaultScope);
  const [selectedScopeId, setSelectedScopeId] = useState(defaultScopeId ?? "");
  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariantId ?? "");
  const [selectedPlatform, setSelectedPlatform] = useState(defaultPlatform ?? "");
  const [selectedRegionId, setSelectedRegionId] = useState(defaultActivationRegionId ?? "");

  const selectedProduct = useMemo(() => {
    if (scope !== "PRODUCT" || !selectedScopeId) return null;
    return products.find((p) => p.id === selectedScopeId) ?? null;
  }, [scope, selectedScopeId, products]);

  const productPlatforms = useMemo(() => {
    if (!selectedProduct) return [];
    const set = new Set<string>();
    for (const v of selectedProduct.variants) {
      if (v.platform) set.add(v.platform);
    }
    return Array.from(set);
  }, [selectedProduct]);

  const productRegions = useMemo(() => {
    if (!selectedProduct) return [];
    const map = new Map<string, string>();
    for (const v of selectedProduct.variants) {
      if (v.activationRegionId) {
        map.set(v.activationRegionId, v.activationRegionName ?? v.activationRegionId);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [selectedProduct]);

  return (
    <>
      <div>
        <label className="label">Applies to</label>
        <select
          name="scope"
          value={scope}
          onChange={(e) => {
            setScope(e.target.value);
            setSelectedScopeId("");
            setSelectedVariantId("");
            setSelectedPlatform("");
            setSelectedRegionId("");
          }}
          className="input"
        >
          {DISCOUNT_SCOPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {scope !== "ALL" && (
        <div>
          <label className="label">
            {scope === "CATEGORY" ? "Category" : scope === "COLLECTION" ? "Collection" : "Product"}
          </label>
          <select
            name="scopeId"
            value={selectedScopeId}
            onChange={(e) => {
              setSelectedScopeId(e.target.value);
              setSelectedVariantId("");
              setSelectedPlatform("");
              setSelectedRegionId("");
            }}
            required
            className="input"
          >
            <option value="">Select…</option>
            {(scope === "CATEGORY" ? categories : scope === "COLLECTION" ? collections : products).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {scope === "PRODUCT" && selectedScopeId && selectedProduct && (
        <div className="md:col-span-2 rounded-lg border border-slate-700/60 bg-slate-900/60 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Product Specifications &amp; Variants
            </span>
            <span className="text-xs text-slate-400">
              Leave as "All" to discount the entire product, or specify:
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="label text-xs">Specific Option / Variant</label>
              <select
                name="variantId"
                value={selectedVariantId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedVariantId(val);
                  if (val) {
                    const match = selectedProduct.variants.find((v) => v.id === val);
                    if (match) {
                      if (match.platform) setSelectedPlatform(match.platform);
                      if (match.activationRegionId) setSelectedRegionId(match.activationRegionId);
                    }
                  }
                }}
                className="input text-xs"
              >
                <option value="">All options / variants</option>
                {selectedProduct.variants.map((v) => {
                  const parts = [v.platform, v.edition, v.durationLabel, v.activationRegionName].filter(Boolean);
                  const desc = parts.length > 0 ? parts.join(" · ") : v.sku;
                  return (
                    <option key={v.id} value={v.id}>
                      {desc} ({v.price} {v.currency})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="label text-xs">Platform filter</label>
              <select
                name="platform"
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                disabled={Boolean(selectedVariantId)}
                className="input text-xs disabled:opacity-40"
              >
                <option value="">All platforms (PC, PS, Xbox...)</option>
                {(productPlatforms.length > 0
                  ? productPlatforms
                  : PLATFORMS.map((p) => p.value)
                ).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-xs">Activation Region filter</label>
              <select
                name="activationRegionId"
                value={selectedRegionId}
                onChange={(e) => setSelectedRegionId(e.target.value)}
                disabled={Boolean(selectedVariantId)}
                className="input text-xs disabled:opacity-40"
              >
                <option value="">All regions (Global, Turkey...)</option>
                {(productRegions.length > 0 ? productRegions : activationRegions).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
