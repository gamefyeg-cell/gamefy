import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { labelFor, ORDER_STATUSES } from "@/lib/enums";
import { readCustomFieldValues } from "@/lib/json";
import RevealButton from "@/components/storefront/RevealButton";
import OrderSuccessBadge from "@/components/storefront/OrderSuccessBadge";

const SUCCESS_STATUSES = new Set(["PAID", "FULFILLED", "PARTIALLY_FULFILLED"]);

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

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      user: true,
      region: true,
      paymentMethod: true,
    },
  });
  if (!order) notFound();

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      {SUCCESS_STATUSES.has(order.status) && <OrderSuccessBadge />}

      {order.status === "AWAITING_VERIFICATION" && (
        <div className="notice-box flex items-center gap-4">
          <span className="text-2xl">🕓</span>
          <div className="flex-1">
            <div className="text-warn font-semibold text-sm">Verifying your payment</div>
            <p className="text-sm text-slate-200 mt-0.5">
              We received your transfer proof{order.paymentMethod ? ` to ${order.paymentMethod.label}` : ""} and
              we're confirming it now — this page updates automatically once it's approved, usually within a
              few minutes.
            </p>
          </div>
          {order.paymentProofUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={order.paymentProofUrl} alt="Your payment proof" className="w-16 h-16 object-cover rounded-lg border border-warn/40 shrink-0" />
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className={SUCCESS_STATUSES.has(order.status) ? "mx-auto text-center" : ""}>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {SUCCESS_STATUSES.has(order.status) ? "You're all set" : "Order confirmation"}
          </h1>
          <p className="text-sm text-slate-500">
            #{order.id.slice(-8).toUpperCase()} · {formatDate(order.createdAt)} · {order.user.email}
          </p>
        </div>
        {!SUCCESS_STATUSES.has(order.status) && (
          <span className={`badge border ${STATUS_COLOR[order.status]}`}>{labelFor(ORDER_STATUSES, order.status)}</span>
        )}
      </div>
      {SUCCESS_STATUSES.has(order.status) && (
        <span className={`badge border self-center ${STATUS_COLOR[order.status]}`}>
          {labelFor(ORDER_STATUSES, order.status)}
        </span>
      )}

      <div className="card divide-y divide-border">
        {order.items.map((item) => {
          const customValues = readCustomFieldValues(item.customFieldValues);
          return (
            <div key={item.id} className="p-4 flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <div>
                  <div className="text-slate-100 font-medium">{item.variant.product.title}</div>
                  <div className="text-xs text-slate-500">
                    {[item.variant.platform, item.variant.edition].filter(Boolean).join(" · ") || item.variant.sku} × {item.quantity}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-slate-200">
                    {formatMoney(item.unitPrice * item.quantity - item.discountAmount, order.currency)}
                  </div>
                  {item.discountAmount > 0 && (
                    <div className="text-xs text-slate-500 line-through">
                      {formatMoney(item.unitPrice * item.quantity, order.currency)}
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

              {item.deliveredAt ? (
                <RevealButton orderItemId={item.id} />
              ) : order.status === "AWAITING_VERIFICATION" ? (
                <p className="text-xs text-slate-500">Delivered as soon as your payment is verified.</p>
              ) : (
                <p className="text-xs text-warn">
                  Awaiting fulfillment — our team will deliver this shortly (this demo has no live
                  provider connected for this delivery type; see README).
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-lg font-semibold">
        <span className="text-slate-300">Total</span>
        <span className="text-white">{formatMoney(order.total, order.currency)}</span>
      </div>
    </div>
  );
}
