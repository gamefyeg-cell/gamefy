import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate, roundMoney } from "@/lib/format";
import { labelFor, ORDER_STATUSES } from "@/lib/enums";
import { readCustomFieldValues } from "@/lib/json";
import { getSession } from "@/lib/session";
import RevealButton from "@/components/storefront/RevealButton";
import OrderSuccessBadge from "@/components/storefront/OrderSuccessBadge";
import CopyButton from "@/components/storefront/CopyButton";

// Ordered pipeline of statuses — used to render the progress tracker.
const STATUS_PIPELINE = [
  "PENDING",
  "AWAITING_VERIFICATION",
  "PAID",
  "FULFILLED",
] as const;

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-slate-500/10 text-slate-300 border-slate-500/30",
  AWAITING_VERIFICATION: "bg-warn/10 text-warn border-warn/30",
  PAID: "bg-accent/10 text-accent-soft border-accent/30",
  FULFILLED: "bg-success/10 text-success border-success/30",
  PARTIALLY_FULFILLED: "bg-warn/10 text-warn border-warn/30",
  CANCELLED: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  REFUNDED: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  DISPUTED: "bg-danger/10 text-danger border-danger/30",
};

const SUCCESS_STATUSES = new Set(["PAID", "FULFILLED", "PARTIALLY_FULFILLED"]);

// Contextual message shown for each order status.
const STATUS_MESSAGE: Record<string, { icon: string; title: string; body: string }> = {
  PENDING: {
    icon: "⏳",
    title: "Order received",
    body: "Your order has been placed. Please complete payment using the method shown below — then upload your transfer proof.",
  },
  AWAITING_VERIFICATION: {
    icon: "🕓",
    title: "Verifying your payment",
    body: "We received your transfer proof and we're confirming it now. This page updates automatically once it's approved — usually within a few minutes.",
  },
  PAID: {
    icon: "✅",
    title: "Payment confirmed",
    body: "Your payment has been verified. Your items will be delivered shortly.",
  },
  FULFILLED: {
    icon: "🎉",
    title: "Order delivered",
    body: "Your order is complete. All items have been delivered — use the reveal button below to view your keys or credentials.",
  },
  PARTIALLY_FULFILLED: {
    icon: "📦",
    title: "Partially delivered",
    body: "Some items have been delivered. The rest will follow shortly — our team is working on it.",
  },
  CANCELLED: {
    icon: "🚫",
    title: "Order cancelled",
    body: "This order has been cancelled. If you believe this is an error, please contact support.",
  },
  REFUNDED: {
    icon: "💸",
    title: "Order refunded",
    body: "This order has been refunded. If you haven't received your funds yet, please allow 1–3 business days.",
  },
  DISPUTED: {
    icon: "⚠️",
    title: "Order disputed",
    body: "This order is under review. Our support team will contact you shortly.",
  },
};

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "PRODUCT_MANAGER", "SUPPORT_AGENT", "FINANCE", "AUDITOR"]);

