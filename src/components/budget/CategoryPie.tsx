"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/format";

export interface PieSlice {
  /** Localized category label (localized on the server). */
  label: string;
  value: number;
}

// Token-derived palette: lapis and clay families first, gold accents after.
const COLORS = [
  "#2f5096", "#cf4e20", "#bc9432", "#6d9ad3", "#e4854d",
  "#a67c28", "#3862b0", "#89301e", "#b19262", "#886948",
];

export function CategoryPie({ slices }: { slices: PieSlice[] }) {
  const t = useTranslations("budget.pie");
  const locale = useLocale();

  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const total = slices.reduce((acc, s) => acc + s.value, 0);

  return (
    <div className="h-72 w-full" role="img" aria-label={t("ariaLabel")}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            innerRadius="52%"
            outerRadius="80%"
            paddingAngle={2}
            isAnimationActive={animate}
            strokeWidth={0}
          >
            {slices.map((s, i) => (
              <Cell key={s.label} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${formatMoney(Number(value), "UZS", locale)} (${total > 0 ? Math.round((Number(value) / total) * 100) : 0}%)`,
              String(name),
            ]}
            contentStyle={{ borderRadius: 12, fontSize: 13 }}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ fontSize: 12, maxWidth: "45%" }}
            formatter={(value: string) => {
              const slice = slices.find((s) => s.label === value);
              const pct = slice && total > 0 ? Math.round((slice.value / total) * 100) : 0;
              return `${value} · ${pct}%`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
