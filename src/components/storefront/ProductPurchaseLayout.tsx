"use client";

import { useMemo, useState } from "react";
import ProductBuyBox from "@/components/storefront/ProductBuyBox";
import GiftCardOptionGrid from "@/components/storefront/GiftCardOptionGrid";
import Reveal from "@/components/storefront/Reveal";

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

/// Owns which variant is selected for the whole purchase area, so the
/// gift-card region/value grid (placed up in the main column, ahead of the
/// description — moved out of the cramped sidebar list per feedback) and
/// the buy box (sticky sidebar, price/stock/add-to-cart) always agree on
/// the current pick. Everything else on the page stays server-rendered;
/// only this shared-selection sliver needs to be a client component, with
/// the server-rendered gallery/description passed straight through as
/// children.
export default function ProductPurchaseLayout({
  productType,
  variants,
  customFields,
  gallery,
  description,
}: {
  productType: string;
  variants: Variant[];
  customFields: CustomField[];
  gallery: React.ReactNode;
  description: React.ReactNode;
}) {
  const usable = useMemo(() => variants.filter((v) => v.active), [variants]);
  const isGiftcard = productType === "GIFTCARD" && usable.length > 1;
  const [variantId, setVariantId] = useState(usable[0]?.id ?? "");

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-6">
        {gallery}
        {isGiftcard && <GiftCardOptionGrid variants={usable} value={variantId} onChange={setVariantId} />}
        {description}
      </div>

      <div>
        <Reveal delay={0.1} className="lg:sticky lg:top-24">
          <ProductBuyBox
            variants={variants}
            customFields={customFields}
            variantId={isGiftcard ? variantId : undefined}
            onVariantChange={isGiftcard ? setVariantId : undefined}
            hideOptionPicker={isGiftcard}
          />
        </Reveal>
      </div>
    </div>
  );
}
