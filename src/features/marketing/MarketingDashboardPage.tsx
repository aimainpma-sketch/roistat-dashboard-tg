import { startTransition, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { AppShell } from "@/components/AppShell";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { DateRangeToolbar } from "@/features/dashboard/components/DateRangeToolbar";
import { useMarketingData } from "@/features/marketing/hooks/useMarketingData";
import { computeSubSourceSummaries } from "@/features/marketing/lib/aggregations";
import { useCurrentRole } from "@/features/dashboard/hooks/useDashboardData";
import { formatRangeLabel } from "@/lib/format";
import { env } from "@/lib/env";
import type { LanguageSegment, EnrichedOrderFact, DealPopupState, ChannelFunnelSummary, SubSourceSummary } from "@/types/dashboard";

const LANGUAGE_OPTIONS: { value: LanguageSegment | null; label: string }[] = [
  { value: null, label: "Все" },
  { value: "RU", label: "RU" },
  { value: "EN", label: "EN" },
];

type FunnelStage = "leads" | "mqlt" | "mqls" | "sql" | "meetingSet" | "meetingDone" | "sales";
const STAGE_LABELS: Record<FunnelStage, string> = {
  leads: "Лиды",
  mqlt: "MQLt",
  mqls: "MQLs",
  sql: "SQL",
  meetingSet: "Встр. назн.",
  meetingDone: "Встречи",
  sales: "Продажи",
};

function filterDealsByStage(orders: EnrichedOrderFact[], channel: string, stage: FunnelStage): EnrichedOrderFact[] {
  const channelOrders = orders.filter(o => o.channel === channel);
  switch (stage) {
    case "leads": return channelOrders;
    case "mqlt": return channelOrders.filter(o => o.isMqlt);
    case "mqls": return channelOrders.filter(o => o.isMqls);
    case "sql": return channelOrders.filter(o => o.isSql);
    case "meetingSet": return channelOrders.filter(o => o.isMeetingSet);
    case "meetingDone": return channelOrders.filter(o => o.isMeetingDone);
    case "sales": return channelOrders.filter(o => o.isSale);
  }
}

export function MarketingDashboardPage() {
  const roleQuery = useCurrentRole();
  const {
    filters,
    setFilters,
    setLanguageFilter,
    orders,
    spend,
    channelSummaries,
    weeklyTrend,
    redFlags,
    rejectionBreakdown,
    languageSplit,
    insights,
    isLoading,
  } = useMarketingData();

  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [dealPopup, setDealPopup] = useState<DealPopupState>(null);
  const [sortCol, setSortCol] = useState<string>("leads");
  const [sortAsc, setSortAsc] = useState(false);

  const toggleChannel = (ch: string) => {
    setExpandedChannels(prev => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch); else next.add(ch);
      return next;
    });
  };

  // Sub-source data for expanded channels
  const subSourceMap = useMemo(() => {
    const map = new Map<string, SubSourceSummary[]>();
    for (const ch of expandedChannels) {
      map.set(ch, computeSubSourceSummaries(orders, spend, filters, ch));
    }
    return map;
  }, [orders, spend, filters, expandedChannels]);

  // Sortable summaries
  const sortedSummaries = useMemo(() => {
    const sorted = [...channelSummaries];
    sorted.sort((a, b) => {
      const va = (a as Record<string, unknown>)[sortCol] as number ?? 0;
      const vb = (b as Record<string, unknown>)[sortCol] as number ?? 0;
      return sortAsc ? va - vb : vb - va;
    });
    return sorted;
  }, [channelSummaries, sortCol, sortAsc]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  const openDealPopup = (channel: string, stage: FunnelStage) => {
    const deals = filterDealsByStage(orders, channel, stage);
    setDealPopup({ channel, stage: STAGE_LABELS[stage], deals });
  };

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

          {/* Insights & Signals */}
          {insights.length > 0 && (
            <WidgetCard
              title="Сигналы и выводы"
              subtitle="Автоматический анализ каналов"
            >
              <div className="flex flex-col gap-2">
                {insights.map((ins, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      ins.severity === "red"
                        ? "border-red-500/20 bg-red-500/10 text-red-300"
                        : ins.severity === "yellow"
                        ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-300"
                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    <span className="mr-1.5">
                      {ins.severity === "red" ? "🔴" : ins.severity === "yellow" ? "🟡" : "🟢"}
                    </span>
                    {ins.message}
                  </div>
                ))}
              </div>
            </WidgetCard>
          )}

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
            subtitle="Кликните на канал для раскрытия источников, на число — для списка сделок"
            actionLabel="Каналы с CPL > $200 и CR MQLt < 10% — кандидаты на отключение"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-slate-400">
                    <th className="pb-2 pr-2 min-w-[130px]">Канал</th>
                    <SortTh col="spend" label="Расход" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                    <SortTh col="leads" label="Лиды" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                    <SortTh col="cpl" label="CPL" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                    <SortTh col="mqlt" label="MQLt" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                    <SortTh col="crMqlt" label="CR%" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                    <SortTh col="mqls" label="MQLs" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                    <SortTh col="sql" label="SQL" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                    <SortTh col="meetingDone" label="Встр." sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                    <SortTh col="sales" label="Прод." sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                    <SortTh col="romi" label="ROMI" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedSummaries.map((ch) => (
                    <ChannelRows
                      key={ch.channel}
                      ch={ch}
                      expanded={expandedChannels.has(ch.channel)}
                      subSources={subSourceMap.get(ch.channel) ?? []}
                      onToggle={() => toggleChannel(ch.channel)}
                      onCellClick={(stage) => openDealPopup(ch.channel, stage)}
                    />
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
                        <td className="max-w-[120px] truncate py-2">{flag.channel}</td>
                        <td className="py-2 text-right">${Math.round(flag.spend).toLocaleString()}</td>
                        <td className="py-2 text-right">{flag.leads}</td>
                        <td className="py-2 text-right">{flag.mqlt}</td>
                        <td className="max-w-[180px] truncate py-2 text-xs">{flag.reason}</td>
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
                        tickFormatter={(v: string) => v.length > 22 ? `${v.slice(0, 20)}…` : v}
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

      {/* Deal List Modal */}
      {dealPopup && (
        <DealListModal popup={dealPopup} onClose={() => setDealPopup(null)} />
      )}
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Sortable table header
// ---------------------------------------------------------------------------
function SortTh({ col, label, sortCol, sortAsc, onSort }: {
  col: string; label: string; sortCol: string; sortAsc: boolean; onSort: (col: string) => void;
}) {
  const active = sortCol === col;
  return (
    <th
      className="cursor-pointer select-none whitespace-nowrap pb-2 text-right hover:text-white"
      onClick={() => onSort(col)}
    >
      {label}
      {active && <span className="ml-0.5 text-brand-400">{sortAsc ? "↑" : "↓"}</span>}
    </th>
  );
}

// ---------------------------------------------------------------------------
// Channel row + expandable sub-sources
// ---------------------------------------------------------------------------
function ChannelRows({ ch, expanded, subSources, onToggle, onCellClick }: {
  ch: ChannelFunnelSummary;
  expanded: boolean;
  subSources: SubSourceSummary[];
  onToggle: () => void;
  onCellClick: (stage: FunnelStage) => void;
}) {
  return (
    <>
      <tr className="border-b border-white/5 text-slate-200 hover:bg-white/3 transition-colors">
        <td className="max-w-[140px] truncate py-2 pr-2 font-medium">
          <button
            type="button"
            className="flex items-center gap-1.5 text-left hover:text-brand-400 transition-colors"
            onClick={onToggle}
          >
            <span className="text-xs text-slate-500">{expanded ? "▼" : "▶"}</span>
            {ch.channel}
          </button>
        </td>
        <td className="py-2 text-right">${Math.round(ch.spend).toLocaleString()}</td>
        <FunnelCell value={ch.leads} stage="leads" onClick={onCellClick} />
        <td className="py-2 text-right">${Math.round(ch.cpl)}</td>
        <FunnelCell value={ch.mqlt} stage="mqlt" onClick={onCellClick} />
        <td className="py-2 text-right">{ch.crMqlt.toFixed(1)}%</td>
        <FunnelCell value={ch.mqls} stage="mqls" onClick={onCellClick} />
        <FunnelCell value={ch.sql} stage="sql" onClick={onCellClick} />
        <FunnelCell value={ch.meetingDone} stage="meetingDone" onClick={onCellClick} />
        <FunnelCell value={ch.sales} stage="sales" onClick={onCellClick} />
        <td className="py-2 text-right">
          {Number.isNaN(ch.romi) ? "—" : `${Math.round(ch.romi)}%`}
        </td>
      </tr>
      {expanded && subSources.map((sub) => (
        <tr key={sub.subSource} className="border-b border-white/3 bg-white/[0.02] text-xs text-slate-400">
          <td className="max-w-[140px] truncate py-1.5 pl-6 pr-2">{sub.subSource}</td>
          <td className="py-1.5 text-right">{sub.spend > 0 ? `$${Math.round(sub.spend).toLocaleString()}` : "—"}</td>
          <td className="py-1.5 text-right">{sub.leads}</td>
          <td className="py-1.5 text-right">{sub.cpl > 0 ? `$${Math.round(sub.cpl)}` : "—"}</td>
          <td className="py-1.5 text-right">{sub.mqlt}</td>
          <td className="py-1.5 text-right">{sub.crMqlt > 0 ? `${sub.crMqlt.toFixed(1)}%` : "—"}</td>
          <td className="py-1.5 text-right">{sub.mqls}</td>
          <td className="py-1.5 text-right">{sub.sql}</td>
          <td className="py-1.5 text-right">{sub.meetingDone}</td>
          <td className="py-1.5 text-right">{sub.sales}</td>
          <td className="py-1.5 text-right">
            {Number.isNaN(sub.romi) ? "—" : `${Math.round(sub.romi)}%`}
          </td>
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Clickable funnel cell
// ---------------------------------------------------------------------------
function FunnelCell({ value, stage, onClick }: {
  value: number; stage: FunnelStage; onClick: (stage: FunnelStage) => void;
}) {
  if (value === 0) {
    return <td className="py-2 text-right text-slate-500">0</td>;
  }
  return (
    <td className="py-2 text-right">
      <button
        type="button"
        className="cursor-pointer text-slate-200 underline decoration-slate-600 underline-offset-2 hover:text-brand-400 hover:decoration-brand-400 transition-colors"
        onClick={() => onClick(stage)}
      >
        {value}
      </button>
    </td>
  );
}

// ---------------------------------------------------------------------------
// Deal List Modal
// ---------------------------------------------------------------------------
function DealListModal({ popup, onClose }: { popup: NonNullable<DealPopupState>; onClose: () => void }) {
  const crmBase = env.roistatProject
    ? `https://cloud.roistat.com/project/${env.roistatProject}/crm/#/deal/`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {popup.stage} — {popup.channel}
            </h3>
            <p className="text-sm text-slate-400">{popup.deals.length} сделок</p>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {popup.deals.length === 0 ? (
          <p className="text-sm text-slate-500">Нет сделок</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {popup.deals.map((deal) => (
              <DealRow key={deal.orderId} deal={deal} crmBase={crmBase} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DealRow({ deal, crmBase }: { deal: EnrichedOrderFact; crmBase: string | null }) {
  const inner = (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm transition hover:border-brand-400/30">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-slate-200">
          {deal.orderName || `Сделка #${deal.orderId}`}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
          <span>{deal.reportDate}</span>
          <span>{deal.manager}</span>
          <span>{deal.statusName}</span>
        </div>
      </div>
      {deal.price > 0 && (
        <span className="shrink-0 text-sm font-medium text-emerald-400">
          ${deal.price.toLocaleString()}
        </span>
      )}
      {crmBase && <span className="shrink-0 text-xs text-slate-500">→</span>}
    </div>
  );

  if (crmBase) {
    return (
      <a href={`${crmBase}${deal.orderId}`} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return inner;
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl border border-white/10 px-4 py-3">
      <div className="truncate text-xs text-slate-400">{label}</div>
      <div className="mt-1 truncate text-xl font-semibold text-white">{value}</div>
    </div>
  );
}
