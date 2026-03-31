type KpiItem = {
  label: string;
  value: string | number;
  format?: "money" | "integer" | "percent";
  delta?: number;
};

type Props = {
  items: KpiItem[];
};

function formatKpiValue(value: string | number, fmt?: "money" | "integer" | "percent"): string {
  if (typeof value === "string") return value;
  switch (fmt) {
    case "money":
      return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    case "percent":
      return `${value.toFixed(1)}%`;
    case "integer":
      return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
    default:
      return String(value);
  }
}

function DeltaBadge({ delta }: { delta: number }) {
  const isPositive = delta >= 0;
  return (
    <span
      className={`ml-2 inline-flex items-center rounded-lg px-1.5 py-0.5 text-xs font-medium ${
        isPositive ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
      }`}
    >
      {isPositive ? "+" : ""}
      {delta.toFixed(1)}%
    </span>
  );
}

export function KpiStrip({ items }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="glass flex-1 min-w-[140px] rounded-2xl border border-white/10 px-4 py-3"
        >
          <div className="text-xs uppercase tracking-wider text-slate-500">{item.label}</div>
          <div className="mt-1 flex items-baseline">
            <span className="text-xl font-semibold text-white">
              {formatKpiValue(item.value, item.format)}
            </span>
            {item.delta != null && <DeltaBadge delta={item.delta} />}
          </div>
        </div>
      ))}
    </div>
  );
}
