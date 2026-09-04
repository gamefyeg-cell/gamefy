import Link from "next/link";
import AddPanel from "@/components/admin/AddPanel";
import { prisma } from "@/lib/prisma";
import { createActivationRegionAction, deleteActivationRegionAction } from "@/lib/actions/admin/activationRegions";

export default async function AdminActivationRegionsPage() {
  const regions = await prisma.activationRegion.findMany({
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { zone: true, _count: { select: { variants: true } } },
  });

  const global = regions.filter((r) => r.kind === "GLOBAL");
  const zones = regions.filter((r) => r.kind === "ZONE");
  const countries = regions.filter((r) => r.kind === "COUNTRY");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Activation Regions</h1>
        <p className="text-sm text-slate-500 mt-1">
          Where a key/account can actually be used — separate from the storefront's pricing/currency
          regions. Pick Global, a broad zone (Europe, Middle East, …), or a specific country when
          setting up a product variant.
        </p>
      </div>

      <div className="card divide-y divide-border">
        {[...global, ...zones, ...countries].length === 0 && (
          <p className="p-4 text-slate-500 text-sm">No activation regions yet — add some below.</p>
        )}
        {global.map((r) => (
          <Row key={r.id} r={r} label="Global" />
        ))}
        {zones.map((r) => (
          <Row key={r.id} r={r} label="Zone" />
        ))}
        {countries.map((r) => (
          <Row key={r.id} r={r} label={`Country${r.zone ? ` · ${r.zone.name}` : ""}`} />
        ))}
      </div>

      <AddPanel label="Add activation region">
        <div className="card p-5">
        <form action={createActivationRegionAction} className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="e.g. Egypt, Middle East, Global" />
          </div>
          <div>
            <label className="label">Kind</label>
            <select name="kind" className="input" defaultValue="ZONE">
              <option value="GLOBAL">Global (worldwide, one entry only)</option>
              <option value="ZONE">Zone (continent/region, e.g. Europe)</option>
              <option value="COUNTRY">Country (specific, e.g. Egypt, France)</option>
            </select>
          </div>
          <div>
            <label className="label">ISO country code (Country kind only)</label>
            <input name="code" maxLength={2} className="input" placeholder="EG, FR, US…" />
          </div>
          <div>
            <label className="label">Parent zone (Country kind only)</label>
            <select name="zoneId" className="input">
              <option value="">— select if adding a country —</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Sort order</label>
            <input name="sortOrder" type="number" defaultValue={0} className="input" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Create
            </button>
          </div>
        </form>
        </div>
      </AddPanel>
    </div>
  );
}

function Row({ r, label }: { r: { id: string; name: string; code: string | null; _count: { variants: number } }; label: string }) {
  return (
    <div className="flex items-center justify-between p-3 text-sm">
      <div>
        <span className="text-slate-100">{r.name}</span>
        {r.code && <span className="text-slate-500 ml-2 text-xs">({r.code})</span>}
        <span className="badge bg-surface2 border border-border text-slate-400 ml-2">{label}</span>
        <span className="text-slate-600 ml-2 text-xs">{r._count.variants} variant(s) using this</span>
      </div>
      <div className="flex items-center gap-3">
        <Link href={`/admin/activation-regions/${r.id}`} className="text-accent-soft hover:text-accent text-xs">
          Edit
        </Link>
        <form action={deleteActivationRegionAction}>
          <input type="hidden" name="id" value={r.id} />
          <button className="text-danger text-xs hover:underline">Delete</button>
        </form>
      </div>
    </div>
  );
}
