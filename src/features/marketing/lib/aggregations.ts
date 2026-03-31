import { startOfWeek } from "date-fns";
import type {
  BrokerChannelCell,
  ChannelDateSpend,
  ChannelFunnelSummary,
  DashboardFilterState,
  EnrichedOrderFact,
  RedFlagItem,
  RejectionBreakdown,
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
