import { curriculum, phraseById } from './content'
import type { CurriculumDay, Settings } from './types'
import { dateKey, daysUntil, isWeekend } from './date'

export function resolveDay(today: string = dateKey()): CurriculumDay {
  const days = curriculum.days
  const exact = days.find((d) => d.date === today)
  if (exact) return exact
  if (today < days[0].date) return days[0]
  return days[days.length - 1]
}

export function dayIndexOf(day: CurriculumDay): number {
  return curriculum.days.findIndex((d) => d.day === day.day)
}

export function countdown(today: string = dateKey()): number {
  return daysUntil(curriculum.targetDate, today)
}

/**
 * 今日導入すべき新フレーズ：今日までのカリキュラム分で未導入のもの（繰り越し含む）を
 * 日付順に並べ、1日の上限で切る。
 */
export function newPhrasesForToday(
  introduced: Set<string>,
  settings: Settings,
  today: string = dateKey(),
): { ids: string[]; carriedOver: number; remainingAfter: number } {
  const limit = isWeekend(today) ? settings.weekendNewLimit : settings.dailyNewLimit
  const todayDay = resolveDay(today)
  const pending: string[] = []
  let carriedOver = 0
  for (const d of curriculum.days) {
    if (d.date > today) break
    for (const id of d.newPhrases) {
      if (!phraseById.has(id) || introduced.has(id)) continue
      pending.push(id)
      if (d.day !== todayDay.day) carriedOver += 1
    }
  }
  const ids = pending.slice(0, limit)
  return { ids, carriedOver: Math.min(carriedOver, ids.length), remainingAfter: pending.length - ids.length }
}

export function dayCompletion(day: CurriculumDay, introduced: Set<string>): { done: number; total: number } {
  const total = day.newPhrases.length
  const done = day.newPhrases.filter((id) => introduced.has(id)).length
  return { done, total }
}
