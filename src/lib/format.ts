const pad = (n: number) => String(n).padStart(2, '0')

/** Unified Chinese date-time format, e.g. "2026年7月29日 16:13" (local time, 24h). */
export function formatDateTime(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
