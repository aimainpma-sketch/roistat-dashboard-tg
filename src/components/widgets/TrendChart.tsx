import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { WeeklyTrend } from "@/types/dashboard";

type Props = {
  data: WeeklyTrend[];
};

export function TrendChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
        <defs>
          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f8fe8" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#4f8fe8" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="weekLabel"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0b1220",
            color: "#e2e8f0",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          formatter={(value: unknown, name: unknown) => {
            const v = Number(value ?? 0);
            const n = String(name ?? "");
            if (n === "Spend") return [`$${v.toLocaleString("en-US")}`, n];
            return [v, n];
          }}
        />
        <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12, paddingTop: 8 }} />

        <Area
          yAxisId="left"
          type="monotone"
          dataKey="spend"
          name="Spend"
          stroke="#4f8fe8"
          fill="url(#spendGrad)"
          strokeWidth={2}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="mqlt"
          name="MQLt"
          stroke="#6fe0d1"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="sales"
          name="Sales"
          stroke="#e77bc0"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
