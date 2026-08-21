"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_AXIS_TEXT } from "@/lib/chartColors";

export type StatusCount = { status: string; label: string; count: number; color: string };

/// Orders grouped by status — this is the "status" color job (state,
/// reserved meaning), not generic categorical: each bar's color is the same
/// token used for that status's badge everywhere else in the admin (see
/// src/lib/orderStatusColors.ts), so the chart and the order list always
/// agree. Horizontal layout since status labels ("Awaiting Payment
/// Verification") run long. Each bar is its own category + directly labeled
/// by the axis, so no legend box is needed.
export default function OrderStatusChart({ data }: { data: StatusCount[] }) {
  const hasData = data.some((d) => d.count > 0);
  const height = Math.max(160, data.length * 34);

  return (
    <div style={{ height }}>
      {!hasData ? (
        <div className="h-full flex items-center justify-center text-sm text-slate-500">No orders yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }} barCategoryGap={10}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={132}
              tick={{ fill: CHART_AXIS_TEXT, fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as StatusCount;
                return (
                  <div className="rounded-lg border border-border bg-surface2 px-3 py-2 shadow-lg text-xs">
                    <div className="text-slate-400 mb-1">{d.label}</div>
                    <div className="text-slate-100 font-semibold tabular-nums">{d.count.toLocaleString()} order{d.count === 1 ? "" : "s"}</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
              {data.map((d) => (
                <Cell key={d.status} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
