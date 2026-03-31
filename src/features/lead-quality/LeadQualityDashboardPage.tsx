import { startTransition } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { AppShell } from "@/components/AppShell";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { DateRangeToolbar } from "@/features/dashboard/components/DateRangeToolbar";
import { useMarketingData } from "@/features/marketing/hooks/useMarketingData";
import { useCurrentRole } from "@/features/dashboard/hooks/useDashboardData";
import { formatRangeLabel } from "@/lib/format";

const PIE_COLORS = ["#4f8fe8", "#e77bc0", "#89cc4a", "#ff8e43", "#6fe0d1", "#7ad2ff", "#8892aa", "#5a7ad9"];

export function LeadQualityDashboardPage() {
  const roleQuery = useCurrentRole();
  const {
    filters,
    setFilters,
    channelSummaries,
    rejectionBreakdown,
    brokerCrosstab,
    isLoading,
  } = useMarketingData();

  const totals = channelSummaries.reduce(
    (acc, ch) => ({
      leads: acc.leads + ch.leads,
      mqlt: acc.mqlt + ch.mqlt,
      mqls: acc.mqls + ch.mqls,
      sql: acc.sql + ch.sql,
      meetingDone: acc.meetingDone + ch.meetingDone,
      sales: acc.sales + ch.sales,
    }),
    { leads: 0, mqlt: 0, mqls: 0, sql: 0, meetingDone: 0, sales: 0 },
  );

  const crMqlt = totals.leads > 0 ? (totals.mqlt / totals.leads) * 100 : 0;
  const crMqltToMqls = totals.mqlt > 0 ? (totals.mqls / totals.mqlt) * 100 : 0;
  const crSql = totals.mqls > 0 ? (totals.sql / totals.mqls) * 100 : 0;
  const crMeetToOrder = totals.meetingDone > 0 ? (totals.sales / totals.meetingDone) * 100 : 0;

  // MQL Rate by channel for horizontal bar chart
  const mqlRateByChannel = channelSummaries
    .filter((ch) => ch.leads >= 3)
    .map((ch) => ({ channel: ch.channel, crMqlt: Number(ch.crMqlt.toFixed(1)) }))
    .sort((a, b) => b.crMqlt - a.crMqlt);

  // All rejections as pie data
  const allRejections = rejectionBreakdown.reduce(
    (acc, ch) => {
      for (const r of ch.reasons) {
        const existing = acc.find((x) => x.name === r.reason);
        if (existing) existing.value += r.count;
        else acc.push({ name: r.reason, value: r.count });
      }
      return acc;
    },
    [] as { name: string; value: number }[],
  );
  allRejections.sort((a, b) => b.value - a.value);

  // Unique managers and channels for crosstab
  const managers = [...new Set(brokerCrosstab.map((c) => c.manager))].sort();
  const channels = [...new Set(brokerCrosstab.map((c) => c.channel))].sort();
  const crosstabMap = new Map(brokerCrosstab.map((c) => [`${c.manager}::${c.channel}`, c]));

  return (
    <AppShell
      title="Качество лидов"
      subtitle={`${formatRangeLabel(filters.dateFrom, filters.dateTo)} · ${filters.grain === "day" ? "дни" : "недели"}`}
      role={roleQuery.data ?? "admin"}
      actions={
        <DateRangeToolbar
          filters={filters}
          onChange={(next) => {
            startTransition(() =>
              setFilters({ ...next, languageFilter: filters.languageFilter }),
            );
          }}
          onRefresh={() => {}}
        />
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          Загрузка данных...
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="Лиды" value={totals.leads.toLocaleString()} />
            <KpiCard label="CR MQLt" value={`${crMqlt.toFixed(1)}%`} />
            <KpiCard label="CR MQLt -> MQLs" value={`${crMqltToMqls.toFixed(1)}%`} />
            <KpiCard label="CR SQL" value={`${crSql.toFixed(1)}%`} />
            <KpiCard label="CR Встреча -> Заказ" value={`${crMeetToOrder.toFixed(1)}%`} />
          </div>

          {/* Row 1: MQL Rate by Channel + Rejections Donut */}
          <div className="grid gap-4 lg:grid-cols-2">
            <WidgetCard
              title="MQL Rate по каналам"
              subtitle="CR MQLt (%) — каналы с 3+ лидами"
              actionLabel="Каналы с CR MQLt < 10% — кандидаты на пересмотр таргетинга"
            >
              {mqlRateByChannel.length === 0 ? (
                <p className="text-sm text-slate-500">Нет данных</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mqlRateByChannel} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 12 }} unit="%" />
                      <YAxis
                        type="category"
                        dataKey="channel"
                        width={140}
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 12 }}
                        labelStyle={{ color: "#e2e8f0" }}
                        formatter={(value: unknown) => [`${Number(value ?? 0)}%`, "CR MQLt"]}
                      />
                      <Bar dataKey="crMqlt" name="CR MQLt" fill="#4f8fe8" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </WidgetCard>

            <WidgetCard
              title="Отказы"
              subtitle="Распределение причин отказов"
              actionLabel="Если доля 'не выходит на связь' > 30% — ускорить первый контакт"
            >
              {allRejections.length === 0 ? (
                <p className="text-sm text-slate-500">Нет данных по отказам</p>
              ) : (
                <div className="flex h-64 items-center gap-4">
                  <div className="h-full w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allRejections.slice(0, 8)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                        >
                          {allRejections.slice(0, 8).map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 12 }}
                          labelStyle={{ color: "#e2e8f0" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="w-1/2 space-y-1 text-xs text-slate-300">
                    {allRejections.slice(0, 8).map((r, i) => (
                      <li key={r.name} className="flex items-center gap-2">
                        <span
                          className="inline-block size-2.5 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="truncate">{r.name}</span>
                        <span className="ml-auto font-medium text-slate-200">{r.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </WidgetCard>
          </div>

          {/* Row 2: Categories A/B/C by Channel */}
          <WidgetCard
            title="Категории A/B/C по каналам"
            subtitle="Распределение лидов по категориям качества"
            actionLabel="Каналы с долей категории A < 15% — проверить источник трафика"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-slate-400">
                    <th className="pb-2 pr-4">Канал</th>
                    <th className="pb-2 text-right">Лиды</th>
                    <th className="pb-2 text-right">Кат. A</th>
                    <th className="pb-2 text-right">Кат. B</th>
                    <th className="pb-2 text-right">Кат. C</th>
                    <th className="pb-2 text-right">Без кат.</th>
                    <th className="pb-2 text-right">% A</th>
                  </tr>
                </thead>
                <tbody>
                  {channelSummaries.map((ch) => {
                    const pctA = ch.leads > 0 ? ((ch.categoryA / ch.leads) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={ch.channel} className="border-b border-white/5 text-slate-200">
                        <td className="py-2 pr-4 font-medium">{ch.channel}</td>
                        <td className="py-2 text-right">{ch.leads}</td>
                        <td className="py-2 text-right text-emerald-400">{ch.categoryA}</td>
                        <td className="py-2 text-right text-yellow-400">{ch.categoryB}</td>
                        <td className="py-2 text-right text-orange-400">{ch.categoryC}</td>
                        <td className="py-2 text-right text-slate-500">{ch.categoryNone}</td>
                        <td className="py-2 text-right">{pctA}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </WidgetCard>

          {/* Row 3: Rejections by Channel + Broker Crosstab */}
          <div className="grid gap-4 lg:grid-cols-2">
            <WidgetCard
              title="Отказы по каналам"
              subtitle="Квалифицированные и неквалифицированные отказы"
              actionLabel="Каналы с высоким % неквалифицированных отказов — ужесточить фильтрацию"
            >
              {rejectionBreakdown.length === 0 ? (
                <p className="text-sm text-slate-500">Нет данных</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-slate-400">
                        <th className="pb-2 pr-4">Канал</th>
                        <th className="pb-2 text-right">Квал.</th>
                        <th className="pb-2 text-right">Неквал.</th>
                        <th className="pb-2 text-right">Всего</th>
                        <th className="pb-2">Топ причина</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rejectionBreakdown.map((ch) => (
                        <tr key={ch.channel} className="border-b border-white/5 text-slate-200">
                          <td className="py-2 pr-4 font-medium">{ch.channel}</td>
                          <td className="py-2 text-right text-emerald-400">{ch.qualifiedCount}</td>
                          <td className="py-2 text-right text-red-400">{ch.unqualifiedCount}</td>
                          <td className="py-2 text-right">{ch.qualifiedCount + ch.unqualifiedCount}</td>
                          <td className="py-2 text-xs text-slate-400">
                            {ch.reasons[0]?.reason ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </WidgetCard>

            <WidgetCard
              title="Брокер x Канал"
              subtitle="Кросс-таблица: менеджеры и каналы"
              actionLabel="Менеджеры с CR встреча->заказ < 10% — провести coaching session"
            >
              {brokerCrosstab.length === 0 ? (
                <p className="text-sm text-slate-500">Нет данных</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-slate-400">
                        <th className="pb-2 pr-4">Менеджер</th>
                        {channels.map((ch) => (
                          <th key={ch} className="pb-2 px-2 text-center text-xs">
                            {ch}
                          </th>
                        ))}
                        <th className="pb-2 text-right">Итого</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managers.map((manager) => {
                        const managerTotal = channels.reduce((sum, ch) => {
                          const cell = crosstabMap.get(`${manager}::${ch}`);
                          return sum + (cell?.leads ?? 0);
                        }, 0);
                        return (
                          <tr key={manager} className="border-b border-white/5 text-slate-200">
                            <td className="py-2 pr-4 font-medium text-xs">{manager}</td>
                            {channels.map((ch) => {
                              const cell = crosstabMap.get(`${manager}::${ch}`);
                              return (
                                <td key={ch} className="py-2 px-2 text-center text-xs">
                                  {cell ? (
                                    <span title={`MQLs: ${cell.mqls}, Продажи: ${cell.sales}, CR: ${cell.crMeetToOrder.toFixed(0)}%`}>
                                      {cell.leads}
                                    </span>
                                  ) : (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-2 text-right font-medium">{managerTotal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
