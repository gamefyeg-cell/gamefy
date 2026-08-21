import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateProviderAction, deleteProviderAction } from "@/lib/actions/admin/providers";
import { PROVIDER_SYNC_MODES } from "@/lib/enums";
import { parseJson } from "@/lib/json";

export default async function EditProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) notFound();

  const markup = parseJson<{ type?: string; value?: number }>(provider.markupRule, {});

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Edit provider</h1>
      <form action={updateProviderAction} className="card p-5 grid md:grid-cols-2 gap-4">
        <input type="hidden" name="id" value={provider.id} />
        <div>
          <label className="label">Name</label>
          <input name="name" defaultValue={provider.name} required className="input" />
        </div>
        <div>
          <label className="label">API base URL</label>
          <input name="apiBaseUrl" defaultValue={provider.apiBaseUrl ?? ""} className="input" />
        </div>
        <div>
          <label className="label">API key (leave blank to keep current)</label>
          <input name="apiKey" type="password" className="input" placeholder="••••••••" />
        </div>
        <div>
          <label className="label">Sync mode</label>
          <select name="syncMode" defaultValue={provider.syncMode} className="input">
            {PROVIDER_SYNC_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sync frequency (minutes)</label>
          <input
            name="syncFrequencyMinutes"
            type="number"
            defaultValue={provider.syncFrequencyMinutes ?? ""}
            className="input"
          />
        </div>
        <div />
        <div>
          <label className="label">Markup type</label>
          <select name="markupType" defaultValue={markup.type ?? ""} className="input">
            <option value="">— none —</option>
            <option value="percent">Percent</option>
            <option value="flat">Flat amount</option>
          </select>
        </div>
        <div>
          <label className="label">Markup value</label>
          <input name="markupValue" type="number" step="0.01" defaultValue={markup.value ?? ""} className="input" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={provider.active} className="h-4 w-4" />
          <span className="text-sm text-slate-300">Active</span>
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </div>
      </form>
      <form action={deleteProviderAction}>
        <input type="hidden" name="id" value={provider.id} />
        <button className="btn-danger">Delete provider</button>
      </form>
    </div>
  );
}
