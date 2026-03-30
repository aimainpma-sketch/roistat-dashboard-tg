import type { DashboardFilterState, MetricId } from "@/types/dashboard";

export const queryKeys = {
  metricTree: (metricId: MetricId, filters: DashboardFilterState) => ["metric-tree", metricId, filters] as const,
  grossMarginMix: (filters: DashboardFilterState) => ["gross-margin-mix", filters] as const,
  dimensionLevels: ["dimension-levels"] as const,
  dashboardViews: ["dashboard-views"] as const,
  currentRole: ["current-role"] as const,
  adminUsers: ["admin-users"] as const,
};
