// Application-level enum definitions. On SQLite these fields are plain
// `String` columns (see prisma/schema.prisma header) — this file is the
// single source of truth for valid values and their admin-facing labels.
// On a Postgres deploy these become native Prisma enums with the same names.

export const PRODUCT_TYPES = [
  { value: "GAME", label: "Game" },
  { value: "GIFTCARD", label: "Gift Card" },
  { value: "TOPUP", label: "Top-Up" },
  { value: "ACCOUNT", label: "Account" },
  { value: "SUBSCRIPTION", label: "Subscription" },
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number]["value"];

export const SALE_MODES = [
  { value: "KEY", label: "Key (redeem on your own account)" },
  { value: "FULL_ACCOUNT", label: "Full Account (full access)" },
  { value: "SHARED_ACCOUNT", label: "Shared Account (login only)" },
  { value: "TOPUP_DIRECT", label: "Direct Top-Up" },
] as const;
export type SaleMode = (typeof SALE_MODES)[number]["value"];

export const DELIVERY_METHODS = [
  { value: "AUTO_KEY", label: "Auto Key (instant, from stock/provider)" },
  { value: "MANUAL_FULFILLMENT", label: "Manual Fulfillment" },
  { value: "CREDENTIAL_DELIVERY", label: "Credential Delivery" },
  { value: "TOPUP_API", label: "Top-Up API" },
  { value: "SUBSCRIPTION_CODE", label: "Subscription Code" },
  { value: "SUBSCRIPTION_SHARED_ACCOUNT", label: "Subscription Shared Account" },
] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]["value"];

export const STOCK_MODES = [
  { value: "MANUAL", label: "Manual count" },
  { value: "UNLIMITED", label: "Unlimited (generated on demand)" },
  { value: "PROVIDER_SYNCED", label: "Provider-synced" },
] as const;
export type StockMode = (typeof STOCK_MODES)[number]["value"];

export const REGION_LOCK_TYPES = [
  { value: "NONE", label: "None — region-free" },
  { value: "SOFT_RESTRICTED", label: "Soft — works cross-region, may need VPN" },
  { value: "HARD_LOCKED", label: "Hard — strictly tied to account/platform region" },
] as const;
export type RegionLockType = (typeof REGION_LOCK_TYPES)[number]["value"];

export const ACCOUNT_ACCESS_LEVELS = [
  { value: "FULL", label: "Full access (buyer may change everything)" },
  { value: "LOGIN_ONLY", label: "Login only (rental/shared, no changes)" },
] as const;
export type AccountAccessLevel = (typeof ACCOUNT_ACCESS_LEVELS)[number]["value"];

export const CUSTOM_FIELD_TYPES = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "SELECT", label: "Select" },
  { value: "EMAIL", label: "Email" },
  { value: "CHECKBOX", label: "Checkbox" },
] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]["value"];

export const PROVIDER_SYNC_MODES = [
  { value: "OFF", label: "Off — fully manual" },
  { value: "STOCK_ONLY", label: "Stock only" },
  { value: "STOCK_AND_PRICE", label: "Stock and price" },
] as const;
export type ProviderSyncMode = (typeof PROVIDER_SYNC_MODES)[number]["value"];

export const ORDER_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "AWAITING_VERIFICATION", label: "Awaiting Payment Verification" },
  { value: "PAID", label: "Paid" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "PARTIALLY_FULFILLED", label: "Partially Fulfilled" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "DISPUTED", label: "Disputed" },
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number]["value"];

export const USER_ROLES = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "PRODUCT_MANAGER", label: "Product Manager" },
  { value: "SUPPORT_AGENT", label: "Support Agent" },
  { value: "FINANCE", label: "Finance" },
  { value: "AUDITOR", label: "Read-only Auditor" },
  { value: "CUSTOMER", label: "Customer" },
] as const;
export type UserRole = (typeof USER_ROLES)[number]["value"];

/// Roles allowed into /admin at all. Fine-grained per-action checks can be
/// layered on top of this later; this is the coarse gate.
export const ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "PRODUCT_MANAGER",
  "SUPPORT_AGENT",
  "FINANCE",
  "AUDITOR",
];

export const COLLECTION_TYPES = [
  { value: "MANUAL", label: "Manual pick" },
  { value: "AUTO_RULE", label: "Auto rule (e.g. best sellers)" },
] as const;
export type CollectionType = (typeof COLLECTION_TYPES)[number]["value"];

export const HOMEPAGE_BLOCK_TYPES = [
  { value: "HERO_SLIDER", label: "Hero Slider" },
  { value: "FEATURED_COLLECTIONS", label: "Featured Collections" },
  { value: "TRENDING", label: "Trending Now" },
  { value: "CATEGORY_GRID", label: "Category Grid" },
  { value: "FLASH_DEALS", label: "Flash Deals" },
  { value: "CUSTOM_BANNER", label: "Custom Banner" },
] as const;
export type HomepageBlockType = (typeof HOMEPAGE_BLOCK_TYPES)[number]["value"];

export const PLATFORMS = [
  { value: "PC", label: "PC" },
  { value: "PlayStation", label: "PlayStation" },
  { value: "Xbox", label: "Xbox" },
  { value: "Nintendo Switch", label: "Nintendo Switch" },
  { value: "Mobile", label: "Mobile (iOS/Android)" },
  { value: "Mac", label: "Mac" },
  { value: "Linux", label: "Linux" },
  { value: "Cross-Platform", label: "Cross-Platform" },
  { value: "Other", label: "Other" },
] as const;
export type Platform = (typeof PLATFORMS)[number]["value"];

export const DISCOUNT_TYPES = [
  { value: "PERCENT", label: "Percent off" },
  { value: "FLAT", label: "Flat amount off" },
] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number]["value"];

export const PAYMENT_METHOD_TYPES = [
  { value: "INSTAPAY", label: "InstaPay" },
  { value: "TELDA", label: "Telda" },
] as const;
export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number]["value"];

export const DISCOUNT_SCOPES = [
  { value: "ALL", label: "Whole website" },
  { value: "CATEGORY", label: "One category" },
  { value: "COLLECTION", label: "One collection" },
  { value: "PRODUCT", label: "One product" },
] as const;
export type DiscountScope = (typeof DISCOUNT_SCOPES)[number]["value"];

export function labelFor(list: readonly { value: string; label: string }[], value: string): string {
  return list.find((i) => i.value === value)?.label ?? value;
}
