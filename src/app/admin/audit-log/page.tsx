import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export default async function AdminAuditLogPage() {
  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { admin: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Audit Log</h1>
      <p className="text-sm text-slate-500 -mt-4">
        Every admin mutation (price change, stock edit, refund, reveal, …) — who, when, what changed.
      </p>
      <div className="card divide-y divide-border">
        {logs.length === 0 && <p className="p-4 text-slate-500 text-sm">No activity yet.</p>}
        {logs.map((l) => (
          <div key={l.id} className="p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-100">
                {l.admin.email} · <span className="text-accent-soft">{l.action}</span>
              </span>
              <span className="text-xs text-slate-500">{formatDate(l.createdAt)}</span>
            </div>
            <div className="text-xs text-slate-500">{l.entity}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
