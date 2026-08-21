// Shared trust-badge content — same three signals shown in the hero and
// on every product page, so the "why buy from us" message stays identical
// everywhere it appears instead of drifting between copies.
export const TRUST_SIGNALS = [
  { icon: "⚡", title: "Instant Delivery", subtitle: "Get your keys in seconds" },
  { icon: "🔒", title: "Secure Checkout", subtitle: "100% safe & protected" },
  { icon: "💳", title: "Local Payment", subtitle: "Pay the way you prefer" },
] as const;
