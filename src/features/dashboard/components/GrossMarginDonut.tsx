import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { formatMoney, formatPercent } from "@/lib/format";
import type { DonutSegment } from "@/types/dashboard";

export function GrossMarginDonut({
  data,
  activeChannel,
  onSelect,
}: {
  data: DonutSegment[];
  activeChannel: string | null;
  onSelect: (channel: string | null) => void;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="glass rounded-[32px] border border-white/10 p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.24em] text-slate-500">Donut</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">Валовая маржа по каналам</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
            Клик по сегменту делает его глобальным фильтром для всех KPI-таблиц.
          </p>
        </div>
        {activeChannel ? (
          <button
            className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-brand-400/40 hover:text-white"
            onClick={() => onSelect(null)}
            type="button"
          >
            Сбросить фильтр
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-2">
          {data.map((item) => (
            <button
              key={item.id}
              className={`grid w-full grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                activeChannel === item.label ? "bg-white/10" : "hover:bg-white/5"
              }`}
              onClick={() => onSelect(activeChannel === item.label ? null : item.label)}
              type="button"
            >
              <span
                className="size-4 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-sm text-slate-200">{item.label}</span>
              <span className="text-right text-sm text-slate-400">
                {formatMoney(item.value)} · {formatPercent(item.shareOfTotal)}
              </span>
            </button>
          ))}
        </div>

        <div className="relative h-[360px]">
          <ResponsiveContainer>
            <PieChart>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0b1220",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                formatter={(value) => [formatMoney(Number(value ?? 0)), "Валовая маржа"]}
              />
              <Pie
                data={data}
                dataKey="value"
                innerRadius={86}
                outerRadius={128}
                paddingAngle={3}
                onClick={(_, index) => onSelect(data[index]?.label ?? null)}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={entry.color}
                    opacity={activeChannel && activeChannel !== entry.label ? 0.42 : 1}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-sm text-slate-400">Валовая маржа</div>
            <div className="mt-2 text-4xl font-semibold text-white">{formatMoney(total)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
