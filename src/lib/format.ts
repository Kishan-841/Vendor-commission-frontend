// Display helpers. Backend sends money/percent as strings; coerce then format.

export function inr(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return "₹" + (Number.isFinite(n) ? n : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function pct(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return `${Number.isFinite(n) ? n : 0}%`;
}

export function num(value: string | number): number {
  return typeof value === "string" ? Number(value) : value;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "2026-07" -> "Jul 2026"
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

// Derive the round-off a stored calculation carries: finalPayable is rounded
// to the whole rupee while its components stay paise-precise. Single source
// of truth for every "Round off" display line.
export function deriveRoundOff(parts: {
  finalPayable: unknown;
  grossCommission: unknown;
  fixedPayAmount?: unknown;
  gstAmount: unknown;
  tdsAmount: unknown;
}): number {
  const n = (v: unknown) => Number(v ?? 0);
  return (
    Math.round(
      (n(parts.finalPayable) -
        (n(parts.grossCommission) + n(parts.fixedPayAmount) + n(parts.gstAmount) - n(parts.tdsAmount))) *
        100,
    ) / 100
  );
}
