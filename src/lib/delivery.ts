/// Delivery methods that pull from KeyStockItem inventory (a key code, or
/// — reusing the same generic "encrypted secret" row — account credentials).
/// Shared between checkout (informational only now — nothing is delivered
/// until an admin verifies payment) and the admin verify-payment action
/// (which actually consumes stock and delivers), so both agree on exactly
/// which delivery methods this applies to.
export const STOCK_BACKED_DELIVERY = new Set([
  "AUTO_KEY",
  "CREDENTIAL_DELIVERY",
  "SUBSCRIPTION_CODE",
  "SUBSCRIPTION_SHARED_ACCOUNT",
]);
