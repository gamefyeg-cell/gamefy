"use client";

/// Shared recharts tooltip content, styled to match the admin's .card
/// surface instead of recharts' default white box. Per dataviz interaction
/// spec: value leads (bold, high-contrast), series name follows (secondary);
/// each row keyed with a short color line, not a filled swatch box.
export type TooltipRow = { name: string; value: string; color: string };

export default function ChartTooltip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: string | number;
  rows: TooltipRow[];
}) {
  if (!active || rows.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-surface2 px-3 py-2 shadow-lg text-xs min-w-[140px]">
      {label && <div className="text-slate-400 mb-1.5 font-medium">{label}</div>}
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="inline-block w-2.5 h-[3px] rounded-full" style={{ backgroundColor: r.color }} />
              {r.name}
            </span>
            <span className="text-slate-100 font-semibold tabular-nums">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