function pipelineIndex(status: string): number {
  return STATUS_PIPELINE.indexOf(status as (typeof STATUS_PIPELINE)[number]);
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Auth guard — only the order owner (or an admin) may view this page.
  const session = await getSession();
  if (!session) redirect(`/account/login?next=/orders/${id}`);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      user: true,
      region: true,
      paymentMethod: true,
    },
  });

  // 404 if the order doesn't exist or belongs to a different user.
  if (!order) notFound();
  const isAdmin = ADMIN_ROLES.has(session.role);
  if (order.userId !== session.userId && !isAdmin) notFound();

  const msg = STATUS_MESSAGE[order.status];
  const pipelinePos = pipelineIndex(order.status);
  const isOffPipeline = ["CANCELLED", "REFUNDED", "DISPUTED", "PARTIALLY_FULFILLED"].includes(order.status);

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      {SUCCESS_STATUSES.has(order.status) && <OrderSuccessBadge />}

      {/* ── Order header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {SUCCESS_STATUSES.has(order.status) ? "You're all set" : "Order details"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">{formatDate(order.createdAt)} · {order.user.email}</p>
        </div>
        <span className={`badge border shrink-0 ${STATUS_COLOR[order.status]}`}>
          {labelFor(ORDER_STATUSES, order.status)}
        </span>
      </div>

      {/* ── Full Order ID (copyable) ── */}
      <div className="card p-4 flex flex-col gap-1">
        <div className="text-xs text-slate-500 mb-1">Order ID</div>
        <div className="flex items-center gap-3">
          <code className="text-sm text-slate-100 font-mono break-all flex-1">{order.id}</code>
          <CopyButton text={order.id} />
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Short reference:{" "}
          <span className="text-slate-300 font-medium">#{order.id.slice(-8).toUpperCase()}</span>
          {" "}· Use the full ID above when contacting support.
        </div>
      </div>

      {/* ── Status progress tracker (normal pipeline only) ── */}
      {!isOffPipeline && (
        <div className="card p-4">
          <div className="flex items-center gap-0">
            {STATUS_PIPELINE.map((s, i) => {
              const done = i < pipelinePos;
              const active = i === pipelinePos;
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                        done
                          ? "bg-success border-success text-white"
                          : active
                          ? "bg-accent/20 border-accent text-accent-soft"
                          : "bg-transparent border-border text-slate-500"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </div>
                    <span
                      className={`text-[10px] text-center leading-tight ${
                        active ? "text-slate-200 font-medium" : done ? "text-success" : "text-slate-600"
                      }`}
                    >
                      {labelFor(ORDER_STATUSES, s)}
                    </span>
                  </div>
                  {i < STATUS_PIPELINE.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-1 mb-5 transition-colors ${
                        i < pipelinePos ? "bg-success" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Status message box ── */}
      {msg && (
        <div className="notice-box flex items-start gap-4">
          <span className="text-2xl shrink-0">{msg.icon}</span>
          <div className="flex-1">
            <div
              className={`font-semibold text-sm ${
                order.status === "FULFILLED"
                  ? "text-success"
                  : order.status === "CANCELLED" || order.status === "REFUNDED"
                  ? "text-slate-400"
                  : order.status === "DISPUTED"
                  ? "text-danger"
                  : order.status === "PAID"
                  ? "text-accent-soft"
                  : "text-warn"
              }`}
            >
              {msg.title}
            </div>
            <p className="text-sm text-slate-200 mt-0.5">{msg.body}</p>
          </div>
          {order.status === "AWAITING_VERIFICATION" && order.paymentProofUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={order.paymentProofUrl}
              alt="Your payment proof"
              className="w-16 h-16 object-cover rounded-lg border border-warn/40 shrink-0"
            />
          )}
        </div>
      )}

      {/* ── Order items ── */}
      <div className="card divide-y divide-border">
        {order.items.map((item) => {
          const customValues = readCustomFieldValues(item.customFieldValues);
          return (
            <div key={item.id} className="p-4 flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <div>
                  <div className="text-slate-100 font-medium">{item.variant.product.title}</div>
                  <div className="text-xs text-slate-500">
                    {[item.variant.platform, item.variant.edition].filter(Boolean).join(" · ") || item.variant.sku}{" "}
                    × {item.quantity}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-slate-200">
                    {formatMoney(roundMoney(item.unitPrice * item.quantity - item.discountAmount), order.currency)}
                  </div>
                  {item.discountAmount > 0 && (
                    <div className="text-xs text-slate-500 line-through">
                      {formatMoney(roundMoney(item.unitPrice * item.quantity), order.currency)}
                    </div>
                  )}
                </div>
              </div>

              {item.discountAmount > 0 && item.discountName && (
                <div className="text-xs text-danger">🏷 {item.discountName}</div>
              )}

              {Object.keys(customValues).length > 0 && (
                <div className="text-xs text-slate-500">
                  {Object.entries(customValues).map(([k, v]) => (
                    <span key={k} className="mr-3">
                      {k}: <span className="text-slate-300">{v}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Per-item delivery status */}
              {item.deliveredAt ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-success">✓ Delivered {formatDate(item.deliveredAt)}</span>
                  <RevealButton orderItemId={item.id} />
                </div>
              ) : order.status === "AWAITING_VERIFICATION" || order.status === "PENDING" ? (
                <p className="text-xs text-slate-500">
                  ⏳ Will be delivered once your payment is verified.
                </p>
              ) : order.status === "PAID" ? (
                <p className="text-xs text-warn">
                  📦 Awaiting delivery — our team will send this shortly.
                </p>
              ) : order.status === "CANCELLED" || order.status === "REFUNDED" ? (
                <p className="text-xs text-slate-500">Not delivered.</p>
              ) : (
                <p className="text-xs text-warn">Awaiting fulfillment — our team is working on it.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Order total ── */}
      <div className="flex justify-between text-lg font-semibold">
        <span className="text-slate-300">Total</span>
        <span className="text-white">{formatMoney(order.total, order.currency)}</span>
      </div>

      {/* ── Payment instructions (pending / awaiting verification) ── */}
      {(order.status === "PENDING" || order.status === "AWAITING_VERIFICATION") && order.paymentMethod && (
        <div className="card p-4 text-sm flex flex-col gap-2">
          <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Payment instructions</div>
          <div>
            <span className="text-slate-200 font-medium">{order.paymentMethod.label}</span>
            <span className="text-slate-400 ml-2 font-mono text-xs">→ {order.paymentMethod.handle}</span>
          </div>
          {order.paymentMethod.instructions && (
            <p className="text-xs text-slate-400">{order.paymentMethod.instructions}</p>
          )}
          <div className="text-xs text-slate-500">
            Transfer exactly{" "}
            <span className="text-slate-200 font-semibold">{formatMoney(order.total, order.currency)}</span> and
            include your order reference{" "}
            <span className="font-mono text-slate-300">#{order.id.slice(-8).toUpperCase()}</span> in the note.
          </div>
        </div>
      )}
    </div>
  );
}
