import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updatePaymentMethodAction, deletePaymentMethodAction } from "@/lib/actions/admin/paymentMethods";
import { PAYMENT_METHOD_TYPES } from "@/lib/enums";

export default async function EditPaymentMethodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!method) notFound();

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Edit payment method</h1>

      <form action={updatePaymentMethodAction} className="card p-5 grid md:grid-cols-2 gap-4">
        <input type="hidden" name="id" value={method.id} />
        <div>
          <label className="label">Type</label>
          <select name="type" defaultValue={method.type} className="input">
            {PAYMENT_METHOD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Label (shown to buyers)</label>
          <input name="label" defaultValue={method.label} required className="input" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Handle / number</label>
          <input name="handle" defaultValue={method.handle} required className="input" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Instructions (optional)</label>
          <input name="instructions" defaultValue={method.instructions ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Sort order</label>
          <input name="sortOrder" type="number" defaultValue={method.sortOrder} className="input" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={method.active} className="h-4 w-4" />
          <span className="text-sm text-slate-300">Active</span>
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </div>
      </form>

      <form action={deletePaymentMethodAction}>
        <input type="hidden" name="id" value={method.id} />
        <button className="btn-danger">Delete payment method</button>
      </form>
    </div>
  );
}
