import type { Card, DailyLog } from './types'
import { phrases, phrasesByScene, scenes } from './content'
import { isMastered } from './srs'
import { addDays, dateKey } from './date'

export interface SceneProgress {
  sceneId: string
  total: number
  introduced: number
  mastered: number
}

export interface ProgressSummary {
  introducedPhrases: number
  masteredPhrases: number
  totalPhrases: number
  dueNow: number
  streak: number
  today: DailyLog
  scenes: SceneProgress[]
  weakPhraseIds: string[] // lapses が多い順
}

export function phraseIdsFromCards(cards: Card[]): Set<string> {
  return new Set(cards.map((c) => c.phraseId))
}

export function logHasActivity(l: DailyLog | undefined): boolean {
  if (!l) return false
  return l.reviews + l.newPhrases + l.quizTotal + (l.toneQuizTotal ?? 0) + (l.roleplays ?? 0) > 0 || l.menuCompleted
}

/** 連続日数：今日（活動があれば）または昨日から過去に向けて数える */
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

export function summarize(cards: Card[], logs: DailyLog[], today: DailyLog, now: number = Date.now()): ProgressSummary {
  const introduced = phraseIdsFromCards(cards)
  const masteredIds = new Set<string>()
  const lapsesByPhrase = new Map<string, number>()
  for (const c of cards) {
    if (c.type === 'speak' && isMastered(c)) masteredIds.add(c.phraseId)
    lapsesByPhrase.set(c.phraseId, (lapsesByPhrase.get(c.phraseId) ?? 0) + c.lapses)
  }
  const sceneProgress: SceneProgress[] = scenes.map((s) => {
    const list = phrasesByScene.get(s.id) ?? []
    return {
      sceneId: s.id,
      total: list.length,
      introduced: list.filter((p) => introduced.has(p.id)).length,
      mastered: list.filter((p) => masteredIds.has(p.id)).length,
    }
  })
  const weak = [...lapsesByPhrase.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id)
  return {
    introducedPhrases: introduced.size,
    masteredPhrases: masteredIds.size,
    totalPhrases: phrases.length,
    dueNow: cards.filter((c) => c.due <= now).length,
    streak: computeStreak(logs),
    today,
    scenes: sceneProgress,
    weakPhraseIds: weak,
  }
}
