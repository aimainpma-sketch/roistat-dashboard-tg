import { startTransition } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { AppShell } from "@/components/AppShell";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { DateRangeToolbar } from "@/features/dashboard/components/DateRangeToolbar";
import { useMarketingData } from "@/features/marketing/hooks/useMarketingData";
import { useCurrentRole } from "@/features/dashboard/hooks/useDashboardData";
import { formatRangeLabel } from "@/lib/format";
import type { LanguageSegment } from "@/types/dashboard";

const LANGUAGE_OPTIONS: { value: LanguageSegment | null; label: string }[] = [
  { value: null, label: "Все языки" },
  { value: "RU", label: "RU" },
  { value: "EN", label: "EN" },
];

export function MarketingDashboardPage() {
  const roleQuery = useCurrentRole();
  const {
    filters,
    setFilters,
    setLanguageFilter,
    channelSummaries,
    weeklyTrend,
    redFlags,
    rejectionBreakdown,
    languageSplit,
    isLoading,
  } = useMarketingData();

  const totals = channelSummaries.reduce(
    (acc, ch) => ({
      spend: acc.spend + ch.spend,
      leads: acc.leads + ch.leads,
      mqlt: acc.mqlt + ch.mqlt,
      sales: acc.sales + ch.sales,
      revenue: acc.revenue + ch.revenue,
    }),
    { spend: 0, leads: 0, mqlt: 0, sales: 0, revenue: 0 },
  );

  const avgCpl = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const avgRomi = totals.spend > 0 ? ((totals.revenue - totals.spend) / totals.spend) * 100 : 0;

  const allRejections = rejectionBreakdown.reduce(
    (acc, ch) => {
      for (const r of ch.reasons) {
        const existing = acc.find((x) => x.reason === r.reason);
        if (existing) existing.count += r.count;
        else acc.push({ ...r });
      }
      return acc;
    },
    [] as { reason: string; count: number }[],
  );
  allRejections.sort((a, b) => b.count - a.count);

  return (
    <AppShell
      title="Маркетинг"
      subtitle={`${formatRangeLabel(filters.dateFrom, filters.dateTo)} · ${filters.grain === "day" ? "дни" : "недели"}`}
      role={roleQuery.data ?? "admin"}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <DateRangeToolbar
            filters={filters}
            onChange={(next) => {
              startTransition(() =>
                setFilters({ ...next, languageFilter: filters.languageFilter }),
              );
            }}
            onRefresh={() => {}}
          />
          <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                className={`rounded-xl px-3 py-2 text-sm transition ${
                  filters.languageFilter === opt.value
                    ? "bg-brand-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
                onClick={() => startTransition(() => setLanguageFilter(opt.value))}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          Загрузка данных...
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Расход" value={`$${Math.round(totals.spend).toLocaleString()}`} />
            <KpiCard label="Лиды" value={totals.leads.toLocaleString()} />
            <KpiCard label="MQLt" value={totals.mqlt.toLocaleString()} />
            <KpiCard label="Продажи" value={totals.sales.toLocaleString()} />
            <KpiCard label="CPL" value={`$${Math.round(avgCpl)}`} />
            <KpiCard label="ROMI" value={`${Math.round(avgRomi)}%`} />
          </div>

          {/* Row 1: Weekly Trend + Language Split */}
          <div className="grid gap-4 lg:grid-cols-2">
            <WidgetCard
              title="Недельный тренд"
              subtitle="Расход, лиды, MQLt и ROMI по неделям"
              actionLabel="Если ROMI падает 2+ недели подряд — пересмотреть бюджет канала"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="weekLabel" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 12 }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="leads" name="Лиды" stroke="#4f8fe8" strokeWidth={2} />
                    <Line type="monotone" dataKey="mqlt" name="MQLt" stroke="#89cc4a" strokeWidth={2} />
                    <Line type="monotone" dataKey="sales" name="Продажи" stroke="#e77bc0" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </WidgetCard>

            <WidgetCard
              title="Сплит по языку"
              subtitle="RU vs EN — лиды, MQLt, ROMI"
              actionLabel="Если CR MQLt EN < 5% — проверить креативы и лендинг EN-версии"
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-slate-400">
                    <th className="pb-2">Язык</th>
                    <th className="pb-2 text-right">Лиды</th>
                    <th className="pb-2 text-right">MQLt</th>
                    <th className="pb-2 text-right">CR MQLt</th>
                    <th className="pb-2 text-right">Продажи</th>
                    <th className="pb-2 text-right">ROMI</th>
                  </tr>
                </thead>
                <tbody>
                  {languageSplit.map((row) => (
                    <tr key={row.language} className="border-b border-white/5 text-slate-200">
                      <td className="py-2 font-medium">{row.language}</td>
                      <td className="py-2 text-right">{row.leads}</td>
                      <td className="py-2 text-right">{row.mqlt}</td>
                      <td className="py-2 text-right">{row.crMqlt.toFixed(1)}%</td>
                      <td className="py-2 text-right">{row.sales}</td>
                      <td className="py-2 text-right">{row.romi.toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </WidgetCard>
          </div>

          {/* Row 2: Channel Funnel Table */}
          <WidgetCard
            title="Воронка по каналам"
            subtitle="Основные KPI по каждому каналу"
            actionLabel="Каналы с CPL > $200 и CR MQLt < 10% — кандидаты на отключение"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-slate-400">
                    <th className="pb-2 pr-4">Канал</th>
                    <th className="pb-2 text-right">Расход</th>
                    <th className="pb-2 text-right">Лиды</th>
                    <th className="pb-2 text-right">CPL</th>
                    <th className="pb-2 text-right">MQLt</th>
                    <th className="pb-2 text-right">CR MQLt</th>
                    <th className="pb-2 text-right">SQL</th>
                    <th className="pb-2 text-right">Встречи</th>
                    <th className="pb-2 text-right">Продажи</th>
                    <th className="pb-2 text-right">ROMI</th>
                  </tr>
                </thead>
                <tbody>
                  {channelSummaries.map((ch) => (
                    <tr key={ch.channel} className="border-b border-white/5 text-slate-200">
                      <td className="py-2 pr-4 font-medium">{ch.channel}</td>
                      <td className="py-2 text-right">${Math.round(ch.spend).toLocaleString()}</td>
                      <td className="py-2 text-right">{ch.leads}</td>
                      <td className="py-2 text-right">${Math.round(ch.cpl)}</td>
                      <td className="py-2 text-right">{ch.mqlt}</td>
                      <td className="py-2 text-right">{ch.crMqlt.toFixed(1)}%</td>
                      <td className="py-2 text-right">{ch.sql}</td>
                      <td className="py-2 text-right">{ch.meetingDone}</td>
                      <td className="py-2 text-right">{ch.sales}</td>
                      <td className="py-2 text-right">
                        {Number.isNaN(ch.romi) ? "—" : `${Math.round(ch.romi)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </WidgetCard>

          {/* Row 3: Red Flags + Rejections */}
          <div className="grid gap-4 lg:grid-cols-2">
            <WidgetCard
              title="Красные флаги"
              subtitle="Каналы с расходом, но без лидов или MQLt"
              actionLabel="Немедленно приостановить расход на каналы без конверсий"
            >
              {redFlags.length === 0 ? (
                <p className="text-sm text-slate-500">Нет красных флагов</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-slate-400">
                      <th className="pb-2">Канал</th>
                      <th className="pb-2 text-right">Расход</th>
                      <th className="pb-2 text-right">Лиды</th>
                      <th className="pb-2 text-right">MQLt</th>
                      <th className="pb-2">Причина</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redFlags.map((flag, i) => (
                      <tr key={i} className="border-b border-white/5 text-red-300">
                        <td className="py-2">{flag.channel}</td>
                        <td className="py-2 text-right">${Math.round(flag.spend).toLocaleString()}</td>
                        <td className="py-2 text-right">{flag.leads}</td>
                        <td className="py-2 text-right">{flag.mqlt}</td>
                        <td className="py-2 text-xs">{flag.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </WidgetCard>

            <WidgetCard
              title="Причины отказов"
              subtitle="Топ причин отказов по всем каналам"
              actionLabel="Если > 30% отказов 'не выходит на связь' — проверить скорость обработки"
            >
              {allRejections.length === 0 ? (
                <p className="text-sm text-slate-500">Нет данных по отказам</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={allRejections.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="reason"
                        width={180}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 12 }}
                        labelStyle={{ color: "#e2e8f0" }}
                      />
                      <Bar dataKey="count" name="Кол-во" fill="#e77bc0" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </WidgetCard>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl border border-white/10 px-4 py-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}
