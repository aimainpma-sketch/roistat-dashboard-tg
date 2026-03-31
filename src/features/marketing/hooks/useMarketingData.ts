import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useReducer } from "react";
import { addDays } from "date-fns";
import { getEnrichedOrders, getChannelSpend } from "@/services/enrichedRepository";
import {
  computeChannelFunnelSummaries,
  computeWeeklyTrend,
  computeRedFlags,
  computeRejectionBreakdown,
  computeBrokerChannelCrosstab,
  computeLanguageSplit,
  generateMarketingInsights,
} from "@/features/marketing/lib/aggregations";
import type { LanguageSegment, MarketingFilterState } from "@/types/dashboard";

function getDefaultDates() {
  const today = new Date();
  const dateTo = today.toISOString().slice(0, 10);
  const dateFrom = addDays(today, -29).toISOString().slice(0, 10);
  return { dateFrom, dateTo };
}

function initFilters(props?: { dateFrom?: string; dateTo?: string }): MarketingFilterState {
  const defaults = getDefaultDates();
  return {
    dateFrom: props?.dateFrom ?? defaults.dateFrom,
    dateTo: props?.dateTo ?? defaults.dateTo,
    grain: "day",
    channelFilter: null,
    languageFilter: null,
  };
}

function filtersReducer(state: MarketingFilterState, action: Partial<MarketingFilterState>): MarketingFilterState {
  return { ...state, ...action };
}

export function useMarketingData(props?: { dateFrom?: string; dateTo?: string }) {
  const [filters, dispatch] = useReducer(filtersReducer, props, initFilters);

  const setFilters = useCallback((next: MarketingFilterState) => dispatch(next), []);
  const setLanguageFilter = useCallback((v: LanguageSegment | null) => dispatch({ languageFilter: v }), []);
  const setChannelFilter = useCallback((v: string | null) => dispatch({ channelFilter: v }), []);

  const ordersQuery = useQuery({
    queryKey: ["enriched-orders", filters.dateFrom, filters.dateTo, filters.languageFilter],
    queryFn: () => getEnrichedOrders(filters),
  });

  const spendQuery = useQuery({
    queryKey: ["channel-spend", filters.dateFrom, filters.dateTo],
    queryFn: () => getChannelSpend(filters),
  });

  const orders = ordersQuery.data ?? [];
  const spend = spendQuery.data ?? [];

  const channelSummaries = useMemo(
    () => computeChannelFunnelSummaries(orders, spend, filters),
    [orders, spend, filters],
  );

  const weeklyTrend = useMemo(
    () => computeWeeklyTrend(orders, spend, filters),
    [orders, spend, filters],
  );

  const redFlags = useMemo(
    () => computeRedFlags(orders, spend, filters),
    [orders, spend, filters],
  );

  const rejectionBreakdown = useMemo(
    () => computeRejectionBreakdown(orders, filters),
    [orders, filters],
  );

  const brokerCrosstab = useMemo(
    () => computeBrokerChannelCrosstab(orders, filters),
    [orders, filters],
  );

  const languageSplit = useMemo(
    () => computeLanguageSplit(orders, spend, filters),
    [orders, spend, filters],
  );

  const insights = useMemo(
    () => generateMarketingInsights(channelSummaries, weeklyTrend),
    [channelSummaries, weeklyTrend],
  );

  const isLoading = ordersQuery.isLoading || spendQuery.isLoading;

  return {
    filters,
    setFilters,
    setLanguageFilter,
    setChannelFilter,
    orders,
    spend,
    channelSummaries,
    weeklyTrend,
    redFlags,
    rejectionBreakdown,
    brokerCrosstab,
    languageSplit,
    insights,
    isLoading,
  };
}
