import type { OrderStatus } from "@/lib/enums";

/// Single source of truth for "what color is this order status" — shared by
/// the order badge (Tailwind classes) and the admin dashboard's status chart
/// (needs real hex, since SVG fill can't take a Tailwind class). Keeping both
/// derived from one map means the badge on /admin/orders and the bar in the
/// chart always agree.
///
/// Job: status (state), not categorical identity — see dataviz color-formula.
/// PENDING/CANCELLED/REFUNDED are neutral (nothing actionable/resolved to
/// report); AWAITING_VERIFICATION/PARTIALLY_FULFILLED are warn (needs admin
/// attention); PAID/FULFILLED are success; DISPUTED is danger. Hex values
/// match the `success`/`warn`/`danger`/`accent` tokens in tailwind.config.ts.
export const ORDER_STATUS_COLOR: Record<OrderStatus, { badgeClass: string; hex: string }> = {
  PENDING: { badgeClass: "bg-slate-500/10 text-slate-300 border-slate-500/30", hex: "#94a3b8" },
  AWAITING_VERIFICATION: { badgeClass: "bg-warn/10 text-warn border-warn/30", hex: "#ffb84d" },
  PAID: { badgeClass: "bg-accent/10 text-accent-soft border-accent/30", hex: "#c987ee" },
  FULFILLED: { badgeClass: "bg-success/10 text-success border-success/30", hex: "#3ddc97" },
  PARTIALLY_FULFILLED: { badgeClass: "bg-warn/10 text-warn border-warn/30", hex: "#ffb84d" },
  CANCELLED: { badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/30", hex: "#64748b" },
  REFUNDED: { badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/30", hex: "#64748b" },
  DISPUTED: { badgeClass: "bg-danger/10 text-danger border-danger/30", hex: "#ff5c72" },
};
