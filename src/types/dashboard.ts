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

// ---------------------------------------------------------------------------
// Marketing & Lead Quality dashboards
// ---------------------------------------------------------------------------

export type LanguageSegment = "RU" | "EN" | "unknown";
export type LeadCategory = "A" | "B" | "C" | "none";

export type EnrichedOrderFact = {
  orderId: number;
  orderName: string;
  rawSource: string;
  statusName: string;
  reportDate: string;
  channel: string;
  levelLabels: string[];
  language: LanguageSegment;
  category: LeadCategory;
  manager: string;
  isMqlt: boolean;
  isMqls: boolean;
  isSql: boolean;
  isMeetingSet: boolean;
  isMeetingDone: boolean;
  isSale: boolean;
  price: number;
  profit: number;
  rejectionReason: string | null;
  isQualifiedRejection: boolean;
};

export type ChannelDateSpend = {
  reportDate: string;
  channel: string;
  spend: number;
};

export type ChannelFunnelSummary = {
  channel: string;
  leads: number;
  mqlt: number;
  mqls: number;
  sql: number;
  meetingSet: number;
  meetingDone: number;
  sales: number;
  revenue: number;
  grossMargin: number;
  spend: number;
  cpl: number;
  cpMqlt: number;
  cpMqls: number;
  cpSql: number;
  cpMeet: number;
  cpMeetSet: number;
  crMqlt: number;
  crMqltToMqls: number;
  crMqlsToSql: number;
  crSqlToMeet: number;
  crSqlToMeetSet: number;
  crMeetSetToMeetDone: number;
  crMeetToOrder: number;
  romi: number;
  categoryA: number;
  categoryB: number;
  categoryC: number;
  categoryNone: number;
  leadsRu: number;
  leadsEn: number;
};

export type WeeklyTrend = {
  weekStart: string;
  weekLabel: string;
  spend: number;
  leads: number;
  mqlt: number;
  sales: number;
  revenue: number;
  romi: number;
};

export type RedFlagItem = {
  channel: string;
  source: string;
  spend: number;
  leads: number;
  mqlt: number;
  reason: string;
};

export type RejectionBreakdown = {
  channel: string;
  qualifiedCount: number;
  unqualifiedCount: number;
  reasons: { reason: string; count: number }[];
};

export type BrokerChannelCell = {
  manager: string;
  channel: string;
  leads: number;
  mqls: number;
  meetingDone: number;
  sales: number;
  crMeetToOrder: number;
};

export type MarketingFilterState = DashboardFilterState & {
  languageFilter: LanguageSegment | null;
};

export type SubSourceSummary = ChannelFunnelSummary & { subSource: string };

export type MarketingInsight = {
  severity: "red" | "yellow" | "green";
  channel: string;
  message: string;
};

export type DealPopupState = {
  channel: string;
  stage: string;
  deals: EnrichedOrderFact[];
} | null;
