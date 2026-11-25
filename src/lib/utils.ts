import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number | string, maximumFractionDigits = 0): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits,
  }).format(num || 0);
}

export function formatCurrencyINR(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num || 0);
}

export const formatCurrency = formatCurrencyINR;

export function formatNumber(qty: number | string, decimals = 2): string {
  const num = typeof qty === "string" ? parseFloat(qty) : qty;
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: decimals,
  }).format(num || 0);
}

export function formatQuantity(qty: number | string, decimals = 3): string {
  const num = typeof qty === "string" ? parseFloat(qty) : qty;
  return (num || 0).toFixed(decimals);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
