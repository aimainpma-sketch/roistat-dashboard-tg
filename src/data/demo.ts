import { addDays, startOfWeek } from "date-fns";
import { formatPeriodLabel } from "@/lib/format";
import { makeId, percentDelta } from "@/lib/utils";
import type {
  DashboardFilterState,
  DonutSegment,
  Grain,
  MetricId,
  MetricTreeNode,
  MetricTreeResult,
  SourceFact,
} from "@/types/dashboard";

const channelColors: Record<string, string> = {
  Avito: "#4f8fe8",
  CallDog: "#7ad2ff",
  Prian: "#4da5aa",
  "Лид брокера": "#89cc4a",
  Директ: "#ff8e43",
  Facebook: "#5a7ad9",
  SMM: "#6fe0d1",
};

const recordsSeed: Array<Omit<SourceFact, "reportDate"> & { dayOffset: number }> = [
  {
    dayOffset: 0,
    channel: "Avito",
    levelLabels: ["Avito", "Пхукет", "Андрей Орлов", "Квартиры", "2к 54м", "Теплый сегмент", "RU"],
    spend: 310,
    leads: 16,
    mqlt: 7,
    meetingsScheduled: 4,
    sales: 1,
    revenue: 7400,
    grossMargin: 4620,
  },
  {
    dayOffset: 0,
    channel: "Prian",
    levelLabels: ["Prian", "Пхукет", "Мария", "Виллы", "Дом 159м", "Партнеры", "INT"],
    spend: 120,
    leads: 5,
    mqlt: 3,
    meetingsScheduled: 2,
    sales: 1,
    revenue: 5200,
    grossMargin: 3440,
  },
  {
    dayOffset: 0,
    channel: "Директ",
    levelLabels: ["Директ", "Таиланд", "Вика", "Лендинг", "Phuket RU", "Search", "High intent"],
    spend: 260,
    leads: 11,
    mqlt: 4,
    meetingsScheduled: 2,
    sales: 0,
    revenue: 0,
    grossMargin: -260,
  },
  {
    dayOffset: 1,
    channel: "Avito",
    levelLabels: ["Avito", "Паттайя", "Андрей Орлов", "Квартиры", "2к 56м", "Теплый сегмент", "RU"],
    spend: 290,
    leads: 13,
    mqlt: 6,
    meetingsScheduled: 3,
    sales: 1,
    revenue: 6900,
    grossMargin: 4320,
  },
  {
    dayOffset: 1,
    channel: "CallDog",
    levelLabels: ["CallDog", "Пхукет", "Контакт-центр", "Входящие", "Phone", "Warm", "RU"],
    spend: 180,
    leads: 9,
    mqlt: 5,
    meetingsScheduled: 2,
    sales: 1,
    revenue: 4800,
    grossMargin: 3020,
  },
  {
    dayOffset: 2,
    channel: "Лид брокера",
    levelLabels: ["Лид брокера", "Пхукет", "Партнер 1", "Апартаменты", "Лот 97", "Partner", "SEA"],
    spend: 90,
    leads: 7,
    mqlt: 4,
    meetingsScheduled: 2,
    sales: 1,
    revenue: 6100,
    grossMargin: 4250,
  },
  {
    dayOffset: 2,
    channel: "SMM",
    levelLabels: ["SMM", "Instagram", "Контент", "Лендинг", "Story 4", "Organic", "RU"],
    spend: 60,
    leads: 4,
    mqlt: 2,
    meetingsScheduled: 1,
    sales: 0,
    revenue: 0,
    grossMargin: -60,
  },
  {
    dayOffset: 3,
    channel: "Avito",
    levelLabels: ["Avito", "Пхукет", "Андрей Орлов", "Квартиры", "1к 43м", "Теплый сегмент", "RU"],
    spend: 280,
    leads: 14,
    mqlt: 6,
    meetingsScheduled: 3,
    sales: 1,
    revenue: 7100,
    grossMargin: 4370,
  },
  {
    dayOffset: 3,
    channel: "Facebook",
    levelLabels: ["Facebook", "Meta Ads", "Вика", "Квиз", "Campaign 23", "Paid Social", "Lookalike"],
    spend: 140,
    leads: 8,
    mqlt: 3,
    meetingsScheduled: 1,
    sales: 0,
    revenue: 0,
    grossMargin: -140,
  },
  {
    dayOffset: 4,
    channel: "CallDog",
    levelLabels: ["CallDog", "Пхукет", "Контакт-центр", "Входящие", "Phone", "Warm", "RU"],
    spend: 160,
    leads: 10,
    mqlt: 5,
    meetingsScheduled: 2,
    sales: 1,
    revenue: 5100,
    grossMargin: 3340,
  },
  {
    dayOffset: 4,
    channel: "Prian",
    levelLabels: ["Prian", "Пхукет", "Мария", "Виллы", "Дом 127м", "Партнеры", "INT"],
    spend: 100,
    leads: 4,
    mqlt: 2,
    meetingsScheduled: 1,
    sales: 0,
    revenue: 0,
    grossMargin: -100,
  },
  {
    dayOffset: 5,
    channel: "Директ",
    levelLabels: ["Директ", "Таиланд", "Вика", "Лендинг", "Brand Search", "Search", "High intent"],
    spend: 240,
    leads: 12,
    mqlt: 5,
    meetingsScheduled: 2,
    sales: 1,
    revenue: 6500,
    grossMargin: 3990,
  },
  {
    dayOffset: 5,
    channel: "Лид брокера",
    levelLabels: ["Лид брокера", "Пхукет", "Партнер 2", "Апартаменты", "Лот 61", "Partner", "SEA"],
    spend: 95,
    leads: 6,
    mqlt: 3,
    meetingsScheduled: 1,
    sales: 0,
    revenue: 0,
    grossMargin: -95,
  },
  {
    dayOffset: 6,
    channel: "Avito",
    levelLabels: ["Avito", "Пхукет", "Андрей Орлов", "Квартиры", "2к 78м", "Теплый сегмент", "RU"],
    spend: 330,
    leads: 17,
    mqlt: 8,
    meetingsScheduled: 4,
    sales: 2,
    revenue: 9600,
    grossMargin: 5970,
  },
  {
    dayOffset: 6,
    channel: "CallDog",
    levelLabels: ["CallDog", "Пхукет", "Контакт-центр", "Входящие", "Phone", "Warm", "RU"],
    spend: 170,
    leads: 11,
    mqlt: 5,
    meetingsScheduled: 3,
    sales: 1,
    revenue: 5200,
    grossMargin: 3440,
  },
];

