"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { placeOrderAction, type CheckoutState } from "@/lib/actions/checkout";
import { formatMoney } from "@/lib/format";
import { PAYMENT_METHOD_TYPES } from "@/lib/enums";
import { TRUST_SIGNALS } from "@/lib/trust-signals";
import PaymentProofUploader from "@/components/storefront/PaymentProofUploader";
import Reveal from "@/components/storefront/Reveal";

const FORM_ID = "checkout-form";

interface Line {
  variantId: string;
  qty: number;
  title: string;
  variantLabel: string;
  price: number;
  currency: string;
  discountAmount: number;
  discountName: string | null;
  cover: string | null;
}

interface PaymentMethod {
  id: string;
  type: string;
  label: string;
  handle: string;
  instructions: string | null;
}

const TYPE_ICON: Record<string, string> = { INSTAPAY: "📲", TELDA: "💳" };

function CopyHandle({ handle }: { handle: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(handle);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — the number is still visible to copy by hand */
        }
      }}
      className="badge bg-surface2 border border-border text-slate-300 hover:border-accent/60 shrink-0"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

export default function CheckoutForm({
  lines,
  total,
  currency,
  needsAck,
  notices,
  loggedInEmail,
  couponCode,
  couponStatus,
  paymentMethods,
}: {
  lines: Line[];
  total: number;
  currency: string;
  needsAck: boolean;
  notices: string[];
  loggedInEmail?: string;
  couponCode?: string;
  couponStatus: "applied" | "valid" | "invalid" | null;
  paymentMethods: PaymentMethod[];
}) {
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(placeOrderAction, {});

  const availableTypes = useMemo(
    () => PAYMENT_METHOD_TYPES.filter((t) => paymentMethods.some((m) => m.type === t.value)),
    [paymentMethods]
  );
  const [activeType, setActiveType] = useState(availableTypes[0]?.value);
  const methodsForType = paymentMethods.filter((m) => m.type === activeType);
  const [methodId, setMethodId] = useState(methodsForType[0]?.id ?? "");
  const selected = paymentMethods.find((m) => m.id === methodId);

  function switchType(type: (typeof PAYMENT_METHOD_TYPES)[number]["value"]) {
    setActiveType(type);
    setMethodId(paymentMethods.find((m) => m.type === type)?.id ?? "");
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      {/* Left: everything that actually submits — one <form>, referenced by
          id from the summary panel's submit button (HTML5 form="..."),
          so the sticky order summary can live in its own column without
          illegally nesting forms inside forms. */}
      <Reveal className="lg:col-span-2 flex flex-col gap-6">
        <form id={FORM_ID} action={formAction} className="flex flex-col gap-6">
          {couponCode && <input type="hidden" name="couponCode" value={couponCode} />}

          {notices.length > 0 && (
            <div className="notice-box flex flex-col gap-2">
              <div className="text-warn font-semibold text-sm">⚠ Before You Buy</div>
              {notices.map((n, i) => (
                <p key={i} className="text-sm text-slate-200 whitespace-pre-line">
                  {n}
                </p>
              ))}
            </div>
          )}

          <div className="card p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-slate-200">Your details</h2>
            {!loggedInEmail && (
              <div>
                <label className="label">Email (order confirmation &amp; delivery)</label>
                <input type="email" name="email" required className="input" placeholder="you@example.com" />
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Full name</label>
                <input name="buyerName" required className="input" placeholder="Ahmed Hassan" />
              </div>
              <div>
                <label className="label">Phone number</label>
                <input name="buyerPhone" required type="tel" className="input" placeholder="01xxxxxxxxx" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">City</label>
                <input name="buyerCity" required className="input" placeholder="Cairo" />
              </div>
            </div>
          </div>

          <div className="card p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-slate-200">Pay via InstaPay or Telda</h2>

            {availableTypes.length === 0 ? (
              <p className="text-sm text-danger">
                No payment method is set up yet — an admin needs to add an InstaPay or Telda account
                under Admin → Payment Methods before checkout can be completed.
              </p>
            ) : (
              <>
                {availableTypes.length > 1 && (
                  <div className="flex gap-2">
                    {availableTypes.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => switchType(t.value)}
                        className={`btn !px-4 !py-1.5 text-sm ${
                          activeType === t.value ? "bg-accent text-white" : "bg-surface2 text-slate-300 border border-border"
                        }`}
                      >
                        {TYPE_ICON[t.value]} {t.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {methodsForType.map((m) => (
                    <label
                      key={m.id}
                      className={`flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        methodId === m.id ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="_methodPicker"
                          checked={methodId === m.id}
                          onChange={() => setMethodId(m.id)}
                          className="h-4 w-4"
                        />
                        <span>
                          <span className="block text-sm text-slate-100 font-medium">{m.label}</span>
                          <span className="block text-xs text-slate-500">{m.handle}</span>
                        </span>
                      </span>
                      <CopyHandle handle={m.handle} />
                    </label>
                  ))}
                </div>

                {selected?.instructions && (
                  <p className="text-xs text-slate-400 whitespace-pre-line">{selected.instructions}</p>
                )}

                <input type="hidden" name="paymentMethodId" value={methodId} />

                <div className="border-t border-border pt-4">
                  <label className="label">
                    Upload a screenshot proving the transfer went through <span className="text-danger">*</span>
                  </label>
                  <PaymentProofUploader name="paymentProofUrl" />
                </div>
              </>
            )}
          </div>

          {needsAck && (
            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input type="checkbox" name="ack" className="mt-1 h-4 w-4" />
              I've read the notes above for the applicable items.
            </label>
          )}

          {state.error && <p className="text-danger text-sm">{state.error}</p>}
        </form>
      </Reveal>

      {/* Right: order summary — sticky, its own coupon mini-form (a
          separate <form method="get">, never nested inside the one
          above), and the actual submit button wired to the main form
          via form="checkout-form" instead of being inside it. */}
      <Reveal delay={0.1}>
        <div className="card p-5 flex flex-col gap-4 relative overflow-hidden lg:sticky lg:top-20">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent-soft to-gold" />

          <h2 className="text-sm font-semibold text-slate-200">Order Summary</h2>

          <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
            {lines.map((l) => {
              const unitNet = Math.max(0, l.price - l.discountAmount);
              return (
                <div key={l.variantId} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface2 border border-border shrink-0">
                    {l.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.cover} alt={l.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white/20 bg-gradient-to-br from-accent-deep to-surface2">
                        {l.title.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-200 truncate">{l.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {l.variantLabel} × {l.qty}
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 text-right shrink-0">{formatMoney(unitNet * l.qty, l.currency)}</div>
                </div>
              );
            })}
          </div>

          <form method="get" className="flex gap-2">
            <input name="coupon" defaultValue={couponCode ?? ""} placeholder="Coupon code" className="input !py-1.5 text-xs flex-1" />
            <button type="submit" className="btn-secondary !py-1.5 !px-3 text-xs">
              Apply
            </button>
          </form>
          {couponStatus === "invalid" && <p className="text-danger text-xs -mt-2">Invalid or expired coupon.</p>}
          {couponStatus === "applied" && <p className="text-success text-xs -mt-2">Coupon applied ✓</p>}

          <div className="flex justify-between border-t border-border pt-3">
            <span className="text-slate-300 font-medium">Total</span>
            <span className="font-heading font-bold text-gold text-2xl">{formatMoney(total, currency)}</span>
          </div>

          <button type="submit" form={FORM_ID} disabled={pending || availableTypes.length === 0} className="btn-cta w-full !py-3 text-base justify-center">
            {pending ? "Submitting…" : "Submit order"}
          </button>

          <p className="text-[11px] text-slate-500 text-center">
            Send the total to the account you picked, upload proof, and submit — we verify and deliver
            usually within a few minutes.
          </p>

          <div className="flex flex-col gap-2.5 border-t border-border pt-4">
            {TRUST_SIGNALS.map((t) => (
              <div key={t.title} className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-7 h-7 rounded-full border border-accent/50 bg-accent/10 text-xs shrink-0">
                  {t.icon}
                </span>
                <span className="text-xs text-slate-400">
                  <span className="text-slate-200 font-medium">{t.title}</span> · {t.subtitle}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
