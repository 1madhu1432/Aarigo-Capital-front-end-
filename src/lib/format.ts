/** Indian formatting helpers. All money values are stored as plain numbers (INR). */

export function inr(value: number | null | undefined): string {
  const n = safe(value);
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));
}

/** Compact Indian notation: ₹18.50L / ₹1.25Cr / ₹85,000 */
export function inrShort(value: number | null | undefined): string {
  const n = safe(value);
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)}L`;
  return inr(n);
}

export function num(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-IN").format(safe(value));
}

export function safe(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return value;
}

export function pct(value: number | null | undefined): string {
  return `${Math.round(safe(value))}%`;
}

/** ISO (yyyy-mm-dd) -> 03 Sep 2026 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );
}

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function subDays(iso: string, days: number): string {
  return addDays(iso, -days);
}

export function addWeeks(iso: string, weeks: number): string {
  return addDays(iso, weeks * 7);
}

export function addMonths(iso: string, months: number): string {
  const parts = iso.split("-").map(Number);
  const y = parts[0] ?? new Date().getFullYear();
  const m = (parts[1] ?? 1) - 1; // 0-based month
  const targetDay = parts[2] ?? 1;

  const targetMonth = m + months;
  const targetYear = y + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;

  // Last day of target month (day 0 of next month)
  const lastDayOfMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const day = Math.min(targetDay, lastDayOfMonth);

  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function daysBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const cleanA = a.includes("T") ? a.slice(0, 10) : a.trim();
  const cleanB = b.includes("T") ? b.slice(0, 10) : b.trim();
  const d1 = new Date(cleanA + "T00:00:00").getTime();
  const d2 = new Date(cleanB + "T00:00:00").getTime();
  if (isNaN(d1) || isNaN(d2)) return 0;
  return Math.round((d2 - d1) / 86_400_000);
}

export function padId(prefix: string, n: number, width = 6): string {
  return `${prefix}-${String(n).padStart(width, "0")}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Generate all EMI due dates for a loan schedule.
 *
 * - Daily:   EMI i → firstEmiDate + (i-1) days   (never duplicate)
 * - Weekly:  EMI i → firstEmiDate + (i-1)*7 days  (never duplicate)
 * - Monthly: EMI i → same calendar day, (i-1) months later
 *            (auto-clamps to last day of short months, e.g. Jan 31 → Feb 28/29)
 */
export function generateEmiDates(
  firstEmiDate: string,
  frequency: "Daily" | "Weekly" | "Monthly",
  tenure: number,
): string[] {
  const dates: string[] = [];
  for (let i = 0; i < tenure; i++) {
    if (frequency === "Monthly") {
      dates.push(addMonths(firstEmiDate, i));
    } else if (frequency === "Weekly") {
      dates.push(addDays(firstEmiDate, i * 7));
    } else {
      // Daily
      dates.push(addDays(firstEmiDate, i));
    }
  }
  return dates;
}

// ── Date-range helpers for analytics / reports ─────────────────────────────

export function startOfMonth(iso: string): string {
  return iso.slice(0, 8) + "01";
}

export function endOfMonth(iso: string): string {
  const d = new Date(iso.slice(0, 7) + "-01T00:00:00");
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return toISO(d);
}

/** Monday of the ISO week containing `iso` (week starts Sunday). */
export function startOfWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - d.getDay());
  return toISO(d);
}

export function endOfWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + (6 - d.getDay()));
  return toISO(d);
}

/** First day of the previous calendar month relative to `iso`. */
export function prevMonthStart(iso: string): string {
  return startOfMonth(addMonths(iso, -1));
}

/** Last day of the previous calendar month relative to `iso`. */
export function prevMonthEnd(iso: string): string {
  return endOfMonth(addMonths(iso, -1));
}

export function prevWeekStart(iso: string): string {
  return addDays(startOfWeek(iso), -7);
}

export function prevWeekEnd(iso: string): string {
  return addDays(endOfWeek(iso), -7);
}

/**
 * Generate a unique NOC certificate reference number.
 *
 * Format: NOC-<YEAR>-<LOAN_ID_DIGITS>-<4_DIGIT_RANDOM>
 * Example: NOC-2026-1042-8371
 *
 * - Year is always the current calendar year (never hardcoded).
 * - loanId digits are extracted from the loanId string (falls back to "000").
 * - A 4-digit random suffix ensures uniqueness even if called multiple times.
 */
export function generateNocNumber(loanId: string): string {
  const year = new Date().getFullYear();
  const cleanId = (loanId || "").replace(/[^0-9]/g, "") || "000";
  const randomSeq = Math.floor(1000 + Math.random() * 9000);
  return `NOC-${year}-${cleanId}-${randomSeq}`;
}
