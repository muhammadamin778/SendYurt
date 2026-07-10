"use client";

import { useLocale, useTranslations } from "next-intl";
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e4dbc6" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6f5e48" }} tickLine={false} />
          <YAxis
            tickFormatter={compactUzs}
            tick={{ fontSize: 12, fill: "#6f5e48" }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value) => formatMoney(Number(value), "UZS", locale)}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e4dbc6",
              fontSize: 13,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey={t("income")} fill="#bc9432" radius={[4, 4, 0, 0]} />
          <Bar dataKey={t("spent")} fill="#cf4e20" radius={[4, 4, 0, 0]} />
          <Bar dataKey={t("saved")} fill="#2f5096" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
