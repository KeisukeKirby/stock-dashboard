import type { Card, Phrase, Settings } from './types'
import { hasTag, phraseById, phrases, phrasesByScene, roleplays, shuffle } from './content'
import { newPhrasesForToday, resolveDay } from './curriculum'
import { sortForReview } from './srs'
import { dateKey, endOfToday } from './date'

export interface QuizQuestion {
  id: string
  phraseId: string
  choices: string[] // phrase ids (4)
  answer: number
  kind: 'meaning' | 'reply'
}

export type SessionStep =
  | { kind: 'review'; cards: Card[] }
  | { kind: 'new'; phraseIds: string[]; carriedOver: number }
  | { kind: 'shadow'; phraseIds: string[] }
  | { kind: 'quiz'; questions: QuizQuestion[] }
  | { kind: 'roleplay'; roleplayId: string }

export interface SessionPlan {
  date: string
  dayNumber: number
  steps: SessionStep[]
  estMinutes: number
}

function distinctJa(target: Phrase, pool: Phrase[]): Phrase[] {
  const seen = new Set<string>([target.ja])
  const out: Phrase[] = []
  for (const p of pool) {
    if (p.id === target.id || seen.has(p.ja)) continue
    seen.add(p.ja)
    out.push(p)
  }
  return out
}

export function makeQuestion(target: Phrase, kind: QuizQuestion['kind'] = 'meaning'): QuizQuestion {
  const sameScene = distinctJa(target, shuffle(phrasesByScene.get(target.scene) ?? []))
  const others = distinctJa(target, shuffle(phrases.filter((p) => p.scene !== target.scene)))
  const distractors = [...sameScene, ...others].slice(0, 3)
  const choices = shuffle([target, ...distractors]).map((p) => p.id)
  return {
    id: `${kind}:${target.id}:${Math.random().toString(36).slice(2, 7)}`,
    phraseId: target.id,
    choices,
    answer: choices.indexOf(target.id),
    kind,
  }
}

/** 導入済みフレーズからクイズを作る。reply タグ付きを minReplies 問以上混ぜる */
export function buildQuiz(introduced: Set<string>, count: number, minReplies = 2): QuizQuestion[] {
  const pool = phrases.filter((p) => introduced.has(p.id))
  const source = pool.length >= 4 ? pool : phrases
  const replies = shuffle(source.filter((p) => hasTag(p, 'reply')))
  const normal = shuffle(source.filter((p) => !hasTag(p, 'reply')))
  const picked: QuizQuestion[] = []
  const usedIds = new Set<string>()
  for (const p of replies.slice(0, Math.min(minReplies, count))) {
    picked.push(makeQuestion(p, 'reply'))
    usedIds.add(p.id)
  }
  for (const p of [...normal, ...replies]) {
    if (picked.length >= count) break
    if (usedIds.has(p.id)) continue
    picked.push(makeQuestion(p, hasTag(p, 'reply') ? 'reply' : 'meaning'))
    usedIds.add(p.id)
  }
  return shuffle(picked)
}

export function buildDailySession(cards: Card[], settings: Settings, today: string = dateKey()): SessionPlan {
  const introduced = new Set(cards.map((c) => c.phraseId))
  const day = resolveDay(today)
  const steps: SessionStep[] = []

  const due = sortForReview(cards.filter((c) => c.due <= endOfToday())).slice(0, settings.reviewLimit)
  if (due.length > 0) steps.push({ kind: 'review', cards: due })

  const fresh = newPhrasesForToday(introduced, settings, today)
  if (fresh.ids.length > 0) steps.push({ kind: 'new', phraseIds: fresh.ids, carriedOver: fresh.carriedOver })

  // シャドーイング：今日の新フレーズから 5、足りなければ最近導入したもの
  const recent = [...cards]
    .filter((c) => c.type === 'speak')
    .sort((a, b) => b.introducedAt - a.introducedAt)
    .map((c) => c.phraseId)
  const shadowIds = [...fresh.ids, ...recent.filter((id) => !fresh.ids.includes(id))].slice(0, 5)
  if (shadowIds.length > 0) steps.push({ kind: 'shadow', phraseIds: shadowIds })

  const quizPool = new Set([...introduced, ...fresh.ids])
  if (quizPool.size >= 4) steps.push({ kind: 'quiz', questions: buildQuiz(quizPool, 8) })

  const rp = day.roleplay ?? shuffle(roleplays.filter((r) => r.scene !== 'pronunciation'))[0]?.id
  if (rp) steps.push({ kind: 'roleplay', roleplayId: rp })

  const estMinutes = Math.round(
    due.length * 0.25 + fresh.ids.length * 0.6 + shadowIds.length * 0.6 + (quizPool.size >= 4 ? 3 : 0) + (rp ? 4 : 0),
  )
  return { date: today, dayNumber: day.day, steps, estMinutes }
}

export function buildQuickSession(cards: Card[], settings: Settings): Card[] {
  const now = Date.now()
  const due = sortForReview(cards.filter((c) => c.due <= now))
  if (due.length >= settings.quickCards) return due.slice(0, settings.quickCards)
  // 不足分は due が近いカードで補う（復習の前倒し）
  const upcoming = [...cards]
    .filter((c) => c.due > now)
    .sort((a, b) => a.due - b.due)
    .slice(0, settings.quickCards - due.length)
  return [...due, ...upcoming]
}

export { phraseById }
