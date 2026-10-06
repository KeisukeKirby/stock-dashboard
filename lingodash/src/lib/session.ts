import type { Card, Item, MenuSize, Settings, StepKind } from './types'
import { grammarUnits, hasTag, itemById, items, itemsByScene, materials, phonics, prompts, roleplays, shuffle } from './content'
import { currentWeek, newItemsForToday, type Plan } from './curriculum'
import { sortForReview } from './srs'
import { dateKey, endOfToday } from './date'

export interface QuizQuestion {
  id: string
  itemId: string
  choices: string[]
  answer: number
  kind: 'meaning' | 'reply'
}

export type SessionStep =
  | { kind: 'sound'; pairIds: string[] }
  | { kind: 'review'; cards: Card[] }
  | { kind: 'new'; itemIds: string[]; carriedOver: number }
  | { kind: 'grammar'; unitId: string }
  | { kind: 'shadow'; itemIds: string[] }
  | { kind: 'listen'; questions: QuizQuestion[]; dictationIds: string[] }
  | { kind: 'speak'; promptIds: string[] }
  | { kind: 'write'; promptId: string }
  | { kind: 'roleplay'; roleplayId: string }

export interface SessionPlan {
  date: string
  week: number
  phase: string
  steps: SessionStep[]
  estMinutes: number
}

export const STEP_MODE: Record<StepKind, 'input' | 'output'> = {
  sound: 'input',
  review: 'input',
  new: 'input',
  grammar: 'input',
  shadow: 'output',
  listen: 'input',
  speak: 'output',
  write: 'output',
  roleplay: 'output',
}

function distinctJa(target: Item, pool: Item[]): Item[] {
  const seen = new Set<string>([target.ja])
  const out: Item[] = []
  for (const p of pool) {
    if (p.id === target.id || seen.has(p.ja)) continue
    seen.add(p.ja)
    out.push(p)
  }
  return out
}

export function makeQuestion(target: Item, kind: QuizQuestion['kind'] = 'meaning'): QuizQuestion {
  const sameScene = distinctJa(target, shuffle(itemsByScene.get(target.scene) ?? []))
  const others = distinctJa(target, shuffle(items.filter((p) => p.scene !== target.scene)))
  const distractors = [...sameScene, ...others].slice(0, 3)
  const choices = shuffle([target, ...distractors]).map((p) => p.id)
  return {
    id: `${kind}:${target.id}:${Math.random().toString(36).slice(2, 7)}`,
    itemId: target.id,
    choices,
    answer: choices.indexOf(target.id),
    kind,
  }
}

