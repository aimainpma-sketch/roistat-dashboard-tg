import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
}

export function formatPeriodLabel(periodKey: string, grain: "day" | "week") {
  const date = parseISO(periodKey);
  return grain === "day" ? format(date, "dd MMM", { locale: ru }) : `Неделя ${format(date, "dd MMM", { locale: ru })}`;
}

export function formatRangeLabel(from: string, to: string) {
  return `${format(parseISO(from), "dd MMM yyyy", { locale: ru })} - ${format(parseISO(to), "dd MMM yyyy", { locale: ru })}`;
}
