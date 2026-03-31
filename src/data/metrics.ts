import type { DashboardView, DimensionLevel, MetricDefinition } from "@/types/dashboard";

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  { id: "spend", label: "Расходы", description: "Расходы по каналам и источникам", format: "money", accent: "#ff8e67" },
  { id: "leads", label: "Лиды", description: "Заявки за период", format: "integer", accent: "#7ad2ff" },
  { id: "cpl", label: "CPL", description: "Стоимость лида", format: "money", accent: "#f7d58d" },
  { id: "mqlt", label: "MQLt", description: "Маркетингово квалифицированные лиды", format: "integer", accent: "#7fb6ff" },
  { id: "meetings_scheduled", label: "Назначенные встречи", description: "Назначенные встречи по каналам", format: "integer", accent: "#b7d75b" },
  { id: "sales", label: "Продажи", description: "Продажи и закрытые сделки", format: "integer", accent: "#9be7c4" },
  { id: "revenue", label: "Выручка", description: "Выручка за период", format: "money", accent: "#72b8ff" },
  { id: "gross_margin", label: "Валовая маржа", description: "Валовая маржа по каналам", format: "money", accent: "#55c1ff" },
];

export const DEFAULT_LEVELS: DimensionLevel[] = [
  { levelIndex: 1, label: "Канал", enabled: true, sortOrder: 1 },
  { levelIndex: 2, label: "Источник", enabled: true, sortOrder: 2 },
  { levelIndex: 3, label: "Менеджер", enabled: true, sortOrder: 3 },
  { levelIndex: 4, label: "Объект", enabled: true, sortOrder: 4 },
  { levelIndex: 5, label: "Креатив", enabled: false, sortOrder: 5 },
  { levelIndex: 6, label: "Сегмент", enabled: false, sortOrder: 6 },
  { levelIndex: 7, label: "Подсегмент", enabled: false, sortOrder: 7 },
];

export const DEFAULT_COLUMN_ORDER = ["label", "value", "shareOfTotal", "previousValue", "deltaPct"];

export const DEFAULT_VIEWS: DashboardView[] = METRIC_DEFINITIONS.map((metric, index) => ({
  viewKey: `${metric.id}-table`,
  metricId: metric.id,
  title: metric.label,
  enabled: metric.id === "gross_margin",
  position: index + 1,
  visibleColumns: [...DEFAULT_COLUMN_ORDER],
  columnOrder: [...DEFAULT_COLUMN_ORDER],
  defaultMaxDepth: 2,
}));
