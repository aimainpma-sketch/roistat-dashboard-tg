type FunnelTotals = {
  spend: number;
  leads: number;
  mqlt: number;
  mqls: number;
  sql: number;
  meetingSet: number;
  meetingDone: number;
  sales: number;
  revenue: number;
  grossMargin: number;
  cpl: number;
  cpMqlt: number;
  cpMqls: number;
  cpSql: number;
  cpMeetSet: number;
  cpMeetDone: number;
  crMqlt: number;
  crMqltToMqls: number;
  crMqlsToSql: number;
  crSqlToMeetSet: number;
  crMeetSetToMeetDone: number;
  crMeetToOrder: number;
  romi: number;
};

type MetricDef = {
  key: keyof FunnelTotals;
  label: string;
  format: "money" | "integer" | "percent";
};

type StageDef = {
  label: string;
  color: string;
  metrics: MetricDef[];
};

const FUNNEL_STAGES: StageDef[] = [
  {
    label: "Расход",
    color: "gray",
    metrics: [
      { key: "spend", label: "Расход", format: "money" },
    ],
  },
  {
    label: "Лиды",
    color: "blue",
    metrics: [
      { key: "leads", label: "Лиды", format: "integer" },
      { key: "cpl", label: "CPL", format: "money" },
    ],
  },
  {
    label: "MQLt",
    color: "indigo",
    metrics: [
      { key: "mqlt", label: "MQLt", format: "integer" },
      { key: "cpMqlt", label: "Цена", format: "money" },
      { key: "crMqlt", label: "CR", format: "percent" },
    ],
  },
  {
    label: "MQLs",
    color: "violet",
    metrics: [
      { key: "mqls", label: "MQLs", format: "integer" },
      { key: "cpMqls", label: "Цена", format: "money" },
      { key: "crMqltToMqls", label: "CR", format: "percent" },
    ],
  },
  {
    label: "SQL",
    color: "purple",
    metrics: [
      { key: "sql", label: "SQL", format: "integer" },
      { key: "cpSql", label: "Цена", format: "money" },
      { key: "crMqlsToSql", label: "CR", format: "percent" },
    ],
  },
  {
    label: "Встр. назн.",
    color: "pink",
    metrics: [
      { key: "meetingSet", label: "Встр. назн.", format: "integer" },
      { key: "cpMeetSet", label: "Цена", format: "money" },
      { key: "crSqlToMeetSet", label: "CR", format: "percent" },
    ],
  },
  {
    label: "Встр. пров.",
    color: "rose",
    metrics: [
      { key: "meetingDone", label: "Встр. пров.", format: "integer" },
      { key: "cpMeetDone", label: "Цена", format: "money" },
      { key: "crMeetSetToMeetDone", label: "CR", format: "percent" },
    ],
  },
  {
    label: "Продажи",
    color: "emerald",
    metrics: [
      { key: "sales", label: "Продажи", format: "integer" },
      { key: "revenue", label: "Выручка", format: "money" },
      { key: "grossMargin", label: "Прибыль", format: "money" },
      { key: "romi", label: "ROI", format: "percent" },
    ],
  },
];

const STAGE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  gray:    { bg: "bg-gray-500/10",    border: "border-gray-500/30",    text: "text-gray-300",    label: "text-gray-400" },
  blue:    { bg: "bg-blue-500/10",    border: "border-blue-500/30",    text: "text-blue-300",    label: "text-blue-400" },
  indigo:  { bg: "bg-indigo-500/10",  border: "border-indigo-500/30",  text: "text-indigo-300",  label: "text-indigo-400" },
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/30",  text: "text-violet-300",  label: "text-violet-400" },
  purple:  { bg: "bg-purple-500/10",  border: "border-purple-500/30",  text: "text-purple-300",  label: "text-purple-400" },
  pink:    { bg: "bg-pink-500/10",    border: "border-pink-500/30",    text: "text-pink-300",    label: "text-pink-400" },
  rose:    { bg: "bg-rose-500/10",    border: "border-rose-500/30",    text: "text-rose-300",    label: "text-rose-400" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300", label: "text-emerald-400" },
};

function formatValue(value: number, format: "money" | "integer" | "percent"): string {
  if (format === "money") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${Math.round(value).toLocaleString()}`;
  }
  if (format === "percent") return `${value.toFixed(1)}%`;
  return value.toLocaleString();
}

export function FunnelStripBar({ totals }: { totals: FunnelTotals }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
      {FUNNEL_STAGES.map((stage) => {
        const colors = STAGE_COLORS[stage.color];
        return (
          <div
            key={stage.label}
            className={`min-w-[110px] flex-shrink-0 snap-start rounded-2xl border ${colors.bg} ${colors.border} px-3 py-2.5`}
          >
            <div className={`text-[10px] font-medium uppercase tracking-wider ${colors.label}`}>
              {stage.label}
            </div>
            <div className="mt-1.5 flex flex-col gap-1">
              {stage.metrics.map((m) => (
                <div key={m.key} className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] text-slate-500">{m.label}</span>
                  <span className={`text-sm font-semibold ${colors.text}`}>
                    {formatValue(totals[m.key], m.format)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
