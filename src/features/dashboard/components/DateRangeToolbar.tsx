import { endOfMonth, format, startOfMonth, subDays } from "date-fns";
import { CalendarDays, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardFilterState, Grain } from "@/types/dashboard";

export function DateRangeToolbar({
  filters,
  onChange,
  onRefresh,
}: {
  filters: DashboardFilterState;
  onChange: (next: DashboardFilterState) => void;
  onRefresh: () => void;
}) {
  const presets = [
    {
      label: "7 дней",
      apply() {
        onChange({
          ...filters,
          dateFrom: subDays(new Date(filters.dateTo), 6).toISOString().slice(0, 10),
        });
      },
    },
    {
      label: "30 дней",
      apply() {
        onChange({
          ...filters,
          dateFrom: subDays(new Date(filters.dateTo), 29).toISOString().slice(0, 10),
        });
      },
    },
    {
      label: "Месяц",
      apply() {
        onChange({
          ...filters,
          dateFrom: startOfMonth(new Date(filters.dateTo)).toISOString().slice(0, 10),
          dateTo: endOfMonth(new Date(filters.dateTo)).toISOString().slice(0, 10),
        });
      },
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-200">
        <CalendarDays className="size-4 text-slate-400" />
        <input
          className="bg-transparent outline-none"
          type="date"
          value={filters.dateFrom}
          onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })}
        />
        <span className="text-slate-500">—</span>
        <input
          className="bg-transparent outline-none"
          type="date"
          value={filters.dateTo}
          onChange={(event) => onChange({ ...filters, dateTo: event.target.value })}
        />
      </div>

      <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
        {(["day", "week"] as Grain[]).map((grain) => (
          <button
            key={grain}
            className={cn(
              "rounded-xl px-4 py-2 text-sm transition",
              filters.grain === grain ? "bg-brand-400 text-slate-950" : "text-slate-300 hover:text-white",
            )}
            onClick={() => onChange({ ...filters, grain })}
            type="button"
          >
            {grain === "day" ? "Дни" : "Недели"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-brand-400/40 hover:text-white"
            onClick={preset.apply}
            type="button"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <button
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-brand-400/40 hover:text-white"
        onClick={onRefresh}
        type="button"
      >
        <RefreshCcw className="size-4" />
        Обновить
      </button>

      {filters.channelFilter ? (
        <div className="rounded-2xl border border-brand-400/25 bg-brand-400/10 px-3 py-2 text-sm text-brand-200">
          Фильтр канала: {filters.channelFilter}
        </div>
      ) : null}
    </div>
  );
}
