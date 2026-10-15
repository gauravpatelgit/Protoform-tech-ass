const DAY_MS = 24 * 3600 * 1000;

const iso = (date: Date) => date.toISOString().slice(0, 10);

// Monday of the UTC week containing `date`, as YYYY-MM-DD.
export function weekStartOf(date: Date): string {
  const day = (date.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - day * DAY_MS);
  return iso(monday);
}

// The last `count` week starts, oldest first, ending with the current week.
export function recentWeekStarts(count: number, now = new Date()): string[] {
  const current = new Date(`${weekStartOf(now)}T00:00:00Z`).getTime();
  return Array.from({ length: count }, (_, i) => iso(new Date(current - (count - 1 - i) * 7 * DAY_MS)));
}
