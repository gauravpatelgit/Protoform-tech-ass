const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const full = new Intl.NumberFormat("en")
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

export const formatCompact = (value: number) => compact.format(value)
export const formatNumber = (value: number) => full.format(value)

export function formatPercent(value: number) {
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)}%`
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
]

export function formatRelativeTime(iso: string | null) {
  if (!iso) return "never"
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return relative.format(Math.round(seconds / size), unit)
    }
  }
  return "just now"
}

export function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  })
}
