/**
 * Enriched data layer for Marketing & Lead Quality dashboards.
 * Fetches roistat_orders with custom_fields and classifies each order
 * through the full 7-stage funnel: Lead → MQLt → MQLs → SQL → MeetingSet → MeetingDone → Sale.
 */
import { addDays, startOfWeek } from "date-fns";
import { env } from "@/lib/env";
import type {
  ChannelDateSpend,
  DashboardFilterState,
  EnrichedOrderFact,
  LanguageSegment,
  LeadCategory,
  MarketingFilterState,
} from "@/types/dashboard";

// ---------------------------------------------------------------------------
// Types for raw Supabase rows
// ---------------------------------------------------------------------------
type OrderRowWithCF = {
  date_create: string;
  source: string | null;
  status_name: string | null;
  status_type: string | null;
  price: number | null;
  profit: number | null;
  custom_fields: Record<string, unknown> | null;
};

type AnalyticsSpendRow = {
  report_date: string;
  source: string | null;
  marketing_cost: number | null;
  raw_data: unknown;
};

// ---------------------------------------------------------------------------
// Reuse helpers from main dashboard repository
// ---------------------------------------------------------------------------
const publicPageSize = 1000;

function cleanLabel(value?: string | null): string {
  if (!value) return "";
  const normalized = value.replace(/\u00a0/g, " ").trim();
  if (!normalized || normalized === "[object Object]") return "";
  return normalized;
}

function humanizeSourceToken(value?: string | null): string {
  const cleaned = cleanLabel(value);
  if (!cleaned) return "";
  const n = cleaned.toLowerCase();
  if (n.includes("avito")) return "Авито";
  if (n.includes("facebook") || n.startsWith("fb") || n.includes("meta")) return "Facebook";
  if (n.includes("instagram") || n.startsWith("ig")) return "Instagram";
  if (n.includes("prian")) return "Prian";
  if (n.includes("direct") || n.includes("yandex")) return "Директ";
  if (n.includes("broker")) return "Лид брокера";
  if (n.includes("smm")) return "SMM";
  if (n.includes("call")) return "CallDog";
  if (n.includes("nosource")) return "Без источника";
  if (n.includes("bot")) return "Роботы";
  return cleaned.replace(/[_-]+/g, " ").split(/\s+/).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(" ");
}

function deriveChannelFromSource(source?: string | null): string {
  const channel = humanizeSourceToken(source);
  return channel || "Неизвестный канал";
}

// ---------------------------------------------------------------------------
// custom_fields parsing
// ---------------------------------------------------------------------------
function cf(fields: Record<string, unknown> | null, key: string): string {
  if (!fields) return "";
  const val = fields[key];
  if (val == null) return "";
  return String(val).trim();
}

function extractLanguage(fields: Record<string, unknown> | null): LanguageSegment {
  const lang = cf(fields, "Язык").toLowerCase();
  if (lang.includes("англ") || lang.includes("english") || lang === "en") return "EN";
  if (lang.includes("русс") || lang.includes("russian") || lang === "ru") return "RU";
  return "unknown";
}

function extractCategory(fields: Record<string, unknown> | null): LeadCategory {
  const cat = cf(fields, "Категория");
  if (!cat) return "none";
  if (cat.includes("A:") || cat.includes("ближ")) return "A";
  if (cat.includes("B:")) return "B";
  if (cat.toLowerCase().includes("ожидает") || cat.includes("C:")) return "C";
  return "none";
}

function extractManager(fields: Record<string, unknown> | null): string {
  return cf(fields, "Менеджер") || "Не назначен";
}

function tagsContain(fields: Record<string, unknown> | null, needle: string): boolean {
  const tags = cf(fields, "Теги").toLowerCase();
  return tags.includes(needle.toLowerCase());
}

function cfFlag(fields: Record<string, unknown> | null, key: string): boolean {
  const val = cf(fields, key);
  return val === "1" || val.toLowerCase() === "true";
}

