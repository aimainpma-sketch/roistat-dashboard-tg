import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addDays } from "date-fns";
import { getEnrichedOrders, getChannelSpend } from "@/services/enrichedRepository";
import {
  computeChannelFunnelSummaries,
  computeWeeklyTrend,
  computeRedFlags,
  computeRejectionBreakdown,
  computeBrokerChannelCrosstab,
  computeLanguageSplit,
} from "@/features/marketing/lib/aggregations";
import type { LanguageSegment, MarketingFilterState, Grain } from "@/types/dashboard";

function getDefaultDates() {
  const today = new Date();
  const dateTo = today.toISOString().slice(0, 10);
  const dateFrom = addDays(today, -29).toISOString().slice(0, 10);
  return { dateFrom, dateTo };
}

export function useMarketingData(props?: { dateFrom?: string; dateTo?: string }) {
  const defaults = getDefaultDates();
  const [dateFrom, setDateFrom] = useState(props?.dateFrom ?? defaults.dateFrom);
  const [dateTo, setDateTo] = useState(props?.dateTo ?? defaults.dateTo);
  const [languageFilter, setLanguageFilter] = useState<LanguageSegment | null>(null);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [grain, setGrain] = useState<Grain>("day");

  const filters: MarketingFilterState = useMemo(
    () => ({ dateFrom, dateTo, grain, channelFilter, languageFilter }),
    [dateFrom, dateTo, grain, channelFilter, languageFilter],
  );

  const setFilters = (next: MarketingFilterState) => {
    setDateFrom(next.dateFrom);
    setDateTo(next.dateTo);
    setGrain(next.grain);
    setChannelFilter(next.channelFilter);
    setLanguageFilter(next.languageFilter);
  };

  const ordersQuery = useQuery({
    queryKey: ["enriched-orders", dateFrom, dateTo, languageFilter],
    queryFn: () => getEnrichedOrders(filters),
  });

  const spendQuery = useQuery({
    queryKey: ["channel-spend", dateFrom, dateTo],
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

  const isLoading = ordersQuery.isLoading || spendQuery.isLoading;

  return {
    filters,
    setFilters,
    setLanguageFilter,
    setChannelFilter,
    channelSummaries,
    weeklyTrend,
    redFlags,
    rejectionBreakdown,
    brokerCrosstab,
    languageSplit,
    isLoading,
  };
}