export function buildQuiz(introduced: Set<string>, count: number, minReplies = 2): QuizQuestion[] {
  const pool = items.filter((p) => introduced.has(p.id))
  const source = pool.length >= 4 ? pool : items
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

const SIZE: Record<MenuSize, { sound: number; shadow: number; quiz: number; dict: number; speak: number; write: boolean; roleplay: boolean }> = {
  short: { sound: 4, shadow: 3, quiz: 5, dict: 1, speak: 2, write: false, roleplay: false },
  standard: { sound: 6, shadow: 4, quiz: 6, dict: 2, speak: 3, write: true, roleplay: true },
  long: { sound: 8, shadow: 6, quiz: 8, dict: 3, speak: 4, write: true, roleplay: true },
}

function dayHash(date: string): number {
  let h = 0
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

/**
 * 今日のメニュー：週のフェーズに応じて重点を変える。
 * 発音フェーズ：最小対を多め。文法フェーズ：文法ドリル必須。アウトプットフェーズ：スピーキング・ライティング多め。
 * インプット 8 : アウトプット 2 の時間配分を目安にする。
 */
export function buildDailySession(cards: Card[], settings: Settings, plan: Plan, today: string = dateKey()): SessionPlan {
  const introduced = new Set(cards.map((c) => c.itemId))
  const week = currentWeek(plan, today)
  const size = SIZE[settings.menuSize]
  const steps: SessionStep[] = []
  const h = dayHash(today)
  let est = 0

  // ① 発音：最小対（発音フェーズは多め、他は軽く）
  const soundN = week.phase === 'pronunciation' ? size.sound + 4 : size.sound
  const pairIds = shuffle(phonics.minimalPairs).slice(0, soundN).map((p) => p.id)
  steps.push({ kind: 'sound', pairIds })
  est += soundN * 0.3

  // ② 復習
  const due = sortForReview(cards.filter((c) => c.due <= endOfToday())).slice(0, settings.reviewLimit)
  if (due.length > 0) {
    steps.push({ kind: 'review', cards: due })
    est += due.length * 0.25
  }

  // ③ 新アイテム
  const fresh = newItemsForToday(introduced, settings, plan, today)
  if (fresh.ids.length > 0) {
    steps.push({ kind: 'new', itemIds: fresh.ids, carriedOver: fresh.carriedOver })
    est += fresh.ids.length * 0.7
  }

  // ④ 文法（今週のユニット。無ければ日替わりで復習）
  const unitPool = week.grammarUnits.length > 0 ? week.grammarUnits : grammarUnits.map((g) => g.id)
  if (week.phase !== 'pronunciation' || week.week >= 2) {
    const unitId = unitPool[h % unitPool.length]
    steps.push({ kind: 'grammar', unitId })
    est += 4
  }

  // ⑤ 音読 → シャドーイング（録音）
  const recent = [...cards]
    .filter((c) => c.type === 'speak')
    .sort((a, b) => b.introducedAt - a.introducedAt)
    .map((c) => c.itemId)
  const shadowPool = [...fresh.ids, ...recent.filter((id) => !fresh.ids.includes(id))]
    .map((id) => itemById.get(id))
    .filter((p): p is Item => !!p && (p.en.split(' ').length >= 4 || !!p.example))
    .map((p) => p.id)
  const shadowIds = shadowPool.slice(0, size.shadow)
  if (shadowIds.length > 0) {
    steps.push({ kind: 'shadow', itemIds: shadowIds })
    est += shadowIds.length * 0.8
  }

  // ⑥ リスニング：クイズ + ディクテーション
  const quizPool = new Set([...introduced, ...fresh.ids])
  const dictN = week.phase === 'pronunciation' ? Math.max(1, size.dict - 1) : size.dict
  const dictationIds = shuffle(materials.dictation).slice(0, dictN).map((d) => d.id)
  const questions = quizPool.size >= 4 ? buildQuiz(quizPool, size.quiz) : []
  if (questions.length > 0 || dictationIds.length > 0) {
    steps.push({ kind: 'listen', questions, dictationIds })
    est += questions.length * 0.3 + dictationIds.length * 1.5
  }

  // ⑦ スピーキング：自分について / 反射ドリル
  const speakN = week.phase === 'output' ? size.speak + 1 : size.speak
  const aboutMe = shuffle(prompts.aboutMe).slice(0, Math.ceil(speakN / 2))
  const reflex = shuffle(prompts.speaking).slice(0, Math.floor(speakN / 2))
  steps.push({ kind: 'speak', promptIds: [...aboutMe, ...reflex].map((p) => p.id) })
  est += speakN * 1.2

  // ⑧ ロールプレイ（標準以上。発音フェーズは隔日）
  if (size.roleplay && (week.phase !== 'pronunciation' || h % 2 === 0)) {
    const rp = roleplays[h % roleplays.length]
    steps.push({ kind: 'roleplay', roleplayId: rp.id })
    est += rp.estMinutes
  }

  // ⑨ クイックライティング（標準以上。アウトプットフェーズは毎日、他は隔日）
  if (size.write && (week.phase === 'output' || h % 2 === 1)) {
    const wp = prompts.writing[h % prompts.writing.length]
    steps.push({ kind: 'write', promptId: wp.id })
    est += (wp.minutes ?? 5) + 1
  }

  return { date: today, week: week.week, phase: week.phase, steps, estMinutes: Math.round(est) }
}

export function buildQuickSession(cards: Card[], settings: Settings): Card[] {
  const now = Date.now()
  const due = sortForReview(cards.filter((c) => c.due <= now))
  if (due.length >= settings.quickCards) return due.slice(0, settings.quickCards)
  const upcoming = [...cards]
    .filter((c) => c.due > now)
    .sort((a, b) => a.due - b.due)
    .slice(0, settings.quickCards - due.length)
  return [...due, ...upcoming]
}

export { itemById }
