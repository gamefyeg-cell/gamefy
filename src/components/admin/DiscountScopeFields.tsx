"use client";

import { useState } from "react";
import { DISCOUNT_SCOPES } from "@/lib/enums";

interface Option {
  id: string;
  name: string;
}

export default function DiscountScopeFields({
  categories,
  collections,
  products,
  defaultScope = "ALL",
  defaultScopeId,
}: {
  categories: Option[];
  collections: Option[];
  products: Option[];
  defaultScope?: string;
  defaultScopeId?: string | null;
}) {
  const [scope, setScope] = useState(defaultScope);

  const options = scope === "CATEGORY" ? categories : scope === "COLLECTION" ? collections : scope === "PRODUCT" ? products : [];

  return (
    <>
      <div>
        <label className="label">Applies to</label>
        <select name="scope" value={scope} onChange={(e) => setScope(e.target.value)} className="input">
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
          <select name="scopeId" defaultValue={defaultScopeId ?? ""} required className="input">
            <option value="">Select…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
