import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateActivationRegionAction, deleteActivationRegionAction } from "@/lib/actions/admin/activationRegions";

export default async function EditActivationRegionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [region, zones] = await Promise.all([
    prisma.activationRegion.findUnique({ where: { id } }),
    prisma.activationRegion.findMany({ where: { kind: "ZONE", NOT: { id } }, orderBy: { name: "asc" } }),
  ]);
  if (!region) notFound();

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-2xl font-bold text-white">Edit activation region</h1>
      <form action={updateActivationRegionAction} className="card p-5 grid gap-4">
        <input type="hidden" name="id" value={region.id} />
        <div>
          <label className="label">Name</label>
          <input name="name" defaultValue={region.name} required className="input" />
        </div>
        <div>
          <label className="label">Kind</label>
          <select name="kind" defaultValue={region.kind} className="input">
            <option value="GLOBAL">Global</option>
            <option value="ZONE">Zone</option>
            <option value="COUNTRY">Country</option>
          </select>
        </div>
        <div>
          <label className="label">ISO country code (Country kind only)</label>
          <input name="code" defaultValue={region.code ?? ""} maxLength={2} className="input" />
        </div>
        <div>
          <label className="label">Parent zone (Country kind only)</label>
          <select name="zoneId" defaultValue={region.zoneId ?? ""} className="input">
            <option value="">— none —</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sort order</label>
          <input name="sortOrder" type="number" defaultValue={region.sortOrder} className="input" />
        </div>
        <button type="submit" className="btn-primary">
          Save changes
        </button>
      </form>
      <form action={deleteActivationRegionAction}>
        <input type="hidden" name="id" value={region.id} />
        <button className="btn-danger">Delete</button>
      </form>
    </div>
  );
}
