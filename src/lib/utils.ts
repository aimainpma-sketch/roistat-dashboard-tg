import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function percentDelta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / previous) * 100;
}

export function makeId(...parts: Array<string | number>) {
  return parts
    .filter(Boolean)
    .join("__")
    .replace(/\s+/g, "_")
    .toLowerCase();
}
