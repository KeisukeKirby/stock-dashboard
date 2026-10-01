import type { Card, CardType, Grade } from './types'
import { DAY, MIN } from './date'

/** 学習ステップ（分）。10分 → 1日 を抜けたら review に入る */
const LEARNING_STEPS_MIN = [10, 24 * 60]
const GRADUATE_INTERVAL_DAYS = 3
const MIN_EASE = 1.3
const MAX_EASE = 3.0

export function cardId(phraseId: string, type: CardType): string {
  return `${phraseId}:${type}`
}

/** 新フレーズを導入したときの初期カード。
 *  listen は 1 日後、speak は 10 分後に初回復習。 */
export function newCard(phraseId: string, type: CardType, now: number = Date.now()): Card {
  const step = type === 'listen' ? 1 : 0
  return {
    id: cardId(phraseId, type),
    phraseId,
    type,
    state: 'learning',
    step,
    due: now + LEARNING_STEPS_MIN[step] * MIN,
    interval: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    introducedAt: now,
  }
}

export function schedule(card: Card, grade: Grade, now: number = Date.now()): Card {
  const c: Card = { ...card, reps: card.reps + 1, lastGrade: grade, lastReviewed: now }

  if (c.state === 'new' || c.state === 'learning' || c.state === 'relearning') {
    if (grade === 1) {
      c.step = 0
      c.due = now + 1 * MIN
    } else if (grade === 2) {
      c.due = now + Math.max(1, LEARNING_STEPS_MIN[c.step] / 2) * MIN
    } else {
      const next = c.step + 1
      if (next >= LEARNING_STEPS_MIN.length) {
        c.state = 'review'
        c.step = 0
        c.interval = c.interval > 0 ? c.interval : GRADUATE_INTERVAL_DAYS
        c.due = now + c.interval * DAY
      } else {
        c.step = next
        c.due = now + LEARNING_STEPS_MIN[next] * MIN
      }
    }
    return c
  }

  // review
  if (grade === 1) {
    c.state = 'relearning'
    c.step = 0
    c.lapses += 1
    c.ease = Math.max(MIN_EASE, c.ease - 0.2)
    c.interval = Math.max(1, Math.round(c.interval * 0.3))
    c.due = now + LEARNING_STEPS_MIN[0] * MIN
  } else if (grade === 2) {
    c.ease = Math.max(MIN_EASE, c.ease - 0.15)
    c.interval = Math.max(1, Math.round(c.interval * 1.2))
    c.due = now + c.interval * DAY
  } else {
    c.ease = Math.min(MAX_EASE, c.ease + 0.05)
    c.interval = Math.max(c.interval + 1, Math.round(c.interval * c.ease))
    c.due = now + c.interval * DAY
  }
  return c
}

export function isDue(card: Card, at: number): boolean {
  return card.due <= at
}

/** 「習得」の定義：review 状態で間隔 4 日以上 */
export function isMastered(card: Card): boolean {
  return card.state === 'review' && card.interval >= 4
}

/** 復習の並び：speak 優先 → due が古い順 */
export function sortForReview(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'speak' ? -1 : 1
    return a.due - b.due
  })
}

export function describeInterval(card: Card): string {
  if (card.state === 'learning' || card.state === 'relearning') {
    return card.step === 0 ? '10分後' : '1日後'
  }
  if (card.state === 'review') return `${card.interval}日後`
  return '新規'
}
