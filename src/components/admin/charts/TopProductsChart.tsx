"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ACCENT_RAMP, CHART_AXIS_TEXT } from "@/lib/chartColors";
import { formatMoney } from "@/lib/format";

export type ProductCount = { id: string; title: string; value: number };

/// Top products by a single metric — magnitude comparison, one series, so
/// one flat hue for every bar (the accent already used for "top products"
/// elsewhere in the admin). Bar length alone carries the ranking; coloring
/// bars by their own value would just re-encode what length already shows.
///
/// `format` is a flag rather than a formatter function on purpose — this is
/// a client component and its parent pages are server components, which
/// can't pass functions as props across that boundary.
export default function TopProductsChart({
  data,
  valueLabel,
  format = "count",
  currency,
}: {
  data: ProductCount[];
  valueLabel: string;
  format?: "count" | "money";
  currency?: string;
}) {
  if (data.length === 0) {
    return <div className="h-40 flex items-center justify-center text-sm text-slate-500">No activity yet.</div>;
  }

  const formatValue = (v: number) => (format === "money" ? formatMoney(v, currency ?? "USD") : v.toLocaleString());

  const chartData = data.map((d) => ({
    ...d,
    shortTitle: d.title.length > 22 ? `${d.title.slice(0, 21)}…` : d.title,
  }));
  const height = Math.max(140, chartData.length * 36);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }} barCategoryGap={10}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="shortTitle"
            tickLine={false}
            axisLine={false}
            width={150}
            tick={{ fill: CHART_AXIS_TEXT, fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof chartData)[number];
              return (
                <div className="rounded-lg border border-border bg-surface2 px-3 py-2 shadow-lg text-xs max-w-[220px]">
                  <div className="text-slate-400 mb-1">{d.title}</div>
                  <div className="text-slate-100 font-semibold tabular-nums">
                    {formatValue(d.value)} {valueLabel}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="value" fill={ACCENT_RAMP.DEFAULT} radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