const baseDate = new Date("2026-03-23T00:00:00.000Z");

const demoFacts: SourceFact[] = recordsSeed.map((entry) => ({
  ...entry,
  reportDate: addDays(baseDate, entry.dayOffset).toISOString().slice(0, 10),
}));

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

function periodKey(date: string, grain: Grain) {
  if (grain === "day") {
    return date;
  }

  return startOfWeek(new Date(`${date}T00:00:00.000Z`), { weekStartsOn: 1 }).toISOString().slice(0, 10);
}

function previousPeriodKey(key: string, grain: Grain) {
  const date = new Date(`${key}T00:00:00.000Z`);
  const shift = grain === "day" ? -1 : -7;
  return addDays(date, shift).toISOString().slice(0, 10);
}

function inRange(date: string, filters: DashboardFilterState) {
  return date >= filters.dateFrom && date <= filters.dateTo;
}

function buildTree(records: SourceFact[], metricId: MetricId, totalForPeriod: number, maxDepth: number) {
  const bucket = new Map<string, MetricTreeNode>();

  for (const record of records) {
    let path: string[] = [];

    for (let depth = 0; depth < Math.min(maxDepth, record.levelLabels.length); depth += 1) {
      const label = record.levelLabels[depth] || record.channel;
      path = [...path, label];
      const id = makeId(...path);
      const value = metricValue(metricId, record);

      const previousValue = 0;
      const existing = bucket.get(id);

      if (existing) {
        existing.value += value;
        existing.previousValue += previousValue;
      } else {
        bucket.set(id, {
          id,
          label,
          path,
          depth: depth + 1,
          value,
          previousValue,
          shareOfTotal: 0,
          deltaPct: 0,
          children: [],
        });
      }
    }
  }

  const nodes = [...bucket.values()].sort((left, right) => {
    if (left.path.length === right.path.length) {
      return right.value - left.value;
    }

    return left.path.length - right.path.length;
  });

  const roots: MetricTreeNode[] = [];
  const nodeMap = new Map<string, MetricTreeNode>(nodes.map((node) => [node.id, node]));

  for (const node of nodes) {
    node.shareOfTotal = totalForPeriod === 0 ? 0 : (node.value / totalForPeriod) * 100;
    node.deltaPct = percentDelta(node.value, node.previousValue);
    const parentPath = node.path.slice(0, -1);

    if (parentPath.length === 0) {
      roots.push(node);
      continue;
    }

    const parent = nodeMap.get(makeId(...parentPath));
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function getDemoMetricTree(metricId: MetricId, filters: DashboardFilterState, maxDepth = 3): MetricTreeResult {
  const scoped = demoFacts.filter((fact) => inRange(fact.reportDate, filters));
  const channelScoped = filters.channelFilter ? scoped.filter((fact) => fact.channel === filters.channelFilter) : scoped;

  const grouped = new Map<string, SourceFact[]>();
  for (const fact of channelScoped) {
    const key = periodKey(fact.reportDate, filters.grain);
    grouped.set(key, [...(grouped.get(key) ?? []), fact]);
  }

  const periods = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entries]) => {
      const totalValue = entries.reduce((sum, entry) => sum + metricValue(metricId, entry), 0);
      const previousKey = previousPeriodKey(key, filters.grain);
      const previousValue = demoFacts
        .filter((fact) => periodKey(fact.reportDate, filters.grain) === previousKey)
        .reduce((sum, entry) => sum + metricValue(metricId, entry), 0);

      return {
        periodKey: key,
        periodLabel: formatPeriodLabel(key, filters.grain),
        totalValue,
        previousValue,
        deltaPct: percentDelta(totalValue, previousValue),
        rows: buildTree(entries, metricId, totalValue, maxDepth),
      };
    });

  return {
    metricId,
    periods,
  };
}

export function getDemoGrossMarginMix(filters: DashboardFilterState): DonutSegment[] {
  const scoped = demoFacts.filter((fact) => inRange(fact.reportDate, filters));
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

export const demoAuthUsers = [
  {
    id: "u-1",
    email: "owner@roistat.local",
    role: "admin" as const,
    status: "active" as const,
    invitedAt: "2026-03-21T10:30:00.000Z",
  },
  {
    id: "u-2",
    email: "marketing@roistat.local",
    role: "editor" as const,
    status: "active" as const,
    invitedAt: "2026-03-22T09:15:00.000Z",
  },
  {
    id: "u-3",
    email: "viewer@roistat.local",
    role: "viewer" as const,
    status: "invited" as const,
    invitedAt: "2026-03-29T11:10:00.000Z",
  },
];
