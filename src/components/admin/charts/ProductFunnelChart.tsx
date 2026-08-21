"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_AXIS_TEXT, CHART_GRID, FUNNEL_ORDINAL_RAMP } from "@/lib/chartColors";
import ChartTooltip from "./ChartTooltip";

export type FunnelRow = { id: string; title: string; views: number; cartAdds: number; purchases: number };

const SERIES = [
  { key: "views" as const, name: "Views", color: FUNNEL_ORDINAL_RAMP[0] },
  { key: "cartAdds" as const, name: "Cart adds", color: FUNNEL_ORDINAL_RAMP[1] },
  { key: "purchases" as const, name: "Purchases", color: FUNNEL_ORDINAL_RAMP[2] },
];

/// Views → cart adds → purchases, per product. This is an *ordinal* triad,
/// not three unrelated categorical series — each stage is a subset of the
/// one before it, and swapping the order would break the story (that's the
/// dataviz test for ordinal vs. categorical). So it takes a one-hue ramp
/// (light → dark = shallow → deep in the funnel) instead of three
/// unrelated hues, reusing the same accent.soft/DEFAULT/deep steps as
/// everywhere else in the brand palette.
export default function ProductFunnelChart({ data }: { data: FunnelRow[] }) {
  if (data.length === 0) {
    return <div className="h-40 flex items-center justify-center text-sm text-slate-500">No activity yet.</div>;
  }

  const chartData = data.map((d) => ({
    ...d,
    shortTitle: d.title.length > 18 ? `${d.title.slice(0, 17)}…` : d.title,
  }));
  const height = Math.max(200, chartData.length * 56);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={18} barGap={2}>
          <CartesianGrid stroke={CHART_GRID} horizontal={false} strokeDasharray="0" />
          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: CHART_AXIS_TEXT, fontSize: 11 }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="shortTitle"
            tickLine={false}
            axisLine={false}
            width={140}
            tick={{ fill: CHART_AXIS_TEXT, fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, label, payload }) => (
              <ChartTooltip
                active={active}
                label={(payload?.[0]?.payload as FunnelRow)?.title ?? label}
                rows={SERIES.map((s) => ({
                  name: s.name,
                  value: (payload?.find((p) => p.dataKey === s.key)?.value as number)?.toLocaleString() ?? "0",
                  color: s.color,
                }))}
              />
            )}
          />
          <Legend
            verticalAlign="top"
            align="left"
            height={32}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: CHART_AXIS_TEXT }}
          />
          {SERIES.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[0, 4, 4, 0]} barSize={12} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
