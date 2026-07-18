"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, formatMonth } from "@/lib/format";

export interface ChartPoint {
  period: string;
  monthStartIso: string;
  incomeUzs: number;
  spentUzs: number;
  savedUzs: number;
}

function compactUzs(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

export function SpendSaveChart({ points }: { points: ChartPoint[] }) {
  const t = useTranslations("budget.chart");
  const locale = useLocale();

  // Bars rise in unless the user prefers reduced motion.
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const data = points.map((p) => ({
    name: formatMonth(new Date(p.monthStartIso), locale),
    [t("income")]: p.incomeUzs,
    [t("spent")]: p.spentUzs,
    [t("saved")]: p.savedUzs,
  }));

  return (
    <div className="h-72 w-full" role="img" aria-label={t("ariaLabel")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--chart-axis)" }} tickLine={false} />
          <YAxis
            tickFormatter={compactUzs}
            tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: "rgb(47 80 150 / 0.06)" }}
            formatter={(value) => formatMoney(Number(value), "UZS", locale)}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--chart-grid)",
              fontSize: 13,
              fontVariantNumeric: "tabular-nums",
              boxShadow: "0 6px 20px -6px rgb(26 39 64 / 0.18)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          {/* Semantic finance encoding: income = trust blue, spending =
              outflow red, saved = profit green. */}
          <Bar dataKey={t("income")} fill="var(--chart-primary)" radius={[4, 4, 0, 0]} isAnimationActive={animate} />
          <Bar dataKey={t("spent")} fill="var(--chart-negative)" radius={[4, 4, 0, 0]} isAnimationActive={animate} />
          <Bar dataKey={t("saved")} fill="var(--chart-positive)" radius={[4, 4, 0, 0]} isAnimationActive={animate} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
