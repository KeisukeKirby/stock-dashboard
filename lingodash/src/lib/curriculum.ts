import { curriculum, itemById } from './content'
import type { CurriculumWeek, Settings } from './types'
import { dateKey, daysUntil } from './date'

export const TOTAL_WEEKS = curriculum.weeks.length

export interface Plan {
  startDate: string // YYYY-MM-DD
  startWeek: number // 1..12 (レベルチェックの結果で決まる開始週)
}

export const DEFAULT_PLAN: Plan = { startDate: dateKey(), startWeek: 1 }

/** 今日が何週目か（startWeek から数える。上限 TOTAL_WEEKS） */
export function currentWeekNumber(plan: Plan, today: string = dateKey()): number {
  const days = Math.max(0, -daysUntil(plan.startDate, today))
  return Math.min(TOTAL_WEEKS, plan.startWeek + Math.floor(days / 7))
}

export function dayInWeek(plan: Plan, today: string = dateKey()): number {
  const days = Math.max(0, -daysUntil(plan.startDate, today))
  return (days % 7) + 1
}

export function weekByNumber(n: number): CurriculumWeek {
  return curriculum.weeks.find((w) => w.week === n) ?? curriculum.weeks[curriculum.weeks.length - 1]
}

export function currentWeek(plan: Plan, today: string = dateKey()): CurriculumWeek {
  return weekByNumber(currentWeekNumber(plan, today))
}

/** 今日導入する新アイテム：現在の週までで未導入のものを週順に並べ、上限で切る */
export function newItemsForToday(
  introduced: Set<string>,
  settings: Settings,
  plan: Plan,
  today: string = dateKey(),
): { ids: string[]; carriedOver: number; remainingAfter: number } {
  const wk = currentWeekNumber(plan, today)
  const pending: string[] = []
  let carriedOver = 0
  for (const w of curriculum.weeks) {
    if (w.week > wk) break
    for (const id of w.newItems) {
      if (!itemById.has(id) || introduced.has(id)) continue
      pending.push(id)
      if (w.week !== wk) carriedOver += 1
    }
  }
  const ids = pending.slice(0, settings.dailyNewLimit)
  return { ids, carriedOver: Math.min(carriedOver, ids.length), remainingAfter: pending.length - ids.length }
}

export function weekCompletion(week: CurriculumWeek, introduced: Set<string>): { done: number; total: number } {
  const total = week.newItems.length
  const done = week.newItems.filter((id) => introduced.has(id)).length
  return { done, total }
}
