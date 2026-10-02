import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Card, DailyLog, ProgressExport, Settings } from './types'
import { DEFAULT_SETTINGS } from './types'
import { dateKey } from './date'

export const SCHEMA_VERSION = 1
const DB_NAME = 'thai-learning'

interface ThaiDB extends DBSchema {
  cards: {
    key: string
    value: Card
    indexes: { byDue: number; byPhrase: string }
  }
  dailyLog: { key: string; value: DailyLog }
  settings: { key: string; value: Settings & { key: string } }
  meta: { key: string; value: { key: string; value: unknown } }
}

let dbPromise: Promise<IDBPDatabase<ThaiDB>> | null = null

export function getDB(): Promise<IDBPDatabase<ThaiDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ThaiDB>(DB_NAME, SCHEMA_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cards')) {
          const cards = db.createObjectStore('cards', { keyPath: 'id' })
          cards.createIndex('byDue', 'due')
          cards.createIndex('byPhrase', 'phraseId')
        }
        if (!db.objectStoreNames.contains('dailyLog')) db.createObjectStore('dailyLog', { keyPath: 'date' })
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' })
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

// ---- change notification (simple pub/sub so hooks can refresh) ----
type Listener = () => void
const listeners = new Set<Listener>()
export function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
function notify() {
  for (const fn of listeners) fn()
}

// ---- cards ----
export async function getAllCards(): Promise<Card[]> {
  return (await getDB()).getAll('cards')
}
export async function getCard(id: string): Promise<Card | undefined> {
  return (await getDB()).get('cards', id)
}
export async function putCard(card: Card): Promise<void> {
  await (await getDB()).put('cards', card)
  notify()
}
export async function putCards(cards: Card[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('cards', 'readwrite')
  await Promise.all([...cards.map((c) => tx.store.put(c)), tx.done])
  notify()
}
export async function getDueCards(at: number): Promise<Card[]> {
  const db = await getDB()
  return db.getAllFromIndex('cards', 'byDue', IDBKeyRange.upperBound(at))
}

// ---- daily log ----
export function emptyLog(date: string): DailyLog {
  return {
    date,
    reviews: 0,
    newPhrases: 0,
    quizCorrect: 0,
    quizTotal: 0,
    toneQuizCorrect: 0,
    toneQuizTotal: 0,
    roleplays: 0,
    minutes: 0,
    menuCompleted: false,
    steps: {},
  }
}
export async function getLog(date: string = dateKey()): Promise<DailyLog> {
  const db = await getDB()
  return (await db.get('dailyLog', date)) ?? emptyLog(date)
}
export async function getAllLogs(): Promise<DailyLog[]> {
  return (await getDB()).getAll('dailyLog')
}
export async function updateLog(patch: (log: DailyLog) => void, date: string = dateKey()): Promise<DailyLog> {
  const db = await getDB()
  const tx = db.transaction('dailyLog', 'readwrite')
  const log = (await tx.store.get(date)) ?? emptyLog(date)
  patch(log)
  await tx.store.put(log)
  await tx.done
  notify()
  return log
}

// ---- settings ----
export async function getSettings(): Promise<Settings> {
  const db = await getDB()
  const row = await db.get('settings', 'settings')
  if (!row) return { ...DEFAULT_SETTINGS }
  const { key: _key, ...rest } = row
  return { ...DEFAULT_SETTINGS, ...rest }
}
export async function saveSettings(s: Settings): Promise<void> {
  await (await getDB()).put('settings', { key: 'settings', ...s })
  notify()
}

// ---- meta ----
export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await (await getDB()).get('meta', key)
  return row?.value as T | undefined
}
export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await getDB()).put('meta', { key, value })
}

// ---- export / import ----
export async function exportAll(): Promise<ProgressExport> {
  const [cards, dailyLog, settings] = await Promise.all([getAllCards(), getAllLogs(), getSettings()])
  return {
    app: 'thai-learning-dashboard',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    cards,
    dailyLog,
    settings,
  }
}

/** マージ取込：カードは「より進んでいる方」、日別ログは数値の大きい方を採用 */
export async function importAll(data: ProgressExport, mode: 'merge' | 'replace' = 'merge'): Promise<{ cards: number; logs: number }> {
  if (data.app !== 'thai-learning-dashboard' || !Array.isArray(data.cards)) {
    throw new Error('このファイルは Thai Learning Dashboard の進捗データではありません')
  }
  const db = await getDB()
  if (mode === 'replace') {
    await Promise.all([db.clear('cards'), db.clear('dailyLog')])
  }
  const tx = db.transaction(['cards', 'dailyLog', 'settings'], 'readwrite')
  const cardStore = tx.objectStore('cards')
  for (const c of data.cards) {
    const cur = await cardStore.get(c.id)
    if (!cur || (c.reps ?? 0) > cur.reps || ((c.reps ?? 0) === cur.reps && (c.lastReviewed ?? 0) > (cur.lastReviewed ?? 0))) {
      await cardStore.put(c)
    }
  }
  const logStore = tx.objectStore('dailyLog')
  for (const l of data.dailyLog ?? []) {
    const cur = await logStore.get(l.date)
    if (!cur) await logStore.put(l)
    else {
      await logStore.put({
        ...cur,
        reviews: Math.max(cur.reviews, l.reviews),
        newPhrases: Math.max(cur.newPhrases, l.newPhrases),
        quizCorrect: Math.max(cur.quizCorrect, l.quizCorrect),
        quizTotal: Math.max(cur.quizTotal, l.quizTotal),
        toneQuizCorrect: Math.max(cur.toneQuizCorrect ?? 0, l.toneQuizCorrect ?? 0),
        toneQuizTotal: Math.max(cur.toneQuizTotal ?? 0, l.toneQuizTotal ?? 0),
        roleplays: Math.max(cur.roleplays ?? 0, l.roleplays ?? 0),
        minutes: Math.max(cur.minutes, l.minutes),
        menuCompleted: cur.menuCompleted || l.menuCompleted,
        steps: { ...l.steps, ...cur.steps },
      })
    }
  }
  if (data.settings) await tx.objectStore('settings').put({ key: 'settings', ...DEFAULT_SETTINGS, ...data.settings })
  await tx.done
  notify()
  return { cards: data.cards.length, logs: (data.dailyLog ?? []).length }
}

export async function resetAll(): Promise<void> {
  const db = await getDB()
  await Promise.all([db.clear('cards'), db.clear('dailyLog'), db.clear('meta')])
  notify()
}
