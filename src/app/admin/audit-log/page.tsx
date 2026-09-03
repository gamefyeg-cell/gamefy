import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import Pagination from "@/components/admin/Pagination";

const PER_PAGE = 50;

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const [total, logs] = await Promise.all([
    prisma.adminAuditLog.count(),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { admin: true },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="a-h1">Audit Log</h1>
        <p className="a-sub">
          Every admin mutation (price change, stock edit, refund, reveal, …) — who, when, what changed.
        </p>
      </div>

      <div className="a-list">
        {logs.length === 0 ? (
          <p className="a-list-empty">No activity yet.</p>
        ) : (
          logs.map((l) => (
            <div key={l.id} className="a-list-row">
              <div className="min-w-0">
                <div style={{ color: "var(--a-text)" }}>
                  {l.admin.email} · <span style={{ color: "var(--a-accent)" }}>{l.action}</span>
                </div>
                <div className="a-sub truncate">{l.entity}</div>
              </div>
              <span className="a-sub shrink-0">{formatDate(l.createdAt)}</span>
            </div>
          ))
        )}
      </div>

      <Pagination page={page} pageCount={pageCount} basePath="/admin/audit-log" />
    </div>
  );
}
