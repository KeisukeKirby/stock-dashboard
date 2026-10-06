import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Card, DailyLog, JournalEntry, ProgressExport, Settings } from './types'
import { DEFAULT_SETTINGS } from './types'
import { dateKey } from './date'

export const SCHEMA_VERSION = 1
const DB_NAME = 'lingodash'

interface LingoDB extends DBSchema {
  cards: { key: string; value: Card; indexes: { byDue: number; byItem: string } }
  dailyLog: { key: string; value: DailyLog }
  settings: { key: string; value: Settings & { key: string } }
  meta: { key: string; value: { key: string; value: unknown } }
  journal: { key: string; value: JournalEntry; indexes: { byDate: string } }
  kv: { key: string; value: { key: string; value: unknown } }
}

let dbPromise: Promise<IDBPDatabase<LingoDB>> | null = null

export function getDB(): Promise<IDBPDatabase<LingoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LingoDB>(DB_NAME, SCHEMA_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cards')) {
          const cards = db.createObjectStore('cards', { keyPath: 'id' })
          cards.createIndex('byDue', 'due')
          cards.createIndex('byItem', 'itemId')
        }
        if (!db.objectStoreNames.contains('dailyLog')) db.createObjectStore('dailyLog', { keyPath: 'date' })
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' })
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' })
        if (!db.objectStoreNames.contains('journal')) {
          const j = db.createObjectStore('journal', { keyPath: 'id' })
          j.createIndex('byDate', 'date')
        }
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

// ---- change notification ----
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

// ---- daily log ----
export function emptyLog(date: string): DailyLog {
  return {
    date,
    reviews: 0,
    newItems: 0,
    quizCorrect: 0,
    quizTotal: 0,
    soundQuizCorrect: 0,
    soundQuizTotal: 0,
    grammarQuizCorrect: 0,
    grammarQuizTotal: 0,
    dictationCorrect: 0,
    dictationTotal: 0,
    shadowReps: 0,
    speakingPrompts: 0,
    recordings: 0,
    writingWords: 0,
    roleplays: 0,
    minutes: 0,
    inputMinutes: 0,
    outputMinutes: 0,
    menuCompleted: false,
    steps: {},
  }
}
export async function getLog(date: string = dateKey()): Promise<DailyLog> {
  const db = await getDB()
  return { ...emptyLog(date), ...((await db.get('dailyLog', date)) ?? {}) }
}
export async function getAllLogs(): Promise<DailyLog[]> {
  const all = await (await getDB()).getAll('dailyLog')
  return all.map((l) => ({ ...emptyLog(l.date), ...l }))
}
export async function updateLog(patch: (log: DailyLog) => void, date: string = dateKey()): Promise<DailyLog> {
  const db = await getDB()
  const tx = db.transaction('dailyLog', 'readwrite')
  const log = { ...emptyLog(date), ...((await tx.store.get(date)) ?? {}) }
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
  notify()
}
export async function getAllMeta(): Promise<{ key: string; value: unknown }[]> {
  return (await getDB()).getAll('meta')
}

// ---- kv (aboutMe / shadowLog / resources / grammar state) ----
export async function kvGet<T>(key: string): Promise<T | undefined> {
  const row = await (await getDB()).get('kv', key)
  return row?.value as T | undefined
}
export async function kvSet(key: string, value: unknown): Promise<void> {
  await (await getDB()).put('kv', { key, value })
  notify()
}
export async function kvDelete(key: string): Promise<void> {
  await (await getDB()).delete('kv', key)
  notify()
}
export async function kvList<T>(prefix: string): Promise<{ key: string; value: T }[]> {
  const all = await (await getDB()).getAll('kv')
  return all.filter((r) => r.key.startsWith(prefix)).map((r) => ({ key: r.key, value: r.value as T }))
}

// ---- journal ----
export async function addJournal(entry: JournalEntry): Promise<void> {
  await (await getDB()).put('journal', entry)
  notify()
}
export async function deleteJournal(id: string): Promise<void> {
  await (await getDB()).delete('journal', id)
  notify()
}
export async function getJournal(): Promise<JournalEntry[]> {
  const all = await (await getDB()).getAll('journal')
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

// ---- export / import ----
export async function exportAll(): Promise<ProgressExport> {
  const db = await getDB()
  const [cards, dailyLog, settings, journal, kv, meta] = await Promise.all([
    getAllCards(),
    getAllLogs(),
    getSettings(),
    getJournal(),
    db.getAll('kv'),
    db.getAll('meta'),
  ])
  return { app: 'lingodash', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), cards, dailyLog, settings, journal, kv, meta }
}

const NUMERIC_LOG_KEYS: (keyof DailyLog)[] = [
  'reviews',
  'newItems',
  'quizCorrect',
  'quizTotal',
  'soundQuizCorrect',
  'soundQuizTotal',
  'grammarQuizCorrect',
  'grammarQuizTotal',
  'dictationCorrect',
  'dictationTotal',
  'shadowReps',
  'speakingPrompts',
  'recordings',
  'writingWords',
  'roleplays',
  'minutes',
  'inputMinutes',
  'outputMinutes',
]

export async function importAll(data: ProgressExport, mode: 'merge' | 'replace' = 'merge'): Promise<{ cards: number; logs: number }> {
  if (data.app !== 'lingodash' || !Array.isArray(data.cards)) {
    throw new Error('このファイルは LingoDash の進捗データではありません')
  }
  const db = await getDB()
  if (mode === 'replace') {
    await Promise.all([db.clear('cards'), db.clear('dailyLog'), db.clear('journal'), db.clear('kv'), db.clear('meta')])
  }
  const tx = db.transaction(['cards', 'dailyLog', 'settings', 'journal', 'kv', 'meta'], 'readwrite')
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
    if (!cur) await logStore.put({ ...emptyLog(l.date), ...l })
    else {
      const merged: DailyLog = { ...emptyLog(l.date), ...cur }
      for (const k of NUMERIC_LOG_KEYS) {
        ;(merged as unknown as Record<string, number>)[k] = Math.max((cur as unknown as Record<string, number>)[k] ?? 0, (l as unknown as Record<string, number>)[k] ?? 0)
      }
      merged.menuCompleted = cur.menuCompleted || l.menuCompleted
      merged.steps = { ...l.steps, ...cur.steps }
      await logStore.put(merged)
    }
  }
  const jStore = tx.objectStore('journal')
  for (const j of data.journal ?? []) if (!(await jStore.get(j.id))) await jStore.put(j)
  const kvStore = tx.objectStore('kv')
  for (const r of data.kv ?? []) if (mode === 'replace' || !(await kvStore.get(r.key))) await kvStore.put(r)
  const metaStore = tx.objectStore('meta')
  for (const r of data.meta ?? []) if (mode === 'replace' || !(await metaStore.get(r.key))) await metaStore.put(r)
  if (data.settings) await tx.objectStore('settings').put({ key: 'settings', ...DEFAULT_SETTINGS, ...data.settings })
  await tx.done
  notify()
  return { cards: data.cards.length, logs: (data.dailyLog ?? []).length }
}

export async function resetAll(): Promise<void> {
  const db = await getDB()
  await Promise.all([db.clear('cards'), db.clear('dailyLog'), db.clear('meta'), db.clear('journal'), db.clear('kv')])
  notify()
}
