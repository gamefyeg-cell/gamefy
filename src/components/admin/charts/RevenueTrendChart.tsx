"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_AXIS_TEXT, CHART_GRID, GOLD_RAMP } from "@/lib/chartColors";
import { formatMoney } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";

export type RevenuePoint = { date: string; label: string; total: number };

/// Revenue over time — a trend, single series, so: sequential (one hue, the
/// gold token already used for "money" elsewhere in the admin), no legend
/// (one color needs no swatch box — the card title already says what's
/// plotted), area wash at ~10% opacity per dataviz mark spec.
export default function RevenueTrendChart({ data, currency }: { data: RevenuePoint[]; currency: string }) {
  const hasData = data.some((d) => d.total > 0);

  return (
    <div className="h-56">
      {!hasData ? (
        <div className="h-full flex items-center justify-center text-sm text-slate-500">No revenue in this period yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD_RAMP.DEFAULT} stopOpacity={0.28} />
                <stop offset="100%" stopColor={GOLD_RAMP.DEFAULT} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART_GRID} vertical={false} strokeDasharray="0" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: CHART_AXIS_TEXT, fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{ fill: CHART_AXIS_TEXT, fontSize: 11 }}
              tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v}`)}
            />
            <Tooltip
              cursor={{ stroke: CHART_GRID, strokeWidth: 1 }}
              content={({ active, label, payload }) => (
                <ChartTooltip
                  active={active}
                  label={label}
                  rows={
                    payload?.length
                      ? [{ name: "Revenue", value: formatMoney(payload[0].value as number, currency), color: GOLD_RAMP.DEFAULT }]
                      : []
                  }
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke={GOLD_RAMP.DEFAULT}
              strokeWidth={2}
              fill="url(#revenueFill)"
              activeDot={{ r: 4, stroke: "#120c1a", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
