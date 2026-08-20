import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createProviderAction, deleteProviderAction } from "@/lib/actions/admin/providers";
import { PROVIDER_SYNC_MODES } from "@/lib/enums";

export default async function AdminProvidersPage() {
  const providers = await prisma.provider.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-white">Providers</h1>
      <p className="text-sm text-slate-500 -mt-4">
        Register 3rd-party key/top-up suppliers here. This registers the provider and encrypts its
        API key at rest — it does not perform live sync yet (no real supplier credentials are
        connected in this demo). See <code className="text-slate-400">README.md</code>.
      </p>

      <div className="card divide-y divide-border">
        {providers.length === 0 && <p className="p-4 text-slate-500 text-sm">No providers yet.</p>}
        {providers.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <span className="text-slate-100">{p.name}</span>
              <span className="text-slate-500 ml-2 text-xs">{p.syncMode}</span>
              {!p.active && <span className="badge bg-surface2 border border-border text-slate-500 ml-2">inactive</span>}
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/admin/providers/${p.id}`} className="text-accent-soft hover:text-accent text-xs">
                Edit
              </Link>
              <form action={deleteProviderAction}>
                <input type="hidden" name="id" value={p.id} />
                <button className="text-danger text-xs hover:underline">Delete</button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Add provider</h2>
        <form action={createProviderAction} className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="e.g. Kinguin" />
          </div>
          <div>
            <label className="label">API base URL</label>
            <input name="apiBaseUrl" className="input" placeholder="https://..." />
          </div>
          <div>
            <label className="label">API key</label>
            <input name="apiKey" type="password" className="input" />
          </div>
          <div>
            <label className="label">Sync mode</label>
            <select name="syncMode" className="input">
              {PROVIDER_SYNC_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Sync frequency (minutes, optional)</label>
            <input name="syncFrequencyMinutes" type="number" className="input" />
          </div>
          <div />
          <div>
            <label className="label">Markup type</label>
            <select name="markupType" className="input">
              <option value="">— none —</option>
              <option value="percent">Percent</option>
              <option value="flat">Flat amount</option>
            </select>
          </div>
          <div>
            <label className="label">Markup value</label>
            <input name="markupValue" type="number" step="0.01" className="input" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4" />
            <span className="text-sm text-slate-300">Active</span>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Create provider
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
