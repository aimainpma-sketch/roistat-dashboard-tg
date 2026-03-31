import { addDays, startOfWeek } from "date-fns";
import { DEFAULT_LEVELS, DEFAULT_VIEWS } from "@/data/metrics";
import { getDemoGrossMarginMix, getDemoMetricTree } from "@/data/demo";
import { env } from "@/lib/env";
import { formatPeriodLabel } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { makeId, percentDelta } from "@/lib/utils";
import type {
  DashboardBootstrap,
  DashboardFilterState,
  DashboardView,
  DimensionLevel,
  DonutSegment,
  MetricId,
  MetricTreeNode,
  MetricTreeResult,
  SourceFact,
  UserDashboardPreference,
  UserRole,
} from "@/types/dashboard";
import type { Json } from "@/lib/database.types";

const storageKeys = {
  levels: "roistat-dashboard.levels",
  views: "roistat-dashboard.views",
  prefs: "roistat-dashboard.preferences",
};
const passwordSessionKey = "roistat-dashboard.password-session";
const publicPageSize = 1000;
const channelColors: Record<string, string> = {
  "Авито": "#4f8fe8",
  Avito: "#4f8fe8",
  Facebook: "#5a7ad9",
  Instagram: "#e77bc0",
  "Чернова Вика": "#7ad2ff",
  "Лид брокера": "#89cc4a",
  Prian: "#4da5aa",
  SMM: "#6fe0d1",
  Директ: "#ff8e43",
  "Без источника": "#778195",
  "Неизвестный канал": "#778195",
  Роботы: "#8892aa",
};

type RoistatAnalyticsRow = {
  report_date: string;
  source: string | null;
  source_level_2: string | null;
  source_level_3: string | null;
  marketing_cost: number | null;
  raw_data: Json | null;
};
type RoistatOrderRow = {
  date_create: string;
  source: string | null;
  status_name: string | null;
  status_type: string | null;
  price: number | null;
  profit: number | null;
};
type RoistatVisitRow = {
  id: string;
  date: string;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  raw_data: Json | null;
};
type RoistatCostRow = {
  date: string | null;
  source: string | null;
  cost: number | null;
  raw_data: Json | null;
};
type SourceProfile = {
  sourceKey: string;
  channel: string;
  levelLabels: string[];
};
type RawDimensions = {
  marker_level_1?: { title?: string | null; value?: string | null };
  marker_level_2?: { title?: string | null; value?: string | null };
  marker_level_3?: { title?: string | null; value?: string | null };
};
type RawVisitSource = {
  system_name?: string | null;
  display_name?: string | null;
  system_name_by_level?: Array<string | null> | null;
  display_name_by_level?: Array<string | null> | null;
};

function cleanLabel(value?: string | null) {
  if (!value) {
    return "";
  }

  const normalized = value.replace(/\u00a0/g, " ").trim();
  if (!normalized || normalized === "[object Object]") {
    return "";
  }

  return normalized;
}

function extractDimensions(rawData: Json | null | undefined): RawDimensions {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return {};
  }

  const rawDimensions = "dimensions" in rawData ? rawData.dimensions : null;
  if (!rawDimensions || typeof rawDimensions !== "object" || Array.isArray(rawDimensions)) {
    return {};
  }

  return rawDimensions as RawDimensions;
}

function extractVisitSource(rawData: Json | null | undefined): RawVisitSource {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return {};
  }

  const rawSource = "source" in rawData ? rawData.source : null;
  if (!rawSource || typeof rawSource !== "object" || Array.isArray(rawSource)) {
    return {};
  }

  return rawSource as RawVisitSource;
}

function uniqueLabels(items: Array<string | null | undefined>) {
  const next: string[] = [];

  for (const item of items) {
    const cleaned = cleanLabel(item);
    if (cleaned && !next.includes(cleaned)) {
      next.push(cleaned);
    }
  }

  return next;
}

