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
  id: number;
  name: string | null;
  date_create: string;
  source: string | null;
  status_name: string | null;
  status_type: string | null;
  price: number | null;
  profit: number | null;
  custom_fields: Record<string, unknown> | null;
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

// ---------------------------------------------------------------------------
// Channel classification — exact replica of Roistat "Каналы общ" grouping
// Uses: source (visit source key), lead_source, utm_source, Теги from custom_fields
// ---------------------------------------------------------------------------
const AVITO_SOURCES = ["avito", "авито дмитрий пхукет", "авито пхукет андрей орлов", "авито паттайя андрей орлов", "авито крым андрей орлов", "авито дмитрий крым"];
const AVITO_LEAD_SOURCES = ["avito_krim_andrey", "avito_krim_sokolov", "avito_phuket_andrey", "avito_phuket_sokolov", "авито - александр недвижимость пхукет", "avito_крым", "авито - adamand estate capital", "авито - твой дом на пхукете", "avito_pattai_andrey"];
const FACEBOOK_SOURCES = ["facebook вика", "чернова вика", "fb", "facebook 3", "facebook алексей никита", "facebook", "meta-ads-vc", "fb арсений", "meta-ads"];
const DIRECT_SOURCES = ["пхукет инна", "пхукет иван к.", "директ сергей копнов", "пхукет инна new"];
const GOOGLE_SOURCES = ["tumanov group | таиланд | ru", "google", "google17", "google-ads-sw"];
const VK_SOURCES = ["vk никита колбаскин", "vk реклама", "vk реклама виктория чернова"];
const SMM_LEAD_SOURCES = ["лид_insta_бутик", "лид_telegram_консультация", "лид_insta_консультация", "лид_insta_дача", "лид_insta_bay", "лид_insta_лес", "лид_insta_тропики", "лид_insta_сад", "лид_insta_ипотека", "лид_insta_камала", "лид_insta_люкс", "лид_tiktok", "лид_insta", "лид_youtube"];

