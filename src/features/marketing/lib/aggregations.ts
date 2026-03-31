import { startOfWeek } from "date-fns";
import type {
  BrokerChannelCell,
  ChannelDateSpend,
  ChannelFunnelSummary,
  DashboardFilterState,
  EnrichedOrderFact,
  MarketingInsight,
  RedFlagItem,
  RejectionBreakdown,
  SubSourceSummary,
  WeeklyTrend,
} from "@/types/dashboard";

function safeDivide(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

function pct(a: number, b: number): number {
  return b === 0 ? 0 : (a / b) * 100;
}

// ---------------------------------------------------------------------------
// Channel Funnel Summaries
// ---------------------------------------------------------------------------
export function computeChannelFunnelSummaries(
  orders: EnrichedOrderFact[],
  spend: ChannelDateSpend[],
  filters: DashboardFilterState,
): ChannelFunnelSummary[] {
  const scoped = orders.filter(o => o.reportDate >= filters.dateFrom && o.reportDate <= filters.dateTo);

  const channelMap = new Map<string, Omit<ChannelFunnelSummary, "cpl" | "cpMqlt" | "cpMqls" | "cpSql" | "cpMeet" | "crMqlt" | "crMqltToMqls" | "crMqlsToSql" | "crSqlToMeet" | "crMeetToOrder" | "romi">>();

  for (const o of scoped) {
    let ch = channelMap.get(o.channel);
    if (!ch) {
      ch = { channel: o.channel, leads: 0, mqlt: 0, mqls: 0, sql: 0, meetingSet: 0, meetingDone: 0, sales: 0, revenue: 0, grossMargin: 0, spend: 0, categoryA: 0, categoryB: 0, categoryC: 0, categoryNone: 0, leadsRu: 0, leadsEn: 0 };
      channelMap.set(o.channel, ch);
    }
    ch.leads += 1;
    if (o.isMqlt) ch.mqlt += 1;
    if (o.isMqls) ch.mqls += 1;
    if (o.isSql) ch.sql += 1;
    if (o.isMeetingSet) ch.meetingSet += 1;
    if (o.isMeetingDone) ch.meetingDone += 1;
    if (o.isSale) { ch.sales += 1; ch.revenue += o.price; ch.grossMargin += o.profit; }
    if (o.category === "A") ch.categoryA += 1;
    else if (o.category === "B") ch.categoryB += 1;
    else if (o.category === "C") ch.categoryC += 1;
    else ch.categoryNone += 1;
    if (o.language === "RU") ch.leadsRu += 1;
    else if (o.language === "EN") ch.leadsEn += 1;
  }

  // Add spend
  const scopedSpend = spend.filter(s => s.reportDate >= filters.dateFrom && s.reportDate <= filters.dateTo);
  for (const s of scopedSpend) {
    const ch = channelMap.get(s.channel);
    if (ch) ch.spend += s.spend;
    else {
      channelMap.set(s.channel, { channel: s.channel, leads: 0, mqlt: 0, mqls: 0, sql: 0, meetingSet: 0, meetingDone: 0, sales: 0, revenue: 0, grossMargin: 0, spend: s.spend, categoryA: 0, categoryB: 0, categoryC: 0, categoryNone: 0, leadsRu: 0, leadsEn: 0 });
    }
  }

  return [...channelMap.values()].map(ch => ({
    ...ch,
    cpl: safeDivide(ch.spend, ch.leads),
    cpMqlt: safeDivide(ch.spend, ch.mqlt),
    cpMqls: safeDivide(ch.spend, ch.mqls),
    cpSql: safeDivide(ch.spend, ch.sql),
    cpMeet: safeDivide(ch.spend, ch.meetingDone),
    crMqlt: pct(ch.mqlt, ch.leads),
    crMqltToMqls: pct(ch.mqls, ch.mqlt),
    crMqlsToSql: pct(ch.sql, ch.mqls),
    crSqlToMeet: pct(ch.meetingDone, ch.sql),
    crMeetToOrder: pct(ch.sales, ch.meetingDone),
    romi: ch.spend === 0 ? NaN : ((ch.revenue - ch.spend) / ch.spend) * 100,
  })).sort((a, b) => b.leads - a.leads);
}

// ---------------------------------------------------------------------------
// Weekly Trend
// ---------------------------------------------------------------------------
export function computeWeeklyTrend(
  orders: EnrichedOrderFact[],
  spend: ChannelDateSpend[],
  filters: DashboardFilterState,
): WeeklyTrend[] {
  const scoped = orders.filter(o => o.reportDate >= filters.dateFrom && o.reportDate <= filters.dateTo);
  const weekMap = new Map<string, WeeklyTrend>();

  for (const o of scoped) {
    const ws = startOfWeek(new Date(`${o.reportDate}T00:00:00.000Z`), { weekStartsOn: 1 }).toISOString().slice(0, 10);
    let w = weekMap.get(ws);
    if (!w) {
      w = { weekStart: ws, weekLabel: ws, spend: 0, leads: 0, mqlt: 0, sales: 0, revenue: 0, romi: 0 };
      weekMap.set(ws, w);
    }
    w.leads += 1;
    if (o.isMqlt) w.mqlt += 1;
    if (o.isSale) { w.sales += 1; w.revenue += o.price; }
  }

  const scopedSpend = spend.filter(s => s.reportDate >= filters.dateFrom && s.reportDate <= filters.dateTo);
  for (const s of scopedSpend) {
    const ws = startOfWeek(new Date(`${s.reportDate}T00:00:00.000Z`), { weekStartsOn: 1 }).toISOString().slice(0, 10);
    let w = weekMap.get(ws);
    if (!w) {
      w = { weekStart: ws, weekLabel: ws, spend: 0, leads: 0, mqlt: 0, sales: 0, revenue: 0, romi: 0 };
      weekMap.set(ws, w);
    }
    w.spend += s.spend;
  }

  const result = [...weekMap.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  for (const w of result) {
    w.romi = w.spend === 0 ? 0 : ((w.revenue - w.spend) / w.spend) * 100;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Red Flags: sources spending money but producing 0 leads or 0 MQLt
// ---------------------------------------------------------------------------
export function computeRedFlags(
  orders: EnrichedOrderFact[],
  spend: ChannelDateSpend[],
  filters: DashboardFilterState,
): RedFlagItem[] {
  const scoped = orders.filter(o => o.reportDate >= filters.dateFrom && o.reportDate <= filters.dateTo);
  const scopedSpend = spend.filter(s => s.reportDate >= filters.dateFrom && s.reportDate <= filters.dateTo);

  // Aggregate spend by channel
  const spendByChannel = new Map<string, number>();
  for (const s of scopedSpend) {
    spendByChannel.set(s.channel, (spendByChannel.get(s.channel) ?? 0) + s.spend);
  }

  // Aggregate leads and mqlt by channel
  const statsByChannel = new Map<string, { leads: number; mqlt: number }>();
  for (const o of scoped) {
    let st = statsByChannel.get(o.channel);
    if (!st) { st = { leads: 0, mqlt: 0 }; statsByChannel.set(o.channel, st); }
    st.leads += 1;
    if (o.isMqlt) st.mqlt += 1;
  }

  const flags: RedFlagItem[] = [];
  for (const [channel, channelSpend] of spendByChannel) {
    if (channelSpend <= 0) continue;
    const stats = statsByChannel.get(channel) ?? { leads: 0, mqlt: 0 };
    if (stats.leads === 0) {
      flags.push({ channel, source: channel, spend: channelSpend, leads: 0, mqlt: 0, reason: `Расход $${Math.round(channelSpend)}, лидов 0` });
    } else if (stats.mqlt === 0) {
      flags.push({ channel, source: channel, spend: channelSpend, leads: stats.leads, mqlt: 0, reason: `Расход $${Math.round(channelSpend)}, MQLt 0` });
    }
  }

  return flags.sort((a, b) => b.spend - a.spend);
}

// ---------------------------------------------------------------------------
// Rejection Breakdown
// ---------------------------------------------------------------------------
export function computeRejectionBreakdown(
  orders: EnrichedOrderFact[],
  filters: DashboardFilterState,
): RejectionBreakdown[] {
  const scoped = orders.filter(o => o.reportDate >= filters.dateFrom && o.reportDate <= filters.dateTo && o.rejectionReason);

  const channelMap = new Map<string, { qual: number; unqual: number; reasons: Map<string, number> }>();

  for (const o of scoped) {
    let ch = channelMap.get(o.channel);
    if (!ch) { ch = { qual: 0, unqual: 0, reasons: new Map() }; channelMap.set(o.channel, ch); }
    if (o.isQualifiedRejection) ch.qual += 1;
    else ch.unqual += 1;
    const reason = o.rejectionReason!;
    ch.reasons.set(reason, (ch.reasons.get(reason) ?? 0) + 1);
  }

  return [...channelMap.entries()].map(([channel, data]) => ({
    channel,
    qualifiedCount: data.qual,
    unqualifiedCount: data.unqual,
    reasons: [...data.reasons.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  })).sort((a, b) => (b.qualifiedCount + b.unqualifiedCount) - (a.qualifiedCount + a.unqualifiedCount));
}

// ---------------------------------------------------------------------------
// Broker × Channel Cross-tab
// ---------------------------------------------------------------------------
export function computeBrokerChannelCrosstab(
  orders: EnrichedOrderFact[],
  filters: DashboardFilterState,
): BrokerChannelCell[] {
  const scoped = orders.filter(o => o.reportDate >= filters.dateFrom && o.reportDate <= filters.dateTo);

  const key = (m: string, c: string) => `${m}::${c}`;
  const cellMap = new Map<string, BrokerChannelCell>();

  for (const o of scoped) {
    const k = key(o.manager, o.channel);
    let cell = cellMap.get(k);
    if (!cell) {
      cell = { manager: o.manager, channel: o.channel, leads: 0, mqls: 0, meetingDone: 0, sales: 0, crMeetToOrder: 0 };
      cellMap.set(k, cell);
    }
    cell.leads += 1;
    if (o.isMqls) cell.mqls += 1;
    if (o.isMeetingDone) cell.meetingDone += 1;
    if (o.isSale) cell.sales += 1;
  }

  const result = [...cellMap.values()];
  for (const cell of result) {
    cell.crMeetToOrder = pct(cell.sales, cell.meetingDone);
  }
  return result.sort((a, b) => b.leads - a.leads);
}

// ---------------------------------------------------------------------------
// Language split summary
// ---------------------------------------------------------------------------
export type LanguageSplitSummary = {
  language: "RU" | "EN";
  leads: number;
  mqlt: number;
  mqls: number;
  sales: number;
  revenue: number;
  spend: number;
  crMqlt: number;
  romi: number;
};

export function computeLanguageSplit(
  orders: EnrichedOrderFact[],
  spend: ChannelDateSpend[],
  filters: DashboardFilterState,
): LanguageSplitSummary[] {
  const scoped = orders.filter(o => o.reportDate >= filters.dateFrom && o.reportDate <= filters.dateTo);
  const totalSpend = spend
    .filter(s => s.reportDate >= filters.dateFrom && s.reportDate <= filters.dateTo)
    .reduce((sum, s) => sum + s.spend, 0);

  const make = (lang: "RU" | "EN") => {
    const langOrders = scoped.filter(o => o.language === lang);
    const leads = langOrders.length;
    const mqlt = langOrders.filter(o => o.isMqlt).length;
    const mqls = langOrders.filter(o => o.isMqls).length;
    const sales = langOrders.filter(o => o.isSale).length;
    const revenue = langOrders.filter(o => o.isSale).reduce((s, o) => s + o.price, 0);
    // Approximate spend proportionally
    const totalLeads = scoped.length || 1;
    const langSpend = totalSpend * (leads / totalLeads);
    return {
      language: lang,
      leads, mqlt, mqls, sales, revenue,
      spend: langSpend,
      crMqlt: pct(mqlt, leads),
      romi: langSpend === 0 ? 0 : ((revenue - langSpend) / langSpend) * 100,
    };
  };

  return [make("RU"), make("EN")];
}

// ---------------------------------------------------------------------------
// Sub-source summaries for expandable channel rows
// ---------------------------------------------------------------------------
export function computeSubSourceSummaries(
  orders: EnrichedOrderFact[],
  spend: ChannelDateSpend[],
  filters: DashboardFilterState,
  channel: string,
): SubSourceSummary[] {
  const scoped = orders.filter(
    o => o.reportDate >= filters.dateFrom && o.reportDate <= filters.dateTo && o.channel === channel,
  );

  const subMap = new Map<string, Omit<SubSourceSummary, "cpl" | "cpMqlt" | "cpMqls" | "cpSql" | "cpMeet" | "crMqlt" | "crMqltToMqls" | "crMqlsToSql" | "crSqlToMeet" | "crMeetToOrder" | "romi">>();

  for (const o of scoped) {
    const src = o.rawSource || "unknown";
    let s = subMap.get(src);
    if (!s) {
      s = { subSource: src, channel, leads: 0, mqlt: 0, mqls: 0, sql: 0, meetingSet: 0, meetingDone: 0, sales: 0, revenue: 0, grossMargin: 0, spend: 0, categoryA: 0, categoryB: 0, categoryC: 0, categoryNone: 0, leadsRu: 0, leadsEn: 0 };
      subMap.set(src, s);
    }
    s.leads += 1;
    if (o.isMqlt) s.mqlt += 1;
    if (o.isMqls) s.mqls += 1;
    if (o.isSql) s.sql += 1;
    if (o.isMeetingSet) s.meetingSet += 1;
    if (o.isMeetingDone) s.meetingDone += 1;
    if (o.isSale) { s.sales += 1; s.revenue += o.price; s.grossMargin += o.profit; }
    if (o.category === "A") s.categoryA += 1;
    else if (o.category === "B") s.categoryB += 1;
    else if (o.category === "C") s.categoryC += 1;
    else s.categoryNone += 1;
    if (o.language === "RU") s.leadsRu += 1;
    else if (o.language === "EN") s.leadsEn += 1;
  }

  return [...subMap.values()].map(s => ({
    ...s,
    cpl: safeDivide(s.spend, s.leads),
    cpMqlt: safeDivide(s.spend, s.mqlt),
    cpMqls: safeDivide(s.spend, s.mqls),
    cpSql: safeDivide(s.spend, s.sql),
    cpMeet: safeDivide(s.spend, s.meetingDone),
    crMqlt: pct(s.mqlt, s.leads),
    crMqltToMqls: pct(s.mqls, s.mqlt),
    crMqlsToSql: pct(s.sql, s.mqls),
    crSqlToMeet: pct(s.meetingDone, s.sql),
    crMeetToOrder: pct(s.sales, s.meetingDone),
    romi: s.spend === 0 ? NaN : ((s.revenue - s.spend) / s.spend) * 100,
  })).sort((a, b) => b.leads - a.leads);
}

// ---------------------------------------------------------------------------
// Marketing Insights — deterministic signal generation
// ---------------------------------------------------------------------------
export function generateMarketingInsights(
  summaries: ChannelFunnelSummary[],
  weeklyTrend: WeeklyTrend[],
): MarketingInsight[] {
  const insights: MarketingInsight[] = [];
  const withSpend = summaries.filter(ch => ch.spend > 0);
  const withLeads = summaries.filter(ch => ch.leads > 0);

  // Average CPL across channels that have both spend and leads
  const totalSpend = withSpend.reduce((s, ch) => s + ch.spend, 0);
  const totalLeads = withLeads.reduce((s, ch) => s + ch.leads, 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  // Average CR MQLt
  const totalMqlt = summaries.reduce((s, ch) => s + ch.mqlt, 0);
  const avgCrMqlt = totalLeads > 0 ? (totalMqlt / totalLeads) * 100 : 0;

  for (const ch of summaries) {
    // Red: CPL > 2x average
    if (ch.cpl > 0 && avgCpl > 0 && ch.cpl > avgCpl * 2) {
      insights.push({
        severity: "red",
        channel: ch.channel,
        message: `${ch.channel}: CPL $${Math.round(ch.cpl)} — в ${(ch.cpl / avgCpl).toFixed(1)}× дороже среднего ($${Math.round(avgCpl)})`,
      });
    }

    // Red: Has leads but zero MQLt
    if (ch.leads > 5 && ch.mqlt === 0) {
      insights.push({
        severity: "red",
        channel: ch.channel,
        message: `${ch.channel}: ${ch.leads} лидов, но 0 MQLt — проверить качество трафика`,
      });
    }

    // Red: Many leads, zero sales
    if (ch.leads > 20 && ch.sales === 0) {
      insights.push({
        severity: "red",
        channel: ch.channel,
        message: `${ch.channel}: ${ch.leads} лидов, но 0 продаж — воронка не доводит до сделки`,
      });
    }

    // Yellow: Low CR MQLt
    if (ch.leads > 10 && ch.crMqlt > 0 && ch.crMqlt < 5) {
      insights.push({
        severity: "yellow",
        channel: ch.channel,
        message: `${ch.channel}: CR MQLt ${ch.crMqlt.toFixed(1)}% (< 5%) — низкое качество лидов`,
      });
    }

    // Yellow: CPL > 1.5x average (but not 2x — that's red)
    if (ch.cpl > 0 && avgCpl > 0 && ch.cpl > avgCpl * 1.5 && ch.cpl <= avgCpl * 2) {
      insights.push({
        severity: "yellow",
        channel: ch.channel,
        message: `${ch.channel}: CPL $${Math.round(ch.cpl)} — в ${(ch.cpl / avgCpl).toFixed(1)}× выше среднего`,
      });
    }

    // Green: Best ROMI
    if (!Number.isNaN(ch.romi) && ch.romi > 200 && ch.sales > 0) {
      insights.push({
        severity: "green",
        channel: ch.channel,
        message: `${ch.channel}: ROMI ${Math.round(ch.romi)}% — отличная окупаемость`,
      });
    }

    // Green: Cheapest leads
    if (ch.cpl > 0 && avgCpl > 0 && ch.cpl < avgCpl * 0.5 && ch.leads > 5) {
      insights.push({
        severity: "green",
        channel: ch.channel,
        message: `${ch.channel}: CPL $${Math.round(ch.cpl)} — самые дешёвые лиды (среднее $${Math.round(avgCpl)})`,
      });
    }
  }

  // Weekly ROMI declining trend
  if (weeklyTrend.length >= 3) {
    const last3 = weeklyTrend.slice(-3);
    if (last3[0].romi > last3[1].romi && last3[1].romi > last3[2].romi && last3[0].romi > 0) {
      insights.push({
        severity: "yellow",
        channel: "Все каналы",
        message: `ROMI падает 3 недели подряд: ${Math.round(last3[0].romi)}% → ${Math.round(last3[1].romi)}% → ${Math.round(last3[2].romi)}%`,
      });
    }
  }

  // Sort: red first, then yellow, then green
  const order = { red: 0, yellow: 1, green: 2 };
  insights.sort((a, b) => order[a.severity] - order[b.severity]);

  return insights;
}
