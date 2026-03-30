export type MetricId =
  | "spend"
  | "leads"
  | "cpl"
  | "mqlt"
  | "meetings_scheduled"
  | "sales"
  | "revenue"
  | "gross_margin";

export type Grain = "day" | "week";
export type UserRole = "admin" | "editor" | "viewer";

export type DashboardFilterState = {
  dateFrom: string;
  dateTo: string;
  grain: Grain;
  channelFilter: string | null;
};

export type MetricDefinition = {
  id: MetricId;
  label: string;
  description: string;
  format: "money" | "integer" | "ratio";
  accent: string;
};

export type SourceFact = {
  reportDate: string;
  channel: string;
  grossMargin: number;
  leads: number;
  levelLabels: string[];
  meetingsScheduled: number;
  mqlt: number;
  revenue: number;
  sales: number;
  spend: number;
};

export type MetricTreeNode = {
  id: string;
  label: string;
  path: string[];
  depth: number;
  value: number;
  previousValue: number;
  shareOfTotal: number;
  deltaPct: number | null;
  children: MetricTreeNode[];
};

export type MetricPeriodGroup = {
  periodKey: string;
  periodLabel: string;
  totalValue: number;
  previousValue: number;
  deltaPct: number | null;
  rows: MetricTreeNode[];
};

export type MetricTreeResult = {
  metricId: MetricId;
  periods: MetricPeriodGroup[];
};

export type DonutSegment = {
  id: string;
  label: string;
  value: number;
  shareOfTotal: number;
  color: string;
};

export type DimensionLevel = {
  levelIndex: number;
  label: string;
  enabled: boolean;
  sortOrder: number;
};

export type DashboardView = {
  viewKey: string;
  metricId: MetricId;
  title: string;
  enabled: boolean;
  position: number;
  visibleColumns: string[];
  columnOrder: string[];
  defaultMaxDepth: number;
};

export type UserDashboardPreference = {
  viewKey: string;
  grain: Grain;
  expandedPaths: string[];
  channelFilter: string | null;
};

export type DashboardBootstrap = {
  levels: DimensionLevel[];
  views: DashboardView[];
  preference: UserDashboardPreference | null;
};

export type AdminUser = {
  id: string;
  email: string;
  role: UserRole;
  status: "active" | "invited" | "disabled";
  invitedAt: string;
};
