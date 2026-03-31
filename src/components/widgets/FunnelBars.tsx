import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

type FunnelDatum = {
  channel: string;
  crMqlt: number;
  crMqltToMqls: number;
  crMqlsToSql: number;
  crSqlToMeet: number;
  crMeetToOrder: number;
};

type Props = {
  data: FunnelDatum[];
};

const STAGES: { key: keyof Omit<FunnelDatum, "channel">; label: string; color: string }[] = [
  { key: "crMqlt", label: "MQLt%", color: "#4f8fe8" },
  { key: "crMqltToMqls", label: "MQLs%", color: "#6fe0d1" },
  { key: "crMqlsToSql", label: "SQL%", color: "#89cc4a" },
  { key: "crSqlToMeet", label: "Meet%", color: "#ff8e43" },
  { key: "crMeetToOrder", label: "Sale%", color: "#e77bc0" },
];

export function FunnelBars({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 56 + 60, 200)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
        <XAxis
          type="number"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
          tickLine={false}
          tickFormatter={(v: number) => `${v.toFixed(0)}%`}
        />
        <YAxis
          type="category"
          dataKey="channel"
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
          formatter={(value: unknown) => [`${Number(value ?? 0).toFixed(1)}%`]}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Legend
          wrapperStyle={{ color: "#cbd5e1", fontSize: 12, paddingTop: 8 }}
        />
        {STAGES.map((stage) => (
          <Bar
            key={stage.key}
            dataKey={stage.key}
            name={stage.label}
            fill={stage.color}
            radius={[0, 4, 4, 0]}
            barSize={8}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
