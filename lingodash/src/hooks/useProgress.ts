import { useCallback, useEffect, useState } from 'react'
import type { Card, DailyLog, JournalEntry, LevelResult, Mode } from '@/lib/types'
import { getAllCards, getAllLogs, getJournal, getLog, getMeta, kvList, subscribe, updateLog } from '@/lib/db'
import { summarize, type ProgressSummary } from '@/lib/progress'
import { DEFAULT_PLAN, type Plan } from '@/lib/curriculum'
import { dateKey } from '@/lib/date'

export function useCards(): { cards: Card[]; loaded: boolean; reload: () => Promise<void> } {
  const [cards, setCards] = useState<Card[]>([])
  const [loaded, setLoaded] = useState(false)
  const reload = useCallback(async () => {
    setCards(await getAllCards())
    setLoaded(true)
  }, [])
  useEffect(() => {
    void reload()
    return subscribe(() => void reload())
  }, [reload])
  return { cards, loaded, reload }
}

export function useProgressSummary(): { summary: ProgressSummary | null; reload: () => Promise<void> } {
  const [summary, setSummary] = useState<ProgressSummary | null>(null)
  const reload = useCallback(async () => {
    const [cards, logs, today] = await Promise.all([getAllCards(), getAllLogs(), getLog()])
    setSummary(summarize(cards, logs, today))
  }, [])
  useEffect(() => {
    void reload()
    return subscribe(() => void reload())
  }, [reload])
  return { summary, reload }
}

export function useLogs(): DailyLog[] {
  const [logs, setLogs] = useState<DailyLog[]>([])
  useEffect(() => {
    const load = () => getAllLogs().then(setLogs)
    void load()
    return subscribe(() => void load())
  }, [])
  return logs
}

export function useTodayLog(): DailyLog | null {
  const [log, setLog] = useState<DailyLog | null>(null)
  useEffect(() => {
    const load = () => getLog().then(setLog)
    void load()
    return subscribe(() => void load())
  }, [])
  return log
}

/** 学習計画（開始日・開始週）とレベルチェック結果 */
export function usePlan(): { plan: Plan; level: LevelResult | null; loaded: boolean } {
  const [plan, setPlan] = useState<Plan>(DEFAULT_PLAN)
  const [level, setLevel] = useState<LevelResult | null>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const load = async () => {
      const [p, l] = await Promise.all([getMeta<Plan>('plan'), getMeta<LevelResult>('level')])
      setPlan(p ?? DEFAULT_PLAN)
      setLevel(l ?? null)
      setLoaded(true)
    }
    void load()
    return subscribe(() => void load())
  }, [])
  return { plan, level, loaded }
}

export function useKvList<T>(prefix: string): { rows: { key: string; value: T }[]; loaded: boolean } {
  const [rows, setRows] = useState<{ key: string; value: T }[]>([])
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const load = () =>
      kvList<T>(prefix).then((r) => {
        setRows(r)
        setLoaded(true)
      })
    void load()
    return subscribe(() => void load())
  }, [prefix])
  return { rows, loaded }
}

export function useJournal(): JournalEntry[] {
  const [rows, setRows] = useState<JournalEntry[]>([])
  useEffect(() => {
    const load = () => getJournal().then(setRows)
    void load()
    return subscribe(() => void load())
  }, [])
  return rows
}

// ---- 学習時間の計測（インプット／アウトプットを分けて 1 分ごとに加算） ----
let currentMode: Mode | null = 'input'
export function setActiveMode(mode: Mode | null) {
  currentMode = mode
}

export function useTimeTracker(active = true): void {
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const mode = currentMode
        void updateLog((l) => {
          l.minutes += 1
          if (mode === 'input') l.inputMinutes += 1
          if (mode === 'output') l.outputMinutes += 1
        }, dateKey())
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [active])
}
