const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toLocalDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function parseLocalDateKey(value: string) {
  const datePart = String(value || "").substring(0, 10);
  const match = datePart.match(DATE_KEY_PATTERN);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getReportingWeekStart(value: Date | string) {
  const date = typeof value === "string"
    ? parseLocalDateKey(value) || new Date(value)
    : new Date(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addReportingWeeks(weekStart: Date, amount: number) {
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + amount * 7);
  nextWeek.setHours(0, 0, 0, 0);
  return nextWeek;
}

export function getReportingWeekEnd(weekStart: Date) {
  const friday = new Date(weekStart);
  friday.setDate(friday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return friday;
}

export function normalizeReportingWeekKey(value?: string | null) {
  if (!value) return "";
  const date = parseLocalDateKey(value);
  return date ? toLocalDateKey(getReportingWeekStart(date)) : String(value).substring(0, 10);
}

export function formatReportingWeek(weekStart: Date) {
  const weekEnd = getReportingWeekEnd(weekStart);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const start = weekStart.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const end = weekEnd.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "long",
    day: "numeric",
    year: "numeric",
  });
  return `${start} – ${end}`;
}

