import { useEffect, useMemo, useState, startTransition } from "react";
import { addDays } from "date-fns";
import { Settings2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DateRangeToolbar } from "@/features/dashboard/components/DateRangeToolbar";
import { GrossMarginDonut } from "@/features/dashboard/components/GrossMarginDonut";
import { HierarchySettingsDrawer } from "@/features/dashboard/components/HierarchySettingsDrawer";
import { MetricSection } from "@/features/dashboard/components/MetricSection";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCurrentRole, useDashboardBootstrap, useGrossMarginMix } from "@/features/dashboard/hooks/useDashboardData";
import { METRIC_DEFINITIONS } from "@/data/metrics";
import { formatRangeLabel } from "@/lib/format";
import { saveDashboardView, saveDimensionLevels } from "@/services/dashboardRepository";
import type { DashboardFilterState, DashboardView, DimensionLevel } from "@/types/dashboard";

function getDefaultFilters(): DashboardFilterState {
  const today = new Date();
  const dateTo = today.toISOString().slice(0, 10);
  const dateFrom = addDays(today, -29).toISOString().slice(0, 10);
  return { dateFrom, dateTo, grain: "day", channelFilter: null };
}

export function DashboardPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<DashboardFilterState>(getDefaultFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [levels, setLevels] = useState<DimensionLevel[]>([]);
  const [views, setViews] = useState<DashboardView[]>([]);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const bootstrapQuery = useDashboardBootstrap();
  const roleQuery = useCurrentRole();
  const mixQuery = useGrossMarginMix(filters);

  useEffect(() => {
    if (!bootstrapQuery.data) {
      return;
    }

    setLevels(bootstrapQuery.data.levels);
    setViews(bootstrapQuery.data.views);
  }, [bootstrapQuery.data]);

  const activeViews = useMemo(
    () => views.filter((view) => view.enabled).sort((left, right) => left.position - right.position),
    [views],
  );

  const handleLevelChange = (nextLevel: DimensionLevel) => {
    const next = levels.map((level) => (level.levelIndex === nextLevel.levelIndex ? nextLevel : level));
    setLevels(next);
    void saveDimensionLevels(next);
  };

  const handleViewDepthChange = (viewKey: string, depth: number) => {
    const next = views.map((view) =>
      view.viewKey === viewKey
        ? {
            ...view,
            defaultMaxDepth: Math.min(7, Math.max(1, depth)),
          }
        : view,
    );
    setViews(next);
    const updated = next.find((view) => view.viewKey === viewKey);
    if (updated) {
      void saveDashboardView(updated);
    }
  };

  return (
    <AppShell
      title="Roistat Dashboard"
      subtitle={`Текущий срез: ${formatRangeLabel(filters.dateFrom, filters.dateTo)} · ${filters.grain === "day" ? "дни" : "недели"}`}
      role={roleQuery.data ?? "admin"}
      actions={
        <>
          <DateRangeToolbar
            filters={filters}
            onChange={(next) => {
              startTransition(() => setFilters(next));
            }}
            onRefresh={() => setRefreshNonce((current) => current + 1)}
          />
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 transition hover:border-brand-400/40 hover:text-white"
            onClick={() => setDrawerOpen(true)}
            type="button"
          >
            <Settings2 className="size-4" />
            Уровни
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <GrossMarginDonut
          data={mixQuery.data ?? []}
          activeChannel={filters.channelFilter}
          onSelect={(channel) =>
            startTransition(() =>
              setFilters((current) => ({
                ...current,
                channelFilter: channel,
              })),
            )
          }
        />

        <section className="grid gap-4">
          {activeViews.map((view) => {
            const metric = METRIC_DEFINITIONS.find((item) => item.id === view.metricId);
            if (!metric) {
              return null;
            }

            return (
              <MetricSection
                key={view.viewKey}
                metric={metric}
                view={view}
                filters={filters}
                userId={user?.id}
              />
            );
          })}
        </section>
      </div>

      <HierarchySettingsDrawer
        open={drawerOpen}
        levels={levels}
        views={views}
        onClose={() => setDrawerOpen(false)}
        onLevelChange={handleLevelChange}
        onViewDepthChange={handleViewDepthChange}
      />
    </AppShell>
  );
}
