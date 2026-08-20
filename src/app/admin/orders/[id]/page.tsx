import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import { labelFor, ORDER_STATUSES, SALE_MODES, DELIVERY_METHODS, PAYMENT_METHOD_TYPES } from "@/lib/enums";
import { readCustomFieldValues } from "@/lib/json";
import { manualFulfillAction, refundOrderAction, cancelOrderAction, verifyPaymentAction } from "@/lib/actions/admin/orders";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      region: true,
      paymentMethod: true,
      items: { include: { variant: { include: { product: true } } } },
    },
  });
  if (!order) notFound();

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Order #{order.id.slice(-8).toUpperCase()}</h1>
          <p className="text-sm text-slate-500">
            {order.user.email} · {formatDate(order.createdAt)} · {order.region.name}
          </p>
        </div>
        <span className="badge bg-surface2 border border-border text-slate-300">{labelFor(ORDER_STATUSES, order.status)}</span>
      </div>

      {(order.buyerName || order.buyerPhone || order.buyerCity || order.paymentProofUrl) && (
        <div className="card p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-200">Buyer &amp; payment</h2>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Name</div>
              <div className="text-slate-200">{order.buyerName || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Phone</div>
              <div className="text-slate-200">{order.buyerPhone || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">City</div>
              <div className="text-slate-200">{order.buyerCity || "—"}</div>
            </div>
          </div>

          {order.paymentMethod && (
            <div className="text-sm">
              <span className="badge bg-accent/10 text-accent-soft border border-accent/30 mr-2">
                {labelFor(PAYMENT_METHOD_TYPES, order.paymentMethod.type)}
              </span>
              <span className="text-slate-300">{order.paymentMethod.label}</span>
              <span className="text-slate-500 ml-2 text-xs">→ {order.paymentMethod.handle}</span>
            </div>
          )}

          {order.paymentProofUrl && (
            <div>
              <div className="text-xs text-slate-500 mb-1.5">Payment proof</div>
              <a href={order.paymentProofUrl} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.paymentProofUrl}
                  alt="Payment proof"
                  className="max-w-xs rounded-lg border border-border hover:border-accent/60 transition-colors"
                />
              </a>
            </div>
          )}

          {order.status === "AWAITING_VERIFICATION" && (
            <form action={verifyPaymentAction} className="flex items-center gap-3">
              <input type="hidden" name="orderId" value={order.id} />
              <button className="btn-cta !px-5">✓ Verify payment &amp; fulfill</button>
              <span className="text-xs text-slate-500">
                Confirms the transfer landed in the account above, then delivers this order.
              </span>
            </form>
          )}
          {order.verifiedAt && (
            <p className="text-xs text-success">Payment verified {formatDate(order.verifiedAt)}</p>
          )}
        </div>
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
                    {item.variant.sku} · {labelFor(SALE_MODES, item.variant.saleMode)} ·{" "}
                    {labelFor(DELIVERY_METHODS, item.variant.deliveryMethod)} × {item.quantity}
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
                <span className="text-xs text-success">Delivered {formatDate(item.deliveredAt)}</span>
              ) : (
                <form action={manualFulfillAction} className="flex gap-2">
                  <input type="hidden" name="orderItemId" value={item.id} />
                  <input type="hidden" name="orderId" value={order.id} />
                  <input
                    name="payload"
                    required
                    placeholder="Key / credentials / confirmation to deliver"
                    className="input flex-1"
                  />
                  <button type="submit" className="btn-primary !px-3">
                    Fulfill
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-lg font-semibold">
        <span className="text-slate-300">Total</span>
        <span className="text-white">{formatMoney(order.total, order.currency)}</span>
      </div>

      {order.status !== "REFUNDED" && order.status !== "CANCELLED" && (
        <div className="flex gap-3">
          <form action={refundOrderAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <button className="btn-danger">Refund order</button>
          </form>
          <form action={cancelOrderAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <button className="btn-secondary">Cancel order</button>
          </form>
        </div>
      )}
    </div>
  );
}
