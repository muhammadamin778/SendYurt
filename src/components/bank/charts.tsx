"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/format";

function useAnimate(): boolean {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return animate;
}

function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}

/* -- Grouped rounded bars (Weekly Activity, Money In & Out) -------------- */

export interface BarPoint {
  name: string;
  primary: number;
  secondary: number;
}

export function BankGroupedBars({
  data,
  primaryColor = "#0a7c53",
  secondaryColor = "#94a3b8",
  ariaLabel,
}: {
  data: BarPoint[];
  primaryColor?: string;
  secondaryColor?: string;
  ariaLabel?: string;
}) {
  const locale = useLocale();
  const animate = useAnimate();

  return (
    <div className="h-[260px] w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={8} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="0" stroke="#eef2f6" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 13, fill: "#64748b" }} tickLine={false} axisLine={false} dy={8} />
          <YAxis tickFormatter={compact} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            cursor={{ fill: "rgba(10, 124, 83, 0.06)" }}
            formatter={(value) => formatMoney(Number(value), "UZS", locale)}
            contentStyle={{ borderRadius: 12, border: "1px solid #e8edf3", fontSize: 13 }}
          />
          <Bar dataKey="primary" fill={primaryColor} radius={[12, 12, 12, 12]} barSize={14} isAnimationActive={animate} />
          <Bar dataKey="secondary" fill={secondaryColor} radius={[12, 12, 12, 12]} barSize={14} isAnimationActive={animate} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -- Balance history area ------------------------------------------------ */

export function BankArea({
  data,
  ariaLabel,
}: {
  data: { name: string; value: number }[];
  ariaLabel?: string;
}) {
  const locale = useLocale();
  const animate = useAnimate();

  return (
    <div className="h-[260px] w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="bankAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a7c53" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#0a7c53" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke="#eef2f6" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} dy={8} />
          <YAxis tickFormatter={compact} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            formatter={(value) => formatMoney(Number(value), "UZS", locale)}
            contentStyle={{ borderRadius: 12, border: "1px solid #e8edf3", fontSize: 13 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#0a7c53"
            strokeWidth={3}
            fill="url(#bankAreaFill)"
            isAnimationActive={animate}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -- Expense statistics pie (labeled slices) ---------------------------- */

const PIE_COLORS = ["#0a7c53", "#d9a441", "#131b2e", "#ef4444", "#34d399", "#94a3b8"];

const RAD = Math.PI / 180;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  if (percent < 0.06) return null;
  return (
    <text x={x} y={y} fill="#ffffff" textAnchor="middle" dominantBaseline="central">
      <tspan x={x} dy="-0.3em" fontSize="15" fontWeight="700">{`${Math.round(percent * 100)}%`}</tspan>
      <tspan x={x} dy="1.3em" fontSize="11" fontWeight="500">{name}</tspan>
    </text>
  );
}

export function BankExpensePie({
  slices,
  ariaLabel,
}: {
  slices: { label: string; value: number }[];
  ariaLabel?: string;
}) {
  const locale = useLocale();
  const animate = useAnimate();
  const total = slices.reduce((a, s) => a + s.value, 0);

  return (
    <div className="h-[300px] w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius="0%"
            outerRadius="88%"
            paddingAngle={3}
            startAngle={90}
            endAngle={-270}
            labelLine={false}
            label={renderLabel}
            isAnimationActive={animate}
            stroke="#ffffff"
            strokeWidth={4}
          >
            {slices.map((s, i) => (
              <Cell key={s.label} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${formatMoney(Number(value), "UZS", locale)} (${total > 0 ? Math.round((Number(value) / total) * 100) : 0}%)`,
              String(name),
            ]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e8edf3", fontSize: 13 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
