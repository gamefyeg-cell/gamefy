import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createPaymentMethodAction } from "@/lib/actions/admin/paymentMethods";
import { PAYMENT_METHOD_TYPES, labelFor } from "@/lib/enums";

export default async function AdminPaymentMethodsPage() {
  const methods = await prisma.paymentMethod.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }] });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Payment Methods</h1>
        <p className="text-sm text-slate-500 mt-1">
          The InstaPay/Telda accounts buyers see at checkout. No payment gateway is wired up — buyers
          transfer manually to whichever account they pick and upload a screenshot; you verify it from
          the order page before it's fulfilled.
        </p>
      </div>

      <div className="card divide-y divide-border">
        {methods.length === 0 && <p className="p-4 text-slate-500 text-sm">No payment methods yet — checkout won't work until you add one.</p>}
        {methods.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <span className="badge bg-accent/10 text-accent-soft border border-accent/30 mr-2">
                {labelFor(PAYMENT_METHOD_TYPES, m.type)}
              </span>
              <span className="text-slate-100">{m.label}</span>
              <span className="text-slate-500 ml-2 text-xs">{m.handle}</span>
              {!m.active && <span className="badge bg-surface2 border border-border text-slate-500 ml-2">inactive</span>}
            </div>
            <Link href={`/admin/payment-methods/${m.id}`} className="text-accent-soft hover:text-accent text-xs">
              Edit →
            </Link>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Add payment method</h2>
        <form action={createPaymentMethodAction} className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Type</label>
            <select name="type" className="input">
              {PAYMENT_METHOD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Label (shown to buyers)</label>
            <input name="label" required className="input" placeholder="InstaPay — Main account" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Handle / number</label>
            <input name="handle" required className="input" placeholder="e.g. yourname@instapay or 01xxxxxxxxx" />
            <p className="text-xs text-slate-600 mt-1">The exact username/IPA or phone number buyers send money to.</p>
          </div>
          <div className="md:col-span-2">
            <label className="label">Instructions (optional)</label>
            <input name="instructions" className="input" placeholder="e.g. Add your order email in the transfer note" />
          </div>
          <div>
            <label className="label">Sort order</label>
            <input name="sortOrder" type="number" defaultValue={0} className="input" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4" />
            <span className="text-sm text-slate-300">Active</span>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Add payment method
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
