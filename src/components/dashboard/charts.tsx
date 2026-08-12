"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inr, formatMonth } from "@/lib/format";
import type { DashboardStats, PayoutStatus } from "@/lib/types";

// Series colors come from the validated chart tokens in globals.css (dataviz
// palette: sales=blue, commission=amber, paid=emerald). SVG presentation
// attributes can't resolve var(), so read the computed values and re-read when
// next-themes swaps the .dark class on <html>.
const FALLBACK = { sales: "#3B82F6", commission: "#F59E0B", paid: "#10B981", surface: "#ffffff" };

function useChartColors() {
  const [colors, setColors] = useState(FALLBACK);
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const get = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
      setColors({
        sales: get("--chart-sales", FALLBACK.sales),
        commission: get("--chart-commission", FALLBACK.commission),
        paid: get("--chart-paid", FALLBACK.paid),
        surface: get("--card", FALLBACK.surface),
      });
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return colors;
}

// Compact Indian money for axis ticks: 1.2Cr / 4.5L / 80k.
function inrCompact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e7) return `₹${(v / 1e7).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (abs >= 1e5) return `₹${(v / 1e5).toFixed(1).replace(/\.0$/, "")}L`;
  if (abs >= 1e3) return `₹${(v / 1e3).toFixed(0)}k`;
  return `₹${v}`;
}

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };

// Recharts tooltip styled with popover tokens so it adapts to light/dark.
function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="tabular-nums" style={{ fontFamily: "var(--font-geist-mono)" }}>
            {inr(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

const LEGEND = (
  <Legend
    iconType="circle"
    iconSize={8}
    wrapperStyle={{ fontSize: 13 }}
    // Identity lives in the colored icon; the label stays in text ink.
    formatter={(value: string) => <span style={{ color: "var(--muted-foreground)" }}>{value}</span>}
  />
);

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-6">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  );
}

// 1. Monthly trend — sales, commission, paid as 2px lines.
export function MonthlyTrendChart({ data }: { data: DashboardStats["monthly"] }) {
  const C = useChartColors();
  const rows = data.map((d) => ({ ...d, label: formatMonth(d.month) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} tickFormatter={inrCompact} axisLine={false} tickLine={false} width={58} />
        <Tooltip content={<MoneyTooltip />} cursor={{ stroke: "var(--border)" }} />
        {LEGEND}
        <Line isAnimationActive={false} type="monotone" dataKey="sales" name="Sales" stroke={C.sales} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line isAnimationActive={false} type="monotone" dataKey="commission" name="Commission" stroke={C.commission} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line isAnimationActive={false} type="monotone" dataKey="paid" name="Paid" stroke={C.paid} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// 2. Zone performance — horizontal grouped bars (zone names are long),
// rounded data-ends, 2px gap between adjacent bars.
export function ZonePerformanceChart({ data }: { data: DashboardStats["zonePerformance"] }) {
  const C = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 44 + 60)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 4 }} barGap={2}>
        <CartesianGrid stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK} tickFormatter={inrCompact} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="zoneName"
          tick={{ ...AXIS_TICK, fontSize: 11 }}
          width={140}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--muted)" }} />
        {LEGEND}
        <Bar isAnimationActive={false} dataKey="sales" name="Sales" fill={C.sales} radius={[0, 4, 4, 0]} barSize={12} />
        <Bar isAnimationActive={false} dataKey="commission" name="Commission" fill={C.commission} radius={[0, 4, 4, 0]} barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 3. Payment status donut — 2px card-surface gap between segments; center total.
export function PaymentStatusDonut({
  data,
}: {
  data: DashboardStats["paymentStatusDistribution"];
}) {
  const C = useChartColors();
  const STATUS_COLORS: Record<PayoutStatus, string> = {
    PENDING: C.sales,
    PARTIAL: C.commission,
    PAID: C.paid,
  };
  const total = data.reduce((s, d) => s + d.count, 0);
  const rows = data.map((d) => ({
    name: d.status.charAt(0) + d.status.slice(1).toLowerCase(),
    value: d.count,
    status: d.status,
  }));
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            isAnimationActive={false}
            data={rows}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={total > 0 ? 1 : 0}
            stroke={C.surface}
            strokeWidth={2}
          >
            {rows.map((r) => (
              <Cell key={r.status} fill={STATUS_COLORS[r.status]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
                  {payload[0].name}: {payload[0].value} calculation(s)
                </div>
              ) : null
            }
          />
          {LEGEND}
        </PieChart>
      </ResponsiveContainer>
      {/* Center hero number: total approved calculations */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
        <span
          className="text-3xl font-semibold tabular-nums"
          style={{ fontFamily: "var(--font-geist-mono)" }}
        >
          {total}
        </span>
        <span className="text-xs text-muted-foreground">approved calcs</span>
      </div>
    </div>
  );
}
