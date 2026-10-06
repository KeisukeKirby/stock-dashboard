import type { Card, DailyLog, Skill } from './types'
import { items, itemsByScene, scenes } from './content'
import { isMastered } from './srs'
import { addDays, dateKey } from './date'

export interface SceneProgress {
  sceneId: string
  total: number
  introduced: number
  mastered: number
}

export interface ProgressSummary {
  introducedItems: number
  masteredItems: number
  totalItems: number
  dueNow: number
  streak: number
  xp: number
  level: number
  today: DailyLog
  scenes: SceneProgress[]
  weakItemIds: string[]
  week: { inputMinutes: number; outputMinutes: number; minutes: number; days: number }
  skillActivity: Record<Skill, number>
}

export function itemIdsFromCards(cards: Card[]): Set<string> {
  return new Set(cards.map((c) => c.itemId))
}

export function logHasActivity(l: DailyLog | undefined): boolean {
  if (!l) return false
  return (
    l.reviews + l.newItems + l.quizTotal + l.soundQuizTotal + l.grammarQuizTotal + l.dictationTotal + l.shadowReps + l.speakingPrompts + l.roleplays + l.writingWords > 0 ||
    l.menuCompleted
  )
}

export function computeStreak(logs: DailyLog[], today: string = dateKey()): number {
  const byDate = new Map(logs.map((l) => [l.date, l]))
  let streak = 0
  let cursor = logHasActivity(byDate.get(today)) ? today : addDays(today, -1)
  while (logHasActivity(byDate.get(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** XP：活動量から計算（保存しない） */
export function computeXp(logs: DailyLog[]): number {
  let xp = 0
  for (const l of logs) {
    xp += l.reviews * 2 + l.newItems * 5 + l.quizCorrect * 3 + l.soundQuizCorrect * 2 + l.grammarQuizCorrect * 3 + l.dictationCorrect * 5
    xp += l.shadowReps * 1 + l.speakingPrompts * 8 + l.recordings * 5 + Math.round(l.writingWords / 5) + l.roleplays * 15
    xp += l.menuCompleted ? 30 : 0
  }
  return xp
}

export function levelFromXp(xp: number): { level: number; next: number; into: number } {
  // レベル n に必要な累計 XP = 100 * n * (n + 1) / 2
  let level = 1
  while (xp >= (100 * (level + 1) * level) / 2) level += 1
  const base = (100 * level * (level - 1)) / 2
  const next = (100 * (level + 1) * level) / 2
  return { level, next: next - base, into: xp - base }
}

export function summarize(cards: Card[], logs: DailyLog[], today: DailyLog, now: number = Date.now()): ProgressSummary {
  const introduced = itemIdsFromCards(cards)
  const masteredIds = new Set<string>()
  const lapsesByItem = new Map<string, number>()
  for (const c of cards) {
    if (c.type === 'speak' && isMastered(c)) masteredIds.add(c.itemId)
    lapsesByItem.set(c.itemId, (lapsesByItem.get(c.itemId) ?? 0) + c.lapses)
  }
  const sceneProgress: SceneProgress[] = scenes.map((s) => {
    const list = itemsByScene.get(s.id) ?? []
    return {
      sceneId: s.id,
      total: list.length,
      introduced: list.filter((p) => introduced.has(p.id)).length,
      mastered: list.filter((p) => masteredIds.has(p.id)).length,
    }
  })
  const weak = [...lapsesByItem.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id)

  const todayKey = dateKey()
  const weekStart = addDays(todayKey, -6)
  const weekLogs = logs.filter((l) => l.date >= weekStart && l.date <= todayKey)
  const week = {
    inputMinutes: weekLogs.reduce((s, l) => s + l.inputMinutes, 0),
    outputMinutes: weekLogs.reduce((s, l) => s + l.outputMinutes, 0),
    minutes: weekLogs.reduce((s, l) => s + l.minutes, 0),
    days: weekLogs.filter(logHasActivity).length,
  }
  const skillActivity: Record<Skill, number> = {
    pronunciation: weekLogs.reduce((s, l) => s + l.soundQuizTotal, 0),
    vocabulary: weekLogs.reduce((s, l) => s + l.reviews + l.newItems, 0),
    grammar: weekLogs.reduce((s, l) => s + l.grammarQuizTotal, 0),
    reading: 0,
    listening: weekLogs.reduce((s, l) => s + l.quizTotal + l.dictationTotal + l.shadowReps, 0),
    speaking: weekLogs.reduce((s, l) => s + l.speakingPrompts + l.recordings + l.roleplays, 0),
    writing: weekLogs.reduce((s, l) => s + Math.round(l.writingWords / 20), 0),
  }
  const xp = computeXp(logs)
  return {
    introducedItems: introduced.size,
    masteredItems: masteredIds.size,
    totalItems: items.length,
    dueNow: cards.filter((c) => c.due <= now).length,
    streak: computeStreak(logs),
    xp,
    level: levelFromXp(xp).level,
    today,
    scenes: sceneProgress,
    weakItemIds: weak,
    week,
    skillActivity,
  }
}
