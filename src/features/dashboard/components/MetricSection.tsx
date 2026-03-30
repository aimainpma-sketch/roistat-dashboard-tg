import { useEffect, useMemo, useState } from "react";
import { useMetricTree } from "@/features/dashboard/hooks/useDashboardData";
import { MetricTable } from "@/features/dashboard/components/MetricTable";
import { saveDashboardView, saveUserPreference } from "@/services/dashboardRepository";
import type { DashboardFilterState, DashboardView, MetricDefinition } from "@/types/dashboard";

export function MetricSection({
  metric,
  view,
  filters,
  userId,
}: {
  metric: MetricDefinition;
  view: DashboardView;
  filters: DashboardFilterState;
  userId?: string;
}) {
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>(view.columnOrder);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(view.visibleColumns);

  useEffect(() => {
    setColumnOrder(view.columnOrder);
    setVisibleColumns(view.visibleColumns);
  }, [view.columnOrder, view.visibleColumns]);

  const { data, isLoading } = useMetricTree(metric.id, filters, view.defaultMaxDepth);

  useEffect(() => {
    void saveUserPreference(
      {
        viewKey: view.viewKey,
        grain: filters.grain,
        expandedPaths,
        channelFilter: filters.channelFilter,
      },
      userId,
    );
  }, [expandedPaths, filters.channelFilter, filters.grain, userId, view.viewKey]);

  const syncedView = useMemo(
    () => ({
      ...view,
      columnOrder,
      visibleColumns,
    }),
    [columnOrder, view, visibleColumns],
  );

  useEffect(() => {
    void saveDashboardView(syncedView);
  }, [syncedView]);

  if (isLoading || !data) {
    return (
      <div className="glass rounded-[28px] border border-white/10 p-6 text-sm text-slate-400">
        Загружаем метрику {metric.label}...
      </div>
    );
  }

  return (
    <MetricTable
      metric={metric}
      periods={data.periods}
      expandedPaths={expandedPaths}
      columnOrder={columnOrder}
      visibleColumns={visibleColumns}
      onExpandedPathsChange={setExpandedPaths}
      onColumnOrderChange={setColumnOrder}
      onVisibleColumnsChange={setVisibleColumns}
    />
  );
}
