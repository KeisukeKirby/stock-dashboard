export const TZ = 'Asia/Bangkok'

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** YYYY-MM-DD in Asia/Bangkok */
export function dateKey(d: Date = new Date()): string {
  return fmt.format(d) // en-CA gives YYYY-MM-DD
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

/** days from today (Bangkok) to target date key; 0 = today, negative = past */
export function daysUntil(targetKey: string, today: string = dateKey()): number {
  const [y1, m1, d1] = today.split('-').map(Number)
  const [y2, m2, d2] = targetKey.split('-').map(Number)
  const a = Date.UTC(y1, m1 - 1, d1)
  const b = Date.UTC(y2, m2 - 1, d2)
  return Math.round((b - a) / 86_400_000)
}

export function isWeekend(key: string): boolean {
  const [y, m, d] = key.split('-').map(Number)
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return wd === 0 || wd === 6
}

export const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土']
export function weekdayJa(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return WEEKDAY_JA[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

export function formatMD(key: string): string {
  const [, m, d] = key.split('-').map(Number)
  return `${m}/${d}`
}

/** epoch ms for the end of today in Bangkok (23:59:59.999) */
export function endOfToday(now: Date = new Date()): number {
  const key = dateKey(now)
  const [y, m, d] = key.split('-').map(Number)
  // Bangkok is UTC+7 with no DST
  return Date.UTC(y, m - 1, d, 23 - 7, 59, 59, 999)
}

export const MIN = 60_000
export const DAY = 86_400_000
