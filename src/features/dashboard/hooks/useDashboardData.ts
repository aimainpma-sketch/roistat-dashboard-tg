import { useQuery } from "@tanstack/react-query";
import { getDashboardBootstrap, getGrossMarginMix, getMetricTree, getCurrentRole } from "@/services/dashboardRepository";
import { queryKeys } from "@/lib/queryKeys";
import type { DashboardFilterState, MetricId } from "@/types/dashboard";

export function useDashboardBootstrap() {
  return useQuery({
    queryKey: [...queryKeys.dimensionLevels, ...queryKeys.dashboardViews],
    queryFn: getDashboardBootstrap,
  });
}

export function useMetricTree(metricId: MetricId, filters: DashboardFilterState, maxDepth: number) {
  return useQuery({
    queryKey: queryKeys.metricTree(metricId, filters),
    queryFn: () => getMetricTree(metricId, filters, maxDepth),
  });
}

export function useGrossMarginMix(filters: DashboardFilterState) {
  return useQuery({
    queryKey: queryKeys.grossMarginMix(filters),
    queryFn: () => getGrossMarginMix(filters),
  });
}

export function useCurrentRole() {
  return useQuery({
    queryKey: queryKeys.currentRole,
    queryFn: getCurrentRole,
  });
}
