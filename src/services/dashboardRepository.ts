import { DEFAULT_LEVELS, DEFAULT_VIEWS } from "@/data/metrics";
import { getDemoGrossMarginMix, getDemoMetricTree } from "@/data/demo";
import { supabase } from "@/lib/supabase";
import type {
  DashboardBootstrap,
  DashboardFilterState,
  DashboardView,
  DimensionLevel,
  DonutSegment,
  MetricId,
  MetricTreeResult,
  UserDashboardPreference,
  UserRole,
} from "@/types/dashboard";

const storageKeys = {
  levels: "roistat-dashboard.levels",
  views: "roistat-dashboard.views",
  prefs: "roistat-dashboard.preferences",
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizePref(preference: UserDashboardPreference | null): UserDashboardPreference | null {
  if (!preference) {
    return null;
  }

  return {
    viewKey: preference.viewKey,
    grain: preference.grain,
    expandedPaths: preference.expandedPaths ?? [],
    channelFilter: preference.channelFilter ?? null,
  };
}

export async function getDashboardBootstrap(): Promise<DashboardBootstrap> {
  if (!supabase) {
    return {
      levels: readStorage(storageKeys.levels, DEFAULT_LEVELS),
      views: readStorage(storageKeys.views, DEFAULT_VIEWS),
      preference: normalizePref(readStorage<UserDashboardPreference | null>(storageKeys.prefs, null)),
    };
  }

  const [levelsResponse, viewsResponse] = await Promise.all([
    supabase.schema("app").from("dimension_levels").select("*").order("sort_order"),
    supabase.schema("app").from("dashboard_views").select("*").order("position"),
  ]);

  return {
    levels:
      levelsResponse.data?.map((item) => ({
        levelIndex: item.level_index,
        label: item.label,
        enabled: item.enabled,
        sortOrder: item.sort_order,
      })) ?? DEFAULT_LEVELS,
    views:
      viewsResponse.data?.map((item) => ({
        viewKey: item.view_key,
        metricId: item.metric_id as MetricId,
        title: item.title,
        enabled: item.enabled,
        position: item.position,
        visibleColumns: item.visible_columns ?? DEFAULT_VIEWS[0].visibleColumns,
        columnOrder: item.column_order ?? DEFAULT_VIEWS[0].columnOrder,
        defaultMaxDepth: item.default_max_depth,
      })) ?? DEFAULT_VIEWS,
    preference: normalizePref(readStorage<UserDashboardPreference | null>(storageKeys.prefs, null)),
  };
}

export async function getMetricTree(
  metricId: MetricId,
  filters: DashboardFilterState,
  maxDepth: number,
): Promise<MetricTreeResult> {
  if (!supabase) {
    return getDemoMetricTree(metricId, filters, maxDepth);
  }

  const { data, error } = await supabase.schema("reporting").rpc("get_metric_tree_v1", {
    metric_id: metricId,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    grain: filters.grain,
    channel_filter: filters.channelFilter,
    max_depth: maxDepth,
  });

  if (error) {
    return getDemoMetricTree(metricId, filters, maxDepth);
  }

  return (data as MetricTreeResult) ?? getDemoMetricTree(metricId, filters, maxDepth);
}

export async function getGrossMarginMix(filters: DashboardFilterState): Promise<DonutSegment[]> {
  if (!supabase) {
    return getDemoGrossMarginMix(filters);
  }

  const { data, error } = await supabase.schema("reporting").rpc("get_gross_margin_mix_v1", {
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    grain: filters.grain,
    channel_filter: filters.channelFilter,
  });

  if (error) {
    return getDemoGrossMarginMix(filters);
  }

  return (data as DonutSegment[]) ?? getDemoGrossMarginMix(filters);
}

export async function saveDimensionLevels(levels: DimensionLevel[]) {
  writeStorage(storageKeys.levels, levels);

  if (!supabase) {
    return;
  }

  await supabase.schema("app").from("dimension_levels").upsert(
    levels.map((level) => ({
      level_index: level.levelIndex,
      label: level.label,
      enabled: level.enabled,
      sort_order: level.sortOrder,
    })),
    { onConflict: "level_index" },
  );
}

export async function saveDashboardView(view: DashboardView) {
  const currentViews = readStorage(storageKeys.views, DEFAULT_VIEWS) as DashboardView[];
  const nextViews = currentViews.map((candidate) => (candidate.viewKey === view.viewKey ? view : candidate));
  writeStorage(storageKeys.views, nextViews);

  if (!supabase) {
    return;
  }

  await supabase.schema("app").from("dashboard_views").upsert(
    {
      view_key: view.viewKey,
      metric_id: view.metricId,
      title: view.title,
      enabled: view.enabled,
      position: view.position,
      visible_columns: view.visibleColumns,
      column_order: view.columnOrder,
      default_max_depth: view.defaultMaxDepth,
    },
    { onConflict: "view_key" },
  );
}

export async function saveUserPreference(preference: UserDashboardPreference, userId?: string) {
  writeStorage(storageKeys.prefs, preference);

  if (!supabase || !userId) {
    return;
  }

  await supabase.schema("app").from("user_dashboard_prefs").upsert(
    {
      user_id: userId,
      view_key: preference.viewKey,
      grain: preference.grain,
      expanded_paths: preference.expandedPaths,
      channel_filter: preference.channelFilter,
    },
    { onConflict: "user_id,view_key" },
  );
}

export async function getCurrentRole(): Promise<UserRole> {
  if (!supabase) {
    return "admin";
  }

  const { data, error } = await supabase.schema("app").rpc("get_current_role_v1");
  if (error) {
    return "viewer";
  }

  return (data as UserRole) ?? "viewer";
}
