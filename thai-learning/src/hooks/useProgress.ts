import { useCallback, useEffect, useState } from 'react'
import type { Card, DailyLog } from '@/lib/types'
import { getAllCards, getAllLogs, getLog, subscribe, updateLog } from '@/lib/db'
import { summarize, type ProgressSummary } from '@/lib/progress'
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

export function useTodayLog(): DailyLog | null {
  const [log, setLog] = useState<DailyLog | null>(null)
  useEffect(() => {
    const load = () => getLog().then(setLog)
    void load()
    return subscribe(() => void load())
  }, [])
  return log
}

/** 画面が表示されている間、1 分ごとに今日の学習時間を加算する */
export function useTimeTracker(active = true): void {
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void updateLog((l) => {
          l.minutes += 1
        }, dateKey())
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [active])
}