const QUALIFIED_REJECTION_REASONS = [
  "отказался от приобретения",
  "неактуально",
  "купил напрямую у застройщика",
  "выбрал инвестировать в другую страну",
  "не найден подходящий объект",
  "отложил покупку",
  "купил с другим брокером",
];

const UNQUALIFIED_REJECTION_REASONS = [
  "спам",
  "ошибочная заявка",
  "не оставлял заявку",
  "тестовая заявка",
  "не выходит на связь",
  "риэлтор",
  "не корректный номер",
  "некорректный номер",
];

function isQualifiedRejection(reason: string | null): boolean {
  if (!reason) return false;
  const lower = reason.toLowerCase();
  return QUALIFIED_REJECTION_REASONS.some(r => lower.includes(r));
}

// ---------------------------------------------------------------------------
// Paginated fetch (same as dashboardRepository)
// ---------------------------------------------------------------------------
async function fetchPublicRows<T>(
  table: string,
  select: string,
  filters: Array<[string, string]>,
  order: string,
): Promise<T[]> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return [];
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const url = new URL(`${env.supabaseUrl}/rest/v1/${table}`);
    url.searchParams.set("select", select);
    url.searchParams.set("order", order);
    for (const [key, value] of filters) url.searchParams.append(key, value);

    const response = await fetch(url, {
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${env.supabaseAnonKey}`,
        "Range-Unit": "items",
        Range: `${offset}-${offset + publicPageSize - 1}`,
      },
    });
    if (!response.ok) throw new Error(`Failed to fetch ${table}: ${response.status}`);
    const page = (await response.json()) as T[];
    rows.push(...page);
    if (page.length < publicPageSize) break;
    offset += publicPageSize;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Enriched order fetching with full funnel classification
// ---------------------------------------------------------------------------
async function fetchEnrichedOrders(
  startDate: string,
  endDate: string,
): Promise<EnrichedOrderFact[]> {
  const rows = await fetchPublicRows<OrderRowWithCF>(
    "roistat_orders",
    "date_create,source,status_name,status_type,price,profit,custom_fields",
    [
      ["date_create", `gte.${startDate}`],
      ["date_create", `lte.${endDate}T23:59:59`],
    ],
    "date_create.asc",
  );

  return rows.map((row) => {
    const fields = row.custom_fields;
    const isCanceled = cleanLabel(row.status_type).toLowerCase() === "canceled";
    const price = Number(row.price ?? 0);
    const profit = Number(row.profit ?? 0);
    const isSale = !isCanceled && (
      cleanLabel(row.status_type).toLowerCase() === "paid" || price > 0 || profit > 0
    );

    return {
      reportDate: row.date_create.slice(0, 10),
      channel: deriveChannelFromSource(row.source),
      levelLabels: [deriveChannelFromSource(row.source)],
      language: extractLanguage(fields),
      category: extractCategory(fields),
      manager: extractManager(fields),
      isMqlt: tagsContain(fields, "QL") || tagsContain(fields, "MQL") || tagsContain(fields, "квал"),
      isMqls: cfFlag(fields, "MQL этап"),
      isSql: tagsContain(fields, "SQL") || cfFlag(fields, "SQL этап"),
      isMeetingSet: cfFlag(fields, "Встреча назначена?"),
      isMeetingDone: cfFlag(fields, "Встреча проведена?"),
      isSale,
      price: isSale ? price : 0,
      profit: isSale ? profit : 0,
      rejectionReason: cf(fields, "Причина отказа") || null,
      isQualifiedRejection: isQualifiedRejection(cf(fields, "Причина отказа") || null),
    };
  });
}

// ---------------------------------------------------------------------------
// Channel spend from roistat_analytics
// ---------------------------------------------------------------------------
async function fetchChannelSpend(
  startDate: string,
  endDate: string,
): Promise<ChannelDateSpend[]> {
  const rows = await fetchPublicRows<AnalyticsSpendRow>(
    "roistat_analytics",
    "report_date,source,marketing_cost,raw_data",
    [
      ["report_date", `gte.${startDate}`],
      ["report_date", `lte.${endDate}`],
    ],
    "report_date.asc",
  );

  const spendMap = new Map<string, ChannelDateSpend>();

  for (const row of rows) {
    const channel = deriveChannelFromSource(row.source);
    let spend = Number(row.marketing_cost ?? 0);

    // Try to extract from raw_data metrics if marketing_cost is 0
    if (spend === 0 && row.raw_data && typeof row.raw_data === "object" && !Array.isArray(row.raw_data)) {
      const rd = row.raw_data as Record<string, unknown>;
      const metrics = "metrics" in rd ? rd.metrics : null;
      if (Array.isArray(metrics)) {
        const mc = metrics.find(
          (m: unknown) => m && typeof m === "object" && "metric_name" in (m as Record<string, unknown>) && (m as Record<string, unknown>).metric_name === "marketing_cost"
        ) as { value: number } | undefined;
        spend = mc?.value ?? 0;
      }
    }

    if (spend <= 0) continue;

    const key = `${row.report_date}::${channel}`;
    const existing = spendMap.get(key);
    if (existing) {
      existing.spend += spend;
    } else {
      spendMap.set(key, { reportDate: row.report_date, channel, spend });
    }
  }

  return [...spendMap.values()];
}

// ---------------------------------------------------------------------------
// Cache layer
// ---------------------------------------------------------------------------
const CACHE_TTL = 30_000;

let ordersCache: { key: string; data: EnrichedOrderFact[]; at: number } | null = null;
let spendCache: { key: string; data: ChannelDateSpend[]; at: number } | null = null;

function cacheKey(f: DashboardFilterState) {
  return `${f.dateFrom}::${f.dateTo}`;
}

export async function getEnrichedOrders(filters: MarketingFilterState): Promise<EnrichedOrderFact[]> {
  const key = cacheKey(filters);
  if (ordersCache && ordersCache.key === key && Date.now() - ordersCache.at < CACHE_TTL) {
    return applyLanguageFilter(ordersCache.data, filters);
  }

  const startDate = addDays(new Date(`${filters.dateFrom}T00:00:00.000Z`), -7).toISOString().slice(0, 10);
  const data = await fetchEnrichedOrders(startDate, filters.dateTo);
  ordersCache = { key, data, at: Date.now() };
  return applyLanguageFilter(data, filters);
}

export async function getChannelSpend(filters: MarketingFilterState): Promise<ChannelDateSpend[]> {
  const key = cacheKey(filters);
  if (spendCache && spendCache.key === key && Date.now() - spendCache.at < CACHE_TTL) {
    return spendCache.data;
  }

  const startDate = addDays(new Date(`${filters.dateFrom}T00:00:00.000Z`), -7).toISOString().slice(0, 10);
  const data = await fetchChannelSpend(startDate, filters.dateTo);
  spendCache = { key, data, at: Date.now() };
  return data;
}

function applyLanguageFilter(orders: EnrichedOrderFact[], filters: MarketingFilterState): EnrichedOrderFact[] {
  if (!filters.languageFilter) return orders;
  return orders.filter(o => o.language === filters.languageFilter);
}

// Re-export channel colors for widgets
export const channelColors: Record<string, string> = {
  "Авито": "#4f8fe8",
  Avito: "#4f8fe8",
  Facebook: "#5a7ad9",
  Instagram: "#e77bc0",
  "Лид брокера": "#89cc4a",
  Prian: "#4da5aa",
  SMM: "#6fe0d1",
  Директ: "#ff8e43",
  CallDog: "#7ad2ff",
  "Без источника": "#778195",
  "Неизвестный канал": "#778195",
  Роботы: "#8892aa",
};
