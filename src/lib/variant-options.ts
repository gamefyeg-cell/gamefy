// Shared conditional-field logic for the admin variant forms
// (ProductWizard step + VariantForm). Pure string helpers — no React.

export const DURATION_PRESETS = [
  "1 Day",
  "3 Days",
  "7 Days",
  "1 Month",
  "2 Months",
  "3 Months",
  "6 Months",
  "12 Months",
  "Lifetime",
];

/// Delivery methods that make sense for a given sale mode + product type.
export function deliveryOptionsFor(saleMode: string, type: string): string[] {
  const isSub = type === "SUBSCRIPTION";
  if (saleMode === "TOPUP_DIRECT") return ["TOPUP_API", "MANUAL_FULFILLMENT"];
  if (saleMode === "FULL_ACCOUNT" || saleMode === "SHARED_ACCOUNT") {
    return isSub
      ? ["SUBSCRIPTION_SHARED_ACCOUNT", "CREDENTIAL_DELIVERY", "MANUAL_FULFILLMENT"]
      : ["CREDENTIAL_DELIVERY", "MANUAL_FULFILLMENT"];
  }
  return isSub
    ? ["SUBSCRIPTION_CODE", "AUTO_KEY", "MANUAL_FULFILLMENT"]
    : ["AUTO_KEY", "MANUAL_FULFILLMENT"];
}

export function defaultSaleModeFor(type: string): string {
  if (type === "TOPUP") return "TOPUP_DIRECT";
  if (type === "ACCOUNT") return "FULL_ACCOUNT";
  return "KEY";
}

/// Split a stored durationLabel into (preset, custom) for the picker.
export function splitDuration(value: string | null | undefined): { preset: string; custom: string } {
  if (!value) return { preset: "1 Month", custom: "" };
  return DURATION_PRESETS.includes(value)
    ? { preset: value, custom: "" }
    : { preset: "__custom__", custom: value };
}