function titleCaseLabel(value: string) {
  if (!value) {
    return value;
  }

  return value
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function humanizeSourceToken(value?: string | null) {
  const cleaned = cleanLabel(value);
  if (!cleaned) {
    return "";
  }

  const normalized = cleaned.toLowerCase();
  if (normalized.includes("avito")) {
    return "Авито";
  }
  if (normalized.includes("facebook") || normalized.startsWith("fb") || normalized.includes("meta")) {
    return "Facebook";
  }
  if (normalized.includes("instagram") || normalized.startsWith("ig")) {
    return "Instagram";
  }
  if (normalized.includes("prian")) {
    return "Prian";
  }
  if (normalized.includes("direct") || normalized.includes("yandex")) {
    return "Директ";
  }
  if (normalized.includes("broker")) {
    return "Лид брокера";
  }
  if (normalized.includes("smm")) {
    return "SMM";
  }
  if (normalized.includes("call")) {
    return "CallDog";
  }
  if (normalized.includes("nosource")) {
    return "Без источника";
  }
  if (normalized.includes("bot")) {
    return "Роботы";
  }

  return titleCaseLabel(cleaned.replace(/[_-]+/g, " "));
}

function deriveChannel(primaryKey?: string | null, primaryLabel?: string | null, fallbackSource?: string | null) {
  const fromKey = humanizeSourceToken(primaryKey);
  if (fromKey) {
    return fromKey;
  }

  const label = cleanLabel(primaryLabel);
  if (label) {
    const firstWord = humanizeSourceToken(label.split(/\s+/)[0]);
    if (firstWord) {
      return firstWord;
    }
  }

  const fallback = humanizeSourceToken(fallbackSource);
  if (fallback) {
    return fallback;
  }

  return "Неизвестный канал";
}

function createProfile(channel: string, levelLabels: string[], sourceKey: string): SourceProfile {
  return {
    sourceKey,
    channel,
    levelLabels: uniqueLabels([channel, ...levelLabels]),
  };
}

function registerProfile(aliasMap: Map<string, SourceProfile>, profile: SourceProfile, aliases: Array<string | null | undefined>) {
  for (const alias of aliases) {
    const cleaned = cleanLabel(alias);
    if (cleaned && !aliasMap.has(cleaned)) {
      aliasMap.set(cleaned, profile);
    }
  }
}

function createFallbackProfile(source?: string | null) {
  const cleaned = cleanLabel(source);
  if (!cleaned) {
    return createProfile("Неизвестный канал", ["Неизвестный канал"], "fallback:unknown");
  }

  if (/^\d+$/.test(cleaned)) {
    return createProfile("Неизвестный канал", ["Неизвестный канал", cleaned], `fallback:${cleaned}`);
  }

  const parts = cleaned.split(/[_:]+/).filter(Boolean);
  const channel = deriveChannel(parts[0], parts[0], cleaned);
  const secondaryLabels = parts.slice(1, 4).map((item) => titleCaseLabel(item.replace(/-/g, " ")));
  return createProfile(channel, secondaryLabels, `fallback:${cleaned}`);
}

function profileFromVisit(row: RoistatVisitRow) {
  const source = extractVisitSource(row.raw_data);
  const systemLevels = uniqueLabels(source.system_name_by_level ?? []);
  const displayLevels = uniqueLabels(source.display_name_by_level ?? []);
  const channel = deriveChannel(systemLevels[0], displayLevels[0], row.utm_source ?? row.source);
  const sourceKey = systemLevels.length > 0 ? systemLevels.join("::") : `visit:${row.id}`;
  const profile = createProfile(channel, displayLevels, sourceKey);

  return {
    profile,
    aliases: [
      row.id,
      row.source,
      source.system_name,
      systemLevels.join("_"),
      systemLevels.join("::"),
    ],
  };
}

function profileFromAnalytics(row: RoistatAnalyticsRow) {
  const dimensions = extractDimensions(row.raw_data);
  const labels = uniqueLabels([
    dimensions.marker_level_1?.title,
    dimensions.marker_level_2?.title,
    dimensions.marker_level_3?.title,
  ]);
  const keys = uniqueLabels([
    dimensions.marker_level_1?.value,
    dimensions.marker_level_2?.value,
    dimensions.marker_level_3?.value,
  ]);
  const channel = deriveChannel(keys[0], labels[0], row.source);
  const sourceKey = keys.length > 0 ? keys.join("::") : `analytics:${row.report_date}:${channel}`;
  const profile = createProfile(channel, labels, sourceKey);

  return {
    profile,
    aliases: [row.source, keys.join("_"), keys.join("::")],
  };
}

function resolveProfile(aliasMap: Map<string, SourceProfile>, source?: string | null) {
  const cleaned = cleanLabel(source);
  if (cleaned && aliasMap.has(cleaned)) {
    return aliasMap.get(cleaned)!;
  }

  return createFallbackProfile(source);
}

function orderDate(value: string) {
  return value.slice(0, 10);
}

function nextDate(date: string) {
  return addDays(new Date(`${date}T00:00:00.000Z`), 1).toISOString().slice(0, 10);
}

function nextPeriodStart(date: string, grain: DashboardFilterState["grain"]) {
  return addDays(new Date(`${date}T00:00:00.000Z`), grain === "day" ? 1 : 7).toISOString().slice(0, 10);
}

function buildPeriodSequence(filters: DashboardFilterState) {
  const periods: string[] = [];
  let cursor =
    filters.grain === "day"
      ? filters.dateFrom
      : startOfWeek(new Date(`${filters.dateFrom}T00:00:00.000Z`), { weekStartsOn: 1 }).toISOString().slice(0, 10);
  const limit = filters.dateTo;

  while (cursor <= limit) {
    periods.push(cursor);
    cursor = nextPeriodStart(cursor, filters.grain);
  }

  return periods;
}

function isMqlStatus(statusName?: string | null) {
  return /mql|qualified|квалификац|контакт установлен|contact established|lead scoring/i.test(cleanLabel(statusName));
}

function isMeetingStatus(statusName?: string | null) {
  return /zoom scheduled|meeting scheduled|встреча назнач|созвон назнач|zoom/i.test(cleanLabel(statusName));
}

function isSaleStatus(statusType?: string | null, price?: number | null, profit?: number | null) {
  return cleanLabel(statusType).toLowerCase() === "paid" || Number(price ?? 0) > 0 || Number(profit ?? 0) > 0;
}

function getAnalyticsSpend(row: RoistatAnalyticsRow) {
  const rawData = row.raw_data;
  let rawValue = 0;

  if (rawData && typeof rawData === "object" && !Array.isArray(rawData)) {
    const metrics = "metrics" in rawData ? rawData.metrics : null;
    if (Array.isArray(metrics)) {
      const marketingCost = metrics.find(
        (item) =>
          item &&
          typeof item === "object" &&
          "metric_name" in item &&
          item.metric_name === "marketing_cost" &&
          "value" in item &&
          typeof item.value === "number",
      ) as { value: number } | undefined;

      rawValue = marketingCost?.value ?? 0;
    }
  }

  if (typeof row.marketing_cost === "number" && row.marketing_cost > 0) {
    return row.marketing_cost;
  }

  return rawValue;
}

function createEmptyFact(reportDate: string, profile: SourceProfile): SourceFact {
  return {
    reportDate,
    channel: profile.channel,
    grossMargin: 0,
    leads: 0,
    levelLabels: profile.levelLabels,
    meetingsScheduled: 0,
    mqlt: 0,
    revenue: 0,
    sales: 0,
    spend: 0,
  };
}

function getFactKey(reportDate: string, sourceKey: string) {
  return `${reportDate}::${sourceKey}`;
}

async function fetchPublicRows<T>(
  table: string,
  select: string,
  filters: Array<[string, string]>,
  order: string,
): Promise<T[]> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return [];
  }

  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const url = new URL(`${env.supabaseUrl}/rest/v1/${table}`);
    url.searchParams.set("select", select);
    url.searchParams.set("order", order);
    for (const [key, value] of filters) {
      url.searchParams.append(key, value);
    }

    const response = await fetch(url, {
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${env.supabaseAnonKey}`,
        "Range-Unit": "items",
        Range: `${offset}-${offset + publicPageSize - 1}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${table}: ${response.status}`);
    }

    const page = (await response.json()) as T[];
    rows.push(...page);

    if (page.length < publicPageSize) {
      break;
    }

    offset += publicPageSize;
  }

  return rows;
}

function metricValue(metricId: MetricId, fact: SourceFact) {
  if (metricId === "cpl") {
    return fact.leads === 0 ? 0 : fact.spend / fact.leads;
  }

  if (metricId === "meetings_scheduled") {
    return fact.meetingsScheduled;
  }

  if (metricId === "gross_margin") {
    return fact.grossMargin;
  }

  return fact[metricId];
}

function periodKey(date: string, grain: DashboardFilterState["grain"]) {
  if (grain === "day") {
    return date;
  }

  return startOfWeek(new Date(`${date}T00:00:00.000Z`), { weekStartsOn: 1 }).toISOString().slice(0, 10);
}

function previousPeriodKey(key: string, grain: DashboardFilterState["grain"]) {
  const date = new Date(`${key}T00:00:00.000Z`);
  return addDays(date, grain === "day" ? -1 : -7).toISOString().slice(0, 10);
}

function sortTree(nodes: MetricTreeNode[]) {
  nodes.sort((left, right) => right.value - left.value);
  for (const node of nodes) {
    sortTree(node.children);
  }
}

function buildMetricTree(records: SourceFact[], metricId: MetricId, totalForPeriod: number, maxDepth: number) {
  const bucket = new Map<string, MetricTreeNode>();

  for (const record of records) {
    let path: string[] = [];
    const value = metricValue(metricId, record);

    for (let depth = 0; depth < Math.min(maxDepth, record.levelLabels.length); depth += 1) {
      const label = record.levelLabels[depth] || record.channel;
      path = [...path, label];
      const id = makeId(...path);
      const existing = bucket.get(id);

      if (existing) {
        existing.value += value;
        continue;
      }

      bucket.set(id, {
        id,
        label,
        path,
        depth: depth + 1,
        value,
        previousValue: 0,
        shareOfTotal: 0,
        deltaPct: null,
        children: [],
      });
    }
  }

  const roots: MetricTreeNode[] = [];

  for (const node of bucket.values()) {
    node.shareOfTotal = totalForPeriod === 0 ? 0 : (node.value / totalForPeriod) * 100;
    node.deltaPct = percentDelta(node.value, node.previousValue);

    const parentPath = node.path.slice(0, -1);
    if (parentPath.length === 0) {
      roots.push(node);
      continue;
    }

    const parent = bucket.get(makeId(...parentPath));
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  sortTree(roots);
  return roots;
}

function buildMetricTreeFromFacts(
  metricId: MetricId,
  filters: DashboardFilterState,
  maxDepth: number,
  facts: SourceFact[],
): MetricTreeResult {
  const scoped = facts.filter((fact) => fact.reportDate >= filters.dateFrom && fact.reportDate <= filters.dateTo);
  const channelScoped = filters.channelFilter ? scoped.filter((fact) => fact.channel === filters.channelFilter) : scoped;

  const grouped = new Map<string, SourceFact[]>();
  for (const fact of channelScoped) {
    const key = periodKey(fact.reportDate, filters.grain);
    grouped.set(key, [...(grouped.get(key) ?? []), fact]);
  }

  const periods = buildPeriodSequence(filters).map((key) => {
      const entries = grouped.get(key) ?? [];
      const totalValue = entries.reduce((sum, entry) => sum + metricValue(metricId, entry), 0);
      const previousKey = previousPeriodKey(key, filters.grain);
      const previousValue = facts
        .filter((fact) => periodKey(fact.reportDate, filters.grain) === previousKey)
        .filter((fact) => !filters.channelFilter || fact.channel === filters.channelFilter)
        .reduce((sum, entry) => sum + metricValue(metricId, entry), 0);

      return {
        periodKey: key,
        periodLabel: formatPeriodLabel(key, filters.grain),
        totalValue,
        previousValue,
        deltaPct: percentDelta(totalValue, previousValue),
        rows: buildMetricTree(entries, metricId, totalValue, maxDepth),
      };
    });

  return {
    metricId,
    periods,
  };
}

function buildGrossMarginMixFromFacts(filters: DashboardFilterState, facts: SourceFact[]): DonutSegment[] {
  const scoped = facts
    .filter((fact) => fact.reportDate >= filters.dateFrom && fact.reportDate <= filters.dateTo)
    .filter((fact) => !filters.channelFilter || fact.channel === filters.channelFilter);

  const grouped = new Map<string, number>();
  for (const fact of scoped) {
    grouped.set(fact.channel, (grouped.get(fact.channel) ?? 0) + fact.grossMargin);
  }

  const total = [...grouped.values()].reduce((sum, value) => sum + value, 0);

  return [...grouped.entries()]
    .map(([label, value]) => ({
      id: makeId(label),
      label,
      value,
      shareOfTotal: total === 0 ? 0 : (value / total) * 100,
      color: channelColors[label] ?? "#55c1ff",
    }))
    .sort((left, right) => right.value - left.value);
}

async function getPublicAnalyticsFacts(filters: DashboardFilterState): Promise<SourceFact[] | null> {
  if (!supabase || !env.supabaseUrl || !env.supabaseAnonKey) {
    return null;
  }

  try {
    const startDate = addDays(new Date(`${filters.dateFrom}T00:00:00.000Z`), filters.grain === "day" ? -1 : -7)
      .toISOString()
      .slice(0, 10);
    const endExclusive = nextDate(filters.dateTo);

    const [visits, orders, analytics, costs] = await Promise.all([
      fetchPublicRows<RoistatVisitRow>(
        "roistat_visits",
        "id,date,source,utm_source,utm_medium,utm_campaign,utm_term,utm_content,raw_data",
        [
          ["date", `gte.${startDate}T00:00:00Z`],
          ["date", `lt.${endExclusive}T00:00:00Z`],
        ],
        "date.asc",
      ),
      fetchPublicRows<RoistatOrderRow>(
        "roistat_orders",
        "date_create,source,status_name,status_type,price,profit",
        [
          ["date_create", `gte.${startDate}T00:00:00Z`],
          ["date_create", `lt.${endExclusive}T00:00:00Z`],
        ],
        "date_create.asc",
      ),
      fetchPublicRows<RoistatAnalyticsRow>(
        "roistat_analytics",
        "report_date,source,source_level_2,source_level_3,marketing_cost,raw_data",
        [
          ["report_date", `gte.${startDate}`],
          ["report_date", `lte.${filters.dateTo}`],
        ],
        "report_date.asc",
      ),
      fetchPublicRows<RoistatCostRow>(
        "roistat_costs",
        "date,source,cost,raw_data",
        [
          ["date", `gte.${startDate}`],
          ["date", `lte.${filters.dateTo}`],
        ],
        "date.asc",
      ),
    ]);

    const aliasMap = new Map<string, SourceProfile>();
    for (const visit of visits) {
      const { profile, aliases } = profileFromVisit(visit);
      registerProfile(aliasMap, profile, aliases);
    }
    for (const row of analytics) {
      const { profile, aliases } = profileFromAnalytics(row);
      registerProfile(aliasMap, profile, aliases);
    }

    const facts = new Map<string, SourceFact>();
    const ensureFact = (reportDate: string, profile: SourceProfile) => {
      const key = getFactKey(reportDate, profile.sourceKey);
      if (!facts.has(key)) {
        facts.set(key, createEmptyFact(reportDate, profile));
      }
      return facts.get(key)!;
    };

    for (const row of orders) {
      const profile = resolveProfile(aliasMap, row.source);
      const fact = ensureFact(orderDate(row.date_create), profile);
      fact.leads += 1;
      fact.revenue += Number(row.price ?? 0);
      fact.grossMargin += Number(row.profit ?? 0);

      if (isMqlStatus(row.status_name)) {
        fact.mqlt += 1;
      }

      if (isMeetingStatus(row.status_name)) {
        fact.meetingsScheduled += 1;
      }

      if (isSaleStatus(row.status_type, row.price, row.profit)) {
        fact.sales += 1;
      }
    }

    for (const row of analytics) {
      const { profile } = profileFromAnalytics(row);
      const fact = ensureFact(row.report_date, profile);
      fact.spend += Number(getAnalyticsSpend(row) ?? 0);
    }

    for (const row of costs) {
      if (!row.date) {
        continue;
      }
      const profile = resolveProfile(aliasMap, row.source);
      const fact = ensureFact(row.date, profile);
      fact.spend += Number(row.cost ?? 0);
    }

    return [...facts.values()];
  } catch {
    return null;
  }
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizePref(preference: UserDashboardPreference | null): UserDashboardPreference | null {
  if (!preference) {
    return null;
  }

  return {
    viewKey: preference.viewKey,
    grain: preference.grain,
    expandedPaths: preference.expandedPaths ?? [],
    channelFilter: preference.channelFilter ?? null,
  };
}

export async function getDashboardBootstrap(): Promise<DashboardBootstrap> {
  if (!supabase) {
    return {
      levels: readStorage(storageKeys.levels, DEFAULT_LEVELS),
      views: readStorage(storageKeys.views, DEFAULT_VIEWS),
      preference: normalizePref(readStorage<UserDashboardPreference | null>(storageKeys.prefs, null)),
    };
  }

  const [levelsResponse, viewsResponse] = await Promise.all([
    supabase.schema("app").from("dimension_levels").select("*").order("sort_order"),
    supabase.schema("app").from("dashboard_views").select("*").order("position"),
  ]);

  return {
    levels:
      levelsResponse.data?.map((item) => ({
        levelIndex: item.level_index,
        label: item.label,
        enabled: item.enabled,
        sortOrder: item.sort_order,
      })) ?? DEFAULT_LEVELS,
    views:
      viewsResponse.data?.map((item) => ({
        viewKey: item.view_key,
        metricId: item.metric_id as MetricId,
        title: item.title,
        enabled: item.enabled,
        position: item.position,
        visibleColumns: item.visible_columns ?? DEFAULT_VIEWS[0].visibleColumns,
        columnOrder: item.column_order ?? DEFAULT_VIEWS[0].columnOrder,
        defaultMaxDepth: item.default_max_depth,
      })) ?? DEFAULT_VIEWS,
    preference: normalizePref(readStorage<UserDashboardPreference | null>(storageKeys.prefs, null)),
  };
}

export async function getMetricTree(
  metricId: MetricId,
  filters: DashboardFilterState,
  maxDepth: number,
): Promise<MetricTreeResult> {
  if (!supabase) {
    return getDemoMetricTree(metricId, filters, maxDepth);
  }

  const facts = await getPublicAnalyticsFacts(filters);
  if (facts) {
    return buildMetricTreeFromFacts(metricId, filters, maxDepth, facts);
  }

  const { data, error } = await supabase.schema("reporting").rpc("get_metric_tree_v1", {
    metric_id: metricId,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    grain: filters.grain,
    channel_filter: filters.channelFilter,
    max_depth: maxDepth,
  });

  if (error) {
    return getDemoMetricTree(metricId, filters, maxDepth);
  }

  return (data as MetricTreeResult) ?? getDemoMetricTree(metricId, filters, maxDepth);
}

export async function getGrossMarginMix(filters: DashboardFilterState): Promise<DonutSegment[]> {
  if (!supabase) {
    return getDemoGrossMarginMix(filters);
  }

  const facts = await getPublicAnalyticsFacts(filters);
  if (facts) {
    return buildGrossMarginMixFromFacts(filters, facts);
  }

  const { data, error } = await supabase.schema("reporting").rpc("get_gross_margin_mix_v1", {
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    grain: filters.grain,
    channel_filter: filters.channelFilter,
  });

  if (error) {
    return getDemoGrossMarginMix(filters);
  }

  return (data as DonutSegment[]) ?? getDemoGrossMarginMix(filters);
}

export async function saveDimensionLevels(levels: DimensionLevel[]) {
  writeStorage(storageKeys.levels, levels);

  if (!supabase) {
    return;
  }

  try {
    await supabase.schema("app").from("dimension_levels").upsert(
      levels.map((level) => ({
        level_index: level.levelIndex,
        label: level.label,
        enabled: level.enabled,
        sort_order: level.sortOrder,
      })),
      { onConflict: "level_index" },
    );
  } catch {
    // Keep local preview usable even when app schema is not exposed yet.
  }
}

export async function saveDashboardView(view: DashboardView) {
  const currentViews = readStorage(storageKeys.views, DEFAULT_VIEWS) as DashboardView[];
  const nextViews = currentViews.map((candidate) => (candidate.viewKey === view.viewKey ? view : candidate));
  writeStorage(storageKeys.views, nextViews);

  if (!supabase) {
    return;
  }

  try {
    await supabase.schema("app").from("dashboard_views").upsert(
      {
        view_key: view.viewKey,
        metric_id: view.metricId,
        title: view.title,
        enabled: view.enabled,
        position: view.position,
        visible_columns: view.visibleColumns,
        column_order: view.columnOrder,
        default_max_depth: view.defaultMaxDepth,
      },
      { onConflict: "view_key" },
    );
  } catch {
    // Keep local preview usable even when app schema is not exposed yet.
  }
}

export async function saveUserPreference(preference: UserDashboardPreference, userId?: string) {
  writeStorage(storageKeys.prefs, preference);

  if (!supabase || !userId) {
    return;
  }

  try {
    await supabase.schema("app").from("user_dashboard_prefs").upsert(
      {
        user_id: userId,
        view_key: preference.viewKey,
        grain: preference.grain,
        expanded_paths: preference.expandedPaths,
        channel_filter: preference.channelFilter,
      },
      { onConflict: "user_id,view_key" },
    );
  } catch {
    // Keep local preview usable even when app schema is not exposed yet.
  }
}

export async function getCurrentRole(): Promise<UserRole> {
  if (typeof window !== "undefined" && env.accessPassword && window.localStorage.getItem(passwordSessionKey) === "true") {
    return "admin";
  }

  if (!supabase) {
    return "admin";
  }

  const { data, error } = await supabase.schema("app").rpc("get_current_role_v1");
  if (error) {
    return "viewer";
  }

  return (data as UserRole) ?? "viewer";
}