function deriveChannel(
  source: string | null,
  fields: Record<string, unknown> | null,
): string {
  const src = cleanLabel(source).toLowerCase();
  const leadSource = cf(fields, "lead_source").toLowerCase();
  const utmSource = cf(fields, "utm_source").toLowerCase();
  const tags = cf(fields, "Теги").toLowerCase();

  // Авито повт. (before Авито to match first)
  if (leadSource.includes("avito-repeat")) return "Авито повт.";

  // Авито
  if (AVITO_SOURCES.some(s => src === s || src.includes("avito")))
    return "Авито";
  if (AVITO_LEAD_SOURCES.some(s => leadSource === s) || leadSource.includes("avito"))
    return "Авито";

  // Директ
  if (DIRECT_SOURCES.some(s => src === s))
    return "Директ";
  if (leadSource === "inna-yd")
    return "Директ";
  if (utmSource.includes("yandex"))
    return "Директ";

  // Ютуб (before Google Ads — more specific)
  if (src === "google-ads-yr")
    return "Ютуб";

  // Google Ads
  if (GOOGLE_SOURCES.some(s => src === s))
    return "Google Ads";
  if (utmSource.includes("google-ads"))
    return "Google Ads";

  // Facebook / Meta
  if (FACEBOOK_SOURCES.some(s => src === s))
    return "Facebook";
  if (utmSource.includes("meta-ads"))
    return "Facebook";

  // SMM
  if (SMM_LEAD_SOURCES.some(s => leadSource === s))
    return "SMM";

  // Приан
  if (src.includes("prian") || leadSource.includes("prian"))
    return "Приан";

  // ДМП (Вантрезалт)
  if (tags.includes("кц"))
    return "ДМП (Вантрезалт)";

  // Homesoverseas
  if (leadSource === "homesoverseas_andrey" || utmSource.includes("homesoverseas"))
    return "Homesoverseas";

  // VK
  if (VK_SOURCES.some(s => src === s))
    return "VK";

  // Сделка удалена
  if (leadSource.includes("delited-lead"))
    return "Сделка удалена";

  // Лид клиента
  if (leadSource.includes("client-lead"))
    return "Лид клиента";

  // Импорт базы
  if (leadSource.includes("import-base"))
    return "Импорт базы";

  // Лид брокера (lead_source contains "broker")
  if (leadSource.includes("broker") || src.includes("broker"))
    return "Лид брокера";

  // Fallback — try to identify by common patterns
  if (src.includes("facebook") || src.includes("fb") || src.includes("meta"))
    return "Facebook";
  if (src.includes("google"))
    return "Google Ads";
  if (src.includes("avito") || src.includes("авито"))
    return "Авито";

  return "Неизвестный канал";
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
const MAX_PAGES = 20;
const FETCH_TIMEOUT = 15_000;

async function fetchWithTimeout(url: URL | string, init: RequestInit, timeoutMs = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPublicRows<T>(
  table: string,
  select: string,
  filters: Array<[string, string]>,
  order: string,
): Promise<T[]> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return [];
  const rows: T[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${env.supabaseUrl}/rest/v1/${table}`);
    url.searchParams.set("select", select);
    url.searchParams.set("order", order);
    for (const [key, value] of filters) url.searchParams.append(key, value);

    const response = await fetchWithTimeout(url, {
      headers: {
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${env.supabaseAnonKey}`,
        "Range-Unit": "items",
        Range: `${offset}-${offset + publicPageSize - 1}`,
      },
    });
    if (!response.ok) throw new Error(`Failed to fetch ${table}: ${response.status}`);
    const batch = (await response.json()) as T[];
    rows.push(...batch);
    if (batch.length < publicPageSize) break;
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
    "id,name,date_create,source,status_name,status_type,price,profit,custom_fields",
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

    const channel = deriveChannel(row.source, fields);
    return {
      orderId: row.id,
      orderName: row.name ?? "",
      rawSource: row.source ?? "",
      statusName: cleanLabel(row.status_name),
      reportDate: row.date_create.slice(0, 10),
      channel,
      levelLabels: [channel],
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
// Channel spend from Roistat API (direct call)
// Maps marker_level_1 source keys to "Каналы общ" channel names
// ---------------------------------------------------------------------------
const SOURCE_KEY_TO_CHANNEL: Record<string, string> = {
  // Авито
  avito: "Авито", avito11: "Авито", avito24: "Авито",
  avito_krim: "Авито", avito_phuket: "Авито",
  // Директ
  direct27: "Директ",
  // Facebook / Meta
  facebook28: "Facebook", facebook23: "Facebook", facebook: "Facebook",
  fb: "Facebook",
  // Google
  google: "Google Ads", google17: "Google Ads",
  "google-ads-sw": "Google Ads", "google-ads-yr": "Ютуб",
  // Prian
  prian: "Приан",
};

function sourceKeyToChannel(key: string, title: string): string {
  // Direct lookup
  const lower = key.toLowerCase();
  if (SOURCE_KEY_TO_CHANNEL[lower]) return SOURCE_KEY_TO_CHANNEL[lower];

  // Pattern matching on key and title
  const t = title.toLowerCase();
  if (lower.includes("avito") || t.includes("авито")) return "Авито";
  if (lower.includes("facebook") || lower.includes("fb") || lower.includes("meta") || t.includes("facebook") || t.includes("чернова вика") || t.includes("fb ")) return "Facebook";
  if (lower.includes("direct") || t.includes("пхукет инна") || t.includes("пхукет иван") || t.includes("директ")) return "Директ";
  if (lower.includes("google-ads-yr") || t.includes("ютуб")) return "Ютуб";
  if (lower.includes("google") || t.includes("google")) return "Google Ads";
  if (lower.includes("prian") || t.includes("приан")) return "Приан";
  if (lower.includes("vk") || t.includes("vk")) return "VK";
  if (lower.includes("homesoverseas") || t.includes("homesoverseas")) return "Homesoverseas";

  return title || "Неизвестный канал";
}

type RoistatAnalyticsItem = {
  metrics: { metric_name: string; value: number }[];
  dimensions: {
    marker_level_1?: { value: string; title: string };
  };
};

type RoistatAnalyticsResponse = {
  status?: string;
  data?: Array<{
    dateFrom?: string;
    dateTo?: string;
    items?: RoistatAnalyticsItem[];
  }>;
};

async function fetchChannelSpend(
  startDate: string,
  endDate: string,
): Promise<ChannelDateSpend[]> {
  if (!env.roistatApiKey || !env.roistatProject) return [];

  try {
    const response = await fetchWithTimeout("https://cloud.roistat.com/api/v1/project/analytics/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: env.roistatApiKey,
        project: env.roistatProject,
        period: { from: startDate, to: endDate },
        metrics: ["marketing_cost"],
        dimensions: ["marker_level_1"],
      }),
    }, 10_000);

    if (!response.ok) {
      console.warn("[spend] Roistat API response not ok:", response.status);
      return [];
    }
    const json = (await response.json()) as RoistatAnalyticsResponse;
    if (!json.data || (json.status && json.status !== "success")) {
      console.warn("[spend] Roistat API error:", json.status);
      return [];
    }

    const spendMap = new Map<string, ChannelDateSpend>();
    const period = json.data[0];
    const items = period?.items ?? [];
    // Use endDate (YYYY-MM-DD) as reportDate so it passes date filtering
    const reportDate = endDate;

    for (const item of items) {
      const dim = item.dimensions.marker_level_1;
      if (!dim) continue;
      const channel = sourceKeyToChannel(dim.value, dim.title);
      const spend = item.metrics.find(m => m.metric_name === "marketing_cost")?.value ?? 0;
      if (spend <= 0) continue;

      const key = `${reportDate}::${channel}`;
      const existing = spendMap.get(key);
      if (existing) {
        existing.spend += spend;
      } else {
        spendMap.set(key, { reportDate, channel, spend });
      }
    }

    console.log(`[spend] Roistat API: ${items.length} sources, ${spendMap.size} channels, total $${[...spendMap.values()].reduce((s, v) => s + v.spend, 0).toFixed(0)}`);
    return [...spendMap.values()];
  } catch (err) {
    console.error("[spend] Roistat API fetch failed:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Cache layer
// ---------------------------------------------------------------------------
const CACHE_TTL = 5 * 60_000; // 5 minutes — data doesn't change frequently

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

// Re-export channel colors for widgets — matches "Каналы общ" grouping
export const channelColors: Record<string, string> = {
  "Авито": "#4f8fe8",
  "Facebook": "#5a7ad9",
  "Директ": "#ff8e43",
  "Google Ads": "#34a853",
  "Ютуб": "#ff0000",
  "SMM": "#6fe0d1",
  "Приан": "#4da5aa",
  "ДМП (Вантрезалт)": "#b388ff",
  "Homesoverseas": "#42a5f5",
  "VK": "#4c75a3",
  "Лид брокера": "#89cc4a",
  "Лид клиента": "#66bb6a",
  "Импорт базы": "#a1887f",
  "Авито повт.": "#2196f3",
  "Сделка удалена": "#ef5350",
  "Неизвестный канал": "#778195",
};
