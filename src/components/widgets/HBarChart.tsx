import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

type HBarDatum = {
  name: string;
  value: number;
  color?: string;
};

type Props = {
  data: HBarDatum[];
  valueLabel?: string;
  referenceLine?: number;
  formatValue?: (v: number) => string;
};

const DEFAULT_COLOR = "#4f8fe8";

export function HBarChart({ data, valueLabel, referenceLine, formatValue }: Props) {
  const fmt = formatValue ?? ((v: number) => v.toLocaleString("en-US"));

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 40 + 32, 120)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
        <XAxis
          type="number"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          tickLine={false}
          tickFormatter={fmt}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#cbd5e1", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0b1220",
            color: "#e2e8f0",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          formatter={(value: unknown) => [fmt(Number(value ?? 0)), valueLabel ?? "Value"]}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        {referenceLine != null && (
          <ReferenceLine x={referenceLine} stroke="#ef4444" strokeDasharray="4 4" />
        )}
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color ?? DEFAULT_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
