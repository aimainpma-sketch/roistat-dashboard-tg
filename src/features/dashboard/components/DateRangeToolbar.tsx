import { memo, useCallback, useRef } from "react";
import { endOfMonth, startOfMonth, subDays } from "date-fns";
import { CalendarDays, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardFilterState, Grain } from "@/types/dashboard";

export const DateRangeToolbar = memo(function DateRangeToolbar({
  filters,
  onChange,
  onRefresh,
}: {
  filters: DashboardFilterState;
  onChange: (next: DashboardFilterState) => void;
  onRefresh: () => void;
}) {
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  const applyDate = useCallback(
    (field: "dateFrom" | "dateTo", value: string) => {
      if (value && value !== filters[field]) {
        onChange({ ...filters, [field]: value });
      }
    },
    [filters, onChange],
  );

  const setPreset7 = useCallback(() => {
    onChange({
      ...filters,
      dateFrom: subDays(new Date(filters.dateTo), 6).toISOString().slice(0, 10),
    });
  }, [filters, onChange]);

  const setPreset30 = useCallback(() => {
    onChange({
      ...filters,
      dateFrom: subDays(new Date(filters.dateTo), 29).toISOString().slice(0, 10),
    });
  }, [filters, onChange]);

  const setPresetMonth = useCallback(() => {
    onChange({
      ...filters,
      dateFrom: startOfMonth(new Date(filters.dateTo)).toISOString().slice(0, 10),
      dateTo: endOfMonth(new Date(filters.dateTo)).toISOString().slice(0, 10),
    });
  }, [filters, onChange]);

  const setGrain = useCallback(
    (grain: Grain) => onChange({ ...filters, grain }),
    [filters, onChange],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-200">
        <CalendarDays className="size-4 text-slate-400" />
        <input
          ref={fromRef}
          className="bg-transparent outline-none"
          type="date"
          defaultValue={filters.dateFrom}
          key={filters.dateFrom}
          onChange={(e) => applyDate("dateFrom", e.target.value)}
        />
        <span className="text-slate-500">—</span>
        <input
          ref={toRef}
          className="bg-transparent outline-none"
          type="date"
          defaultValue={filters.dateTo}
          key={filters.dateTo}
          onChange={(e) => applyDate("dateTo", e.target.value)}
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
            onClick={() => setGrain(grain)}
            type="button"
          >
            {grain === "day" ? "Дни" : "Недели"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-brand-400/40 hover:text-white"
          onClick={setPreset7}
          type="button"
        >
          7 дней
        </button>
        <button
          className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-brand-400/40 hover:text-white"
          onClick={setPreset30}
          type="button"
        >
          30 дней
        </button>
        <button
          className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-brand-400/40 hover:text-white"
          onClick={setPresetMonth}
          type="button"
        >
          Месяц
        </button>
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
});
